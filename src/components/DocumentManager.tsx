import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FolderOpen, BarChart3, RefreshCw } from "lucide-react";
import DocumentUploader from "./DocumentUploader";
import DocumentViewer from "./DocumentViewer";
import DocumentStats from "./DocumentStats";
import { cn } from "@/lib/utils";

interface DocumentManagerProps {
  ticketId: string;
  className?: string;
  defaultTab?: 'upload' | 'view' | 'stats';
}

const DocumentManager = ({ 
  ticketId, 
  className,
  defaultTab = 'view'
}: DocumentManagerProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('view');
  };

  const handleDocumentDeleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Gestione Documenti
            </CardTitle>
            <CardDescription>
              Upload, visualizza e gestisci i documenti allegati al ticket
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Visualizza
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Carica
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-6">
            <DocumentViewer
              key={`viewer-${refreshKey}`}
              ticketId={ticketId}
              onDocumentDeleted={handleDocumentDeleted}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <DocumentUploader
              ticketId={ticketId}
              onUploadComplete={handleUploadComplete}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <DocumentStats
              key={`stats-${refreshKey}`}
              ticketId={ticketId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentManager;