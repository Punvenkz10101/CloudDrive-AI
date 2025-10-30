import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Cloud,
  Shield,
  Search,
  Upload,
  Files,
  Trash2,
  Menu,
  X,
  User
} from 'lucide-react';

interface NavigationProps {
  isAuthenticated?: boolean;
}

const Navigation = ({ isAuthenticated = false }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { icon: Files, label: 'Dashboard', path: '/dashboard' },
    { icon: Files, label: 'My Files', path: '/files' },
    { icon: Upload, label: 'Upload', path: '/upload' },
  ];

  if (!isAuthenticated) {
    return (
      <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-brand rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-emerald-brand-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">CloudDrive-AI</span>
            </Link>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/learn-more">Learn More</Link>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-border lg:bg-background/50 lg:backdrop-blur-sm">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="w-8 h-8 bg-emerald-brand rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-brand-foreground" />
            </div>
            <span className="ml-2 text-xl font-bold text-foreground">CloudDrive-AI</span>
          </div>
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-smooth ${isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Toggle Button (only visible on small screens) */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-background border-r border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-emerald-brand rounded-lg flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-emerald-brand-foreground" />
                </div>
                <span className="ml-2 text-xl font-bold text-foreground">CloudDrive-AI</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="mt-4 px-4 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-smooth ${isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;