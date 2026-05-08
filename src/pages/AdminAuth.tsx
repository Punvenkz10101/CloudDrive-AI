import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

export default function AdminAuth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem('adminToken') === 'true';
    if (isAdmin) {
      navigate('/admin/ddos');
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('adminToken', 'true');
      toast({ title: 'Success', description: 'Logged into Admin portal' });
      navigate('/admin/ddos');
    } else {
      toast({ title: 'Access Denied', description: 'Invalid admin credentials', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
          <CardTitle className="text-2xl text-emerald-500">Security Operations Center</CardTitle>
          <CardDescription className="text-slate-400">Restricted Access Portal</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SOC ID</label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                type="text" 
                placeholder="Enter admin ID" 
                className="bg-slate-800 border-slate-700" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passphrase</label>
              <Input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password" 
                placeholder="••••••••" 
                className="bg-slate-800 border-slate-700" 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Authenticate</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
