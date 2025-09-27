import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Trash2 } from 'lucide-react';

const Quarantine = () => {
  return (
    <div className="min-h-screen bg-beige">
      <Navigation isAuthenticated={true} />

      <main className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-charcoal">Suspicious Files</h1>
            <p className="text-lg text-charcoal/70">Manage virus-infected files</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-rust-brand/10 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-rust-brand" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-charcoal/70">Infected Files</p>
                    <p className="text-2xl font-bold text-charcoal">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-golden-brand/10 rounded-lg">
                    <Trash2 className="h-6 w-6 text-golden-brand" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-charcoal/70">Deleted Files</p>
                    <p className="text-2xl font-bold text-charcoal">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Virus Detection Status
              </CardTitle>
              <CardDescription>
                Review and manage virus-infected files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-emerald-brand mx-auto mb-4" />
                <h3 className="text-lg font-medium text-charcoal mb-2">No Infected Files</h3>
                <p className="text-charcoal/60 mb-4">All your files are virus-free</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Quarantine;