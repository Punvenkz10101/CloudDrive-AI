const MAJORITY_THRESHOLD = 2;

function toVote(decision) {
  if (!decision) {
    return { vote: 'ALLOW', reason: 'missing_cluster_response' };
  }

  const riskLevel = String(decision.risk_level || '').toUpperCase();
  const action = String(decision.action || '').toUpperCase();
  const anomalyScore = Number(decision.anomaly_score ?? 0);
  // Only cast a BLOCK vote for clearly malicious confidence.
  // Suspicious traffic should be throttled/challenged, not always hard-blocked.
  const isAttack =
    action === 'BLOCK' ||
    riskLevel === 'MALICIOUS' ||
    anomalyScore >= 0.85;

  return {
    vote: isAttack ? 'BLOCK' : 'ALLOW',
    clusterId: decision.clusterId,
    action,
    risk_level: riskLevel || 'NORMAL',
    anomaly_score: anomalyScore,
    error: decision.error || null
  };
}

export function aggregateFederatedDecision(decisions) {
  const votes = decisions.map(toVote);
  const blockVotes = votes.filter((vote) => vote.vote === 'BLOCK').length;
  const allowVotes = votes.filter((vote) => vote.vote === 'ALLOW').length;

  const finalDecision = blockVotes >= MAJORITY_THRESHOLD ? 'BLOCK' : 'ALLOW';

  return {
    finalDecision,
    blockVotes,
    allowVotes,
    majorityThreshold: MAJORITY_THRESHOLD,
    votes,
    shouldBlock: finalDecision === 'BLOCK',
    shouldAllow: finalDecision === 'ALLOW'
  };
}