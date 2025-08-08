import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle } from "lucide-react";

interface TicketMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTicketId: string;
  sourceTicketTitle: string;
  onTicketMerged?: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

export function TicketMergeDialog({ 
  isOpen, 
  onClose, 
  sourceTicketId, 
  sourceTicketTitle,
  onTicketMerged 
}: TicketMergeDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTargetTicket, setSelectedTargetTicket] = useState<string>("");
  const [mergeReason, setMergeReason] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchTickets = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, created_at')
        .neq('id', sourceTicketId)
        .neq('status', 'closed')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching tickets:', error);
      toast.error("Errore durante la ricerca dei ticket");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMergeTickets = async () => {
    if (!selectedTargetTicket || !mergeReason.trim()) {
      toast.error("Seleziona un ticket di destinazione e inserisci il motivo della fusione");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Mark source ticket as merged
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'closed',
          resolved_at: new Date().toISOString(),
          resolution_notes: `Ticket unito con #${selectedTargetTicket}. Motivo: ${mergeReason}`
        })
        .eq('id', sourceTicketId);

      if (updateError) throw updateError;

      // Copy comments from source to target ticket
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('ticket_id', sourceTicketId);

      if (comments && comments.length > 0) {
        const newComments = comments.map(comment => ({
          ticket_id: selectedTargetTicket,
          user_id: comment.user_id,
          content: `[Unito da ticket #${sourceTicketId.substring(0, 8)}] ${comment.content}`,
          created_at: comment.created_at
        }));

        await supabase.from('comments').insert(newComments);
      }

      // Add merge comment to target ticket
      await supabase
        .from('comments')
        .insert({
          ticket_id: selectedTargetTicket,
          user_id: user.id,
          content: `Ticket #${sourceTicketId.substring(0, 8)} unito a questo ticket. Motivo: ${mergeReason}`
        });

      toast.success("Ticket uniti con successo");
      onTicketMerged?.();
      onClose();
      
      // Reset form
      setSearchQuery("");
      setSearchResults([]);
      setSelectedTargetTicket("");
      setMergeReason("");
    } catch (error) {
      console.error('Error merging tickets:', error);
      toast.error("Errore durante l'unione dei ticket");
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