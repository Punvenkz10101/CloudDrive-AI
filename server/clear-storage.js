import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'storage', 'files');
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).forEach(file => {
    try {
      fs.unlinkSync(path.join(dir, file));
    } catch(e) {}
  });
}
const meta = path.join(__dirname, 'storage', 'file-metadata.json');
if(fs.existsSync(meta)) {
    fs.writeFileSync(meta, '{}');
}
console.log('Storage cleared!');
