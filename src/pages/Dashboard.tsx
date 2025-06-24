
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";
import TicketCard from "@/components/TicketCard";
import CreateTicketDialog from "@/components/CreateTicketDialog";

// Mock data per i ticket - in un'app reale verrebbe da API/database
const mockTickets = [
  {
    id: "T-001",
    title: "Problema accesso Wi-Fi ufficio",
    description: "Non riesco a connettermi alla rete Wi-Fi dell'ufficio da questa mattina",
    status: "in_progress" as const,
    priority: "high" as const,
    category: "network",
    createdAt: new Date("2024-06-20"),
    updatedAt: new Date("2024-06-24"),
    assignedTo: "Marco Rossi"
  },
  {
    id: "T-002", 
    title: "Richiesta installazione software",
    description: "Ho bisogno di Adobe Photoshop per il nuovo progetto",
    status: "pending" as const,
    priority: "medium" as const,
    category: "software",
    createdAt: new Date("2024-06-22"),
    updatedAt: new Date("2024-06-23"),
    assignedTo: "Sara Bianchi"
  },
  {
    id: "T-003",
    title: "Monitor secondario non funziona",
    description: "Il monitor dell'ufficio 205 non si accende più",
    status: "resolved" as const,
    priority: "low" as const,
    category: "hardware",
    createdAt: new Date("2024-06-18"),
    updatedAt: new Date("2024-06-21"),
    assignedTo: "Luca Verde"
  }
];

const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const statusCounts = {
    total: mockTickets.length,
    pending: mockTickets.filter(t => t.status === 'pending').length,
    in_progress: mockTickets.filter(t => t.status === 'in_progress').length,
    resolved: mockTickets.filter(t => t.status === 'resolved').length
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sistema Ticketing IT</h1>
            <p className="text-muted-foreground">Gestisci le tue richieste di supporto</p>
          </div>
          <Button 
            size="lg" 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Ticket
          </Button>
        </div>

        {/* Statistiche Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Ticket</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Lavorazione</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.in_progress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risolti</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>I Tuoi Ticket</CardTitle>
            <CardDescription>
              Panoramica completa delle tue richieste di supporto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dialog per creare nuovo ticket */}
        <CreateTicketDialog 
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;
