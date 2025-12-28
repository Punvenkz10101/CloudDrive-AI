import Navigation from '@/components/layout/Navigation';
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
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
  features: {
    anomalyDetection: boolean;
    rateLimiting: boolean;
    captchaProtection: boolean;
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
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [blockedEvents, setBlockedEvents] = useState<BlockedEvent[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const [statusData, blockedEventsData, blockedUsersData, eventsData, analyticsData] = await Promise.all([
        apiFetch('/ddos/status').catch(() => null),
        apiFetch('/ddos/blocked').catch(() => []),
        apiFetch('/ddos/blocked-users').catch(() => []),
        apiFetch('/ddos/events').catch(() => null),
        apiFetch('/ddos/analytics').catch(() => null)
      ]);

      if (statusData) setStatus(statusData);
      if (Array.isArray(blockedEventsData)) setBlockedEvents(blockedEventsData);
      if (Array.isArray(blockedUsersData)) setBlockedUsers(blockedUsersData);
      if (eventsData) setEvents(eventsData.events || []);
      if (analyticsData) setAnalytics(analyticsData);
    } catch (error: any) {
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

    // Auto-refresh every 10 seconds (faster for attack monitoring)
    if (autoRefresh) {
      const interval = setInterval(loadData, 10000);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />

      <div className="lg:pl-64">
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-8 h-8 text-emerald-brand" />
                  DDoS Protection & Security
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  ML-powered anomaly detection and real-time defense
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-pulse" />
                      Live Updates ON
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Live Updates OFF
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  {status?.modelReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-brand" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rust-brand" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {status?.modelReady ? 'Active' : 'Not Ready'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status?.modelReady ? 'ML model loaded & protecting' : 'Model training required'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attacks Blocked</CardTitle>
                  <Shield className="w-4 h-4 text-emerald-brand" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-brand">
                    {blockedEvents.length > 0 ? blockedEvents.length : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recently blocked attempts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attackers Identify</CardTitle>
                  <Users className="w-4 h-4 text-rust-brand" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rust-brand">
                    {blockedUsers.length > 0 ? blockedUsers.length : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique IPs/Users flagged
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Traffic</CardTitle>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {status?.stats.totalUploads.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requests processed (24h)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="blocked" className="space-y-4">
              <TabsList>
                <TabsTrigger value="blocked" className="text-emerald-brand font-medium">
                  <Shield className="w-4 h-4 mr-2" />
                  Blocked Attacks
                </TabsTrigger>
                <TabsTrigger value="attackers" className="text-rust-brand font-medium">
                  <Users className="w-4 h-4 mr-2" />
                  Blocked Users
                </TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Blocked Attacks Tab */}
              <TabsContent value="blocked" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-brand" />
                      Recent Blocked Attempts
                    </CardTitle>
                    <CardDescription>Real-time log of attacks stopped by the ML system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedEvents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-brand opacity-50" />
                        <h3 className="text-lg font-medium">No Attacks Detected</h3>
                        <p className="mt-2">System is monitoring. Run an attack simulation to see it in action.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Attacker ID</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Payload Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {blockedEvents.map((event, index) => (
                            <TableRow key={index} className="bg-rust-brand/5 hover:bg-rust-brand/10 transition-colors">
                              <TableCell className="font-mono text-xs">
                                {formatDate(event.timestamp)}
                              </TableCell>
                              <TableCell className="font-mono font-medium text-rust-brand">
                                {event.userId}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {event.ipAddress}
                              </TableCell>
                              <TableCell>
                                {formatBytes(event.fileSize)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="bg-rust-brand hover:bg-rust-brand">
                                  BLOCKED
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {event.reason}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-rust-brand" />
                      Identified Attackers
                    </CardTitle>
                    <CardDescription>Unique users flagged as malicious</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedUsers.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No malicious users identified yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {blockedUsers.map((user, index) => (
                          <div key={index} className="flex flex-col p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <Badge variant="outline" className="font-mono">
                                {user.userId}
                              </Badge>
                              <Badge variant="destructive">RESTRICTED</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Attempts:</span>
                                <span className="font-bold">{user.blockCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Seen:</span>
                                <span className="font-mono text-xs">{formatDate(user.lastBlocked)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">IP:</span>
                                <span className="font-mono text-xs">{user.ipAddress}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Global Traffic Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Total Unique Users</span>
                          <span className="text-lg font-bold">{analytics.totalUsers}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Total Requests</span>
                          <span className="text-lg font-bold">{analytics.totalUploads}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Data Processed</span>
                          <span className="text-lg font-bold">{formatBytes(analytics.totalSize)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Avg Request Size</span>
                          <span className="text-lg font-bold">{formatBytes(analytics.averageFileSize)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Duplicate Payloads</span>
                          <span className="text-lg font-bold text-yellow-500">
                            {(analytics.duplicateRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                          <span className="text-sm text-muted-foreground">Block Rate</span>
                          <span className="text-lg font-bold text-rust-brand">
                            {(analytics.failureRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Top Activity Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.topUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No data available</p>
                        ) : (
                          <div className="space-y-3">
                            {analytics.topUsers.map((user, index) => (
                              <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-card/50">
                                <div>
                                  <div className="font-mono text-sm font-medium">{user.userId}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.uploads} requests
                                  </div>
                                </div>
                                <div className="text-sm font-medium">
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
      </div >
    </div >
  );
};

export default DDoSMetrics;



