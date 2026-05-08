import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ensureBucket, uploadBuffer, listFiles, deleteFile, presignUrl } from '../lib/s3.js';
import { ddosProtection } from '../middleware/ddos_protection.js';
import { calculateFileHash, logUploadEvent } from '../lib/ddos_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Helper to get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip || 
    req.connection?.remoteAddress ||
    '0.0.0.0';
}

function fakeMalwareScan(filePath) {
  // Simple fake scan: if filename includes "virus" then quarantine.
  return path.basename(filePath).toLowerCase().includes('virus') ? 'infected' : 'clean';
}

router.get('/stats', async (_req, res) => {
  try {
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (process.env.USE_S3 === 'true') {
      const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
      try {
        await ensureBucket(bucket);
        const contents = await listFiles(bucket);
        const totalFiles = contents.length;
        const totalSize = contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);

        return res.json({ 
          totalFiles,
          storageUsed: formatSize(totalSize),
          storageBytes: totalSize
        });
      } catch (s3Error) {
        console.warn('[Files] S3 stats failed, falling back to local storage:', s3Error.message);
      }

      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

      const fileNames = fs.readdirSync(filesDir);
      let totalSize = 0;
      for (const name of fileNames) {
        try {
          const stat = fs.statSync(path.join(filesDir, name));
          if (stat.isFile()) {
            totalSize += stat.size;
          }
        } catch(err) {}
      }
      return res.json({
        totalFiles: fileNames.length,
        storageUsed: formatSize(totalSize),
        storageBytes: totalSize
      });
    } else {
      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
      
      const fileNames = fs.readdirSync(filesDir);
      let totalSize = 0;
      for (const name of fileNames) {
         try {
           const stat = fs.statSync(path.join(filesDir, name));
           if (stat.isFile()) {
             totalSize += stat.size;
           }
         } catch(err) {}
      }
      res.json({
        totalFiles: fileNames.length,
        storageUsed: formatSize(totalSize),
        storageBytes: totalSize
      });
    }
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to get stats' });
  }
});

router.get('/', async (_req, res) => {
  try {
    if (process.env.USE_S3 === 'true') {
      const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
      try {
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

        files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        return res.json({ files });
      } catch (s3Error) {
        console.warn('[Files] S3 list failed, falling back to local storage:', s3Error.message);
      }

      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

      const fileNames = fs.readdirSync(filesDir);
      const files = fileNames.map(name => {
        const stat = fs.statSync(path.join(filesDir, name));
        const originalName = name.split('-').slice(2).join('-') || name;
        return {
          id: name,
          name: originalName,
          size: stat.size,
          uploadDate: stat.mtime.toISOString(),
          status: name.startsWith('quarantine/') ? 'Quarantined' : 'Clean',
          downloadUrl: `http://localhost:${process.env.PORT || 8080}/downloads/${name}`
        };
      });

      files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      return res.json({ files });
    } else {
      // Local fallback listing
      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
      
      const fileNames = fs.readdirSync(filesDir);
      const files = fileNames.map(name => {
        const stat = fs.statSync(path.join(filesDir, name));
        // Extract original filename (after timestamp-random- prefix)
        const originalName = name.split('-').slice(2).join('-') || name;
        return {
          id: name,
          name: originalName,
          size: stat.size,
          uploadDate: stat.mtime.toISOString(),
          status: name.startsWith('quarantine/') ? 'Quarantined' : 'Clean',
          downloadUrl: `http://localhost:${process.env.PORT || 8080}/downloads/${name}`
        };
      });

      // Sort in descending order (newest first)
      files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      res.json({ files });
    }
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to list files' });
  }
});

router.post('/upload', 
  ddosProtection,
  upload.single('file'), 
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      
      const startTime = Date.now();
      const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'] || `ip_${getClientIP(req)}`;
      const ipAddress = getClientIP(req);
      const isAttackSimulation = String(req.headers['x-attack-simulation'] || '').toLowerCase() === 'true';
      const warmupThreshold = req.simulation?.threshold || 6;
      const isWarmupWindow = isAttackSimulation && (req.simulation?.burstCount || 0) < warmupThreshold;
      
      // DDoS ENFORCEMENT: Block persistent duplicate upload attacks
      if (!isWarmupWindow && req.ddosRisk?.features?.duplicate_file_ratio > 0.7) {
        console.warn(`[DDoS] Blocking duplicate upload for user: ${userId} (${Math.round(req.ddosRisk.features.duplicate_file_ratio * 100)}% duplicate content)`);
        
        // Log the blocked attempt
        logUploadEvent({
          timestamp: new Date().toISOString(),
          user_id: userId,
          ip_address: ipAddress,
          file_hash: calculateFileHash(file.buffer),
          file_size: file.size,
          filename: file.originalname,
          success: 0,
          error: 'Blocked: Duplicate Flood'
        }).catch(() => {});

        return res.status(403).json({
          error: 'Upload blocked. Too many duplicate files detected in this session.',
          code: 'DUPLICATE_FLOOD_DETECTED',
          reason: 'Our DDoS protection system has flagged this account for repeated duplicate uploads.'
        });
      }

      // Calculate file hash for duplicate detection
      const fileHash = calculateFileHash(file.buffer);
      
      const useS3 = process.env.USE_S3 === 'true';
      const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai-storage';
      if (useS3) {
        await ensureBucket(bucket);
      }
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
      
      let downloadUrl = `http://localhost:${process.env.PORT || 8080}/downloads/${blobName}`;

      if (useS3) {
        // Upload to S3
        await uploadBuffer(bucket, blobName, file.buffer, file.mimetype);
        downloadUrl = await presignUrl(bucket, blobName, 1800);
      }
      
      const uploadDuration = Date.now() - startTime;
      
      // Log upload event for ML analysis (non-blocking)
      logUploadEvent({
        timestamp: new Date().toISOString(),
        user_id: userId,
        ip_address: ipAddress,
        file_hash: fileHash,
        file_size: file.size,
        filename: file.originalname,
        upload_duration_ms: uploadDuration,
        success: 1,
        error: null
      }).catch(err => {
        console.error('[DDoS] Failed to log upload event:', err);
      });
      
      // Immediately return response (non-blocking)
      const response = {
        id: blobName, 
        name: file.originalname, 
        size: file.size, 
        status, 
        downloadUrl, // Switched to variable
        fileHash,
        message: 'File uploaded successfully. OCR processing started in background.'
      };
      
      // Include risk information if available
      if (req.ddosRisk) {
        response.security = {
          riskLevel: req.ddosRisk.risk_level,
          anomalyScore: req.ddosRisk.anomaly_score
        };
      }
      
      res.json(response);
    
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

router.delete('/:id', ddosProtection, async (req, res) => {
  try {
    const id = req.params.id;
    if (process.env.USE_S3 === 'true') {
      const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
      await deleteFile(bucket, id);
    } else {
      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      const localPath = path.join(filesDir, id);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Delete failed' });
  }
});

export default router;



