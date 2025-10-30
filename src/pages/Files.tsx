import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Files as FilesIcon, Search, Upload, Brain, FileText, Calendar, Download, Eye, MessageCircle, Trash2, RefreshCw, X, FileImage, FileType } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { API_URL } from '@/lib/config';
import ChatInterface from '@/components/chat/ChatInterface';
import { toast } from '@/components/ui/use-toast';

type FileRow = { id: string; name: string; size: number; uploadDate: string; status: string; downloadUrl: string };

const Files = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return files.filter(file => {
      // Search by file name (extract just the actual name, not timestamp prefix)
      const fileName = file.name.toLowerCase();
      const nameWithoutPrefix = file.name.split('-').slice(2).join('-').toLowerCase(); // Remove timestamp prefix
      
      // Search by date - try multiple formats
      const formattedDate = formatDate(file.uploadDate).toLowerCase();
      const rawDate = file.uploadDate.toLowerCase();
      
      // Search in file name (full and without prefix)
      const nameMatch = fileName.includes(query) || nameWithoutPrefix.includes(query);
      
      // Search in dates
      const dateMatch = formattedDate.includes(query) || rawDate.includes(query);
      
      // Also try searching individual words
      const queryWords = query.split(/\s+/);
      const allText = `${fileName} ${formattedDate} ${rawDate}`.toLowerCase();
      const wordMatch = queryWords.every(word => allText.includes(word));
      
      return nameMatch || dateMatch || wordMatch;
    });
  }, [searchQuery, files]);

  const [aiQuery, setAiQuery] = useState('');

  const handleAskAI = () => {
    if (!aiQuery.trim()) {
      setShowChat(true);
      return;
    }
    // Always show chat when asking a question
    setShowChat(true);
    // Auto-send the AI query to chat
    setTimeout(() => {
      const event = new CustomEvent('auto-ask', { detail: aiQuery });
      window.dispatchEvent(event);
      setAiQuery('');
    }, 300);
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) return;

    try {
      await apiFetch(`/files/${fileId}`, { method: 'DELETE' });
      toast({
        title: "File deleted",
        description: `${fileName} has been deleted successfully`,
      });
      loadFiles(); // Reload the files list
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <FileType className="h-4 w-4 text-red-600 flex-shrink-0" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <FileImage className="h-4 w-4 text-emerald-brand flex-shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-emerald-brand flex-shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-beige">
      <Navigation isAuthenticated={true} />

      <main className="lg:pl-64">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-charcoal mb-2">My Files</h1>
              <p className="text-lg text-charcoal/70">Manage your files and ask questions with AI</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* File Search - Search files by name */}
            <Card className="border-emerald-brand/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-brand/5 to-emerald-brand/2 border-b border-emerald-brand/20">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-brand/20 rounded-lg">
                    <Search className="h-5 w-5 text-emerald-brand" />
                  </div>
                  <div>
                    <div className="text-charcoal">Search Files</div>
                    <p className="text-sm font-normal text-charcoal/60 mt-0.5">
                      Search your files by name or date
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-brand/60 z-10" />
                  <input
                    type="text"
                    placeholder="Search files by name or date (e.g., 'Aadhar', 'Oct 29', 'PDF')..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full pl-11 pr-4 py-3.5 border-2 border-emerald-brand/20 rounded-xl bg-white text-charcoal placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-emerald-brand/50 focus:border-emerald-brand transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-charcoal/40 hover:text-charcoal/70"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-3 text-sm text-charcoal/60">
                    Found {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} matching "{searchQuery}"
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Assistant - Ask questions about files */}
            <Card className="border-emerald-brand/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-brand/10 to-emerald-brand/5 border-b border-emerald-brand/20">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-brand/20 rounded-lg">
                      <Brain className="h-5 w-5 text-emerald-brand" />
                    </div>
                    <div>
                      <div className="text-charcoal">AI Assistant</div>
                      <p className="text-sm font-normal text-charcoal/60 mt-0.5">
                        Ask questions about your files using natural language
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowChat(!showChat)}
                    className="text-emerald-brand hover:text-emerald-brand/80 hover:bg-emerald-brand/10"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {showChat ? (
                  <div className="border-t border-emerald-brand/10">
                    <ChatInterface onClose={() => setShowChat(false)} hideHeader={true} />
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="relative mb-4">
                      <Brain className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-brand/60" />
                      <input
                        type="text"
                        placeholder="Ask anything about your files (e.g., 'What is my SRN?', 'What is my Aadhar number?')..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAskAI();
                          }
                        }}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-emerald-brand/20 rounded-xl bg-white text-charcoal placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-emerald-brand/50 focus:border-emerald-brand transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-charcoal/60">
                        💡 Type your question and press Enter, or click "Ask AI"
                      </p>
                      <Button 
                        variant="hero" 
                        onClick={handleAskAI}
                        className="bg-emerald-brand hover:bg-emerald-brand/90 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Ask AI
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-emerald-brand/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-brand/5 to-emerald-brand/2 border-b border-emerald-brand/20">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-brand/20 rounded-lg">
                    <FilesIcon className="h-5 w-5 text-emerald-brand" />
                  </div>
                  <div>
                    <div className="text-charcoal">File Management</div>
                    <p className="text-sm font-normal text-charcoal/60 mt-0.5">
                      View, organize, and manage your uploaded files
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadFiles} 
                  disabled={loading}
                  className="text-emerald-brand hover:text-emerald-brand/80 hover:bg-emerald-brand/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-brand/10">
                <p className="text-sm text-charcoal/70">
                  {searchQuery ? `${filteredFiles.length} of ${files.length}` : files.length} {files.length === 1 ? 'file' : 'files'} uploaded
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-charcoal/60">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-emerald-brand" />
                  <p>Loading files...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-600">{error}</div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FilesIcon className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-charcoal mb-2">
                    {searchQuery ? 'No files match your search' : 'No files uploaded yet'}
                  </h3>
                  <p className="text-charcoal/60">
                    {searchQuery ? 'Try adjusting your search query' : 'Upload your first file to get started'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-brand/20">
                        <TableHead className="text-charcoal font-semibold">Name</TableHead>
                        <TableHead className="text-charcoal font-semibold">Size</TableHead>
                        <TableHead className="text-charcoal font-semibold">Upload Date</TableHead>
                        <TableHead className="text-charcoal font-semibold">Status</TableHead>
                        <TableHead className="text-charcoal font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow 
                          key={file.id} 
                          className="border-emerald-brand/10 hover:bg-emerald-brand/5 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(file.name)}
                              <span className="text-charcoal truncate max-w-[300px]" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-charcoal/70">
                            {formatFileSize(file.size)}
                          </TableCell>
                          <TableCell className="text-charcoal/70">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-emerald-brand/60" />
                              <span className="text-sm">{formatDate(file.uploadDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-brand/10 text-emerald-brand border border-emerald-brand/20">
                              {file.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${API_URL}${file.downloadUrl}`, '_blank')}
                                className="text-emerald-brand hover:text-emerald-brand/80 hover:bg-emerald-brand/10"
                                title="View file"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `${API_URL}${file.downloadUrl}`;
                                  link.download = file.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-emerald-brand hover:text-emerald-brand/80 hover:bg-emerald-brand/10"
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(file.id, file.name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Files;