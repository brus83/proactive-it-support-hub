import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "view" | "upload" | "stats";

interface DocumentManagerProps {
  ticketId?: string;
  mode?: "ticket" | "admin";
}

export function DocumentManager({ ticketId, mode = "ticket" }: DocumentManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("view");

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestione Documenti</CardTitle>
        <CardDescription>
          {mode === "ticket" 
            ? "Carica e visualizza i documenti allegati al ticket" 
            : "Visualizza tutti i documenti del sistema"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">Visualizza</TabsTrigger>
            <TabsTrigger value="upload">Carica</TabsTrigger>
            <TabsTrigger value="stats">Statistiche</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            <div className="text-center py-8 text-muted-foreground">
              Sistema documenti in configurazione...
            </div>
          </TabsContent>
          
          <TabsContent value="upload">
            <div className="text-center py-8 text-muted-foreground">
              Sistema upload in configurazione...
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="text-center py-8 text-muted-foreground">
              Statistiche in configurazione...
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DocumentManager;