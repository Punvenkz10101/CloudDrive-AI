import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload as UploadIcon, File, Shield, Trash2, Download, RefreshCw, MessageCircle } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { apiFetch, getAuthToken } from '@/lib/api';
import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import { toast } from '@/components/ui/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  status: string;
  downloadUrl: string;
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/files');
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChoose = async (e) => {
    // Prevent event if clicking the upload area (but not the button)
    if (e && e.target.tagName !== 'BUTTON') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      setUploading(true);

      try {
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
          throw new Error(text || 'Upload failed');
        }

        const data = await res.json();
        toast({
          title: "Upload successful",
          description: `${file.name} uploaded. OCR processing started.`,
        });

        // Reload files after a short delay (for OCR to start)
        setTimeout(() => {
          loadFiles();
        }, 2000);

        // Reset input to allow selecting same file again
        input.value = '';

      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || 'Failed to upload file',
          variant: "destructive"
        });
      } finally {
        setUploading(false);
        // Reset input to allow selecting same file again
        input.value = '';
      }
    };
    input.click();
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await apiFetch(`/files/${fileId}`, { method: 'DELETE' });
      toast({
        title: "File deleted",
        description: "File has been deleted successfully",
      });
      loadFiles();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  return (
    <div className="min-h-screen bg-beige">
      <Navigation isAuthenticated={true} />

      <main className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-charcoal">Upload Files</h1>
              <p className="text-lg text-charcoal/70">Upload files and ask questions using AI</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {showChat ? 'Hide Chat' : 'Open Chat'}
            </Button>
          </div>

          {/* Chat Interface */}
          {showChat && (
            <div className="mb-6">
              <ChatInterface onClose={() => setShowChat(false)} />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UploadIcon className="h-5 w-5 mr-2" />
                    Upload File
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadFiles} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Upload PDFs or images. OCR will automatically extract text.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-charcoal/20 rounded-lg p-12 text-center">
                  <UploadIcon className={`h-12 w-12 text-charcoal/30 mx-auto mb-4 ${uploading ? 'animate-pulse' : ''}`} />
                  <h3 className="text-lg font-medium text-charcoal mb-2">
                    {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                  </h3>
                  <p className="text-charcoal/60 mb-4">PDF, JPG, PNG supported</p>
                  <Button variant="default" onClick={handleChoose} disabled={uploading}>
                    <File className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Choose File'}
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-emerald-brand/10 rounded-lg border border-emerald-brand/20">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-emerald-brand mr-2" />
                    <div>
                      <h4 className="font-medium text-charcoal">Automatic OCR Processing</h4>
                      <p className="text-sm text-charcoal/70">All files are automatically scanned with OCR to extract text for AI search</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Files List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <File className="h-5 w-5 mr-2" />
                    Your Files ({files.length})
                  </div>
                </CardTitle>
                <CardDescription>
                  Uploaded files are automatically processed with OCR
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-charcoal/60">Loading files...</div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-charcoal/60">
                    <File className="h-12 w-12 mx-auto mb-4 text-charcoal/30" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Upload a file to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border border-emerald-brand/20 rounded-lg hover:bg-emerald-brand/5 hover:border-emerald-brand/30 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="h-5 w-5 text-emerald-brand flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-charcoal truncate">{file.name}</p>
                            <p className="text-sm text-charcoal/60">
                              {formatFileSize(file.size)} • {file.status}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.downloadUrl, '_blank')}
                            className="text-emerald-brand hover:text-emerald-brand/80 hover:bg-emerald-brand/10"
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Upload;