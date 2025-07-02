
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { automationService } from "@/services/automationService";
import { sanitizeText } from "@/utils/sanitizer";

interface Category {
  id: string;
  name: string;
}

interface TicketFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id: string;
}

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: () => void;
}

const CreateTicketDialog: React.FC<CreateTicketDialogProps> = ({
  isOpen,
  onClose,
  onTicketCreated
}) => {
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category_id: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Errore nel caricamento delle categorie:', error);
      toast.error('Errore nel caricamento delle categorie');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize input data
    const sanitizedTitle = sanitizeText(formData.title);
    const sanitizedDescription = sanitizeText(formData.description);
    
    if (!sanitizedTitle.trim() || !sanitizedDescription.trim()) {
      toast.error('Titolo e descrizione sono obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Crea il ticket con dati sanitizzati
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          title: sanitizedTitle,
          description: sanitizedDescription,
          priority: formData.priority,
          category_id: formData.category_id || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket creato con successo');

      // Genera suggerimenti automatici in background
      setTimeout(async () => {
        try {
          await automationService.generateSmartSuggestions(
            ticket.id,
            `${sanitizedTitle} ${sanitizedDescription}`
          );
          console.log('Suggerimenti automatici generati per il ticket:', ticket.id);
        } catch (error) {
          console.error('Errore nella generazione suggerimenti automatici:', error);
        }
      }, 1000);

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category_id: ''
      });

      onTicketCreated?.();
      onClose();
    } catch (error) {
      console.error('Errore nella creazione del ticket:', error);
      toast.error('Errore nella creazione del ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof TicketFormData, value: string) => {
    if (field === 'title' || field === 'description') {
      value = sanitizeText(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Ticket</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Descrivi brevemente il problema..."
              maxLength={200}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrizione *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Fornisci dettagli sul problema, inclusi codici negozio, indirizzi IP o altre informazioni utili..."
              rows={4}
              maxLength={2000}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priorità</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  priority: value as 'low' | 'medium' | 'high' | 'urgent' 
                }))}
              >
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

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creazione...' : 'Crea Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketDialog;
