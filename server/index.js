// CRITICAL: Load environment variables FIRST before any other imports
import './config/env.js';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import searchRouter from './routes/search.js';
import ocrRouter from './routes/ocr.js';
import ddosRouter from './routes/ddos.js';

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

// Ensure DDoS system directories exist
const ddosSystemRoot = path.join(__dirname, '..', 'ddos_system', 'Application_Layer_DDOS');
const ddosDataDir = path.join(ddosSystemRoot, 'data');
const ddosModelDir = path.join(ddosSystemRoot, 'model');
[ddosDataDir, ddosModelDir].forEach((dir) => {
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

// Register routes with error handling
try {
  app.use('/api/auth', authRouter);
  console.log('✓ Registered /api/auth routes');
} catch (e) {
  console.error('✗ Failed to register auth routes:', e);
}

try {
  app.use('/api/files', filesRouter);
  console.log('✓ Registered /api/files routes');
} catch (e) {
  console.error('✗ Failed to register files routes:', e);
}

try {
  app.use('/api/search', searchRouter);
  console.log('✓ Registered /api/search routes');
} catch (e) {
  console.error('✗ Failed to register search routes:', e);
}

try {
  app.use('/api/ocr', ocrRouter);
  console.log('✓ Registered /api/ocr routes');
} catch (e) {
  console.error('✗ Failed to register OCR routes:', e);
}

try {
  app.use('/api/ddos', ddosRouter);
  console.log('✓ Registered /api/ddos routes');
} catch (e) {
  console.error('✗ Failed to register DDoS routes:', e);
}

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

app.listen(PORT, async () => {
  console.log(`CloudDrive-AI server running on port ${PORT}`);
  
  // Auto-process unprocessed files on startup
  (async () => {
    // Wait for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      console.log('\n[Startup] Checking for unprocessed files...');
      const response = await fetch(`http://localhost:${PORT}/api/ocr/process-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.results) {
          const { success, failed } = result.results;
          if (success.length > 0 || failed.length > 0) {
            console.log(`[Startup] Processed ${success.length} files, ${failed.length} failed`);
          } else {
            console.log('[Startup] All files are already processed');
          }
        }
      }
    } catch (error) {
      console.log('[Startup] Could not auto-process files (server may still be starting):', error.message);
    }
  })();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✗ Port ${PORT} is already in use!`);
    console.error(`\nTo fix this, run:\n  Get-Process node | Stop-Process -Force\n\nOr kill the process using port ${PORT}:\n  Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force\n`);
    process.exit(1);
  } else {
    throw err;
  }
});



