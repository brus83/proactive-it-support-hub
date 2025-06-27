
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TicketClosureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  contactName: string;
  onTicketClosed: () => void;
}

const TicketClosureDialog = ({ 
  isOpen, 
  onClose, 
  ticketId, 
  ticketTitle, 
  contactName,
  onTicketClosed 
}: TicketClosureDialogProps) => {
  const [closureNotes, setClosureNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!closureNotes.trim()) {
      toast.error("Inserisci le note di chiusura");
      return;
    }

    setIsSubmitting(true);

    try {
      // Aggiorna il ticket nel database
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          status: 'closed',
          resolution_notes: closureNotes,
          closed_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // Recupera l'email del contatto (se disponibile)
      const contactEmail = `${contactName.toLowerCase().replace(/\s+/g, '.')}@company.com`; // Placeholder
      
      // Invia email di notifica
      try {
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.user?.id)
          .single();

        await supabase.functions.invoke('send-ticket-closure-email', {
          body: {
            ticketId,
            ticketTitle,
            contactEmail,
            contactName,
            closureNotes,
            closedBy: profile?.full_name || 'Sistema'
          }
        });
      } catch (emailError) {
        console.error('Errore invio email:', emailError);
        // Non bloccare la chiusura del ticket se l'email fallisce
      }

      toast.success("Ticket chiuso con successo");
      onTicketClosed();
      onClose();
      setClosureNotes("");
    } catch (error) {
      console.error('Errore chiusura ticket:', error);
      toast.error("Errore nella chiusura del ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chiudi Ticket #{ticketId}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Titolo Ticket</Label>
            <p className="text-sm text-muted-foreground mt-1">{ticketTitle}</p>
          </div>
          
          <div>
            <Label>Cliente</Label>
            <p className="text-sm text-muted-foreground mt-1">{contactName}</p>
          </div>

          <div>
            <Label htmlFor="closure-notes">Note di Chiusura *</Label>
            <Textarea
              id="closure-notes"
              placeholder="Descrivi la soluzione applicata e i dettagli della risoluzione..."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Chiusura..." : "Chiudi Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TicketClosureDialog;
