import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesSelected?: (files: FileList) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, onFilesSelected, maxFiles = 10, acceptedTypes, maxSize, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && onFilesSelected) {
        onFilesSelected(files);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && onFilesSelected) {
        onFilesSelected(files);
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary/50 cursor-pointer",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <Upload className={cn(
            "mx-auto h-8 w-8",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
          <div>
            <p className="font-medium">
              {isDragging ? "Rilascia i file qui" : "Carica file"}
            </p>
            <p className="text-sm text-muted-foreground">
              Trascina e rilascia o clicca per selezionare
            </p>
          </div>
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max {formatFileSize(maxSize)} per file • Max {maxFiles} file
            </p>
          )}
        </div>
        
        <input
          ref={ref}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes?.join(',')}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };