/**
 * DDoS Protection Middleware
 * Implements rate limiting, captcha validation, and blocking based on ML risk scores
 */

import { assessUserRisk, logUploadEvent } from '../lib/ddos_service.js';

// ... (existing imports and constants)
// In-memory store for user risk states and rate limits
// In production, use Redis or similar
const userRiskCache = new Map();
const rateLimitStore = new Map();
const blockedUsers = new Set();
const captchaRequired = new Set();

// Cache TTL (milliseconds)
const RISK_CACHE_TTL = 60000; // 1 minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// Rate limit thresholds
const RATE_LIMITS = {
  NORMAL: { maxRequests: 20, windowMs: 60000 },      // 20 requests per minute
  SUSPICIOUS: { maxRequests: 5, windowMs: 60000 },    // 5 requests per minute
  MALICIOUS: { maxRequests: 0, windowMs: 60000 }      // Blocked
};

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.ip || 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    '0.0.0.0';
}

/**
 * Check if user is blocked
 */
export function isUserBlocked(userId) {
  return blockedUsers.has(userId);
}

/**
 * Check if user requires captcha
 */
export function requiresCaptcha(userId) {
  return captchaRequired.has(userId);
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId, riskLevel) {
  const now = Date.now();
  const limit = RATE_LIMITS[riskLevel] || RATE_LIMITS.NORMAL;

  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, {
      requests: [],
      riskLevel
    });
  }

  const userLimit = rateLimitStore.get(userId);
  
  // Clean old requests outside window
  userLimit.requests = userLimit.requests.filter(
    timestamp => now - timestamp < limit.windowMs
  );

  // Update risk level if changed
  if (userLimit.riskLevel !== riskLevel) {
    userLimit.riskLevel = riskLevel;
    // Reset requests when risk level changes
    userLimit.requests = [];
  }

  // Check if limit exceeded
  if (userLimit.requests.length >= limit.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: userLimit.requests[0] + limit.windowMs
    };
  }

  // Add current request
  userLimit.requests.push(now);

  return {
    allowed: true,
    remaining: limit.maxRequests - userLimit.requests.length,
    resetAt: now + limit.windowMs
  };
}

/**
 * Main DDoS protection middleware
 */
export async function ddosProtection(req, res, next) {
  try {
    // Get user ID from auth token or use IP as fallback
    const userId = req.user?.userId || req.user?.id || `ip_${getClientIP(req)}`;
    const ipAddress = getClientIP(req);

    // Check if user is blocked
    if (isUserBlocked(userId)) {
      // Log the blocked attempt
      await logUploadEvent({
        timestamp: new Date().toISOString(),
        user_id: userId,
        ip_address: ipAddress,
        file_hash: '',
        file_size: 0,
        filename: 'blocked_request',
        success: 0,
        error: 'User Blocked'
      });

      return res.status(403).json({
        error: 'Account temporarily blocked due to suspicious activity',
        code: 'USER_BLOCKED',
        retryAfter: 'Please contact support or try again later'
      });
    }

    // Get cached risk or assess new risk
    let riskData = userRiskCache.get(userId);
    const now = Date.now();

    if (!riskData || (now - riskData.timestamp > RISK_CACHE_TTL)) {
      // Assess risk (async, but we wait for it)
      riskData = await assessUserRisk(userId, ipAddress);
      riskData.timestamp = now;
      userRiskCache.set(userId, riskData);
    }

    const { risk_level, action, anomaly_score } = riskData;

    // Update user status based on risk
    if (risk_level === 'MALICIOUS') {
      blockedUsers.add(userId);
      
      // Log the malicious block
      await logUploadEvent({
        timestamp: new Date().toISOString(),
        user_id: userId,
        ip_address: ipAddress,
        file_hash: '',
        file_size: 0,
        filename: 'malicious_block',
        success: 0,
        error: 'Malicious Risk Level'
      });

      return res.status(403).json({
        error: 'Request blocked by security system',
        code: 'MALICIOUS_DETECTED',
        anomaly_score: anomaly_score.toFixed(3)
      });
    }

    if (risk_level === 'SUSPICIOUS' || action === 'CAPTCHA') {
      captchaRequired.add(userId);
    }

    // Check rate limit
    const rateLimit = checkRateLimit(userId, risk_level);
    if (!rateLimit.allowed) {
      // Log rate limit block
      await logUploadEvent({
        timestamp: new Date().toISOString(),
        user_id: userId,
        ip_address: ipAddress,
        file_hash: '',
        file_size: 0,
        filename: 'rate_limit_block',
        success: 0,
        error: 'Rate Limit Exceeded'
      });

      const resetIn = Math.ceil((rateLimit.resetAt - now) / 1000);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS[risk_level]?.maxRequests || 20,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString()
        }
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': RATE_LIMITS[risk_level]?.maxRequests || 20,
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
      'X-Risk-Level': risk_level,
      'X-Anomaly-Score': anomaly_score?.toFixed(3) || '0.000'
    });

    // Attach risk data to request for use in routes
    req.ddosRisk = {
      risk_level,
      anomaly_score,
      action,
      requiresCaptcha: requiresCaptcha(userId)
    };

    next();
  } catch (err) {
    console.error('[DDoS] Protection middleware error:', err);
    // On error, allow request but log it
    req.ddosRisk = {
      risk_level: 'NORMAL',
      anomaly_score: 0,
      action: 'ALLOW',
      requiresCaptcha: false,
      error: err.message
    };
    next();
  }
}

/**
 * Captcha verification middleware
 */
export function requireCaptchaVerification(req, res, next) {
  const userId = req.user?.userId || req.user?.id || `ip_${getClientIP(req)}`;
  
  if (requiresCaptcha(userId)) {
    const captchaToken = req.headers['x-captcha-token'] || req.body?.captchaToken;
    
    if (!captchaToken) {
      return res.status(403).json({
        error: 'Captcha verification required',
        code: 'CAPTCHA_REQUIRED',
        requiresCaptcha: true
      });
    }

    // TODO: Verify captcha token with captcha service
    // For now, any token is accepted (implement proper verification)
    if (!captchaToken || captchaToken === 'invalid') {
      return res.status(403).json({
        error: 'Invalid captcha token',
        code: 'CAPTCHA_INVALID'
      });
    }

    // Captcha passed, remove from required list temporarily
    captchaRequired.delete(userId);
  }

  next();
}

/**
 * Cleanup old cache entries (run periodically)
 */
export function cleanupCache() {
  const now = Date.now();
  
  // Clean risk cache
  for (const [userId, data] of userRiskCache.entries()) {
    if (now - data.timestamp > RISK_CACHE_TTL * 10) {
      userRiskCache.delete(userId);
    }
  }

  // Clean rate limit store
  for (const [userId, data] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    const hasRecentRequests = data.requests.some(
      timestamp => now - timestamp < 3600000
    );
    if (!hasRecentRequests) {
      rateLimitStore.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);



