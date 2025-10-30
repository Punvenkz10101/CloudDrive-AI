import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get full extracted text from OCR processing
 * Searches multiple locations for the extracted text file
 */
export async function getExtractedTextFromOCR(fileName) {
  try {
    console.log(`[OCR Loader] Looking for content for: ${fileName}`);
    
    // 1. Check main metadata file first (most reliable)
    const mainMetadataFile = path.join(__dirname, '..', 'storage', 'file-metadata.json');
    if (fs.existsSync(mainMetadataFile)) {
      const mainMetadata = JSON.parse(fs.readFileSync(mainMetadataFile, 'utf-8'));
      if (mainMetadata[fileName]) {
        // Check if we have a path to full content
        if (mainMetadata[fileName].fullContentPath) {
          let contentPath = mainMetadata[fileName].fullContentPath;
          
          // Handle relative paths
          if (!path.isAbsolute(contentPath)) {
            const normalizedPath = contentPath.replace(/\\/g, '/');
            const possiblePaths = [
              path.join(__dirname, '..', normalizedPath),
              path.join(__dirname, '..', 'extracted_text', path.basename(normalizedPath)),
              path.join(__dirname, '..', contentPath.replace(/\\/g, path.sep))
            ];
            
            for (const testPath of possiblePaths) {
              if (fs.existsSync(testPath)) {
                contentPath = testPath;
                break;
              }
            }
          }
          
          if (fs.existsSync(contentPath)) {
            const content = fs.readFileSync(contentPath, 'utf-8');
            if (content && content.length > 50) {
              console.log(`[OCR Loader] ✓ Loaded ${content.length} chars from: ${contentPath}`);
              return content;
            }
          }
        }
        
        // Otherwise use content from metadata
        if (mainMetadata[fileName].content && mainMetadata[fileName].content.length > 50 &&
            !mainMetadata[fileName].content.includes('PDF content extraction not fully implemented')) {
          console.log(`[OCR Loader] ✓ Found ${mainMetadata[fileName].content.length} chars in metadata`);
          return mainMetadata[fileName].content;
        }
      }
    }
    
    // 2. Check OCR extracted_text directory
    const extractedTextDir = path.join(__dirname, '..', 'extracted_text');
    if (fs.existsSync(extractedTextDir) && fs.statSync(extractedTextDir).isDirectory()) {
      const fileStem = path.parse(fileName).name;
      const fileNameLower = fileName.toLowerCase();
      
      // Try multiple naming patterns
      const possiblePaths = [
        path.join(extractedTextDir, `${fileName}_extracted.txt`),
        path.join(extractedTextDir, `${fileStem}_extracted.txt`),
        path.join(extractedTextDir, `${fileStem}.txt`)
      ];
      
      for (const textPath of possiblePaths) {
        if (fs.existsSync(textPath)) {
          const content = fs.readFileSync(textPath, 'utf-8');
          if (content && content.length > 50) {
            console.log(`[OCR Loader] ✓ Found content at: ${textPath}`);
            return content;
          }
        }
      }
      
      // Search all files in directory
      try {
        const files = fs.readdirSync(extractedTextDir);
        const fileStemLower = fileStem.toLowerCase();
        
        for (const file of files) {
          if (!file.endsWith('.txt') || !file.includes('_extracted')) continue;
          
          const extractedFilename = file.replace('_extracted.txt', '').toLowerCase();
          if (extractedFilename === fileNameLower.replace(/\.(pdf|jpg|jpeg|png)$/i, '') ||
              extractedFilename.includes(fileStemLower) ||
              fileNameLower.includes(extractedFilename)) {
            const textPath = path.join(extractedTextDir, file);
            const content = fs.readFileSync(textPath, 'utf-8');
            if (content && content.length > 50) {
              console.log(`[OCR Loader] ✓ Found by search: ${file}`);
              return content;
            }
          }
        }
      } catch (dirError) {
        console.error(`[OCR Loader] Error reading directory: ${dirError.message}`);
      }
    }
    
    console.log(`[OCR Loader] ✗ No content found for ${fileName}`);
    return '';
  } catch (error) {
    console.error(`[OCR Loader] Error:`, error);
    return '';
  }
}




