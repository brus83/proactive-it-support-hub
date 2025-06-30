import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, Tag, MessageSquare, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onTicketUpdated?: () => void;
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  contact_name?: string;
  assigned_to?: string;
  resolution_notes?: string;
  categories?: {
    name: string;
    color: string;
  };
  assigned_user?: {
    full_name: string;
  };
  creator?: {
    full_name: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string;
    role: string;
  };
}

const TicketDetailDialog = ({ isOpen, onClose, ticketId, onTicketUpdated }: TicketDetailDialogProps) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color),
          assigned_user:profiles!tickets_assigned_to_fkey (full_name),
          creator:profiles!tickets_user_id_fkey (full_name)
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      setTicket(ticketData as any);
      setNewStatus(ticketData.status);

      // Per ora simuliamo i commenti, in futuro si potrebbe aggiungere una tabella comments
      setComments([]);
    } catch (error) {
      console.error('Errore caricamento dettagli ticket:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli del ticket",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!ticket || newStatus === ticket.status) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' && !ticket.resolution_notes) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Stato aggiornato",
        description: `Il ticket è ora: ${getStatusText(newStatus as any)}`,
      });

      await fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (error) {
      console.error('Errore aggiornamento stato:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del ticket",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    // Per ora aggiungiamo solo una nota al ticket
    setSubmitting(true);
    try {
      const currentNotes = ticket?.resolution_notes || '';
      const timestamp = new Date().toLocaleString('it-IT');
      const authorName = profile?.full_name || 'Utente';
      const newNote = `[${timestamp}] ${authorName}: ${newComment.trim()}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;

      const { error } = await supabase
        .from('tickets')
        .update({
          resolution_notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      setNewComment("");
      toast({
        title: "Commento aggiunto",
        description: "Il commento è stato aggiunto al ticket",
      });

      await fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (error) {
      console.error('Errore aggiunta commento:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il commento",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Aperto";
      case "in_progress": return "In Lavorazione";
      case "resolved": return "Risolto";
      case "closed": return "Chiuso";
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent": return "Urgente";
      case "high": return "Alta";
      case "medium": return "Media";
      case "low": return "Bassa";
      default: return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Errore</DialogTitle>
            <DialogDescription>
              Impossibile caricare i dettagli del ticket.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const canEdit = profile?.role === 'admin' || profile?.role === 'technician' || ticket.assigned_to === profile?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Ticket #{ticket.id.substring(0, 8).toUpperCase()}</span>
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusText(ticket.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Dettagli e gestione del ticket
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dettagli principali */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{ticket.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>

            {/* Note e commenti */}
            {ticket.resolution_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Note e Commenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">
                    {ticket.resolution_notes}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aggiungi commento */}
            <Card>
              <CardHeader>
                <CardTitle>Aggiungi Commento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comment">Nuovo Commento</Label>
                  <Textarea
                    id="comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Scrivi un commento o aggiornamento..."
                    className="min-h-24"
                  />
                </div>
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Invio..." : "Aggiungi Commento"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar con informazioni */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Priorità</Label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {getPriorityText(ticket.priority)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Categoria</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {ticket.categories?.name || 'Non categorizzato'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Creato da</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.contact_name || ticket.creator?.full_name || 'Sconosciuto'}
                  </p>
                </div>

                {ticket.assigned_user && (
                  <div>
                    <Label className="text-sm font-medium">Assegnato a</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.assigned_user.full_name}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Data Creazione</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.created_at).toLocaleString('it-IT')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Ultimo Aggiornamento</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.updated_at).toLocaleString('it-IT')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Gestione stato (solo per admin/tecnici) */}
            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestione Stato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Cambia Stato</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aperto</SelectItem>
                        <SelectItem value="in_progress">In Lavorazione</SelectItem>
                        <SelectItem value="resolved">Risolto</SelectItem>
                        {profile?.role === 'admin' && (
                          <SelectItem value="closed">Chiuso</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {newStatus !== ticket.status && (
                    <Button 
                      onClick={handleStatusUpdate}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? "Aggiornamento..." : "Aggiorna Stato"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;