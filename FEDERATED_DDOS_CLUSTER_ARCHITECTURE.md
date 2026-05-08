# CloudDrive-AI Federated Clustered DDoS Architecture

This document defines an updated DDoS protection layer for CloudDrive-AI that replaces the single central detector with three independently running ML clusters, a round-robin load balancer, and a federated decision aggregator.

## Architecture Diagram

```text
User / React Frontend
        |
        v
API Gateway
        |
        v
Load Balancer
  (round-robin request distribution)
        |
        +-------------------+-------------------+-------------------+
        |                   |                   |
        v                   v                   v
DDoS ML Cluster 1     DDoS ML Cluster 2     DDoS ML Cluster 3
(Isolation Forest)     (Isolation Forest)    (Isolation Forest)
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
             Federated Decision Aggregator
                 Majority vote: 2 of 3
                            |
                 +----------+----------+
                 |                     |
                 v                     v
           Block request        Allow request
                                      |
                                      v
                              Express Backend
                                      |
                                      v
                               OCR Pipeline
                                      |
                                      v
                               Storage Layer
```

## Data Flow

1. The React frontend submits upload or API traffic to the API gateway.
2. The API gateway routes security-sensitive traffic to the DDoS protection layer before the Express backend.
3. The load balancer distributes each request-analysis job in round-robin order across the three DDoS ML clusters.
4. Each cluster runs the same Isolation Forest-based detection algorithm, but each analyzes the request independently.
5. Every cluster returns a verdict such as allow, suspicious, or block, along with its anomaly score.
6. The federated decision aggregator collects all three verdicts.
7. If at least two clusters detect malicious behavior, the request is blocked.
8. If at least two clusters allow the request, it is forwarded to the Express backend.
9. The backend continues the existing CloudDrive-AI pipeline: upload handling, OCR processing, and storage.

## Component Responsibilities

### Load Balancer
- Distributes request-analysis work across the three clusters using round-robin scheduling.
- Prevents one DDoS node from becoming overloaded.
- Reduces exposure to a single point of failure at the ingress layer.

### DDoS ML Cluster 1
- Runs the same feature extraction and Isolation Forest detection logic used by the current system.
- Independently scores traffic and returns a local verdict.

### DDoS ML Cluster 2
- Performs the same analysis as Cluster 1 on the same request stream.
- Acts as an independent peer detector rather than a replica of control flow.

### DDoS ML Cluster 3
- Provides a third independent opinion for federated voting.
- Keeps the decision layer functional even if one cluster is degraded or attacked.

### Federated Decision Aggregator
- Receives the three cluster verdicts.
- Applies majority voting to produce the final security decision.
- Blocks the request if two or more clusters detect an attack.
- Allows the request only when two or more clusters permit it.

### Express Backend
- Receives only traffic that has passed the federated security gate.
- Handles authenticated API operations and file upload orchestration.

### OCR Pipeline
- Processes accepted uploads after the backend allows them.
- Extracts text and supports downstream search and AI features.

### Storage Layer
- Persists uploaded files, extracted OCR text, and metadata.
- Remains behind the security gate so blocked traffic never reaches storage.

## Security Benefits

- Removes the single central DDoS model as a single point of failure.
- Forces an attacker to evade multiple independent detections instead of one.
- Limits the impact of model poisoning or targeted node compromise.
- Preserves service availability when one cluster is offline or under attack.
- Improves resilience by separating detection, arbitration, and application processing.

## Why Hackers Cannot Easily Bypass It

The request cannot skip directly to the Express backend because the federated security layer sits between the API gateway and the backend. The load balancer only distributes analysis jobs to the clusters, and the aggregator controls the final decision. An attacker would need to defeat a majority of detectors or compromise the aggregator path, which is substantially harder than bypassing a single middleware instance.

This design also reduces the value of targeting one ML node. If one cluster is disrupted, the other two can still determine the final verdict. That makes the system fault tolerant and harder to blind with a focused denial-of-service or evasion attempt.

## How Load Balancing Distributes Traffic

The load balancer uses round-robin assignment so incoming request-analysis jobs are rotated across Cluster 1, Cluster 2, and Cluster 3 in sequence. This keeps the work evenly distributed and avoids sending all traffic to a single detector.

Example rotation:

```text
Request 1 -> Cluster 1
Request 2 -> Cluster 2
Request 3 -> Cluster 3
Request 4 -> Cluster 1
Request 5 -> Cluster 2
Request 6 -> Cluster 3
```

Because each cluster evaluates requests independently, balancing improves throughput without collapsing the security decision into one machine.

## Why Federated Voting Improves Accuracy

Majority voting is more robust than trusting a single score. One cluster may be temporarily noisy, slightly stale, or biased toward false positives, but the other two can correct the final result. That improves overall stability and reduces both false blocks and missed attacks.

In practice, the federated layer gives CloudDrive-AI a stronger decision boundary because:

- one model can be wrong without controlling the outcome;
- two matching opinions override one outlier;
- divergent scores become a signal for deeper inspection;
- the system can keep operating during partial failure.

## Fit With the Existing CloudDrive-AI Pipeline

This architecture preserves the existing application flow:

```text
React Frontend -> API Gateway -> Federated DDoS Layer -> Express Backend -> OCR -> Storage
```

It also maps cleanly onto the current CloudDrive-AI security stack:

- Existing DDoS feature extraction remains useful for each cluster.
- Existing Isolation Forest logic becomes the shared algorithm on all three nodes.
- Existing upload handling, OCR, and storage remain downstream of the security gate.
- Existing analytics and threat logging can be extended to include per-cluster verdicts and aggregator decisions.

## Summary

CloudDrive-AI’s DDoS protection layer is redesigned as a distributed, federated cluster system with three independent ML nodes, round-robin distribution, and majority-vote arbitration. This keeps the upload pipeline intact while improving resilience, fault tolerance, and resistance to targeted bypass attempts.