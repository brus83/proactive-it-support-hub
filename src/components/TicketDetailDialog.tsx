import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Comment, MessageSquare, MapPin, BookOpenCheck, Lightbulb, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import StoreSuggestions from "./StoreSuggestions";
import MLSuggestions from "./MLSuggestions";
import KnowledgeBaseSuggestions from "./KnowledgeBaseSuggestions";
import WorkflowWidget from './WorkflowWidget';

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onTicketUpdated: () => void;
}

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface TicketData {
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

const TicketDetailDialog = ({ isOpen, onClose, ticketId, onTicketUpdated }: TicketDetailDialogProps) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
      fetchComments();
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color),
          profiles!tickets_user_id_fkey (full_name)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error("Errore nel caricamento dei dettagli del ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error("Errore nel caricamento dei commenti");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmittingComment(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            ticket_id: ticketId,
            user_id: user.id,
            content: newComment,
          }
        ]);

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast.success("Commento aggiunto!");
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error("Errore nell'aggiunta del commento");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettagli Ticket</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Informazioni principali del ticket */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={`https://avatar.vercel.sh/${ticket?.profiles?.full_name}.png`} />
                    <AvatarFallback>{ticket?.profiles?.full_name?.charAt(0).toUpperCase() || 'UT'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg">{ticket.title}</DialogTitle>
                    <DialogDescription className="text-gray-500">
                      Creato da {ticket?.profiles?.full_name} il {formatDate(ticket.created_at)}
                    </DialogDescription>
                  </div>
                </div>
                <div className="ml-auto">
                  {ticket.categories && (
                    <Badge className="gap-2">
                      <Lightbulb className="h-4 w-4" />
                      {ticket.categories.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{ticket.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priorità</Label>
                    <div className="font-semibold">{ticket.priority}</div>
                  </div>
                  <div>
                    <Label>Stato</Label>
                    <div className="font-semibold">{ticket.status}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Widget */}
            <WorkflowWidget ticketId={ticketId} />

            {/* Store Suggestions Widget */}
            <StoreSuggestions ticketDescription={ticket.description} />

            {/* ML Suggestions Widget */}
            <MLSuggestions ticketDescription={ticket.description} />

            {/* Knowledge Base Widget */}
            <KnowledgeBaseSuggestions ticketDescription={ticket.description} />

            {/* Sezione commenti */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <DialogTitle className="text-base">
                  <MessageSquare className="mr-2 h-4 w-4 inline-block" />
                  Commenti
                </DialogTitle>
                <Badge variant="secondary">{comments.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Comment className="h-5 w-5 mx-auto mb-2" />
                    Nessun commento presente
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${comment?.profiles?.full_name}.png`} />
                          <AvatarFallback>{comment?.profiles?.full_name?.charAt(0).toUpperCase() || 'UT'}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="text-sm font-bold">{comment?.profiles?.full_name || 'Utente Sconosciuto'}</div>
                          <p className="text-sm text-gray-500">{formatDate(comment.created_at)}</p>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Form per nuovo commento */}
            <Card>
              <CardContent>
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comment">Aggiungi un commento</Label>
                    <Textarea
                      id="comment"
                      placeholder="Scrivi il tuo commento..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingComment}>
                      {isSubmittingComment ? (
                        <>
                          Invio...
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          Invia
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500">
            Ticket non trovato
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;
