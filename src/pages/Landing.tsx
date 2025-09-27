import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navigation from '@/components/layout/Navigation';
import { Shield, Search, Cloud, Zap, Lock, Brain } from 'lucide-react';
import heroImage from '@/assets/hero-illustration.jpg';

const Landing = () => {
  const features = [
    {
      icon: Shield,
      title: 'Advanced Malware Protection',
      description: 'Real-time scanning with AI-powered threat detection',
      color: 'emerald-brand'
    },
    {
      icon: Brain,
      title: 'AI-Powered Search',
      description: 'Semantic search across all your documents and files',
      color: 'plum-brand'
    },
    {
      icon: Lock,
      title: 'DDoS Protection',
      description: 'Enterprise-grade security for your data',
      color: 'emerald-brand'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized performance with instant file access',
      color: 'golden-brand'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Secure Cloud Storage with{' '}
                <span className="bg-gradient-to-r from-emerald via-plum to-golden bg-clip-text text-transparent">
                  AI Intelligence
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
                Store, search, and protect your files with advanced AI-powered malware detection 
                and semantic search capabilities. Your data, secured and accessible.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src={heroImage} 
                  alt="CloudDrive-AI secure cloud storage with AI" 
                  className="w-full h-auto rounded-2xl shadow-medium"
                />
              </div>
              <div className="absolute inset-0 hero-gradient opacity-20 rounded-2xl transform rotate-3 scale-105"></div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-emerald-brand rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-emerald-brand-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">CloudDrive-AI</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 CloudDrive-AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;