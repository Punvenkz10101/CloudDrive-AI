/**
 * DDoS Detection Service
 * Integrates with Python ML prediction system for real-time anomaly detection
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to DDoS system components
const DDOS_SYSTEM_ROOT = path.join(__dirname, '..', '..', 'ddos_system', 'Application_Layer_DDOS');
const PREDICT_SCRIPT = path.join(DDOS_SYSTEM_ROOT, 'src', 'predict.py');
const FEATURE_EXTRACTOR_SCRIPT = path.join(DDOS_SYSTEM_ROOT, 'src', 'feature_extractor.py');
const DATA_DIR = path.join(DDOS_SYSTEM_ROOT, 'data');
const MODEL_DIR = path.join(DDOS_SYSTEM_ROOT, 'model');
const UPLOAD_LOGS_FILE = path.join(DATA_DIR, 'upload_logs.csv');

// Ensure directories exist
[DATA_DIR, MODEL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize upload logs CSV if it doesn't exist
if (!fs.existsSync(UPLOAD_LOGS_FILE)) {
  const csvHeader = 'timestamp,user_id,ip_address,file_hash,file_size,filename,upload_duration_ms,success,error\n';
  fs.writeFileSync(UPLOAD_LOGS_FILE, csvHeader);
}

/**
 * Generate SHA256 hash of file content
 */
export function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Log upload event to CSV for ML analysis
 */
export async function logUploadEvent(event) {
  const {
    timestamp,
    user_id,
    ip_address,
    file_hash,
    file_size,
    filename,
    upload_duration_ms = 0,
    success = 1,
    error = null
  } = event;

  const csvRow = [
    timestamp || new Date().toISOString(),
    user_id || 'unknown',
    ip_address || '0.0.0.0',
    file_hash || '',
    file_size || 0,
    filename || 'unknown',
    upload_duration_ms,
    success,
    error || ''
  ].join(',') + '\n';

  try {
    fs.appendFileSync(UPLOAD_LOGS_FILE, csvRow);
    return true;
  } catch (err) {
    console.error('[DDoS] Failed to log upload event:', err);
    return false;
  }
}

/**
 * Extract features for a single user from recent upload logs
 * This is a simplified real-time version of feature_extractor.py
 */
export async function extractUserFeatures(userId, timeWindowMinutes = 60) {
  try {
    if (!fs.existsSync(UPLOAD_LOGS_FILE)) {
      return getDefaultFeatures(userId);
    }

    const logs = fs.readFileSync(UPLOAD_LOGS_FILE, 'utf-8');
    const lines = logs.trim().split('\n');
    if (lines.length < 2) return getDefaultFeatures(userId); // Only header

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const userLogs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 9) continue;

      const logTime = new Date(cols[0]);
      const logUserId = cols[1];
      
      if (logUserId === userId && logTime >= cutoffTime) {
        userLogs.push({
          timestamp: logTime,
          user_id: logUserId,
          ip_address: cols[2],
          file_hash: cols[3],
          file_size: parseInt(cols[4]) || 0,
          filename: cols[5],
          upload_duration_ms: parseFloat(cols[6]) || 0,
          success: parseInt(cols[7]) || 0,
          error: cols[8] || ''
        });
      }
    }

    if (userLogs.length === 0) {
      return getDefaultFeatures(userId);
    }

    // Sort by timestamp
    userLogs.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate features
    const successfulLogs = userLogs.filter(log => log.success === 1);
    const totalUploads = userLogs.length;
    const successfulUploads = successfulLogs.length;

    // 1. Uploads per time window (5-minute rolling window)
    let maxUploadsPerWindow = 0;
    for (let i = 0; i < userLogs.length; i++) {
      const windowEnd = new Date(userLogs[i].timestamp.getTime() + 5 * 60 * 1000);
      const uploadsInWindow = userLogs.filter(log => 
        log.timestamp >= userLogs[i].timestamp && log.timestamp <= windowEnd
      ).length;
      maxUploadsPerWindow = Math.max(maxUploadsPerWindow, uploadsInWindow);
    }

    // 2. Duplicate file ratio
    const fileHashes = successfulLogs.map(log => log.file_hash).filter(Boolean);
    const uniqueHashes = new Set(fileHashes);
    const duplicateRatio = fileHashes.length > 0 
      ? (fileHashes.length - uniqueHashes.size) / fileHashes.length 
      : 0;

    // 3. Average file size
    const avgFileSize = successfulLogs.length > 0
      ? successfulLogs.reduce((sum, log) => sum + log.file_size, 0) / successfulLogs.length
      : 0;

    // 4. Upload failure rate
    const failureRate = totalUploads > 0 
      ? (totalUploads - successfulUploads) / totalUploads 
      : 0;

    // 5. Max file size
    const maxFileSize = successfulLogs.length > 0
      ? Math.max(...successfulLogs.map(log => log.file_size))
      : 0;

    // 6. Time between uploads (average seconds)
    let avgTimeBetween = 0;
    if (userLogs.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < userLogs.length; i++) {
        const diff = (userLogs[i].timestamp - userLogs[i-1].timestamp) / 1000; // seconds
        timeDiffs.push(diff);
      }
      avgTimeBetween = timeDiffs.reduce((sum, d) => sum + d, 0) / timeDiffs.length;
    }

    // 7. Total uploads
    const totalUploadsCount = totalUploads;

    // 8. Total bytes uploaded
    const totalBytes = successfulLogs.reduce((sum, log) => sum + log.file_size, 0);

    // 9. IP diversity
    const uniqueIPs = new Set(userLogs.map(log => log.ip_address));
    const ipDiversity = uniqueIPs.size;

    // 10. Unique file hashes
    const uniqueFileHashes = uniqueHashes.size;

    return {
      user_id: userId,
      uploads_per_time_window: maxUploadsPerWindow,
      duplicate_file_ratio: duplicateRatio,
      average_file_size: avgFileSize,
      upload_failure_rate: failureRate,
      max_file_size: maxFileSize,
      time_between_uploads_sec: avgTimeBetween,
      total_uploads: totalUploadsCount,
      total_bytes_uploaded: totalBytes,
      ip_diversity: ipDiversity,
      unique_file_hashes: uniqueFileHashes
    };
  } catch (err) {
    console.error('[DDoS] Error extracting user features:', err);
    return getDefaultFeatures(userId);
  }
}

function getDefaultFeatures(userId) {
  return {
    user_id: userId,
    uploads_per_time_window: 0,
    duplicate_file_ratio: 0,
    average_file_size: 0,
    upload_failure_rate: 0,
    max_file_size: 0,
    time_between_uploads_sec: 0,
    total_uploads: 0,
    total_bytes_uploaded: 0,
    ip_diversity: 1,
    unique_file_hashes: 0
  };
}

/**
 * Predict user risk using Python ML model
 * Returns: { anomaly_score, risk_level, is_anomaly, action }
 */
export async function predictUserRisk(userFeatures) {
  return new Promise((resolve, reject) => {
    // Check if model exists
    const modelFile = path.join(MODEL_DIR, 'isolation_forest.pkl');
    const scalerFile = path.join(MODEL_DIR, 'scaler.pkl');

    if (!fs.existsSync(modelFile) || !fs.existsSync(scalerFile)) {
      console.warn('[DDoS] Model files not found. Returning default safe response.');
      resolve({
        status: 'success',
        anomaly_score: 0.0,
        risk_level: 'NORMAL',
        is_anomaly: 0,
        action: 'ALLOW',
        message: 'Model not trained yet'
      });
      return;
    }

    // Create temporary features file
    const tempFeaturesFile = path.join(DATA_DIR, `temp_features_${Date.now()}.json`);
    fs.writeFileSync(tempFeaturesFile, JSON.stringify(userFeatures));

    // Create a Python script that will read features and predict
    const srcPath = path.join(DDOS_SYSTEM_ROOT, 'src').replace(/\\/g, '/');
    const predictScript = `
import sys
import json
import os

# Add src directory to Python path
sys.path.insert(0, r"${srcPath}")
sys.path.insert(0, r"${DDOS_SYSTEM_ROOT.replace(/\\/g, '/')}")

# Change to the DDoS system root directory for proper imports
os.chdir(r"${DDOS_SYSTEM_ROOT.replace(/\\/g, '/')}")

# Import predict functions from src module
try:
    from src.predict import predict_single_user, FEATURE_COLUMNS
except ImportError:
    # Fallback: try direct import if src is in path
    import importlib.util
    spec = importlib.util.spec_from_file_location("predict", r"${PREDICT_SCRIPT.replace(/\\/g, '/')}")
    predict_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(predict_module)
    predict_single_user = predict_module.predict_single_user
    FEATURE_COLUMNS = predict_module.FEATURE_COLUMNS

# Read features
with open(r"${tempFeaturesFile.replace(/\\/g, '/')}", 'r') as f:
    features = json.load(f)

# Ensure all required features are present
for col in FEATURE_COLUMNS:
    if col not in features:
        features[col] = 0

# Predict
result = predict_single_user(features)
print(json.dumps(result))
`;

    const pythonScript = path.join(DATA_DIR, `temp_predict_${Date.now()}.py`);
    fs.writeFileSync(pythonScript, predictScript);

    // Try to use virtual environment Python if available, otherwise use system Python
    const venvPython = path.join(DDOS_SYSTEM_ROOT, 'venv', 'Scripts', 'python.exe');
    const venvPythonUnix = path.join(DDOS_SYSTEM_ROOT, 'venv', 'bin', 'python3');
    let python = process.platform === 'win32' ? 'python' : 'python3';
    
    // Prefer venv Python if it exists
    if (process.platform === 'win32' && fs.existsSync(venvPython)) {
      python = venvPython;
    } else if (process.platform !== 'win32' && fs.existsSync(venvPythonUnix)) {
      python = venvPythonUnix;
    }

    const child = spawn(python, [pythonScript], {
      cwd: DDOS_SYSTEM_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: `${DDOS_SYSTEM_ROOT}${path.delimiter}${srcPath}` }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Cleanup temp files
      try {
        if (fs.existsSync(tempFeaturesFile)) fs.unlinkSync(tempFeaturesFile);
        if (fs.existsSync(pythonScript)) fs.unlinkSync(pythonScript);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code !== 0) {
        // If it's a module import error, provide helpful message
        if (stderr.includes('ModuleNotFoundError') || stderr.includes('No module named')) {
          console.warn('[DDoS] Python module import error. Model may not be trained or venv not activated.');
          console.warn('[DDoS] Run: cd ddos_system/Application_Layer_DDOS && .\\train_ddos_model.ps1');
          // Return safe default instead of failing
          resolve({
            status: 'success',
            anomaly_score: 0.0,
            risk_level: 'NORMAL',
            is_anomaly: 0,
            action: 'ALLOW',
            message: 'Python modules not available. Please train the model first.'
          });
          return;
        }
        console.error('[DDoS] Python prediction error:', stderr);
        // Still return safe default to avoid breaking uploads
        resolve({
          status: 'success',
          anomaly_score: 0.0,
          risk_level: 'NORMAL',
          is_anomaly: 0,
          action: 'ALLOW',
          message: 'Prediction error, using safe defaults'
        });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        
        // Determine action based on risk level
        let action = 'ALLOW';
        if (result.risk_level === 'MALICIOUS') {
          action = 'BLOCK';
        } else if (result.risk_level === 'SUSPICIOUS') {
          action = 'CAPTCHA';
        }

        // Add rate limiting suggestion for suspicious users
        if (result.anomaly_score > 0.7 && result.anomaly_score < 0.85) {
          action = 'RATE_LIMIT';
        }

        resolve({
          ...result,
          action
        });
      } catch (err) {
        reject(new Error(`Failed to parse prediction result: ${err.message}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
}

/**
 * Get user risk assessment (combines feature extraction + prediction)
 */
export async function assessUserRisk(userId, ipAddress) {
  try {
    // Extract features
    const features = await extractUserFeatures(userId);
    
    // Predict risk
    const prediction = await predictUserRisk(features);
    
    return {
      ...prediction,
      features,
      userId,
      ipAddress,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[DDoS] Risk assessment error:', err);
    return {
      status: 'error',
      risk_level: 'NORMAL',
      action: 'ALLOW',
      error: err.message
    };
  }
}

/**
 * Check if model is trained and ready
 */
export function isModelReady() {
  const modelFile = path.join(MODEL_DIR, 'isolation_forest.pkl');
  const scalerFile = path.join(MODEL_DIR, 'scaler.pkl');
  return fs.existsSync(modelFile) && fs.existsSync(scalerFile);
}


