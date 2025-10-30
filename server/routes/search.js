import express from 'express';
import { listFiles } from '../lib/s3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getExtractedTextFromOCR } from '../lib/ocr_content_loader.js';
import { getAIAnswer } from '../lib/gemini_ai.js';

// Use native fetch (Node.js 18+) or fallback
// For older Node versions: npm install node-fetch@2
const fetchFn = typeof globalThis.fetch !== 'undefined' 
  ? globalThis.fetch 
  : async (url, options) => {
      const http = await import('http');
      const { URL } = await import('url');
      const urlObj = new URL(url);
      return new Promise((resolve, reject) => {
        const req = http.request(urlObj, { 
          method: options?.method || 'GET', 
          headers: options?.headers || {} 
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data),
              text: async () => data
            });
          });
        });
        req.on('error', reject);
        if (options?.body) req.write(options.body);
        req.end();
      });
    };

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Log when router is loaded
console.log('[Search Router] Route module loaded');

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Search router is working!', timestamp: new Date().toISOString() });
});

// File metadata storage
const metadataFile = path.join(__dirname, '..', 'storage', 'file-metadata.json');

function readFileMetadata() {
  if (!fs.existsSync(metadataFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
  } catch {
    return {};
  }
}

function writeFileMetadata(metadata) {
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
}

// Basic search endpoint
router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai-storage';
    const contents = await listFiles(bucket);
    const metadata = readFileMetadata();
    
    let results = contents.map((o) => {
      const fileName = o.Key;
      const fileMetadata = metadata[fileName] || {};
      return {
        id: fileName,
        name: path.basename(fileName),
        description: fileMetadata.description || '',
        content: fileMetadata.content || '',
        mimeType: fileMetadata.mimeType || ''
      };
    });
    
    // Enhanced search with content matching
    if (q) {
      results = results.filter(file => {
        const nameMatch = file.name.toLowerCase().includes(q);
        const descMatch = file.description.toLowerCase().includes(q);
        const contentMatch = file.content.toLowerCase().includes(q);
        return nameMatch || descMatch || contentMatch;
      });
    }
    
    res.json({ results });
  } catch (e) {
    console.error('Search API Error:', e);
    res.status(500).json({ error: (e && e.message) || 'Search failed' });
  }
});

// AI-powered answer endpoint using Gemini
router.post('/ai', async (req, res) => {
  console.log('[Search Router] POST /ai called', { body: req.body });
  try {
    const { query, type = 'answer' } = req.body;
    
    if (!query) {
      console.log('[Search Router] Missing query parameter');
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (type === 'answer') {
      // Get all files and their OCR content
      const metadata = readFileMetadata();
      let allFileNames = Object.keys(metadata);
      
      // Also get files from S3
      try {
        const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai-storage';
        const contents = await listFiles(bucket);
        const s3FileNames = contents.map(f => f.Key);
        const allFilesSet = new Set([...allFileNames, ...s3FileNames]);
        allFileNames = Array.from(allFilesSet);
      } catch (error) {
        console.log('Could not list S3 files, using metadata only:', error.message);
      }
      
      if (allFileNames.length === 0) {
        return res.json({
          success: true,
          answer: {
            answer: "No documents found. Please upload some documents first.",
            sources: [],
            sourceFiles: []
          },
          question: query
        });
      }
      
      const queryLower = query.toLowerCase();
      const context = [];
      const relevantFiles = [];
      
      // Get ALL file contents first for better relevance checking
      const fileContents = [];
      for (const fileName of allFileNames) {
        const fullContent = await getExtractedTextFromOCR(fileName);
        if (fullContent && fullContent.length > 50 &&
            !fullContent.includes('PDF content extraction not fully implemented')) {
          fileContents.push({ fileName, content: fullContent.toLowerCase(), original: fullContent });
        }
      }
      
      console.log(`[Search] Analyzing ${fileContents.length} files for relevance to: "${query}"`);
      
      // Score files by relevance (count matching query terms)
      const fileScores = [];
      const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
      
      // Create expanded keyword mapping for better matching
      const keywordMap = {
        'aptitude': ['aptitude', 'topics', 'questions', 'problems', 'chapters', 'topics', 'subjects', 'sections', 'areas'],
        'topics': ['topics', 'chapters', 'subjects', 'areas', 'sections', 'content', 'topics'],
        'questions': ['questions', 'problems', 'exercises', 'quiz', 'tests', 'problems'],
        'srn': ['srn', 'student', 'roll', 'number', 'registration'],
        'resume': ['resume', 'cv', 'profile', 'experience', 'skills'],
        'internship': ['internship', 'intern', 'job', 'position', 'role', 'jd', 'description']
      };
      
      // Expand query terms with related keywords
      const expandedQueryTerms = new Set(queryTerms);
      for (const term of queryTerms) {
        if (keywordMap[term]) {
          keywordMap[term].forEach(k => expandedQueryTerms.add(k));
        }
      }
      
      for (const file of fileContents) {
        const fileData = metadata[file.fileName] || {};
        const fileNameLower = file.fileName.toLowerCase();
        
        let score = 0;
        let matchCount = 0;
        
        // Check filename matches with original terms
        for (const term of queryTerms) {
          if (fileNameLower.includes(term)) {
            score += 10; // Higher weight for filename match
            matchCount++;
          }
        }
        
        // Check content matches with BOTH original and expanded terms
        for (const term of expandedQueryTerms) {
          const count = (file.content.match(new RegExp(term, 'g')) || []).length;
          score += Math.min(count, 5); // Cap at 5 matches per term
          if (count > 0) matchCount++;
        }
        
        // Check if entire phrase exists in content
        if (file.content.includes(queryLower)) {
          score += 15; // Bonus for exact phrase match
          matchCount++;
        }
        
        fileScores.push({ 
          fileName: file.fileName, 
          original: file.original, 
          score, 
          matchCount,
          fileData 
        });
      }
      
      // Sort by relevance score
      fileScores.sort((a, b) => b.score - a.score);
      
      // ONLY include files with non-zero scores (files that actually match)
      const relevantFileScores = fileScores.filter(f => f.score > 0);
      
      console.log(`[Search] Found ${relevantFileScores.length} relevant files out of ${fileScores.length} total files`);
      
      // If no files matched, use ALL files (fallback to searching everything)
      let filesToInclude;
      if (relevantFileScores.length === 0) {
        console.log(`[Search] No files matched the query "${query}", searching ALL files as fallback`);
        filesToInclude = fileScores.slice(0, 5); // Use top 5 files by default even if no matches
      } else {
        // Limit to top 5 most relevant files
        filesToInclude = relevantFileScores.slice(0, 5);
      }
      
      console.log(`[Search] Including top ${filesToInclude.length} relevant files`);
      for (const file of filesToInclude) {
        const contentSnippet = file.original.length > 10000 
          ? file.original.substring(0, 10000) + '\n...[Content continues]...'
          : file.original;
        
        relevantFiles.push(file.fileName);
        context.push(`File: ${file.fileName}\nDescription: ${file.fileData.description || ''}\nOCR Content:\n${contentSnippet}`);
        console.log(`✓ Added ${file.original.length} chars from ${file.fileName} (score: ${file.score})`);
      }
      
      // At this point, we have relevant files with matching content
      // No need to fall back to showing all files - we only show matched ones
      
      // Use Gemini AI to generate answer with client-side retry handling
      console.log(`[Gemini] Generating answer for query with ${context.length} files`);
      let aiAnswer;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          aiAnswer = await getAIAnswer(query, context.join('\n\n'));
          break; // Success, exit loop
        } catch (error) {
          const errorMsg = error.message || String(error);
          retryCount++;
          
          // Check if it's a rate limit error
          if (errorMsg.includes('RATE_LIMIT') || errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('Resource exhausted')) {
            if (retryCount < maxRetries) {
              const delay = 2000 * retryCount; // 2s, 4s, 6s
              console.log(`[Search] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              // After all retries, return user-friendly message
              aiAnswer = `⚠️ **Rate Limit Reached**\n\nThe AI service is currently experiencing high demand. The system tried ${maxRetries} times with delays.\n\n**What you can do:**\n1. **Wait 1-2 minutes** and try again\n2. Check your API quota at https://console.cloud.google.com\n3. The rate limit resets automatically\n\nYour question was: "${query}"`;
              break;
            }
          } else {
            // Not a rate limit error, throw it
            throw error;
          }
        }
      }
      
      // Only include files with actual matches (score > 0) in the source files
      const matchedFiles = filesToInclude.filter(f => f.score > 0).map(f => f.fileName);
      
      res.json({
        success: true,
        answer: {
          answer: aiAnswer,
          sources: relevantFiles,
          sourceFiles: matchedFiles.map(fileName => {
            const fileData = metadata[fileName] || {};
            return {
              fileName: fileName,
              description: fileData.description || path.basename(fileName),
              downloadUrl: `/downloads/${fileName}`
            };
          })
        },
        question: query
      });
    } else {
      res.status(400).json({ error: 'Invalid type. Use "answer"' });
    }
  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({ error: 'AI search failed: ' + error.message });
  }
});

// Store file metadata
router.post('/metadata', async (req, res) => {
  try {
    const { fileName, description, content, mimeType } = req.body;
    const metadata = readFileMetadata();
    metadata[fileName] = { 
      description, 
      content: content?.substring(0, 15000) || '', 
      mimeType, 
      updatedAt: new Date().toISOString() 
    };
    writeFileMetadata(metadata);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to store metadata' });
  }
});

export default router;
