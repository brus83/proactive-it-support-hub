import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle } from "lucide-react";

interface TicketMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTicketId: string;
  sourceTicketTitle: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

export function TicketMergeDialog({ isOpen, onClose, sourceTicketId, sourceTicketTitle }: TicketMergeDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTargetTicket, setSelectedTargetTicket] = useState<string>("");
  const [mergeReason, setMergeReason] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const searchTickets = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, created_at')
        .neq('id', sourceTicketId)
        .eq('is_merged', false)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching tickets:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca dei ticket",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleMergeTickets = async () => {
    if (!selectedTargetTicket || !mergeReason.trim()) {
      toast({
        title: "Errore",
        description: "Seleziona un ticket di destinazione e inserisci il motivo della fusione",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Start transaction
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Mark source ticket as merged
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          is_merged: true,
          merged_into_ticket_id: selectedTargetTicket,
          status: 'closed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', sourceTicketId);

      if (updateError) throw updateError;

      // Create merge history record
      const { error: mergeError } = await supabase
        .from('ticket_merges')
        .insert({
          source_ticket_id: sourceTicketId,
          target_ticket_id: selectedTargetTicket,
          merged_by: user.id,
          merge_reason: mergeReason
        });

      if (mergeError) throw mergeError;

      // Copy comments from source to target ticket
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('ticket_id', sourceTicketId);

      if (comments && comments.length > 0) {
        const newComments = comments.map(comment => ({
          ...comment,
          id: undefined, // Let database generate new ID
          ticket_id: selectedTargetTicket,
          content: `[Unito da ticket #${sourceTicketId}] ${comment.content}`
        }));

        await supabase.from('comments').insert(newComments);
      }

      toast({
        title: "Successo",
        description: "Ticket uniti con successo"
      });

      onClose();
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error merging tickets:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'unione dei ticket",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Unisci Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Ticket Sorgente:</Label>
            <p className="text-sm mt-1">{sourceTicketTitle}</p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="search">Cerca Ticket di Destinazione</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Cerca per titolo o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTickets()}
              />
              <Button 
                onClick={searchTickets} 
                disabled={isSearching}
                variant="outline"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Seleziona Ticket di Destinazione</Label>
              <Select value={selectedTargetTicket} onValueChange={setSelectedTargetTicket}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un ticket..." />
                </SelectTrigger>
                <SelectContent>
                  {searchResults.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{ticket.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.status} • {ticket.priority} • {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo della Fusione</Label>
            <Textarea
              id="reason"
              placeholder="Spiega perché questi ticket devono essere uniti..."
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button 
              onClick={handleMergeTickets}
              disabled={!selectedTargetTicket || !mergeReason.trim() || isSubmitting}
            >
              {isSubmitting ? "Unendo..." : "Unisci Ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}