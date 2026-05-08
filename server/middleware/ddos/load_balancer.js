const CLUSTERS = ['cluster1', 'cluster2', 'cluster3'];

let nextIndex = 0;

export function getRoundRobinClusterOrder() {
  const start = nextIndex;
  nextIndex = (nextIndex + 1) % CLUSTERS.length;

  return CLUSTERS.map((_, offset) => CLUSTERS[(start + offset) % CLUSTERS.length]);
}

export function attachLoadBalancerMetadata(req) {
  const clusterOrder = getRoundRobinClusterOrder();
  req.ddosClusterOrder = clusterOrder;
  req.ddosLoadBalancer = {
    strategy: 'round-robin',
    clusterOrder,
    selectedCluster: clusterOrder[0]
  };
  return clusterOrder;
}