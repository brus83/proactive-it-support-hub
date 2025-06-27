
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lightbulb } from "lucide-react";
import KnowledgeBaseWidget from "./KnowledgeBaseWidget";
import { automationService, KnowledgeBase } from "@/services/automationService";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const CreateTicketDialog = ({ isOpen, onClose, onTicketCreated }: CreateTicketDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [categoryId, setCategoryId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [kbSuggestions, setKbSuggestions] = useState<KnowledgeBase[]>([]);
  const [showKB, setShowKB] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (profile?.full_name) {
        setContactName(profile.full_name);
      }
    }
  }, [isOpen, profile]);

  // Auto-suggest dalla KB mentre l'utente scrive
  useEffect(() => {
    const searchTerm = title + " " + description;
    if (searchTerm.trim().length > 3) {
      searchKnowledgeBase(searchTerm.trim());
    } else {
      setKbSuggestions([]);
    }
  }, [title, description]);

  const searchKnowledgeBase = async (query: string) => {
    try {
      const suggestions = await automationService.getKBSuggestions(query);
      setKbSuggestions(suggestions.slice(0, 3));
      setShowKB(suggestions.length > 0);
    } catch (error) {
      console.error('Errore ricerca KB:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      const ticketData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        category_id: categoryId || null,
        contact_name: contactName || profile?.full_name || user.email,
        user_id: user.id,
        status: 'open' as const,
        kb_suggestions: kbSuggestions.map(kb => ({
          id: kb.id,
          title: kb.title,
          relevance: 'high'
        }))
      };

      // Inserisci il ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Log dei suggerimenti KB se presenti
      if (kbSuggestions.length > 0) {
        await supabase
          .from('automation_logs')
          .insert({
            ticket_id: ticket.id,
            action_type: 'kb_suggestion',
            action_details: {
              suggestions_count: kbSuggestions.length,
              suggestions: kbSuggestions.map(kb => kb.title)
            }
          });
      }

      // Invia email di conferma automatica
      try {
        await supabase.functions.invoke('send-ticket-confirmation-email', {
          body: { 
            ticketId: ticket.id,
            userEmail: user.email,
            ticketTitle: title,
            ticketNumber: ticket.id.substring(0, 8).toUpperCase(),
            priority: priority,
            contactName: contactName || profile?.full_name || user.email
          }
        });
        
        // Aggiorna il flag response_sent
        await supabase
          .from('tickets')
          .update({ response_sent: true })
          .eq('id', ticket.id);

      } catch (emailError) {
        console.error('Errore invio email conferma:', emailError);
        // Non bloccare la creazione del ticket per errori email
      }

      toast({
        title: "Ticket creato!",
        description: `Il ticket #${ticket.id.substring(0, 8).toUpperCase()} è stato creato con successo. ${kbSuggestions.length > 0 ? 'Controlla i suggerimenti dalla knowledge base.' : ''}`,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategoryId("");
      setContactName("");
      setKbSuggestions([]);
      setShowKB(false);
      
      onTicketCreated();
      onClose();
    } catch (error) {
      console.error('Errore creazione ticket:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il ticket. Riprova.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKbSuggestionClick = (article: KnowledgeBase) => {
    // Mostra il contenuto dell'articolo in un toast o dialog
    toast({
      title: article.title,
      description: article.content.replace(/<[^>]*>/g, '').substring(0, 200) + "...",
      duration: 10000,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Ticket</DialogTitle>
          <DialogDescription>
            Compila i dettagli del problema. Il sistema suggerirà automaticamente soluzioni dalla knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name">Nome Contatto</Label>
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Il tuo nome"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priorità</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bassa</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Oggetto *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Breve descrizione del problema"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrizione *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi il problema in dettaglio"
                  className="min-h-32"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crea Ticket
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Knowledge Base Suggestions */}
          <div className="lg:col-span-1">
            {showKB && kbSuggestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Soluzioni Suggerite
                </div>
                
                <div className="space-y-3">
                  {kbSuggestions.map((suggestion) => (
                    <div 
                      key={suggestion.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleKbSuggestionClick(suggestion)}
                    >
                      <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {suggestion.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                      
                      {suggestion.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {suggestion.keywords.slice(0, 3).map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  💡 Clicca su un suggerimento per vedere la soluzione completa
                </p>
              </div>
            )}

            {!showKB && (
              <div className="p-4 border rounded-lg text-center text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Inizia a scrivere il problema per ricevere suggerimenti automatici dalla knowledge base
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketDialog;
