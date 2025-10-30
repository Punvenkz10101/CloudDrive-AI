import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ensureBucket, uploadBuffer, listFiles, deleteFile, presignUrl } from '../lib/s3.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

function fakeMalwareScan(filePath) {
  // Simple fake scan: if filename includes "virus" then quarantine.
  return path.basename(filePath).toLowerCase().includes('virus') ? 'infected' : 'clean';
}

router.get('/stats', async (_req, res) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
    await ensureBucket(bucket);
    const contents = await listFiles(bucket);
    const totalFiles = contents.length;
    const totalSize = contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
    
    // Format storage size
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    res.json({ 
      totalFiles,
      storageUsed: formatSize(totalSize),
      storageBytes: totalSize
    });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to get stats' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
    await ensureBucket(bucket);
    const contents = await listFiles(bucket);
    const files = await Promise.all((contents).map(async (obj) => {
      const url = await presignUrl(bucket, obj.Key, 1800);
      return {
        id: obj.Key,
        name: path.basename(obj.Key),
        size: obj.Size || 0,
        uploadDate: obj.LastModified ? new Date(obj.LastModified).toISOString() : '',
        status: 'Clean',
        downloadUrl: url,
      };
    }));
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to list files' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai-storage';
    await ensureBucket(bucket);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    const scan = fakeMalwareScan(unique);
    let status = 'Clean';
    let blobName = unique;
    if (scan === 'infected') {
      status = 'Quarantined';
      blobName = `quarantine/${unique}`;
    }
    
    // Save file locally for OCR processing
    const filesDir = req.storagePaths?.filesDir || path.join(__dirname, '..', 'storage', 'files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    const localPath = path.join(filesDir, blobName);
    fs.writeFileSync(localPath, file.buffer);
    
    // Upload to S3
    await uploadBuffer(bucket, blobName, file.buffer, file.mimetype);
    const url = await presignUrl(bucket, blobName, 1800);
    
    // Immediately return response (non-blocking)
    res.json({ 
      id: blobName, 
      name: file.originalname, 
      size: file.size, 
      status, 
      downloadUrl: url,
      message: 'File uploaded successfully. OCR processing started in background.'
    });
    
    // Process with OCR in background (non-blocking)
    const supportedTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg', 
      'image/tiff', 
      'image/bmp', 
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    if (supportedTypes.includes(file.mimetype)) {
      // Run OCR processing asynchronously with retry logic
      (async () => {
        // Wait for file to be fully written
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry logic for OCR processing
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            // Verify file exists before processing
            if (!fs.existsSync(localPath)) {
              console.warn(`[OCR] File not found at ${localPath}, waiting...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
              continue;
            }
            
            console.log(`[OCR] Starting background OCR processing for ${blobName} (attempt ${retryCount + 1}/${maxRetries})...`);
            
            const ocrResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/api/ocr/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filePath: localPath,
                fileName: blobName
              })
              // Note: Timeout handled by Node.js default (no timeout)
            });
            
            if (ocrResponse.ok) {
              const ocrResult = await ocrResponse.json();
              if (ocrResult.success) {
                console.log(`[OCR] ✓ Successfully processed ${blobName} with OCR (${ocrResult.textLength || 0} chars extracted)`);
                break; // Success, exit retry loop
              } else {
                console.error(`[OCR] ✗ OCR processing failed for ${blobName}:`, ocrResult.error);
                if (retryCount < maxRetries - 1) {
                  console.log(`[OCR] Retrying OCR processing for ${blobName}...`);
                  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
                }
              }
            } else {
              const errorText = await ocrResponse.text();
              console.error(`[OCR] ✗ OCR request failed for ${blobName}: ${ocrResponse.status} - ${errorText.substring(0, 200)}`);
              if (retryCount < maxRetries - 1) {
                console.log(`[OCR] Retrying OCR processing for ${blobName}...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } catch (ocrError) {
            console.error(`[OCR] ✗ OCR processing error for ${blobName} (attempt ${retryCount + 1}):`, ocrError.message);
            if (retryCount < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
          
          retryCount++;
        }
        
        if (retryCount >= maxRetries) {
          console.error(`[OCR] ✗ Failed to process ${blobName} after ${maxRetries} attempts`);
        }
      })(); // Immediately invoked async function (non-blocking)
    }
    
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: (e && e.message) || 'Upload failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
    const id = req.params.id;
    await deleteFile(bucket, id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Delete failed' });
  }
});

export default router;



