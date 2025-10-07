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
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
    await ensureBucket(bucket);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    const scan = fakeMalwareScan(unique);
    let status = 'Clean';
    let blobName = unique;
    if (scan === 'infected') {
      status = 'Quarantined';
      blobName = `quarantine/${unique}`;
    }
    await uploadBuffer(bucket, blobName, file.buffer, file.mimetype);
    const url = await presignUrl(bucket, blobName, 1800);
    res.json({ id: blobName, name: file.originalname, size: file.size, status, downloadUrl: url });
  } catch (e) {
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



