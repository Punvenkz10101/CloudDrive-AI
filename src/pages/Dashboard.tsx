import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/layout/Navigation';
import {
  Files,
  Search,
  Upload,
  Activity,
  Database,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState([
    {
      title: 'Total Files',
      value: '0',
      change: '',
      changeType: 'positive',
      icon: Files,
      color: 'emerald-brand'
    },
    {
      title: 'Storage Used',
      value: '0 Bytes',
      change: '',
      changeType: 'neutral',
      icon: Database,
      color: 'golden-brand'
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const statsData = await apiFetch('/files/stats');
      const filesData = await apiFetch('/files');
      
      // Update stats
      setStats([
        {
          title: 'Total Files',
          value: statsData.totalFiles?.toLocaleString() || '0',
          change: '',
          changeType: 'positive',
          icon: Files,
          color: 'emerald-brand'
        },
        {
          title: 'Storage Used',
          value: statsData.storageUsed || '0 Bytes',
          change: '',
          changeType: 'neutral',
          icon: Database,
          color: 'golden-brand'
        }
      ]);

      // Build recent activity from files
      const files = filesData.files || [];
      if (files.length > 0) {
        const activities = files.slice(0, 5).map((file, idx) => ({
          id: idx + 1,
          type: 'upload',
          title: 'Document uploaded',
          description: file.name,
          time: formatTimeAgo(file.uploadDate),
          status: 'completed',
          icon: Upload
        }));
        setRecentActivity(activities);
      } else {
        setRecentActivity([{
          id: 1,
          type: 'upload',
          title: 'No activity yet',
          description: 'Upload your first file to see activity',
          time: 'Never',
          status: 'completed',
          icon: Upload
        }]);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const quickActions = [
    {
      title: 'Upload Files',
      description: 'Add new files to your secure storage',
      icon: Upload,
      variant: 'hero' as const,
      href: '/upload'
    },
    {
      title: 'AI Search',
      description: 'Find content using semantic search',
      icon: Search,
      variant: 'hero' as const,
      href: '/files'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-brand" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />

      <div className="lg:pl-64">
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Welcome back! Here's what's happening with your files.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {stat.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-foreground">
                            {stat.value}
                          </p>
                          {stat.change && (
                            <span className={`text-xs px-2 py-1 rounded-full ${stat.changeType === 'positive'
                                ? 'bg-emerald-brand/10 text-emerald-brand'
                                : stat.changeType === 'negative'
                                  ? 'bg-rust-brand/10 text-rust-brand'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                              {stat.change}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant}
                        className="w-full justify-start h-auto p-4"
                        asChild
                      >
                        <a href={action.href}>
                          <div className="flex items-center w-full">
                            <action.icon className="w-5 h-5 mr-3" />
                            <div className="text-left">
                              <div className="font-medium">{action.title}</div>
                              <div className="text-xs opacity-80">
                                {action.description}
                              </div>
                            </div>
                          </div>
                        </a>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <activity.icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {activity.title}
                              </p>
                              {getStatusIcon(activity.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.time}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button variant="ghost" className="w-full">
                        View All Activity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;