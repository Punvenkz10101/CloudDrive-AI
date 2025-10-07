import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload as UploadIcon, File, Shield } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';

const Upload = () => {
  const handleChoose = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const form = new FormData();
      form.append('file', file);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        alert(text || 'Upload failed');
        return;
      }
      const data = await res.json();
      alert(`Uploaded: ${file.name} (${data.status})`);
    };
    input.click();
  };
  return (
    <div className="min-h-screen bg-beige">
      <Navigation isAuthenticated={true} />

      <main className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-charcoal">Upload Files</h1>
            <p className="text-lg text-charcoal/70">Securely upload and scan your files</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UploadIcon className="h-5 w-5 mr-2" />
                File Upload
              </CardTitle>
              <CardDescription>
                Drag and drop files or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-charcoal/20 rounded-lg p-12 text-center hover:border-emerald-brand transition-colors">
                <UploadIcon className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-charcoal mb-2">Drop files here to upload</h3>
                <p className="text-charcoal/60 mb-4">or click to browse from your device</p>
                <Button variant="default" onClick={handleChoose}>
                  <File className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              <div className="mt-6 p-4 bg-emerald-brand/10 rounded-lg border border-emerald-brand/20">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-emerald-brand mr-2" />
                  <div>
                    <h4 className="font-medium text-charcoal">Automatic Security Scanning</h4>
                    <p className="text-sm text-charcoal/70">All files are automatically scanned for malware and threats</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;