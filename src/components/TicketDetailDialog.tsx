import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, MessageSquare, MapPin, BookOpenCheck, Lightbulb, Send, Loader2, X, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import StoreSuggestionsWidget from "./StoreSuggestionsWidget";
import MLSuggestionsWidget from "./MLSuggestionsWidget";
import KnowledgeBaseWidget from "./KnowledgeBaseWidget";
import WorkflowWidget from './WorkflowWidget';
import TicketClosureDialog from "./TicketClosureDialog";
import ReminderManager from "./ReminderManager";
import DocumentManager from "./DocumentManager";

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
  assigned_user?: {
    full_name: string;
  } | null;
}

const TicketDetailDialog = ({ isOpen, onClose, ticketId, onTicketUpdated }: TicketDetailDialogProps) => {
  const { user, profile } = useAuth();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [closureDialog, setClosureDialog] = useState({
    isOpen: false,
    ticketId: '',
    ticketTitle: '',
    contactName: ''
  });

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
          profiles!tickets_user_id_fkey (full_name),
          assigned_user:profiles!tickets_assigned_to_fkey (full_name)
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

  const handleCloseTicket = () => {
    if (!ticket) return;
    
    setClosureDialog({
      isOpen: true,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      contactName: ticket.contact_name || ticket.profiles?.full_name || 'Cliente'
    });
  };

  const handleTicketClosed = () => {
    fetchTicketDetails();
    onTicketUpdated();
    setClosureDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleSuggestionApply = (suggestion: string) => {
    setNewComment(prev => prev + (prev ? '\n\n' : '') + suggestion);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  };

  const canCloseTicket = () => {
    return ticket && 
           ticket.status === 'resolved' && 
           (profile?.role === 'admin' || profile?.role === 'technician');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Dettagli Ticket</DialogTitle>
              {canCloseTicket() && (
                <Button
                  onClick={handleCloseTicket}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Chiudi Ticket
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : ticket ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonna principale - Ticket, Commenti e Documenti */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informazioni principali del ticket */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${ticket?.profiles?.full_name}.png`} />
                        <AvatarFallback>{ticket?.profiles?.full_name?.charAt(0).toUpperCase() || 'UT'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <DialogTitle className="text-lg">{ticket.title}</DialogTitle>
                        <DialogDescription className="text-gray-500">
                          Creato da {ticket?.profiles?.full_name} il {formatDate(ticket.created_at)}
                        </DialogDescription>
                      </div>
                      <div className="flex flex-col gap-2">
                        {ticket.categories && (
                          <Badge className="gap-2">
                            <Lightbulb className="h-4 w-4" />
                            {ticket.categories.name}
                          </Badge>
                        )}
                        <Badge variant={
                          ticket.status === 'open' ? 'destructive' :
                          ticket.status === 'in_progress' ? 'default' :
                          ticket.status === 'resolved' ? 'secondary' : 'outline'
                        }>
                          {ticket.status === 'open' ? 'Aperto' :
                           ticket.status === 'in_progress' ? 'In Lavorazione' :
                           ticket.status === 'resolved' ? 'Risolto' : 'Chiuso'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>{ticket.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Priorità</Label>
                        <div className="font-semibold capitalize">{ticket.priority}</div>
                      </div>
                      <div>
                        <Label>Assegnato a</Label>
                        <div className="font-semibold">
                          {ticket.assigned_user?.full_name || 'Non assegnato'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow Widget */}
                <WorkflowWidget ticketId={ticketId} />

                {/* Tabs per Commenti e Documenti */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Commenti ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Documenti
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="comments" className="space-y-4">
                    {/* Sezione commenti */}
                    <Card>
                      <CardContent className="space-y-4 pt-6">
                        {comments.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <MessageCircle className="h-5 w-5 mx-auto mb-2" />
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
                              rows={4}
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
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    {/* Gestione Documenti */}
                    <DocumentManager
                      ticketId={ticketId}
                      defaultTab="view"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar - Suggerimenti */}
              <div className="space-y-6">
                {/* Reminder Manager */}
                <ReminderManager ticketId={ticket.id} />

                {/* ML Suggestions Widget */}
                <MLSuggestionsWidget
                  ticketTitle={ticket.title}
                  ticketDescription={ticket.description}
                  ticketId={ticket.id}
                  onSuggestionApply={handleSuggestionApply}
                />

                {/* Knowledge Base Widget */}
                <KnowledgeBaseWidget
                  searchQuery={`${ticket.title} ${ticket.description}`}
                />

                {/* Store Suggestions Widget */}
                <StoreSuggestionsWidget
                  ticketTitle={ticket.title}
                  ticketDescription={ticket.description}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              Ticket non trovato
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per chiudere ticket */}
      <TicketClosureDialog
        isOpen={closureDialog.isOpen}
        onClose={() => setClosureDialog(prev => ({ ...prev, isOpen: false }))}
        ticketId={closureDialog.ticketId}
        ticketTitle={closureDialog.ticketTitle}
        contactName={closureDialog.contactName}
        onTicketClosed={handleTicketClosed}
      />
    </>
  );
};

export default TicketDetailDialog;