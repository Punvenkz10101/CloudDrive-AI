import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Files from "./pages/Files";
import Upload from "./pages/Upload";
import DDoSMetrics from "./pages/DDoSMetrics";
import AdminAuth from "./pages/AdminAuth";
import NotFound from "./pages/NotFound";
import BehaviorTracker from "./components/BehaviorTracker";
import { useEffect } from "react";
import { toast as useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const ZeroTrustGuard = () => {
  useEffect(() => {
    // Background polling for zero trust status
    let lastAlertTime = 0;
    
    const checkZeroTrust = async () => {
      try {
        const res = await apiFetch('/ddos/my-risk');
        const now = Date.now();
        const adminToken = localStorage.getItem('adminToken');
        
        // If the platform is under attack and we haven't alerted recently
        if ((res.zeroTrustMode || res.rateLimited) && (now - lastAlertTime > 30000)) {
          lastAlertTime = now;
          
          // Only show banner to non-admins on active pages
          if (adminToken !== 'true' && window.location.pathname !== '/auth') {
            useToast({
              title: "🛡️ Security Defense Active",
              description: "High traffic detected. The system is now applying ML-based throttling and blocking.",
              variant: "default",
              duration: 10000
            });
          }
        }
      } catch (e) {
        // Silent catch for background poll
      }
    };
    
    // Initial check and 5s polling
    setTimeout(checkZeroTrust, 1000);
    const interval = setInterval(checkZeroTrust, 5000);
    
    const handleSztE = (e: any) => {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken !== 'true' && window.location.pathname !== '/auth') {
        const detail = e.detail || {};
        if (detail.code === 'RATE_LIMIT_EXCEEDED') {
          useToast({
            title: "⏳ Rate Limited",
            description: "Too many requests detected. Please slow down and retry.",
            variant: "default",
            duration: 8000
          });
        } else if (detail.code === 'MALICIOUS_DETECTED' || detail.code === 'USER_BLOCKED') {
           useToast({
              title: "🚫 Access Blocked",
              description: "Your access has been blocked due to suspicious activity.",
              variant: "destructive",
              duration: 10000
           });
        }
      }
    };
    window.addEventListener('sec-zero-trust-enforced', handleSztE);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sec-zero-trust-enforced', handleSztE);
    };
  }, []);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BehaviorTracker />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ZeroTrustGuard />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/files" element={<Files />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/admin/ddos" element={<DDoSMetrics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
