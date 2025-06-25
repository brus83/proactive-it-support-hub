
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, AlertCircle, LogOut, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TicketCard from "@/components/TicketCard";
import CreateTicketDialog from "@/components/CreateTicketDialog";
import AIKeySetup from "@/components/AIKeySetup";

interface DatabaseTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id: string;
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
    color: string;
  };
  profiles?: {
    full_name: string;
  };
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const statusCounts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  const handleApiKeySet = (apiKey: string) => {
    localStorage.setItem('openai_api_key', apiKey);
    setHasApiKey(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'technician': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore';
      case 'technician': return 'Tecnico';
      default: return 'Utente';
    }
  };

  // Convert database ticket to TicketCard format
  const convertToTicketCardFormat = (dbTicket: DatabaseTicket) => ({
    id: dbTicket.id,
    title: dbTicket.title,
    description: dbTicket.description,
    status: dbTicket.status as "pending" | "in_progress" | "resolved",
    priority: dbTicket.priority as "low" | "medium" | "high",
    category: dbTicket.categories?.name || 'Non categorizzato',
    createdAt: new Date(dbTicket.created_at),
    updatedAt: new Date(dbTicket.updated_at),
    assignedTo: dbTicket.profiles?.full_name
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with User Info */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sistema Ticketing IT</h1>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-muted-foreground">
                Benvenuto, {profile?.full_name || user?.email}
              </p>
              <Badge className={getRoleColor(profile?.role || 'user')}>
                {getRoleLabel(profile?.role || 'user')}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              size="lg" 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Ticket
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <User className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* AI Setup */}
        <AIKeySetup 
          onApiKeySet={handleApiKeySet}
          hasApiKey={hasApiKey || !!localStorage.getItem('openai_api_key')}
        />

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
              <CardTitle className="text-sm font-medium">Aperti</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statusCounts.open}</div>
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
            <CardTitle>
              {profile?.role === 'admin' || profile?.role === 'technician' 
                ? 'Tutti i Ticket' 
                : 'I Tuoi Ticket'
              }
            </CardTitle>
            <CardDescription>
              {profile?.role === 'admin' || profile?.role === 'technician'
                ? 'Panoramica completa di tutti i ticket nel sistema'
                : 'Panoramica delle tue richieste di supporto'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Nessun ticket trovato</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={convertToTicketCardFormat(ticket)} />
                ))
              )}
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
