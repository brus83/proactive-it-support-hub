
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Tag, MessageSquare, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import KnowledgeBaseWidget from "./KnowledgeBaseWidget";
import StoreSuggestionsWidget from "./StoreSuggestionsWidget";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id: string | null;
  category?: Category | null;
  user_id: string;
  user?: {
    full_name: string | null;
    email: string;
  };
  assigned_to: string | null;
  assigned_user?: {
    full_name: string | null;
  };
  created_at: string;
  updated_at: string;
  comments?: Comment[];
  resolved_at: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-green-100 text-green-800 border-green-200";
    case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
    case "resolved": return "bg-gray-100 text-gray-800 border-gray-200";
    case "closed": return "bg-gray-100 text-gray-800 border-gray-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "bg-red-100 text-red-800 border-red-200";
    case "medium": return "bg-orange-100 text-orange-800 border-orange-200";
    case "low": return "bg-gray-100 text-gray-800 border-gray-200";
    case "urgent": return "bg-red-500 text-white border-red-600";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
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
    case "high": return "Alta";
    case "medium": return "Media";
    case "low": return "Bassa";
    case "urgent": return "Urgente";
    default: return priority;
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

interface TicketDetailDialogProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated?: () => void;
}

const TicketDetailDialog: React.FC<TicketDetailDialogProps> = ({
  ticketId,
  isOpen,
  onClose,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (ticketId && isOpen) {
      loadTicketDetails();
    }
  }, [ticketId, isOpen]);

  const loadTicketDetails = async () => {
    setLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          category:categories(id, name, color),
          user:profiles!tickets_user_id_fkey(id, full_name, email),
          assigned_user:profiles!tickets_assigned_to_fkey(id, full_name)
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(id, full_name, email)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Costruisco manualmente l'oggetto ticket con i tipi corretti
      const ticketDetail: TicketDetail = {
        id: ticketData.id,
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priority: ticketData.priority,
        category_id: ticketData.category_id,
        category: ticketData.category as Category,
        user_id: ticketData.user_id,
        user: ticketData.user as { full_name: string | null; email: string },
        assigned_to: ticketData.assigned_to,
        assigned_user: ticketData.assigned_user as { full_name: string | null },
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
        resolved_at: ticketData.resolved_at,
        comments: commentsData?.map(comment => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          user: comment.user as { full_name: string | null; email: string }
        })) || []
      };

      setTicket(ticketDetail);
    } catch (error) {
      console.error('Errore nel caricamento dei dettagli del ticket:', error);
      toast.error('Errore nel caricamento dei dettagli del ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !ticket) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          ticket_id: ticket.id,
          content: comment,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('Commento aggiunto con successo');
      setComment('');
      loadTicketDetails();
    } catch (error) {
      console.error('Errore nell\'aggiunta del commento:', error);
      toast.error('Errore nell\'aggiunta del commento');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!ticket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (error) throw error;

      toast.success('Ticket risolto con successo');
      onTicketUpdated?.();
      onClose();
    } catch (error) {
      console.error('Errore nella risoluzione del ticket:', error);
      toast.error('Errore nella risoluzione del ticket');
    }
  };

  if (!isOpen || !ticketId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Dettagli Ticket #{ticketId.substring(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Caricamento...</div>
          </div>
        ) : ticket ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonna principale - Dettagli ticket */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header del ticket */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{ticket.title}</h2>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusText(ticket.status)}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {getPriorityText(ticket.priority)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Creato da: {ticket.user?.full_name || ticket.user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Creato: {formatDate(new Date(ticket.created_at))}</span>
                  </div>
                  {ticket.assigned_to && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Assegnato a: {ticket.assigned_user?.full_name}</span>
                    </div>
                  )}
                  {ticket.category && (
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4" />
                      <span>Categoria: {ticket.category.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Descrizione */}
              <div>
                <h3 className="font-medium mb-2">Descrizione</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>

              {/* Commenti */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Commenti
                </h3>
                
                <div className="space-y-3 mb-4">
                  {ticket.comments?.map((comment) => (
                    <div key={comment.id} className="bg-muted p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">
                          {comment.user?.full_name || 'Utente sconosciuto'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(comment.created_at))}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                  
                  {!ticket.comments?.length && (
                    <p className="text-muted-foreground text-sm">Nessun commento ancora.</p>
                  )}
                </div>

                {/* Aggiungi commento */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Aggiungi un commento..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddComment}
                      disabled={!comment.trim() || submittingComment}
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Aggiungi Commento
                    </Button>
                    
                    {ticket.status !== 'resolved' && (
                      <Button 
                        onClick={handleResolveTicket}
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Risolvi Ticket
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Widget di supporto */}
            <div className="space-y-4">
              {/* Widget suggerimenti negozi */}
              <StoreSuggestionsWidget 
                ticketTitle={ticket.title}
                ticketDescription={ticket.description}
              />
              
              {/* Widget knowledge base */}
              <KnowledgeBaseWidget 
                searchQuery={`${ticket.title} ${ticket.description}`}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Ticket non trovato</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;
