import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Eye,
  FileText,
  AlertTriangle
} from "lucide-react";
import { TicketAttachment, documentService } from "@/services/documentService";
import { toast } from "sonner";

interface DocumentPreviewProps {
  attachment: TicketAttachment | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentPreview = ({ attachment, isOpen, onClose }: DocumentPreviewProps) => {
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    if (!attachment) return;
    
    setDownloading(true);
    try {
      const downloadUrl = await documentService.getDownloadUrl(attachment.id);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Download avviato: ${attachment.file_name}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Errore durante il download");
    } finally {
      setDownloading(false);
    }
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
    setImageError(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderPreview = () => {
    if (!attachment) return null;

    const isImage = attachment.mime_type.startsWith('image/');
    const isPdf = attachment.mime_type === 'application/pdf';
    const isText = attachment.mime_type.startsWith('text/');

    if (attachment.virus_scan_status !== 'clean') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">File Non Disponibile</h3>
          <p className="text-sm text-muted-foreground">
            Questo file non ha superato la scansione di sicurezza
          </p>
          <Badge variant="destructive" className="mt-2">
            {attachment.virus_scan_status === 'pending' ? 'Scansione in corso' : 
             attachment.virus_scan_status === 'infected' ? 'File infetto' : 'Errore scansione'}
          </Badge>
        </div>
      );
    }

    if (isImage && !imageError) {
      return (
        <div className="flex justify-center">
          <img
            src={`/api/attachments/${attachment.id}/preview`}
            alt={attachment.file_name}
            className="max-w-full max-h-96 object-contain transition-transform"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="h-16 w-16 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Documento PDF</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {attachment.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            L'anteprima PDF non è disponibile. Scarica il file per visualizzarlo.
          </p>
        </div>
      );
    }

    if (isText) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="h-16 w-16 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">File di Testo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {attachment.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Scarica il file per visualizzare il contenuto completo.
          </p>
        </div>
      );
    }

    // Default preview for other file types
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Eye className="h-16 w-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Anteprima Non Disponibile</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {attachment.file_name}
        </p>
        <p className="text-xs text-muted-foreground">
          Questo tipo di file non supporta l'anteprima. Scarica il file per visualizzarlo.
        </p>
      </div>
    );
  };

  const showImageControls = attachment?.mime_type.startsWith('image/') && !imageError;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Anteprima Documento
            </DialogTitle>
            <div className="flex items-center gap-2">
              {showImageControls && (
                <>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Badge variant="outline">{zoom}%</Badge>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {attachment && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-medium">{attachment.file_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {documentService.formatFileSize(attachment.file_size)} • 
                  Caricato da {attachment.uploader?.full_name || 'Utente'} • 
                  {attachment.download_count} download
                </p>
              </div>
              <Badge variant={
                attachment.virus_scan_status === 'clean' ? 'default' :
                attachment.virus_scan_status === 'pending' ? 'secondary' : 'destructive'
              }>
                {attachment.virus_scan_status === 'clean' ? 'Sicuro' :
                 attachment.virus_scan_status === 'pending' ? 'Scansione...' : 'Bloccato'}
              </Badge>
            </div>

            {/* Preview area */}
            <div className="border rounded-lg p-4 bg-background min-h-[400px] overflow-auto">
              {renderPreview()}
            </div>

            {imageError && (
              <div className="text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p>Impossibile caricare l'anteprima dell'immagine</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetView}
                  className="mt-2"
                >
                  Riprova
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;