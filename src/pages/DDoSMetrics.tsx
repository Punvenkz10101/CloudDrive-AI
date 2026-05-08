// Removed standard Navigation import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  AlertCircle,
  Globe,
  Trash2
} from 'lucide-react';
import ThreatMap from '@/components/ThreatMap';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SystemStatus {
  modelReady: boolean;
  stats: {
    totalUploads: number;
    recentUploads24h: number;
    uploadLogsFile: string;
  };
  federatedState?: {
    zeroTrustMode: boolean;
    blockedUsersSize: number;
    rateLimitStoreSize: number;
    userRiskCacheSize: number;
    simulatorBurstSize: number;
  };
  federatedDecision?: {
    finalDecision: 'ALLOW' | 'BLOCK';
    blockVotes: number;
    allowVotes: number;
    majorityThreshold: number;
    decisionSource?: 'majority_vote' | 'simulation_threshold' | 'simulation_warmup';
    updatedAt?: string | null;
    requestUserId?: string;
    requestIpAddress?: string;
    simulation?: {
      isAttackSimulation: boolean;
      burstCount: number;
      threshold: number;
      key?: string;
    };
    clusters?: Array<{
      clusterId: string;
      action?: string;
      risk_level?: string;
      anomaly_score?: number;
      error?: string;
      status?: string;
    }>;
    votes?: Array<{
      clusterId: string;
      vote: 'ALLOW' | 'BLOCK';
      action?: string;
      risk_level?: string;
      anomaly_score?: number;
      error?: string | null;
    }>;
    attack?: {
      attackType?: string;
      runId?: string;
      sourceIp?: string;
      startedAt?: string;
      lastSeenAt?: string;
      totalDecisions?: number;
      blockDecisions?: number;
      allowDecisions?: number;
      burstCount?: number;
      burstThreshold?: number;
    };
    history?: Array<{
      updatedAt: string;
      finalDecision: 'ALLOW' | 'BLOCK';
      blockVotes: number;
      allowVotes: number;
      attack?: {
        attackType?: string;
        runId?: string;
        sourceIp?: string;
      };
    }>;
    attackState?: 'ACTIVE' | 'IDLE';
    lastCompletedAttack?: {
      attackType?: string;
      runId?: string;
      sourceIp?: string;
      startedAt?: string;
      endedAt?: string;
      finalDecision?: 'ALLOW' | 'BLOCK';
      blockVotes?: number;
      allowVotes?: number;
      majorityThreshold?: number;
      totalDecisions?: number;
      blockDecisions?: number;
      allowDecisions?: number;
    };
  };
  features: {
    anomalyDetection: boolean;
    rateLimiting: boolean;
    duplicateDetection: boolean;
  };
}

interface BlockedEvent {
  timestamp: string;
  userId: string;
  ipAddress: string;
  fileSize: number;
  reason: string;
  error: string;
  explanation_factors?: string[];
  location?: { lat: number, lon: number, country: string, city: string, street?: string };
}

interface BlockedUser {
  userId: string;
  blockCount: number;
  lastBlocked: string;
  ipAddress: string;
  status: string;
}

interface SecurityEvent {
  type: string;
  userId: string;
  timestamp: string;
  severity: string;
  details: any;
}

interface Analytics {
  totalUsers: number;
  totalUploads: number;
  totalSize: number;
  averageFileSize: number;
  duplicateRate: number;
  failureRate: number;
  uploadsByHour: Record<string, number>;
  topUsers: Array<{
    userId: string;
    uploads: number;
    totalSize: number;
  }>;
}

const DDoSMetrics = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [blockedEvents, setBlockedEvents] = useState<BlockedEvent[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Redirect to login if not authenticated as admin
  useEffect(() => {
    const isAdmin = localStorage.getItem('adminToken');
    if (!isAdmin) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleReset = async () => {
    if (!window.confirm('WARNING: This will PERMANENTLY delete all DDoS logs and reset all blocked identifiers. Proceed?')) return;
    
    try {
      setLoading(true);
      await apiFetch('/ddos/reset', { method: 'POST' });
      toast({
        title: 'Security State Reset',
        description: 'DDoS logs and risk caches have been cleared successfully.',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Could not reset security state.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    // Relying on browser tokens or network restrictions for API in an Admin Dashboard context
    // In a full implementation, the backend would also require an independent admin JWT

    try {
      setLoading(true);
      setAuthError(false);

      const [statusData, blockedEventsData, blockedUsersData, eventsData, analyticsData] = await Promise.all([
        apiFetch('/ddos/status').catch((e) => { if (e.message?.includes('401') || e.message?.includes('Missing token') || e.message?.includes('Invalid token') || e.message?.includes('Unexpected')) setAuthError(true); return null; }),
        apiFetch('/ddos/blocked').catch(() => []),
        apiFetch('/ddos/blocked-users').catch(() => []),
        apiFetch('/ddos/events').catch(() => ({ events: [] })),
        apiFetch('/ddos/analytics').catch(() => null)
      ]);

      if (statusData) setStatus(statusData);
      if (Array.isArray(blockedEventsData)) setBlockedEvents(blockedEventsData);
      if (Array.isArray(blockedUsersData)) setBlockedUsers(blockedUsersData);
      if (eventsData && eventsData.events) setEvents(eventsData.events || []);
      if (analyticsData) setAnalytics(analyticsData);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Failed to load data",
        description: error.message || "Could not fetch DDoS metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 2 seconds for live attack vote updates.
    if (autoRefresh) {
      const interval = setInterval(loadData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatReasonText = (reasonText?: string) => {
    if (!reasonText) return 'Federated defense blocked suspicious traffic.';

    if (reasonText.includes('Shared simulator burst from')) {
      return 'Federated defense blocked repeated high-rate requests from one source within 45 seconds.';
    }

    if (reasonText.includes('Blocked simulator burst from')) {
      return 'Federated defense blocked repeated high-rate requests from one source within 45 seconds.';
    }

    return reasonText;
  };

  const isAttackIdle = status?.federatedDecision?.attackState === 'IDLE';
  const currentAttackLabel = isAttackIdle
    ? 'Waiting for next attack'
    : (status?.federatedDecision?.attack?.attackType || 'No active attack');
  const currentAttackDetails = isAttackIdle
    ? 'The panel has been reset and is ready for the next run.'
    : `Run: ${status?.federatedDecision?.attack?.runId || 'n/a'} | IP: ${status?.federatedDecision?.requestIpAddress || 'unknown'}`;

  const attackLocations = useMemo(() => {
    const locationsByPoint = new Map<string, {
      lat: number,
      lon: number,
      country: string,
      city: string,
      street: string,
      userId: string,
      timestamp: string,
      count: number
    }>();

    blockedEvents
      .filter(ev => ev.location && Number.isFinite(ev.location.lat) && Number.isFinite(ev.location.lon))
      .forEach((ev) => {
        const lat = ev.location!.lat;
        const lon = ev.location!.lon;
        const key = `${ev.ipAddress}_${lat.toFixed(6)}_${lon.toFixed(6)}`;

        if (!locationsByPoint.has(key)) {
          locationsByPoint.set(key, {
            lat,
            lon,
            country: ev.location!.country,
            city: ev.location!.city,
            street: (ev.location as any).street || `${ev.location!.city}`,
            userId: ev.userId,
            timestamp: ev.timestamp,
            count: 1
          });
          return;
        }

        const existing = locationsByPoint.get(key)!;
        existing.count += 1;
        if (new Date(ev.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
          existing.userId = ev.userId;
          existing.timestamp = ev.timestamp;
        }
      });

    return Array.from(locationsByPoint.values());
  }, [blockedEvents]);

  // Show auth error state
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-rust-brand opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">You must authenticate via the SOC Portal to view this page.</p>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Go to SOC Login
          </button>
        </div>
      </div>
    );
  }

  const handleLogoutAdmin = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Admin Navbar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-emerald-500" />
          <span className="font-bold text-lg tracking-tight">SOC Admin Portal</span>
        </div>
        <Button variant="destructive" size="sm" onClick={handleLogoutAdmin}>End Session</Button>
      </div>

      <div>
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-8 h-8 text-emerald-500" />
                  DDoS Protection & Security
                </h1>
                <p className="text-lg text-slate-400 mt-2">
                  ML-powered anomaly detection and real-time defense
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  {autoRefresh ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 text-emerald-500 animate-pulse" />
                      Live Updates ON
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Live Updates OFF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="bg-slate-800 border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-900/50"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Service
                </Button>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">System Status</CardTitle>
                  {status?.modelReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {status?.modelReady ? 'Active' : 'Not Ready'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {status?.modelReady ? 'ML model loaded & protecting' : 'Model training required'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Attacks Blocked</CardTitle>
                  <Shield className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">
                    {blockedEvents.length > 0 ? blockedEvents.length : '0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Recently blocked attempts
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Attackers Identify</CardTitle>
                  <Users className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {blockedUsers.length > 0 ? blockedUsers.length : '0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Unique IPs/Users flagged
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Traffic</CardTitle>
                  <Activity className="w-4 h-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {status?.stats.totalUploads.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requests processed (24h)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Federated Decision Snapshot */}
            {status && (
              <Card className="bg-slate-900 border-slate-800 text-slate-300 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <BarChart3 className="w-5 h-5 text-sky-500" />
                    Federated Cluster Votes (3-Cluster System)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!status.federatedDecision ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm text-slate-400">
                      Federated voting data is not available yet. Run a simulated attack and refresh to populate the 3-cluster vote panel.
                    </div>
                  ) : (
                  <>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
                    <div className="text-sm text-slate-400">
                      {isAttackIdle ? 'Attack Status' : 'Current Attack'}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-100">
                      {currentAttackLabel}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {currentAttackDetails}
                    </div>
                    <div className="mt-1 text-xs text-sky-400">
                      Votes reset for every new attack run.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-4">
                      <div className="text-sm text-slate-400">System State</div>
                      <div className={`mt-1 text-2xl font-bold ${isAttackIdle ? 'text-sky-400' : status.federatedDecision?.finalDecision === 'BLOCK' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {isAttackIdle ? 'READY' : (status.federatedDecision?.finalDecision || 'N/A')}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">
                        {isAttackIdle
                          ? 'Attack finished. Waiting for the next simulated run.'
                          : status.federatedDecision?.decisionSource === 'simulation_warmup'
                            ? `Warmup phase: allowing initial uploads (${status.federatedDecision?.simulation?.burstCount || 0}/${status.federatedDecision?.simulation?.threshold || 0}).`
                            : status.federatedDecision?.decisionSource === 'simulation_threshold'
                              ? 'Blocked due to repeated high-rate attack traffic.'
                              : 'Decision made by federated cluster voting.'}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-4">
                      <div className="text-sm text-slate-400">Last Updated</div>
                      <div className="mt-1 text-lg font-mono text-slate-100">
                        {status.federatedDecision?.updatedAt ? formatDate(status.federatedDecision.updatedAt) : 'Waiting for attack'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-200 mb-3">Cluster Votes</div>
                    {(!status.federatedDecision?.votes?.length && !status.federatedDecision?.clusters?.length) ? (
                      <div className="rounded-md border border-dashed border-slate-700 bg-slate-950 px-4 py-5 text-sm text-slate-400">
                        No active votes right now. Run an attack to see cluster decisions.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(status.federatedDecision?.votes || status.federatedDecision?.clusters || []).map((cluster: any, index: number) => {
                          const voteLabel = cluster.vote || ((cluster.action === 'BLOCK' || cluster.risk_level === 'MALICIOUS' || (cluster.anomaly_score || 0) >= 0.7) ? 'BLOCK' : 'ALLOW');
                          const isBlock = voteLabel === 'BLOCK';
                          return (
                            <div key={index} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
                              <div className="font-mono text-sm text-slate-200">{cluster.clusterId || cluster.name || `Cluster-${index + 1}`}</div>
                              <Badge className={isBlock ? 'bg-red-900/40 text-red-300 border border-red-900/60' : 'bg-emerald-900/30 text-emerald-300 border border-emerald-900/60'}>
                                {voteLabel}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="blocked" className="space-y-4">
              <TabsList className="bg-slate-900 border border-slate-800">
                <TabsTrigger value="blocked" className="text-emerald-500 font-medium data-[state=active]:bg-slate-800">
                  <Shield className="w-4 h-4 mr-2" />
                  Blocked Attacks
                </TabsTrigger>
                <TabsTrigger value="attackers" className="text-red-500 font-medium data-[state=active]:bg-slate-800">
                  <Users className="w-4 h-4 mr-2" />
                  Blocked Users
                </TabsTrigger>
                <TabsTrigger value="threatmap" className="text-blue-500 font-medium data-[state=active]:bg-slate-800">
                  <Globe className="w-4 h-4 mr-2" />
                  Threat Map
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800 text-slate-300">Analytics</TabsTrigger>
              </TabsList>

              {/* Blocked Attacks Tab */}
              <TabsContent value="blocked" className="space-y-4">
                <Card className="bg-slate-900 border-slate-800 text-slate-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Shield className="w-5 h-5 text-emerald-500" />
                      Recent Blocked Attempts
                    </CardTitle>
                    <CardDescription className="text-slate-500">Real-time log of attacks stopped by the ML system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedEvents.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                        <h3 className="text-lg font-medium text-slate-300">No Attacks Detected</h3>
                        <p className="mt-2 text-slate-500">System is monitoring. Run an attack simulation to see it in action.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-slate-800/50">
                            <TableHead className="text-slate-400">Time</TableHead>
                            <TableHead className="text-slate-400">Attacker ID</TableHead>
                            <TableHead className="text-slate-400">IP Address</TableHead>
                            <TableHead className="text-slate-400">Payload</TableHead>
                            <TableHead className="text-slate-400">Security Action</TableHead>
                            <TableHead className="text-slate-400">Anomaly Reasoning (XAI)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {blockedEvents.map((event, index) => (
                            <TableRow key={index} className="bg-red-900/10 hover:bg-red-900/20 transition-colors border-slate-800">
                              <TableCell className="font-mono text-xs text-slate-400">
                                {formatDate(event.timestamp)}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-red-400">
                                {event.userId}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-500">
                                {event.ipAddress}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {formatBytes(event.fileSize)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="bg-red-500 text-white border-0 font-bold px-3 py-1 animate-pulse">
                                  DROP & BLOCK
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="space-y-1">
                                  <div className="text-red-400 font-bold">{formatReasonText(event.error || event.reason)}</div>
                                  {event.explanation_factors && event.explanation_factors.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {event.explanation_factors.map((f, i) => (
                                        <span key={i} className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Blocked Users Tab */}
              <TabsContent value="attackers" className="space-y-4">
                <Card className="bg-slate-900 border-slate-800 text-slate-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Users className="w-5 h-5 text-red-500" />
                      Identified Attackers
                    </CardTitle>
                    <CardDescription className="text-slate-500">Unique users flagged as malicious</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedUsers.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <p>No malicious users identified yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {blockedUsers.map((user, index) => (
                          <div key={index} className="flex flex-col p-4 border border-slate-800 rounded-lg bg-slate-950 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <Badge variant="outline" className="font-mono border-slate-700 text-slate-300">
                                {user.userId}
                              </Badge>
                              <Badge variant="destructive" className="bg-red-900/50 text-red-500 border-0">RESTRICTED</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Attempts:</span>
                                <span className="font-bold text-slate-200">{user.blockCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Last Seen:</span>
                                <span className="font-mono text-xs text-slate-400">{formatDate(user.lastBlocked)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">IP:</span>
                                <span className="font-mono text-xs text-slate-400">{user.ipAddress}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Threat Map Tab */}
              <TabsContent value="threatmap" className="space-y-4">
                <ThreatMap 
                  locations={attackLocations}
                />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-slate-900 border-slate-800 text-slate-300">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Global Traffic Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Total Unique Users</span>
                          <span className="text-lg font-bold text-slate-200">{analytics.totalUsers}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Total Requests</span>
                          <span className="text-lg font-bold text-slate-200">{analytics.totalUploads}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Data Processed</span>
                          <span className="text-lg font-bold text-slate-200">{formatBytes(analytics.totalSize)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Avg Request Size</span>
                          <span className="text-lg font-bold text-slate-200">{formatBytes(analytics.averageFileSize)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Duplicate Payloads</span>
                          <span className="text-lg font-bold text-yellow-500">
                            {(analytics.duplicateRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-800">
                          <span className="text-sm text-slate-400">Block Rate</span>
                          <span className="text-lg font-bold text-red-500">
                            {(analytics.failureRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 text-slate-300">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Top Activity Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.topUsers.length === 0 ? (
                          <p className="text-sm text-slate-500">No data available</p>
                        ) : (
                          <div className="space-y-3">
                            {analytics.topUsers.map((user, index) => (
                              <div key={index} className="flex justify-between items-center p-3 rounded-lg border border-slate-800 bg-slate-950/50">
                                <div>
                                  <div className="font-mono text-sm font-medium text-slate-200">{user.userId}</div>
                                  <div className="text-xs text-slate-500">
                                    {user.uploads} requests
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-slate-300">
                                  {formatBytes(user.totalSize)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>


            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DDoSMetrics;




