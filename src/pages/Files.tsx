import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Files as FilesIcon, Search, Upload, Brain, FileText, Calendar, Download, Eye } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { API_URL } from '@/lib/config';

type FileRow = { id: string; name: string; size: number; uploadDate: string; status: string; downloadUrl: string };

const Files = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/files');
      setFiles(res.files || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();
    return files.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.uploadDate.toLowerCase().includes(query)
    );
  }, [searchQuery, files]);

  const handleSearch = async () => {
    try {
      const res = await apiFetch(`/search?q=${encodeURIComponent(searchQuery)}`);
      const names = (res.results || []).map((r: any) => r.name);
      setFiles((prev) => prev.filter((f) => names.includes(f.name)));
    } catch (e) { }
  };

  return (
    <div className="min-h-screen bg-beige">
      <Navigation isAuthenticated={true} />

      <main className="lg:pl-64">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-charcoal">My Files</h1>
              <p className="text-lg text-charcoal/70">Manage your uploaded files</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                AI-Powered Search
              </CardTitle>
              <CardDescription>
                Search your files using natural language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
                <input
                  type="text"
                  placeholder="Ask anything about your files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-charcoal/20 rounded-lg bg-background text-charcoal placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-emerald-brand"
                />
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="hero" onClick={handleSearch}>
                  <Brain className="h-4 w-4 mr-2" />
                  Search with AI
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FilesIcon className="h-5 w-5 mr-2" />
                File Management
              </CardTitle>
              <CardDescription>
                View, organize, and manage your uploaded files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Loading…</div>
              ) : error ? (
                <div className="text-center py-12 text-red-600">{error}</div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-charcoal mb-2">No files found</h3>
                  <p className="text-charcoal/60">Try adjusting your search query</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-charcoal/50" />
                            {file.name}
                          </div>
                        </TableCell>
                        <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-charcoal/50" />
                            {file.uploadDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-brand/10 text-emerald-brand">
                            {file.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button asChild variant="ghost" size="sm">
                              <a href={`${API_URL}${file.downloadUrl}`} target="_blank" rel="noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <a href={`${API_URL}${file.downloadUrl}`} download>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Files;