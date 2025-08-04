import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, AlertCircle, LogOut, User, BarChart3, Database, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import TicketCard from "@/components/TicketCard";
import CreateTicketDialog from "@/components/CreateTicketDialog";
import TicketDetailDialog from "@/components/TicketDetailDialog";
import TicketClosureDialog from "@/components/TicketClosureDialog";
import AIKeySetup from "@/components/AIKeySetup";
import { aiService } from "@/services/aiService";
import ChatbotWidget from "@/components/ChatbotWidget";
import AdminMenuButton from "@/components/AdminMenuButton";
import NotificationCenter from "@/components/NotificationCenter";

interface DatabaseTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  categories?: {
    name: string;
    color: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<'huggingface'>('huggingface');
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [closureDialog, setClosureDialog] = useState<{
    isOpen: boolean;
    ticketId: string;
    ticketTitle: string;
    contactName: string;
  }>({
    isOpen: false,
    ticketId: '',
    ticketTitle: '',
    contactName: ''
  });

  const fetchTickets = async () => {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color),
          profiles!tickets_user_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      // Se l'utente non è admin o tecnico, mostra solo i suoi ticket
      if (profile?.role !== 'admin' && profile?.role !== 'technician') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Type assertion to handle the Supabase query result
      const typedData = data as any[];
      const validTickets: DatabaseTicket[] = typedData?.map(ticket => ({
        ...ticket,
        categories: ticket.categories || null,
        profiles: ticket.profiles || null
      })) || [];
      
      setTickets(validTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [profile, user]);

  const statusCounts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  const handleProviderChange = (provider: 'huggingface') => {
    setCurrentProvider(provider);
    aiService.setProvider(provider);
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
    status: dbTicket.status === 'open' ? 'pending' as const : 
            dbTicket.status === 'in_progress' ? 'in_progress' as const : 
            'resolved' as const,
    priority: dbTicket.priority as "low" | "medium" | "high",
    category: dbTicket.categories?.name || 'Non categorizzato',
    createdAt: new Date(dbTicket.created_at),
    updatedAt: new Date(dbTicket.updated_at),
    assignedTo: dbTicket.profiles?.full_name || undefined
  });

  const handleTicketCreated = async () => {
    await fetchTickets();
  };

  const handleTicketView = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDetailDialogOpen(true);
  };

  const handleTicketEdit = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDetailDialogOpen(true);
  };

  const handleCloseTicket = (ticketId: string, ticketTitle: string, contactName: string) => {
    setClosureDialog({
      isOpen: true,
      ticketId,
      ticketTitle,
      contactName
    });
  };

  const handleTicketClosed = async () => {
    await fetchTickets();
  };

  const handleTicketUpdated = async () => {
    await fetchTickets();
  };

  // Filter tickets based on status
  const getFilteredTickets = (status?: string) => {
    if (!status || status === 'all') return tickets;
    return tickets.filter(t => t.status === status);
  };

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
        {/* Header with User Info and Logo */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Logo NAU! */}
            <img 
              src="/logo.png" 
              alt="NAU! Logo" 
              className="h-12 w-auto"
            />
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
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/statistics">
              <Button variant="outline" size="lg">
                <BarChart3 className="w-4 h-4 mr-2" />
                Statistiche
              </Button>
            </Link>

            {/* Mostra il link per importare dati solo agli admin */}
            {profile?.role === 'admin' && (
              <Link to="/import-data">
                <Button variant="outline" size="lg">
                  <Database className="w-4 h-4 mr-2" />
                  Importa Dati
                </Button>
              </Link>
            )}

            {/* Nuovo link per Dashboard Automazione */}
            {(profile?.role === 'admin' || profile?.role === 'technician') && (
              <Link to="/automation">
                <Button variant="outline" size="lg">
                  <Zap className="w-4 h-4 mr-2" />
                  Automazione
                </Button>
              </Link>
            )}

            {/* Menu Amministrazione */}
            <AdminMenuButton />

            {/* Centro Notifiche */}
            <NotificationCenter />
            
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
          onProviderChange={handleProviderChange}
          currentProvider={currentProvider}
        />

        {/* Tabs per filtrare i ticket */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Tutti ({statusCounts.total})
            </TabsTrigger>
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Aperti ({statusCounts.open})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              In Lavorazione ({statusCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Risolti ({statusCounts.resolved})
            </TabsTrigger>
            <TabsTrigger value="closed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              Chiusi
            </TabsTrigger>
          </TabsList>

          {/* Content for each tab */}
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {status === 'all' ? 'Tutti i Ticket' :
                     status === 'open' ? 'Ticket Aperti' :
                     status === 'in_progress' ? 'Ticket in Lavorazione' :
                     status === 'resolved' ? 'Ticket Risolti' :
                     'Ticket Chiusi'}
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
                    {getFilteredTickets(status === 'all' ? undefined : status).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Nessun ticket trovato per questa categoria</p>
                      </div>
                    ) : (
                      getFilteredTickets(status === 'all' ? undefined : status).map((ticket) => (
                        <div key={ticket.id} className="relative">
                          <TicketCard 
                            ticket={convertToTicketCardFormat(ticket)}
                            onView={handleTicketView}
                            onEdit={handleTicketEdit}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Dialog per creare nuovo ticket */}
        <CreateTicketDialog 
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onTicketCreated={handleTicketCreated}
        />

        {/* Dialog per visualizzare dettagli ticket */}
        <TicketDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          ticketId={selectedTicketId}
          onTicketUpdated={handleTicketUpdated}
        />

        {/* Dialog per chiudere ticket */}
        <TicketClosureDialog
          isOpen={closureDialog.isOpen}
          onClose={() => setClosureDialog(prev => ({ ...prev, isOpen: false }))}
          ticketId={closureDialog.ticketId}
          ticketTitle={closureDialog.ticketTitle}
          contactName={closureDialog.contactName}
          onTicketClosed={handleTicketClosed}
        />

        {/* Chatbot Widget */}
        <ChatbotWidget />
      </div>
    </div>
  );
};

export default Dashboard;