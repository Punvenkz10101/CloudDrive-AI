import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read file metadata helper
function readFileMetadata() {
  const metadataFile = path.join(__dirname, '..', 'storage', 'file-metadata.json');
  if (fs.existsSync(metadataFile)) {
    try {
      return JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    } catch (error) {
      console.error('Error reading metadata:', error);
      return {};
    }
  }
  return {};
}

// Process file with OCR
router.post('/process', async (req, res) => {
  try {
    const { filePath, fileName } = req.body;
    
    console.log(`\n[OCR Process] ===== Starting OCR Processing =====`);
    console.log(`[OCR Process] File: ${fileName}`);
    console.log(`[OCR Process] Path: ${filePath}`);
    
    if (!filePath || !fileName) {
      return res.status(400).json({ error: 'File path and name are required' });
    }
    
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.warn(`[OCR Process] File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found', success: false });
    }
    
    // Check file size
    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.warn(`[OCR Process] File is empty: ${filePath}`);
        return res.status(400).json({ error: 'File is empty', success: false });
      }
    } catch (err) {
      console.warn(`[OCR Process] Cannot read file stats: ${err.message}`);
    }
    
    // Ensure extracted_text directory exists
    const extractedTextDir = path.join(__dirname, '..', 'extracted_text');
    if (!fs.existsSync(extractedTextDir)) {
      fs.mkdirSync(extractedTextDir, { recursive: true });
      console.log(`[OCR Process] Created extracted_text directory: ${extractedTextDir}`);
    }
    
    // Ensure storage directory exists
    const storageDir = path.join(__dirname, '..', 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
      console.log(`[OCR Process] Created storage directory: ${storageDir}`);
    }
    
    // Check if file exists, try alternative paths if needed
    let actualFilePath = filePath;
    if (!fs.existsSync(actualFilePath)) {
      console.error(`[OCR Process] ✗ File not found: ${actualFilePath}`);
      // Try alternative paths
      const filesDir = path.join(__dirname, '..', 'storage', 'files');
      const altPath = path.join(filesDir, fileName);
      if (fs.existsSync(altPath)) {
        console.log(`[OCR Process] Found file at alternative path: ${altPath}`);
        actualFilePath = altPath;
      } else {
        return res.status(404).json({ error: `File not found: ${filePath}` });
      }
    }
    
    console.log(`[OCR Process] ✓ File exists: ${actualFilePath}`);
    const fileSize = fs.statSync(actualFilePath).size;
    console.log(`[OCR Process] File size: ${(fileSize / 1024).toFixed(2)} KB`);
    
    const libDir = path.join(__dirname, '..', 'lib');
    const pythonScript = path.join(libDir, 'ocr_process_temp.py');
    
    // Create temporary Python script to run OCR
    const escapedPath = actualFilePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedName = fileName.replace(/'/g, "\\'");
    
    const processScript = `import sys
import os
from pathlib import Path

lib_dir = r'${libDir.replace(/\\/g, '\\\\')}'
sys.path.insert(0, lib_dir)

from ocr_processing import OCRProcessor

try:
    output_dir = os.path.join(os.path.dirname(lib_dir), 'extracted_text')
    ocr_processor = OCRProcessor(output_dir=output_dir)
    
    print(f"[OCR Python] Processing: ${escapedName}")
    print(f"[OCR Python] Path: ${escapedPath}")
    
    text = ocr_processor.process_file(r'${escapedPath}', r'${escapedName}')
    
    print(f"[OCR Python] Success! Extracted {len(text)} characters")
    print(f"PROCESSED_SUCCESS:True")
    print(f"PROCESSED_TEXT_LENGTH:{len(text)}")
except Exception as e:
    import traceback
    print(f"[OCR Python] Error: {str(e)}")
    print(f"PROCESSED_SUCCESS:False")
    print(f"PROCESSED_ERROR:{str(e)}")
    traceback.print_exc()
    sys.exit(1)
`;
    
    fs.writeFileSync(pythonScript, processScript);
    console.log(`[OCR Process] Created Python script: ${pythonScript}`);
    
    // Run Python script
    console.log(`[OCR Process] Executing Python OCR script...`);
    const python = spawn('python', [pythonScript], {
      cwd: libDir,
      env: { 
        ...process.env, 
        PATH: process.env.PATH + ';C:\\Program Files\\Tesseract-OCR',
        PYTHONPATH: libDir
      },
      shell: true // Use shell on Windows for better compatibility
    });
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[OCR Python] ${text.trim()}`);
    });
    
    python.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(`[OCR Python Error] ${text.trim()}`);
    });
    
    python.on('close', async (code) => {
      // Clean up temp script
      try {
        if (fs.existsSync(pythonScript)) {
          fs.unlinkSync(pythonScript);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp script:', cleanupError);
      }
      
      console.log(`\n[OCR Process] Python process exited with code: ${code}`);
      
      if (code === 0) {
        const success = output.includes('PROCESSED_SUCCESS:True');
        if (success) {
          // Wait a moment for file writes to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify metadata was updated
          let metadata = readFileMetadata();
          console.log(`[OCR Process] Metadata file has ${Object.keys(metadata).length} files`);
          
          // Retry reading metadata a few times if needed
          let retries = 3;
          while (!metadata[fileName] && retries > 0) {
            console.log(`[OCR Process] Waiting for metadata update... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            metadata = readFileMetadata();
            retries--;
          }
          
          const fileMetadata = metadata[fileName];
          if (fileMetadata && fileMetadata.content) {
            console.log(`[OCR Process] ✓ Content available in metadata: ${fileMetadata.content.length} chars`);
          } else {
            console.warn(`[OCR Process] ⚠ Metadata for ${fileName} not found or has no content`);
            console.log(`[OCR Process] Available files in metadata: ${Object.keys(metadata).join(', ')}`);
          }
          
          // Also check extracted_text directory
          const extractedTextDir = path.join(__dirname, '..', 'extracted_text');
          const fileStem = path.parse(fileName).name;
          const possibleExtractedFiles = [
            path.join(extractedTextDir, `${fileStem}_extracted.txt`),
            path.join(extractedTextDir, `${fileName}_extracted.txt`)
          ];
          
          for (const extractedFile of possibleExtractedFiles) {
            if (fs.existsSync(extractedFile)) {
              const content = fs.readFileSync(extractedFile, 'utf-8');
              console.log(`[OCR Process] ✓ Found extracted text file: ${extractedFile} (${content.length} chars)`);
              break;
            }
          }
          
          res.json({ 
            success: true, 
            fileName: fileName, 
            message: 'File processed successfully',
            textLength: fileMetadata?.content?.length || 0
          });
          console.log(`[OCR Process] ===== OCR Processing Complete =====\n`);
        } else {
          const errorMatch = output.match(/PROCESSED_ERROR:(.+)/);
          const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error';
          console.error(`[OCR Process] ✗ Processing failed: ${errorMsg}`);
          console.error(`[OCR Process] Full output:\n${output}`);
          if (errorOutput) {
            console.error(`[OCR Process] Error output:\n${errorOutput}`);
          }
          res.status(500).json({ 
            success: false, 
            error: `OCR processing failed: ${errorMsg}`,
            details: output.substring(0, 500) // Include first 500 chars of output
          });
        }
      } else {
        console.error(`[OCR Process] ✗ Python script exited with code ${code}`);
        console.error(`[OCR Process] Stdout:\n${output}`);
        console.error(`[OCR Process] Stderr:\n${errorOutput}`);
        res.status(500).json({ 
          success: false, 
          error: `OCR processing failed. Python exited with code ${code}`,
          details: errorOutput || output.substring(0, 500)
        });
      }
    });
    
  } catch (error) {
    console.error('[OCR Process] Exception:', error);
    res.status(500).json({ 
      success: false, 
      error: `OCR processing error: ${error.message}` 
    });
  }
});

// Process all unprocessed files with OCR
router.post('/process-all', async (req, res) => {
  try {
    console.log(`\n[OCR Process All] ===== Starting batch OCR processing =====`);
    
    // Get all files from S3
    const { listFiles } = await import('../lib/s3.js');
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai-storage';
    let allFiles = [];
    
    try {
      const contents = await listFiles(bucket);
      allFiles = contents.map(f => f.Key);
      console.log(`[OCR Process All] Found ${allFiles.length} files in S3`);
    } catch (error) {
      console.error(`[OCR Process All] Error listing S3 files:`, error);
    }
    
    // Also check local storage
    const filesDir = path.join(__dirname, '..', 'storage', 'files');
    if (fs.existsSync(filesDir)) {
      const localFiles = fs.readdirSync(filesDir)
        .filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.docx', '.doc'].includes(ext);
        });
      const allFilesSet = new Set([...allFiles, ...localFiles]);
      allFiles = Array.from(allFilesSet);
      console.log(`[OCR Process All] Including local files, total: ${allFiles.length}`);
    }
    
    // Check metadata to see which files have been processed
    const metadata = readFileMetadata();
    const processedFiles = new Set(Object.keys(metadata).filter(key => {
      const fileData = metadata[key];
      return fileData && fileData.content && fileData.content.length > 50 &&
             !fileData.content.includes('PDF content extraction not fully implemented');
    }));
    
    // Also check extracted_text directory
    const extractedTextDir = path.join(__dirname, '..', 'extracted_text');
    if (fs.existsSync(extractedTextDir)) {
      const extractedFiles = fs.readdirSync(extractedTextDir)
        .filter(f => f.endsWith('_extracted.txt'))
        .map(f => f.replace('_extracted.txt', '').replace('.txt', ''));
      extractedFiles.forEach(f => processedFiles.add(f));
    }
    
    // Filter to unprocessed files
    const unprocessedFiles = allFiles.filter(fileName => {
      const fileStem = path.parse(fileName).name;
      return !processedFiles.has(fileName) && !processedFiles.has(fileStem);
    });
    
    console.log(`[OCR Process All] Found ${unprocessedFiles.length} unprocessed files out of ${allFiles.length} total`);
    
    if (unprocessedFiles.length === 0) {
      return res.json({
        success: true,
        message: 'All files have already been processed',
        processed: allFiles.length,
        unprocessed: 0
      });
    }
    
    // Process files in parallel (limit concurrent to 3)
    const results = {
      success: [],
      failed: [],
      total: unprocessedFiles.length
    };
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < unprocessedFiles.length; i += batchSize) {
      const batch = unprocessedFiles.slice(i, i + batchSize);
      console.log(`[OCR Process All] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(unprocessedFiles.length / batchSize)}`);
      
      await Promise.all(batch.map(async (fileName) => {
        try {
          // Find the file path
          const filesDir = path.join(__dirname, '..', 'storage', 'files');
          let filePath = path.join(filesDir, fileName);
          
          if (!fs.existsSync(filePath)) {
            // Try with different path structures
            const altPaths = [
              path.join(__dirname, '..', 'storage', 'files', fileName),
              fileName // Absolute path
            ];
            
            for (const altPath of altPaths) {
              if (fs.existsSync(altPath)) {
                filePath = altPath;
                break;
              }
            }
          }
          
          if (!fs.existsSync(filePath)) {
            console.warn(`[OCR Process All] File not found locally: ${fileName}`);
            results.failed.push({ fileName, error: 'File not found locally' });
            return;
          }
          
          console.log(`[OCR Process All] Processing: ${fileName}`);
          
          // Trigger OCR processing
          const ocrResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/api/ocr/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: filePath,
              fileName: fileName
            })
          });
          
          if (ocrResponse.ok) {
            const ocrResult = await ocrResponse.json();
            if (ocrResult.success) {
              console.log(`[OCR Process All] ✓ Successfully processed ${fileName}`);
              results.success.push({ fileName, textLength: ocrResult.textLength || 0 });
            } else {
              console.error(`[OCR Process All] ✗ Failed for ${fileName}:`, ocrResult.error);
              results.failed.push({ fileName, error: ocrResult.error || 'Unknown error' });
            }
          } else {
            const errorText = await ocrResponse.text();
            console.error(`[OCR Process All] ✗ Request failed for ${fileName}: ${ocrResponse.status}`);
            results.failed.push({ fileName, error: `HTTP ${ocrResponse.status}: ${errorText.substring(0, 100)}` });
          }
        } catch (error) {
          console.error(`[OCR Process All] ✗ Exception for ${fileName}:`, error.message);
          results.failed.push({ fileName, error: error.message });
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < unprocessedFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[OCR Process All] ===== Batch processing complete =====`);
    console.log(`[OCR Process All] Success: ${results.success.length}, Failed: ${results.failed.length}`);
    
    res.json({
      success: true,
      message: `Processed ${results.success.length} files successfully, ${results.failed.length} failed`,
      results: {
        success: results.success,
        failed: results.failed,
        total: results.total
      }
    });
  } catch (error) {
    console.error('[OCR Process All] Exception:', error);
    res.status(500).json({
      success: false,
      error: `Batch processing error: ${error.message}`
    });
  }
});

export default router;

