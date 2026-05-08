import { assessUserRisk, logUploadEvent } from '../../lib/ddos_service.js';

function createClusterState(clusterId) {
  return {
    clusterId,
    cache: new Map(),
    lastSweep: Date.now()
  };
}

function resolveUserId(req) {
  return String(
    req.user?.userId ||
    req.user?.id ||
    req.user?.sub ||
    req.headers['x-user-id'] ||
    req.headers['x-bot-id'] ||
    `ip_${req.ip || req.connection?.remoteAddress || '0.0.0.0'}`
  );
}

function resolveIpAddress(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.headers['x-bot-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    '0.0.0.0';
}

function makeCacheKey(userId, ipAddress) {
  return `${userId}:${ipAddress}`;
}

function sweepExpiredEntries(state, ttlMs) {
  const now = Date.now();
  if (now - state.lastSweep < ttlMs) return;
  state.lastSweep = now;

  for (const [key, value] of state.cache.entries()) {
    if (!value || now - value.timestamp > ttlMs) {
      state.cache.delete(key);
    }
  }
}

export function createDdosClusterMiddleware(clusterId) {
  const state = createClusterState(clusterId);
  const cacheTtlMs = 60 * 1000;

  return async function clusterMiddleware(req, _res, next) {
    try {
      const userId = resolveUserId(req);
      const ipAddress = resolveIpAddress(req);
      const cacheKey = makeCacheKey(userId, ipAddress);
      const isAttackSimulation = String(req.headers['x-attack-simulation'] || '').toLowerCase() === 'true';

      sweepExpiredEntries(state, cacheTtlMs);

      let decision = state.cache.get(cacheKey);
      const now = Date.now();

      if (isAttackSimulation || !decision || now - decision.timestamp > cacheTtlMs) {
        const risk = await assessUserRisk(userId, ipAddress);
        decision = {
          ...risk,
          clusterId,
          timestamp: now
        };
        if (!isAttackSimulation) {
          state.cache.set(cacheKey, decision);
        }
      }

      req.ddosClusters = req.ddosClusters || {};
      req.ddosClusters[clusterId] = decision;

      req.ddosClusterMeta = req.ddosClusterMeta || {};
      req.ddosClusterMeta[clusterId] = {
        userId,
        ipAddress,
        action: decision.action,
        anomaly_score: decision.anomaly_score,
        risk_level: decision.risk_level
      };

      req.ddosClusterLogs = req.ddosClusterLogs || [];
      req.ddosClusterLogs.push({
        clusterId,
        userId,
        ipAddress,
        action: decision.action,
        anomaly_score: decision.anomaly_score,
        risk_level: decision.risk_level
      });

      req.ddosLogEvent = async (event) => logUploadEvent(event);
      next();
    } catch (error) {
      req.ddosClusters = req.ddosClusters || {};
      req.ddosClusters[clusterId] = {
        status: 'error',
        action: 'ALLOW',
        risk_level: 'NORMAL',
        anomaly_score: 0,
        error: error.message,
        clusterId
      };
      next();
    }
  };
}

export function getClusterDecision(req, clusterId) {
  return req.ddosClusters?.[clusterId] || null;
}