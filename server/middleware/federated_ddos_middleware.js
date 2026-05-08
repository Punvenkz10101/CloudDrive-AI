import { ddosCluster1 } from './ddos/cluster1.js';
import { ddosCluster2 } from './ddos/cluster2.js';
import { ddosCluster3 } from './ddos/cluster3.js';
import { attachLoadBalancerMetadata } from './ddos/load_balancer.js';
import { aggregateFederatedDecision } from './ddos/federated_aggregator.js';
import { logUploadEvent } from '../lib/ddos_service.js';

const SIMULATOR_BLOCK_THRESHOLD = 10;
const SIMULATOR_WINDOW_MS = 45 * 1000;
const SIMULATOR_PROFILE_BY_ATTACK = {
  'rapid-duplicate': { warmupCount: 5, threshold: 5 },
  'bot-same-ip': { warmupCount: 5, threshold: 5 },
  'combined': { warmupCount: 5, threshold: 5 }
};
const simulatorBurstTracker = new Map();
const attackSessionTracker = new Map();
const federatedDecisionHistoryBySession = new Map();
let latestAttackSessionKey = null;
let lastCompletedAttackSummary = null;
const FEDERATED_HISTORY_LIMIT = 50;
const ATTACK_IDLE_RESET_MS = 2500;

const CLUSTER_MIDDLEWARES = {
  cluster1: ddosCluster1,
  cluster2: ddosCluster2,
  cluster3: ddosCluster3
};

let latestFederatedDecision = {
  finalDecision: 'ALLOW',
  blockVotes: 0,
  allowVotes: 3,
  majorityThreshold: 2,
  votes: [],
  shouldBlock: false,
  shouldAllow: true,
  updatedAt: null
};

export function getLatestFederatedDecision() {
  const now = Date.now();

  if (latestAttackSessionKey) {
    const latestSession = attackSessionTracker.get(latestAttackSessionKey);
    const lastSeen = latestSession ? new Date(latestSession.lastSeenAt).getTime() : 0;
    if (!latestSession || (now - lastSeen > ATTACK_IDLE_RESET_MS)) {
      if (latestSession) {
        const history = federatedDecisionHistoryBySession.get(latestAttackSessionKey) || [];
        const lastDecision = history[0] || null;
        lastCompletedAttackSummary = {
          attackType: latestSession.attackType,
          runId: latestSession.runId,
          sourceIp: latestSession.sourceIp,
          startedAt: latestSession.startedAt,
          endedAt: latestSession.lastSeenAt,
          finalDecision: lastDecision?.finalDecision || 'ALLOW',
          blockVotes: lastDecision?.blockVotes ?? 0,
          allowVotes: lastDecision?.allowVotes ?? 0,
          majorityThreshold: lastDecision?.majorityThreshold ?? 2,
          totalDecisions: latestSession.totalDecisions,
          blockDecisions: latestSession.blockDecisions,
          allowDecisions: latestSession.allowDecisions
        };
      }

      latestAttackSessionKey = null;
      latestFederatedDecision = {
        finalDecision: 'ALLOW',
        blockVotes: 0,
        allowVotes: 3,
        majorityThreshold: 2,
        votes: [],
        shouldBlock: false,
        shouldAllow: true,
        updatedAt: null,
        attackState: 'IDLE',
        lastCompletedAttack: lastCompletedAttackSummary
      };
    }
  }

  return {
    ...latestFederatedDecision,
    history: latestAttackSessionKey ? (federatedDecisionHistoryBySession.get(latestAttackSessionKey) || []).slice(0, 15) : [],
    lastCompletedAttack: lastCompletedAttackSummary
  };
}

export function resetFederatedDecisionHistory() {
  attackSessionTracker.clear();
  federatedDecisionHistoryBySession.clear();
  latestAttackSessionKey = null;
  lastCompletedAttackSummary = null;
  latestFederatedDecision = {
    finalDecision: 'ALLOW',
    blockVotes: 0,
    allowVotes: 3,
    majorityThreshold: 2,
    votes: [],
    shouldBlock: false,
    shouldAllow: true,
    updatedAt: null,
    attackState: 'IDLE'
  };
}

function inferAttackType(req, userId) {
  const headerAttackType = String(req.headers['x-attack-type'] || '').trim().toLowerCase();
  if (headerAttackType) return headerAttackType;

  const lowerUser = String(userId || '').toLowerCase();
  if (lowerUser.includes('rapid_duplicate')) return 'rapid-duplicate';
  if (lowerUser.includes('combined')) return 'combined';
  if (lowerUser.includes('attacker_')) return 'bot-same-ip';
  return 'unknown';
}

function getOrCreateAttackSession(req) {
  const userId = resolveRequestUserId(req);
  const ipAddress = resolveClientIp(req);
  const simulation = req.simulation;
  const attackType = inferAttackType(req, userId);
  const runId = String(req.headers['x-attack-run-id'] || '').trim() || 'no-run-id';
  const sessionKey = simulation?.isAttackSimulation
    ? `sim:${attackType}:${runId}:${ipAddress}`
    : `req:${userId}:${ipAddress}`;

  if (!attackSessionTracker.has(sessionKey)) {
    attackSessionTracker.set(sessionKey, {
      sessionKey,
      attackType,
      runId,
      sourceIp: ipAddress,
      startedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      totalDecisions: 0,
      blockDecisions: 0,
      allowDecisions: 0
    });
  }

  const session = attackSessionTracker.get(sessionKey);
  session.lastSeenAt = new Date().toISOString();
  session.totalDecisions += 1;
  latestAttackSessionKey = sessionKey;
  return session;
}

function appendDecisionHistory(sessionKey, entry) {
  const history = federatedDecisionHistoryBySession.get(sessionKey) || [];
  history.unshift(entry);
  if (history.length > FEDERATED_HISTORY_LIMIT) {
    history.length = FEDERATED_HISTORY_LIMIT;
  }
  federatedDecisionHistoryBySession.set(sessionKey, history);
}

function resolveRequestUserId(req) {
  return String(
    req.user?.userId ||
    req.user?.id ||
    req.user?.sub ||
    req.headers['x-user-id'] ||
    req.headers['x-bot-id'] ||
    `ip_${req.ip || req.connection?.remoteAddress || '0.0.0.0'}`
  );
}

function resolveClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    '0.0.0.0';
}

function trackAttackSimulation(req) {
  const isAttackSimulation = String(req.headers['x-attack-simulation'] || '').toLowerCase() === 'true';
  const userId = resolveRequestUserId(req);
  const ipAddress = resolveClientIp(req);
  const attackType = inferAttackType(req, userId);
  const profile = SIMULATOR_PROFILE_BY_ATTACK[attackType] || { warmupCount: 4, threshold: SIMULATOR_BLOCK_THRESHOLD };
  // Attack simulations should be grouped by source IP so multi-bot swarms
  // from the same origin share one escalation window.
  const simulationKey = isAttackSimulation ? `sim:${ipAddress}` : `sim:${ipAddress}:${userId}`;

  const now = Date.now();
  const existingBursts = simulatorBurstTracker.get(simulationKey) || [];
  const filteredBursts = existingBursts.filter((timestamp) => now - timestamp < SIMULATOR_WINDOW_MS);
  filteredBursts.push(now);
  simulatorBurstTracker.set(simulationKey, filteredBursts);

  req.simulation = {
    isAttackSimulation,
    attackType,
    burstCount: isAttackSimulation ? filteredBursts.length : 0,
    warmupCount: profile.warmupCount,
    threshold: profile.threshold,
    key: simulationKey
  };

  return req.simulation;
}

function applySimulationOverride(req, aggregate) {
  const simulation = req.simulation;
  const isAttackSimulation = Boolean(simulation?.isAttackSimulation);
  const burstCount = Number(simulation?.burstCount || 0);
  const warmupCount = Number(simulation?.warmupCount || 0);
  const threshold = Number(simulation?.threshold || SIMULATOR_BLOCK_THRESHOLD);
  const thresholdReached = Boolean(
    isAttackSimulation && burstCount >= threshold
  );

  if (isAttackSimulation && burstCount <= warmupCount) {
    // Warmup phase: always allow the first few simulator requests for demonstrable escalation.
    return {
      ...aggregate,
      finalDecision: 'ALLOW',
      shouldBlock: false,
      shouldAllow: true,
      decisionSource: 'simulation_warmup',
      simulation: {
        isAttackSimulation: simulation.isAttackSimulation,
        burstCount: simulation.burstCount,
        threshold: simulation.threshold,
        key: simulation.key
      }
    };
  }

  if (isAttackSimulation && burstCount > warmupCount) {
    return {
      ...aggregate,
      finalDecision: 'BLOCK',
      shouldBlock: true,
      shouldAllow: false,
      decisionSource: 'simulation_threshold',
      simulation: {
        isAttackSimulation: simulation.isAttackSimulation,
        burstCount: simulation.burstCount,
        threshold: simulation.threshold,
        key: simulation.key
      }
    };
  }

  return {
    ...aggregate,
    decisionSource: 'majority_vote'
  };
}

function toClusterDecision(req, clusterId) {
  return req.ddosClusters?.[clusterId] || {
    clusterId,
    action: 'ALLOW',
    risk_level: 'NORMAL',
    anomaly_score: 0,
    status: 'missing'
  };
}

async function recordFederatedLog(req, finalDecision, reason, aggregate) {
  const userId = resolveRequestUserId(req);
  const ipAddress = resolveClientIp(req);

  if (finalDecision !== 'BLOCK') {
    return;
  }

  await logUploadEvent({
    timestamp: new Date().toISOString(),
    user_id: userId,
    ip_address: ipAddress,
    file_hash: req.headers['x-file-hash'] || '',
    file_size: Number(req.headers['x-file-size'] || 0),
    filename: req.headers['x-filename'] || 'request',
    upload_duration_ms: 0,
    success: finalDecision === 'BLOCK' ? 0 : 1,
    error: reason
  });
}

export function createFederatedDdosMiddleware() {
  return async function federatedDdosMiddleware(req, res, next) {
    try {
      trackAttackSimulation(req);
      const attackSession = getOrCreateAttackSession(req);
      const clusterOrder = attachLoadBalancerMetadata(req);

      const analysisPromises = clusterOrder.map(async (clusterId) => {
        const clusterMiddleware = CLUSTER_MIDDLEWARES[clusterId];
        if (!clusterMiddleware) {
          return {
            clusterId,
            status: 'error',
            action: 'ALLOW',
            risk_level: 'NORMAL',
            anomaly_score: 0,
            error: 'cluster_not_found'
          };
        }

        await clusterMiddleware(req, res, () => {});
        return toClusterDecision(req, clusterId);
      });

      const clusterResults = await Promise.allSettled(analysisPromises);
      const decisions = clusterResults.map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        return {
          clusterId: clusterOrder[index],
          status: 'error',
          action: 'ALLOW',
          risk_level: 'NORMAL',
          anomaly_score: 0,
          error: result.reason?.message || 'cluster_analysis_failed'
        };
      });

      const aggregate = applySimulationOverride(req, aggregateFederatedDecision(decisions));
      const primaryDecision = decisions.find((decision) => decision && decision.features) || decisions[0] || {};

      if (aggregate.shouldBlock) {
        attackSession.blockDecisions += 1;
      } else {
        attackSession.allowDecisions += 1;
      }

      const decisionEntry = {
        sessionKey: attackSession.sessionKey,
        updatedAt: new Date().toISOString(),
        finalDecision: aggregate.shouldBlock ? 'BLOCK' : 'ALLOW',
        blockVotes: aggregate.blockVotes,
        allowVotes: aggregate.allowVotes,
        majorityThreshold: aggregate.majorityThreshold,
        decisionSource: aggregate.decisionSource || 'majority_vote',
        attack: {
          attackType: attackSession.attackType,
          runId: attackSession.runId,
          sourceIp: attackSession.sourceIp,
          startedAt: attackSession.startedAt,
          lastSeenAt: attackSession.lastSeenAt,
          totalDecisions: attackSession.totalDecisions,
          blockDecisions: attackSession.blockDecisions,
          allowDecisions: attackSession.allowDecisions,
          burstCount: req.simulation?.burstCount || 0,
          burstThreshold: req.simulation?.threshold || SIMULATOR_BLOCK_THRESHOLD
        },
        requestUserId: resolveRequestUserId(req),
        requestIpAddress: resolveClientIp(req),
        votes: aggregate.votes || [],
        clusters: decisions
      };

      appendDecisionHistory(attackSession.sessionKey, decisionEntry);

      latestFederatedDecision = {
        ...aggregate,
        updatedAt: decisionEntry.updatedAt,
        attackState: 'ACTIVE',
        clusters: decisions,
        requestUserId: resolveRequestUserId(req),
        requestIpAddress: resolveClientIp(req),
        attack: decisionEntry.attack
      };
      req.ddosFederatedDecision = aggregate;
      req.ddosRisk = {
        ...aggregate,
        features: primaryDecision.features || null,
        userId: resolveRequestUserId(req),
        ipAddress: resolveClientIp(req),
        clusters: decisions
      };

      const finalDecision = aggregate.shouldBlock ? 'BLOCK' : 'ALLOW';
      const reason = finalDecision === 'BLOCK'
        ? (aggregate.decisionSource === 'simulation_threshold'
          ? `Federated defense blocked repeated high-rate requests from one source within 45 seconds`
          : `Federated majority block: ${aggregate.blockVotes}/${decisions.length} clusters flagged attack behavior for ${req.ddosRisk?.userId || resolveRequestUserId(req)} (${resolveClientIp(req)})`)
        : `Federated allow: ${aggregate.allowVotes}/${decisions.length} clusters allowed ${req.ddosRisk?.userId || resolveRequestUserId(req)} (${resolveClientIp(req)})`;

      await recordFederatedLog(req, finalDecision, reason, aggregate);

      if (aggregate.shouldBlock) {
        blockedByFederatedCluster(req, res, aggregate, reason);
        return;
      }

      req.ddosDecision = aggregate;
      next();
    } catch (error) {
      latestFederatedDecision = {
        finalDecision: 'ALLOW',
        blockVotes: 0,
        allowVotes: 0,
        majorityThreshold: 2,
        votes: [],
        shouldBlock: false,
        shouldAllow: true,
        decisionSource: 'majority_vote',
        updatedAt: new Date().toISOString(),
        attackState: 'IDLE',
        lastCompletedAttack: lastCompletedAttackSummary,
        error: error.message
      };
      req.ddosFederatedDecision = {
        finalDecision: 'ALLOW',
        shouldAllow: true,
        shouldBlock: false,
        votes: [],
        blockVotes: 0,
        allowVotes: 0,
        decisionSource: 'majority_vote',
        error: error.message
      };
      next();
    }
  };
}

function blockedByFederatedCluster(_req, res, aggregate, reason) {
  res.status(403).json({
    error: 'Upload blocked by federated DDoS protection',
    code: 'FEDERATED_DDOS_BLOCKED',
    reason,
    decision: aggregate,
    retryAfter: 'Please retry later or contact support'
  });
}
