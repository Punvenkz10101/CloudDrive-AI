/**
 * DDoS Detection API Routes
 * Provides endpoints for monitoring and managing DDoS protection
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  assessUserRisk, 
  extractUserFeatures,
  isModelReady,
  logUploadEvent 
} from '../lib/ddos_service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * Get DDoS system status and model information
 */
router.get('/status', async (req, res) => {
  try {
    const modelReady = isModelReady();
    
    // Get upload logs stats
    const ddosSystemRoot = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
    const uploadLogsFile = path.join(ddosSystemRoot, 'data', 'upload_logs.csv');
    
    let totalUploads = 0;
    let recentUploads = 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    if (fs.existsSync(uploadLogsFile)) {
      const logs = fs.readFileSync(uploadLogsFile, 'utf-8');
      const lines = logs.trim().split('\n');
      totalUploads = Math.max(0, lines.length - 1); // Exclude header
      
      // Count recent uploads (last 24 hours)
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length > 0) {
          try {
            const logTime = new Date(cols[0]).getTime();
            if (logTime > oneDayAgo) {
              recentUploads++;
            }
          } catch (e) {
            // Skip invalid timestamps
          }
        }
      }
    }
    
    res.json({
      modelReady,
      stats: {
        totalUploads,
        recentUploads24h: recentUploads,
        uploadLogsFile: fs.existsSync(uploadLogsFile) ? 'present' : 'missing'
      },
      features: {
        anomalyDetection: true,
        rateLimiting: true,
        captchaProtection: true,
        duplicateDetection: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user's risk assessment
 */
router.get('/my-risk', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '0.0.0.0';
    
    const riskAssessment = await assessUserRisk(userId, ipAddress);
    
    res.json(riskAssessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user features for analysis
 */
router.get('/my-features', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    const features = await extractUserFeatures(userId);
    
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recent security events/attacks detected
 */
router.get('/events', async (req, res) => {
  try {
    const ddosSystemRoot = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
    const uploadLogsFile = path.join(ddosSystemRoot, 'data', 'upload_logs.csv');
    const featuresFile = path.join(ddosSystemRoot, 'data', 'extracted_features.csv');
    
    const events = [];
    
    // Read upload logs to find suspicious patterns
    if (fs.existsSync(uploadLogsFile)) {
      const logs = fs.readFileSync(uploadLogsFile, 'utf-8');
      const lines = logs.trim().split('\n');
      
      // Group by user and detect patterns
      const userActivity = {};
      const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 9) continue;
        
        try {
          const timestamp = new Date(cols[0]).getTime();
          if (timestamp < last24Hours) continue;
          
          const userId = cols[1];
          const fileSize = parseInt(cols[4]) || 0;
          const success = parseInt(cols[7]) || 0;
          
          if (!userActivity[userId]) {
            userActivity[userId] = {
              userId,
              uploadCount: 0,
              totalSize: 0,
              failures: 0,
              timestamps: []
            };
          }
          
          userActivity[userId].uploadCount++;
          userActivity[userId].totalSize += fileSize;
          userActivity[userId].timestamps.push(timestamp);
          if (success === 0) userActivity[userId].failures++;
        } catch (e) {
          // Skip invalid entries
        }
      }
      
      // Detect suspicious patterns
      for (const [userId, activity] of Object.entries(userActivity)) {
        const avgTimeBetween = activity.timestamps.length > 1
          ? (activity.timestamps[activity.timestamps.length - 1] - activity.timestamps[0]) / (activity.timestamps.length - 1)
          : 0;
        
        const isSuspicious = 
          activity.uploadCount > 10 || // Too many uploads
          activity.totalSize > 100 * 1024 * 1024 || // >100MB
          (activity.uploadCount > 5 && avgTimeBetween < 5000) || // Rapid uploads
          activity.failures > activity.uploadCount * 0.5; // High failure rate
        
        if (isSuspicious) {
          events.push({
            type: 'SUSPICIOUS_ACTIVITY',
            userId,
            timestamp: new Date(Math.max(...activity.timestamps)).toISOString(),
            severity: 'medium',
            details: {
              uploadCount: activity.uploadCount,
              totalSize: activity.totalSize,
              failures: activity.failures,
              avgTimeBetween: Math.round(avgTimeBetween / 1000) + 's'
            }
          });
        }
      }
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      events: events.slice(0, 50), // Return last 50 events
      total: events.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get attack statistics and analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const ddosSystemRoot = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
    const uploadLogsFile = path.join(ddosSystemRoot, 'data', 'upload_logs.csv');
    
    const stats = {
      totalUsers: 0,
      totalUploads: 0,
      totalSize: 0,
      averageFileSize: 0,
      duplicateRate: 0,
      failureRate: 0,
      uploadsByHour: {},
      topUsers: []
    };
    
    if (fs.existsSync(uploadLogsFile)) {
      const logs = fs.readFileSync(uploadLogsFile, 'utf-8');
      const lines = logs.trim().split('\n');
      
      const userStats = {};
      const fileHashes = new Set();
      let totalHashes = 0;
      let failures = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 9) continue;
        
        try {
          const timestamp = new Date(cols[0]);
          const userId = cols[1];
          const fileHash = cols[3];
          const fileSize = parseInt(cols[4]) || 0;
          const success = parseInt(cols[7]) || 0;
          
          // User stats
          if (!userStats[userId]) {
            userStats[userId] = {
              uploads: 0,
              totalSize: 0
            };
          }
          userStats[userId].uploads++;
          userStats[userId].totalSize += fileSize;
          
          // Global stats
          stats.totalUploads++;
          stats.totalSize += fileSize;
          if (success === 0) failures++;
          
          // Duplicate detection
          if (fileHash) {
            totalHashes++;
            if (fileHashes.has(fileHash)) {
              stats.duplicateRate++;
            }
            fileHashes.add(fileHash);
          }
          
          // Hourly breakdown
          const hour = timestamp.toISOString().substring(0, 13);
          stats.uploadsByHour[hour] = (stats.uploadsByHour[hour] || 0) + 1;
        } catch (e) {
          // Skip invalid entries
        }
      }
      
      stats.totalUsers = Object.keys(userStats).length;
      stats.averageFileSize = stats.totalUploads > 0 ? stats.totalSize / stats.totalUploads : 0;
      stats.duplicateRate = totalHashes > 0 ? stats.duplicateRate / totalHashes : 0;
      stats.failureRate = stats.totalUploads > 0 ? failures / stats.totalUploads : 0;
      
      // Top users by upload count
      stats.topUsers = Object.entries(userStats)
        .map(([userId, data]) => ({
          userId,
          uploads: data.uploads,
          totalSize: data.totalSize
        }))
        .sort((a, b) => b.uploads - a.uploads)
        .slice(0, 10);
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get blocked attacks (success=0)
 */
router.get('/blocked', async (req, res) => {
  try {
    const ddosSystemRoot = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
    const uploadLogsFile = path.join(ddosSystemRoot, 'data', 'upload_logs.csv');
    
    const blockedEvents = [];
    
    if (fs.existsSync(uploadLogsFile)) {
      const logs = fs.readFileSync(uploadLogsFile, 'utf-8');
      const lines = logs.trim().split('\n');
      
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      
      for (let i = lines.length - 1; i > 0; i--) {
        const cols = lines[i].split(',');
        if (cols.length < 9) continue;
        
        try {
          const timestamp = new Date(cols[0]).getTime();
          // if (timestamp < oneHourAgo) break; // Optimization: only check last hour
          
          const success = parseInt(cols[7]) || 0;
          
          if (success === 0) {
            blockedEvents.push({
              timestamp: cols[0],
              userId: cols[1],
              ipAddress: cols[2], 
              fileSize: parseInt(cols[4]) || 0,
              reason: 'Anomaly Detected', // In real system, we'd log the specific reason
              error: cols[8] || 'Blocked by DDoS Protection'
            });
            
            if (blockedEvents.length >= 50) break; // Limit to 50
          }
        } catch (e) {
          // Skip
        }
      }
    }
    
    res.json(blockedEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get users who have been blocked
 */
router.get('/blocked-users', async (req, res) => {
  try {
    const ddosSystemRoot = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
    const uploadLogsFile = path.join(ddosSystemRoot, 'data', 'upload_logs.csv');
    
    const blockedUsers = [];
    
    if (fs.existsSync(uploadLogsFile)) {
      const logs = fs.readFileSync(uploadLogsFile, 'utf-8');
      const lines = logs.trim().split('\n');
      
      const userBlockStats = {};
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 9) continue;
        
        try {
          const timestamp = new Date(cols[0]).getTime();
          if (timestamp < oneDayAgo) continue;
          
          const userId = cols[1];
          const success = parseInt(cols[7]) || 0;
          
          if (success === 0) {
            if (!userBlockStats[userId]) {
              userBlockStats[userId] = {
                userId,
                blockCount: 0,
                lastBlocked: 0,
                ipAddress: cols[2]
              };
            }
            userBlockStats[userId].blockCount++;
            userBlockStats[userId].lastBlocked = Math.max(userBlockStats[userId].lastBlocked, timestamp);
          }
        } catch (e) {
          // Skip
        }
      }
      
      // Convert to array
      for (const stats of Object.values(userBlockStats)) {
        blockedUsers.push({
          userId: stats.userId,
          blockCount: stats.blockCount,
          lastBlocked: new Date(stats.lastBlocked).toISOString(),
          ipAddress: stats.ipAddress,
          status: 'Restricted'
        });
      }
      
      // Sort by most blocks
      blockedUsers.sort((a, b) => b.blockCount - a.blockCount);
    }
    
    res.json(blockedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;



