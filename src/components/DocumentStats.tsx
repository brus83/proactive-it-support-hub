import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  BarChart3,
  HardDrive,
  Download,
  Calendar
} from "lucide-react";
import { documentService, TicketAttachment } from "@/services/documentService";
import { useAuth } from "@/hooks/useAuth";

interface DocumentStatsProps {
  ticketId?: string;
  className?: string;
}

const DocumentStats = ({ ticketId, className }: DocumentStatsProps) => {
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const loadData = async () => {
    try {
      if (ticketId) {
        // Load attachments for specific ticket
        const data = await documentService.getTicketAttachments(ticketId);
        setAttachments(data);
      }

      // Load global stats if admin/technician
      if (profile?.role === 'admin' || profile?.role === 'technician') {
        const stats = await documentService.getStorageStats();
        setGlobalStats(stats);
      }
    } catch (error) {
      console.error('Error loading document stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTicketStats = () => {
    if (!ticketId || attachments.length === 0) return null;

    const totalSize = attachments.reduce((sum, att) => sum + att.file_size, 0);
    const totalDownloads = attachments.reduce((sum, att) => sum + att.download_count, 0);
    
    const filesByType = attachments.reduce((acc, att) => {
      const category = documentService.getFileCategory(att.mime_type);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles: attachments.length,
      totalSize,
      totalDownloads,
      filesByType
    };
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4 text-green-600" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-600" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'word': return <FileText className="h-4 w-4 text-blue-600" />;
      default: return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Immagini';
      case 'pdf': return 'PDF';
      case 'excel': return 'Excel';
      case 'word': return 'Word';
      case 'text': return 'Testo';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      default: return 'Altri';
    }
  };

  useEffect(() => {
    loadData();
  }, [ticketId, profile]);

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

  const ticketStats = calculateTicketStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Ticket-specific stats */}
      {ticketId && ticketStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiche Ticket
            </CardTitle>
            <CardDescription>
              Analisi dei documenti allegati a questo ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{ticketStats.totalFiles}</div>
                <div className="text-sm text-muted-foreground">File Totali</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documentService.formatFileSize(ticketStats.totalSize)}
                </div>
                <div className="text-sm text-muted-foreground">Dimensione</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{ticketStats.totalDownloads}</div>
                <div className="text-sm text-muted-foreground">Download</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(ticketStats.filesByType).length}
                </div>
                <div className="text-sm text-muted-foreground">Tipi File</div>
              </div>
            </div>

            {Object.keys(ticketStats.filesByType).length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Distribuzione per Tipo</h4>
                <div className="space-y-2">
                  {Object.entries(ticketStats.filesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(type)}
                        <span className="text-sm">{getFileTypeLabel(type)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(count / ticketStats.totalFiles) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global system stats (admin/technician only) */}
      {globalStats && (profile?.role === 'admin' || profile?.role === 'technician') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Statistiche Sistema
            </CardTitle>
            <CardDescription>
              Panoramica utilizzo storage a livello sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{globalStats.totalFiles}</div>
                <div className="text-sm text-muted-foreground">File Totali</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documentService.formatFileSize(globalStats.totalSize)}
                </div>
                <div className="text-sm text-muted-foreground">Storage Usato</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{globalStats.recentUploads}</div>
                <div className="text-sm text-muted-foreground">Upload Settimana</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(globalStats.filesByType).length}
                </div>
                <div className="text-sm text-muted-foreground">Tipi Diversi</div>
              </div>
            </div>

            {/* Storage usage progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilizzo Storage</span>
                <span>{documentService.formatFileSize(globalStats.totalSize)} / 10GB</span>
              </div>
              <Progress value={(globalStats.totalSize / (10 * 1024 * 1024 * 1024)) * 100} />
            </div>

            {/* File type distribution */}
            {Object.keys(globalStats.filesByType).length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Distribuzione Globale per Tipo</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(globalStats.filesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(type)}
                        <span className="text-sm">{getFileTypeLabel(type)}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentStats;