import fs from 'fs';
import path from 'path';
import { getExtractedTextFromOCR } from './lib/ocr_content_loader.js';

async function run() {
  const query = "who are the authors of clouddrive ai paper";
  const queryLower = query.toLowerCase();
  
  const metadataFile = './storage/file-metadata.json';
  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  let allFileNames = Object.keys(metadata);
  
  console.log("Found metadata keys:", allFileNames);
  
  const fileContents = [];
  for (const fileName of allFileNames) {
    const fullContent = await getExtractedTextFromOCR(fileName);
    if (fullContent && fullContent.length > 50 &&
        !fullContent.includes('PDF content extraction not fully implemented')) {
      fileContents.push({ fileName, content: fullContent.toLowerCase(), original: fullContent });
    }
  }
  console.log("Files with content:", fileContents.length);
  
  const fileScores = [];
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
  
  const keywordMap = {
    'aptitude': ['aptitude', 'topics', 'questions', 'problems', 'chapters', 'topics', 'subjects', 'sections', 'areas'],
    'topics': ['topics', 'chapters', 'subjects', 'areas', 'sections', 'content', 'topics'],
    'questions': ['questions', 'problems', 'exercises', 'quiz', 'tests', 'problems'],
    'srn': ['srn', 'student', 'roll', 'number', 'registration'],
    'resume': ['resume', 'cv', 'profile', 'experience', 'skills'],
    'internship': ['internship', 'intern', 'job', 'position', 'role', 'jd', 'description']
  };
  
  const expandedQueryTerms = new Set(queryTerms);
  for (const term of queryTerms) {
    if (keywordMap[term]) {
      keywordMap[term].forEach(k => expandedQueryTerms.add(k));
    }
  }
  
  for (const file of fileContents) {
    const fileNameLower = file.fileName.toLowerCase();
    let score = 0;
    let matchCount = 0;
    
    for (const term of queryTerms) {
      if (fileNameLower.includes(term)) {
        score += 10;
        matchCount++;
      }
    }
    
    for (const term of expandedQueryTerms) {
      const count = (file.content.match(new RegExp(term, 'g')) || []).length;
      score += Math.min(count, 5);
      if (count > 0) matchCount++;
    }
    
    if (file.content.includes(queryLower)) {
      score += 15;
      matchCount++;
    }
    
    fileScores.push({ fileName: file.fileName, score, matchCount });
    console.log(`File: ${file.fileName}, Score: ${score}, MatchCount: ${matchCount}`);
  }
  
  fileScores.sort((a, b) => b.score - a.score);
  const relevantFileScores = fileScores.filter(f => f.score > 0);
  console.log("Relevant scores:", relevantFileScores);
  
  let filesToInclude;
  if (relevantFileScores.length === 0) {
    filesToInclude = fileScores.slice(0, 5);
  } else {
    filesToInclude = relevantFileScores.slice(0, 5);
  }
  
  console.log("Files to include length:", filesToInclude.length);
  const context = [];
  for (const file of filesToInclude) {
     const orig = fileContents.find(f => f.fileName === file.fileName).original;
     context.push(`File: ${file.fileName}\nDesc:\nOCR Content:\n${orig.substring(0, 100)}...`);
  }
  
  console.log("Context:\n", context.join('\n\n'));
}

run().catch(console.error);
