import express from 'express';
import { listFiles } from '../lib/s3.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'clouddrive-ai';
    const contents = await listFiles(bucket);
    const results = contents
      .map((o) => o.Key)
      .filter((k) => (q ? k.toLowerCase().includes(q) : true))
      .map((name) => ({ id: name, name }));
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Search failed' });
  }
});

export default router;



