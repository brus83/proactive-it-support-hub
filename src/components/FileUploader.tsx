
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface FileUploaderProps {
  onDataParsed: (data: any[]) => void;
}

const FileUploader = ({ onDataParsed }: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      if (file.name.endsWith('.csv')) {
        // Processa CSV
        const text = new TextDecoder().decode(arrayBuffer);
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        onDataParsed(data);
        toast.success(`File CSV processato: ${data.length} righe importate`);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processa Excel
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        onDataParsed(data);
        toast.success(`File Excel processato: ${data.length} righe importate`);
      } else {
        toast.error("Formato file non supportato. Usa CSV o Excel (.xlsx/.xls)");
      }
    } catch (error) {
      console.error('Errore nel processare il file:', error);
      toast.error("Errore nel processare il file");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Carica File Dati
        </CardTitle>
        <CardDescription>
          Carica un file CSV o Excel (.xlsx/.xls) contenente i dati dei ticket da importare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Trascina un file qui o clicca per selezionare
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={processFile}
                disabled={isProcessing}
                size="sm"
              >
                {isProcessing ? "Elaborazione..." : "Elabora"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Formati supportati:</strong> CSV, Excel (.xlsx, .xls)</p>
          <p><strong>Struttura consigliata:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Nome contatto</li>
            <li>ID Ticket</li>
            <li>Oggetto</li>
            <li>Proprietario Ticket</li>
            <li>Stato</li>
            <li>Priorità</li>
            <li>Canale</li>
            <li>Ora di creazione</li>
            <li>Ora di chiusura</li>
            <li>Tipologia</li>
            <li>Dipartimento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;
