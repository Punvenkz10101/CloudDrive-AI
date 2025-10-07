import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import searchRouter from './routes/search.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Ensure storage directories exist
const storageBase = path.join(__dirname, 'storage');
const filesDir = path.join(storageBase, 'files');
const quarantineDir = path.join(storageBase, 'quarantine');
[storageBase, filesDir, quarantineDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Attach storage paths for routers
app.use((req, _res, next) => {
  req.storagePaths = { storageBase, filesDir, quarantineDir };
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'clouddrive-ai', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/search', searchRouter);

// Serve downloads statically (validated paths handled in router)
app.use('/downloads', express.static(filesDir));

// Serve frontend build if present (for hosting in one app)
const webRoot = path.join(__dirname, '..', 'dist');
if (fs.existsSync(webRoot)) {
  app.use(express.static(webRoot));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webRoot, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`CloudDrive-AI server running on port ${PORT}`);
});



