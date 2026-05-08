import { getExtractedTextFromOCR } from './lib/ocr_content_loader.js';
import fs from 'fs';
import path from 'path';

async function test() {
  const meta = JSON.parse(fs.readFileSync('./storage/file-metadata.json', 'utf8'));
  const keys = Object.keys(meta);
  console.log("Keys:", keys);
  for (const k of keys) {
    const text = await getExtractedTextFromOCR(k);
    console.log(`Key: ${k}, Text length: ${text?.length}`);
  }
}
test().catch(console.error);
