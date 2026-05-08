/**
 * Federated DDoS Protection Middleware Entry Point
 * Routes requests through three independent ML clusters and a majority-vote aggregator.
 */

import jwt from 'jsonwebtoken';
import { createFederatedDdosMiddleware, getLatestFederatedDecision, resetFederatedDecisionHistory } from './federated_ddos_middleware.js';

const federatedDdosProtection = createFederatedDdosMiddleware();

const userRiskCache = new Map();
const rateLimitStore = new Map();
const blockedUsers = new Map();
const simulatorBurstTracker = new Map();
const USER_BLOCK_DURATION_MS = Number(process.env.USER_BLOCK_DURATION_MS || 10 * 60 * 1000);

let globalZeroTrustMode = false;
let lastZeroTrustCheck = Date.now();
const THREAT_CHECK_INTERVAL = 10 * 1000;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    '0.0.0.0';
}

function resolveRequestUserId(req) {
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId) return String(headerUserId);

  const authUser = req.user?.userId || req.user?.id || req.user?.sub || req.user?.email;
  if (authUser) return String(authUser);

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
      const payload = jwt.verify(token, secret);
      const tokenUser = payload?.userId || payload?.id || payload?.sub || payload?.email;
      if (tokenUser) return String(tokenUser);
    } catch {
      // Downstream auth middleware will enforce invalid tokens.
    }
  }

  return `ip_${getClientIP(req)}`;
}

function isPublicAuthRoute(req) {
  const routePath = String(req.originalUrl || req.baseUrl || req.path || '').toLowerCase();
  return routePath === '/api/auth/login' || routePath === '/api/auth/signup';
}

function updateZeroTrustMode() {
  const now = Date.now();
  if (now - lastZeroTrustCheck < THREAT_CHECK_INTERVAL) return;
  lastZeroTrustCheck = now;

  let highRiskUsers = 0;
  for (const risk of userRiskCache.values()) {
    if (now - risk.timestamp < 60 * 1000) {
      if (risk.risk_level === 'MALICIOUS' || risk.risk_level === 'SUSPICIOUS' || risk.anomaly_score > 0.4) {
        highRiskUsers++;
      }
    }
  }

  if (highRiskUsers >= 1) {
    if (!globalZeroTrustMode) {
      console.warn('[DDoS] SECURITY BREACH DETECTED: Activating GLOBAL ZERO TRUST MODE.');
    }
    globalZeroTrustMode = true;
    lastZeroTrustCheck = now;
    return;
  }

  if (globalZeroTrustMode && now - lastZeroTrustCheck > 60 * 1000) {
    console.log('[DDoS] Threat Level Normal. Deactivating Global Zero Trust.');
    globalZeroTrustMode = false;
  }
}

function cleanupCache() {
  const now = Date.now();

  for (const [userId, data] of userRiskCache.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) {
      userRiskCache.delete(userId);
    }
  }

  for (const [userId, data] of rateLimitStore.entries()) {
    const hasRecentRequests = Array.isArray(data.requests) && data.requests.some((timestamp) => now - timestamp < 60 * 60 * 1000);
    if (!hasRecentRequests) {
      rateLimitStore.delete(userId);
    }
  }

  // Drop expired temporary user blocks so users can recover automatically.
  for (const [userId, blockData] of blockedUsers.entries()) {
    if (!blockData || now >= blockData.blockedUntil) {
      blockedUsers.delete(userId);
    }
  }
}

setInterval(cleanupCache, 5 * 60 * 1000);

export function getZeroTrustMode() {
  return globalZeroTrustMode;
}

export function resetSecurityState() {
  userRiskCache.clear();
  rateLimitStore.clear();
  blockedUsers.clear();
  simulatorBurstTracker.clear();
  resetFederatedDecisionHistory();
  globalZeroTrustMode = false;
  lastZeroTrustCheck = Date.now();
  console.log('[DDoS] Federated security state has been reset by Administrator.');
}

export function setBotScore(userId, score) {
  const riskData = userRiskCache.get(userId) || { timestamp: Date.now() };
  riskData.bot_score = score;
  userRiskCache.set(userId, riskData);
}

export function recordSimulatedRisk(userId, riskData) {
  userRiskCache.set(userId, {
    ...riskData,
    timestamp: Date.now()
  });
  updateZeroTrustMode();
}

export function isUserBlocked(userId) {
  const blockData = blockedUsers.get(userId);
  if (!blockData) return false;

  if (Date.now() >= blockData.blockedUntil) {
    blockedUsers.delete(userId);
    return false;
  }

  return true;
}

function getBlockRemainingSeconds(userId) {
  const blockData = blockedUsers.get(userId);
  if (!blockData) return 0;
  return Math.max(1, Math.ceil((blockData.blockedUntil - Date.now()) / 1000));
}

export function getFederatedDdosState() {
  // Ensure expired blocks are cleaned before reporting dashboard state.
  const now = Date.now();
  for (const [userId, blockData] of blockedUsers.entries()) {
    if (!blockData || now >= blockData.blockedUntil) {
      blockedUsers.delete(userId);
    }
  }

  return {
    userRiskCacheSize: userRiskCache.size,
    rateLimitStoreSize: rateLimitStore.size,
    blockedUsersSize: blockedUsers.size,
    simulatorBurstSize: simulatorBurstTracker.size,
    zeroTrustMode: globalZeroTrustMode
  };
}

export function getFederatedDecisionSnapshot() {
  return getLatestFederatedDecision();
}

export async function ddosProtection(req, res, next) {
  const userId = resolveRequestUserId(req);

  // Keep login/signup reachable even if the current IP/user has been flagged.
  // The rest of the application remains protected by the federated gate.
  if (isPublicAuthRoute(req)) {
    return next();
  }

  if (isUserBlocked(userId)) {
    return res.status(403).json({
      error: 'Account temporarily blocked due to suspicious activity',
      code: 'USER_BLOCKED',
      retryAfter: getBlockRemainingSeconds(userId)
    });
  }

  const result = await federatedDdosProtection(req, res, next);

  if (req.ddosFederatedDecision?.shouldBlock || res.statusCode === 403) {
    blockedUsers.set(userId, {
      blockedAt: Date.now(),
      blockedUntil: Date.now() + USER_BLOCK_DURATION_MS
    });
    if (req.ddosRisk) {
      userRiskCache.set(userId, {
        ...req.ddosRisk,
        timestamp: Date.now()
      });
      updateZeroTrustMode();
    }
  }

  return result;
}




