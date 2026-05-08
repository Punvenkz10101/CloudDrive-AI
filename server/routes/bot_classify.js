import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { setBotScore } from '../middleware/ddos_protection.js';

const router = express.Router();

/**
 * Endpoint to receive mouse/click/scroll metrics and evaluate a probability score
 * 0.0 = Human, 1.0 = Bot
 */
router.post('/', (req, res) => {
  try {
    const { mouseSpeed = 0, clickFrequency = 0, scrollFrequency = 0, duration = 0 } = req.body || {};
    
    // Safety check
    if (!duration || duration < 1) return res.json({ botProbability: 0.1, message: 'Minimal interaction tracked' });

    let botScore = 0.0;

    // Zero or near-zero mouse movement usually indicates a bot just running API requests
    // but we have to be careful if they simply are reading a page (hence scroll checking)
    if (mouseSpeed < 0.5 && scrollFrequency < 0.1 && clickFrequency > 0.5) {
      botScore += 0.6; // High clicks, no movement = bot
    }
    
    if (mouseSpeed > 100) {
      botScore += 0.4; // Extreme erratic unnatural speed
    }

    if (clickFrequency > 5.0) {
      botScore += 0.5; // Clicking > 5 times a second steadily
    }
    
    // In a real impl, this would be a LogisticRegression.predict_proba() from sklearn
    const finalScore = Math.min(1.0, Math.max(0.0, botScore));
    
    // We could store it in Redis or memory against user session to be utilized by DDoS protection
    if (req.user && (req.user.userId || req.user.id)) {
       const userId = req.user.userId || req.user.id;
       setBotScore(userId, finalScore);
    } else if (req.headers['x-user-id']) {
       setBotScore(req.headers['x-user-id'], finalScore);
    } else {
       const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
       setBotScore(`ip_${ip}`, finalScore);
    }

    res.json({ botProbability: finalScore, message: 'Classification logged' });
  } catch (err) {
    console.error('[Bot Classify] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
