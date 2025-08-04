import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Eye, 
  Trash2, 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FolderOpen,
  Calendar,
  User,
  Shield
} from "lucide-react";
import { documentService, TicketAttachment } from "@/services/documentService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DocumentViewerProps {
  ticketId: string;
  onDocumentDeleted?: () => void;
  className?: string;
}

const DocumentViewer = ({ ticketId, onDocumentDeleted, className }: DocumentViewerProps) => {
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadAttachments = async () => {
    try {
      const data = await documentService.getTicketAttachments(ticketId);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast.error("Errore nel caricamento dei documenti");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: TicketAttachment) => {
    setDownloading(attachment.id);
    try {
      const downloadUrl = await documentService.getDownloadUrl(attachment.id);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Download avviato: ${attachment.file_name}`);
      
      // Refresh to update download count
      loadAttachments();
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Errore durante il download");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (attachment: TicketAttachment) => {
    try {
      await documentService.deleteAttachment(attachment.id);
      toast.success(`File eliminato: ${attachment.file_name}`);
      loadAttachments();
      onDocumentDeleted?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Errore nell'eliminazione del file");
    }
  };

  const getFileIcon = (mimeType: string) => {
    const category = documentService.getFileCategory(mimeType);
    
    switch (category) {
      case 'image':
        return <Image className="h-6 w-6 text-green-600" />;
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
      case 'word':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'video':
        return <FileVideo className="h-6 w-6 text-purple-600" />;
      case 'audio':
        return <FileAudio className="h-6 w-6 text-orange-600" />;
      default:
        return <File className="h-6 w-6 text-gray-600" />;
    }
  };

  const getSecurityBadge = (status: string) => {
    switch (status) {
      case 'clean':
        return <Badge variant="outline" className="text-green-600 border-green-200">
          <Shield className="h-3 w-3 mr-1" />
          Sicuro
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">
          <Shield className="h-3 w-3 mr-1" />
          Scansione...
        </Badge>;
      case 'infected':
        return <Badge variant="destructive">
          <Shield className="h-3 w-3 mr-1" />
          Bloccato
        </Badge>;
      default:
        return <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          Errore Scan
        </Badge>;
    }
  };

  const canDelete = (attachment: TicketAttachment) => {
    return profile?.role === 'admin' || 
           profile?.role === 'technician' || 
           attachment.uploaded_by === profile?.id;
  };

  useEffect(() => {
    loadAttachments();
  }, [ticketId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attachments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documenti Allegati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun documento allegato</p>
            <p className="text-sm mt-1">Usa il modulo di upload per aggiungere file</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Documenti Allegati ({attachments.length})
        </CardTitle>
        <CardDescription>
          File e documenti associati a questo ticket
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(attachment.mime_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {attachment.file_name}
                        </h4>
                        {getSecurityBadge(attachment.virus_scan_status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <File className="h-3 w-3" />
                          {documentService.formatFileSize(attachment.file_size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(attachment.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {attachment.uploader?.full_name || 'Utente'}
                        </span>
                      </div>

                      {attachment.download_count > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <Download className="h-3 w-3 inline mr-1" />
                          {attachment.download_count} download
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      disabled={downloading === attachment.id || attachment.virus_scan_status !== 'clean'}
                    >
                      {downloading === attachment.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>

                    {canDelete(attachment) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina Documento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare il file "{attachment.file_name}"? 
                              Questa azione non può essere annullata.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(attachment)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* File preview for images */}
                {attachment.mime_type.startsWith('image/') && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizza Anteprima
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DocumentViewer;