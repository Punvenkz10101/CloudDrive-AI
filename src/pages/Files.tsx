import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Files as FilesIcon, Search, Upload, Brain, FileText, Calendar, Download, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Dummy file data
const dummyFiles = [
  { id: 1, name: 'Project_Report_2024.pdf', size: '2.5 MB', type: 'PDF', uploadDate: '2024-01-15', status: 'Clean' },
  { id: 2, name: 'Financial_Data.xlsx', size: '1.2 MB', type: 'Excel', uploadDate: '2024-01-14', status: 'Clean' },
  { id: 3, name: 'Marketing_Presentation.pptx', size: '5.8 MB', type: 'PowerPoint', uploadDate: '2024-01-13', status: 'Clean' },
  { id: 4, name: 'User_Research.docx', size: '890 KB', type: 'Word', uploadDate: '2024-01-12', status: 'Clean' },
  { id: 5, name: 'Database_Schema.sql', size: '45 KB', type: 'SQL', uploadDate: '2024-01-11', status: 'Clean' },
  { id: 6, name: 'UI_Mockups.figma', size: '3.2 MB', type: 'Figma', uploadDate: '2024-01-10', status: 'Clean' },
  { id: 7, name: 'API_Documentation.md', size: '156 KB', type: 'Markdown', uploadDate: '2024-01-09', status: 'Clean' },
  { id: 8, name: 'Customer_Feedback.csv', size: '678 KB', type: 'CSV', uploadDate: '2024-01-08', status: 'Clean' },
];

const Files = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return dummyFiles;

    const query = searchQuery.toLowerCase();
    return dummyFiles.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.type.toLowerCase().includes(query) ||
      file.uploadDate.includes(query)
    );
  }, [searchQuery]);

  const handleSearch = () => {
    // AI search functionality would be implemented here
    console.log('AI Search for:', searchQuery);
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
              {filteredFiles.length === 0 ? (
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
                      <TableHead>Type</TableHead>
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
                        <TableCell>{file.type}</TableCell>
                        <TableCell>{file.size}</TableCell>
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
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
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