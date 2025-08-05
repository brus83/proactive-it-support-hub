import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { documentService, UploadProgress } from "@/services/documentService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploaderProps {
  ticketId: string;
  onUploadComplete?: () => void;
  className?: string;
}

const DocumentUploader = ({ ticketId, onUploadComplete, className }: DocumentUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8 text-green-600" />;
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8 text-red-600" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    if (file.type.includes('word') || file.type.includes('document')) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }
    return <File className="h-8 w-8 text-gray-600" />;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, [ticketId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploads(files.map(file => ({
      file,
        // Basic validation here since validateFile is private
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`Il file ${file.name} è troppo grande. Dimensione massima: 50MB`);
        }
        if (file.size === 0) {
          throw new Error(`Il file ${file.name} è vuoto`);
        }
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
          throw new Error(`Nome file non valido: ${file.name}`);
        }
      status: 'uploading'
    })));

    try {
      console.log('Starting upload for', files.length, 'files to ticket:', ticketId);
      await documentService.uploadFiles(
        ticketId,
        files,
        (progressArray) => {
          setUploads(progressArray);
        }
      );

      // Mark all as completed
      setUploads(prev => prev.map(upload => ({
        ...upload,
        progress: 100,
        status: 'completed'
      })));

      toast.success(`${files.length} file caricati con successo!`);
      onUploadComplete?.();

      // Clear uploads after delay
      setTimeout(() => {
        setUploads([]);
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'error'
      })));
      toast.error("Errore durante l'upload dei file");
    } finally {
      setIsUploading(false);
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    return documentService.formatFileSize(bytes);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Allega Documenti
        </CardTitle>
        <CardDescription>
          Carica screenshot, report, contratti e altri documenti (max 50MB per file)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            !isUploading ? "cursor-pointer hover:border-primary/50" : "cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <Upload className={cn(
              "mx-auto h-12 w-12",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            
            <div>
              <p className="text-lg font-medium">
                {isDragging ? "Rilascia i file qui" : "Trascina i file qui"}
              </p>
              <p className="text-sm text-muted-foreground">
                Oppure clicca per selezionare
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">JPG, PNG, GIF</Badge>
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">Excel (XLS, XLSX)</Badge>
              <Badge variant="outline">Word (DOC, DOCX)</Badge>
              <Badge variant="outline">ZIP</Badge>
            </div>

            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Upload in corso:</h4>
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {upload.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : upload.status === 'error' ? (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  )}
                </div>
                
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(upload.file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(upload.file.size)}
                    </p>
                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} className="mt-1 h-2" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={
                    upload.status === 'completed' ? 'default' :
                    upload.status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {upload.status === 'completed' ? 'Completato' :
                     upload.status === 'error' ? 'Errore' : 'Caricamento'}
                  </Badge>
                  
                  {upload.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Dimensione massima per file: 50MB</p>
          <p>• Formati supportati: Immagini, PDF, Excel, Word, file di testo</p>
          <p>• Tutti i file vengono automaticamente scansionati per virus</p>
          <p>• Solo gli utenti con accesso al ticket possono visualizzare i documenti</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUploader;