import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FolderOpen, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  BarChart3,
  HardDrive,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { documentService, TicketAttachment } from "@/services/documentService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "react-router-dom";
import DocumentPreview from "@/components/DocumentPreview";

const DocumentsAdminPage = () => {
  const { profile } = useAuth();
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [filteredAttachments, setFilteredAttachments] = useState<TicketAttachment[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [securityFilter, setSecurityFilter] = useState<string>("all");
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'technician') {
      loadDocuments();
      loadStorageStats();
    }
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [attachments, searchTerm, fileTypeFilter, securityFilter]);

  const loadDocuments = async () => {
    try {
      const data = await documentService.getAllAttachments();
      setAttachments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error("Errore nel caricamento documenti");
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await documentService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = attachments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(att => 
        att.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.uploader?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // File type filter
    if (fileTypeFilter !== "all") {
      filtered = filtered.filter(att => 
        documentService.getFileCategory(att.mime_type) === fileTypeFilter
      );
    }

    // Security filter
    if (securityFilter !== "all") {
      filtered = filtered.filter(att => att.virus_scan_status === securityFilter);
    }

    setFilteredAttachments(filtered);
  };

  const handleDownload = async (attachment: TicketAttachment) => {
    try {
      const downloadUrl = await documentService.getDownloadUrl(attachment.id);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Download avviato: ${attachment.file_name}`);
      loadDocuments(); // Refresh to update download count
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Errore durante il download");
    }
  };

  const handleDelete = async (attachment: TicketAttachment) => {
    if (!confirm(`Sei sicuro di voler eliminare "${attachment.file_name}"?`)) return;
    
    try {
      await documentService.deleteAttachment(attachment.id);
      toast.success(`File eliminato: ${attachment.file_name}`);
      loadDocuments();
      loadStorageStats();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Errore nell'eliminazione del file");
    }
  };

  const handlePreview = (attachment: TicketAttachment) => {
    setPreviewAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const getFileIcon = (mimeType: string) => {
    const category = documentService.getFileCategory(mimeType);
    
    switch (category) {
      case 'image':
        return <Image className="h-5 w-5 text-green-600" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'word':
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSecurityBadge = (status: string) => {
    switch (status) {
      case 'clean':
        return <Badge variant="outline" className="text-green-600">Sicuro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Scansione...</Badge>;
      case 'infected':
        return <Badge variant="destructive">Bloccato</Badge>;
      default:
        return <Badge variant="secondary">Errore</Badge>;
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'technician') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Accesso Negato</CardTitle>
              <CardDescription>
                Solo amministratori e tecnici possono gestire i documenti del sistema.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Gestione Documenti Sistema</h1>
            <p className="text-muted-foreground">Panoramica e gestione di tutti i documenti del sistema</p>
          </div>
        </div>

        {/* Storage Statistics */}
        {storageStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">File Totali</CardTitle>
                <File className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{storageStats.totalFiles}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Utilizzato</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {documentService.formatFileSize(storageStats.totalSize)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upload Recenti</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{storageStats.recentUploads}</div>
                <p className="text-xs text-muted-foreground">Ultima settimana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tipi File</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(storageStats.filesByType).length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Tutti i Documenti ({filteredAttachments.length})
            </CardTitle>
            <CardDescription>
              Gestione centralizzata di tutti i documenti del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cerca per nome file o utente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="image">Immagini</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="word">Word</SelectItem>
                  <SelectItem value="text">Testo</SelectItem>
                  <SelectItem value="other">Altri</SelectItem>
                </SelectContent>
              </Select>

              <Select value={securityFilter} onValueChange={setSecurityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="clean">Sicuri</SelectItem>
                  <SelectItem value="pending">In scansione</SelectItem>
                  <SelectItem value="infected">Bloccati</SelectItem>
                  <SelectItem value="error">Errore scan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Caricamento documenti...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Dimensione</TableHead>
                    <TableHead>Caricato da</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Data Upload</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead>Sicurezza</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttachments.map((attachment) => (
                    <TableRow key={attachment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(attachment.mime_type)}
                          <div>
                            <div className="font-medium">{attachment.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {attachment.mime_type}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {documentService.formatFileSize(attachment.file_size)}
                      </TableCell>
                      <TableCell>
                        {attachment.uploader?.full_name || 'Utente'}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {attachment.ticket_id.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {format(new Date(attachment.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{attachment.download_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {getSecurityBadge(attachment.virus_scan_status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(attachment)}
                            disabled={attachment.virus_scan_status !== 'clean'}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(attachment)}
                            disabled={attachment.virus_scan_status !== 'clean'}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {profile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(attachment)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && filteredAttachments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun documento trovato</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Type Distribution */}
        {storageStats && Object.keys(storageStats.filesByType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione per Tipo di File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(storageStats.filesByType).map(([type, count]) => (
                  <Card key={type} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(`${type}/example`)}
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Issues Alert */}
        {attachments.some(att => att.virus_scan_status === 'infected') && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Avviso Sicurezza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700">
                Sono stati rilevati {attachments.filter(att => att.virus_scan_status === 'infected').length} file 
                potenzialmente pericolosi che sono stati bloccati automaticamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Preview Dialog */}
      <DocumentPreview
        attachment={previewAttachment}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default DocumentsAdminPage;