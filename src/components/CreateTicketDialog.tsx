
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { autoResponseService } from "@/services/autoResponseService";
import { workflowService } from "@/services/workflowService";
import { Lightbulb, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

const CreateTicketDialog = ({ isOpen, onClose, onTicketCreated }: CreateTicketDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoResponse, setAutoResponse] = useState<any>(null);
  const [showAutoResponse, setShowAutoResponse] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Controlla le risposte automatiche quando cambiano titolo/descrizione
  useEffect(() => {
    if (title || description) {
      checkAutoResponse();
    }
  }, [title, description, categoryId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const checkAutoResponse = async () => {
    if (!title && !description) {
      setAutoResponse(null);
      setShowAutoResponse(false);
      return;
    }

    const selectedCategory = categories.find(cat => cat.id === categoryId);
    const response = await autoResponseService.findMatchingResponse(
      title, 
      description, 
      selectedCategory?.name
    );

    if (response) {
      setAutoResponse(response);
      setShowAutoResponse(true);
    } else {
      setAutoResponse(null);
      setShowAutoResponse(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([
          {
            title,
            description,
            priority,
            category_id: categoryId || null,
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Se c'è una risposta automatica, aggiungila come commento
      if (autoResponse) {
        await supabase
          .from('comments')
          .insert([
            {
              ticket_id: ticket.id,
              user_id: user.id,
              content: `**Risposta Automatica:**\n\n${autoResponse.response_template}`
            }
          ]);
      }

      // Controlla se c'è un workflow per questa categoria
      if (categoryId) {
        const workflow = await workflowService.getWorkflowByCategory(categoryId);
        if (workflow) {
          await workflowService.startWorkflow(workflow.id, ticket.id);
        }
      }

      toast.success("Ticket creato con successo!");
      onTicketCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error("Errore nella creazione del ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategoryId("");
    setAutoResponse(null);
    setShowAutoResponse(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descrivi brevemente il problema"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fornisci una descrizione dettagliata del problema"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
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

          {/* Risposta Automatica */}
          {showAutoResponse && autoResponse && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">
                      Possibile Soluzione Automatica
                    </h3>
                    <Badge variant="secondary">
                      {autoResponse.name}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAutoResponse(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  Abbiamo rilevato che il tuo problema potrebbe essere risolto automaticamente:
                </p>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="text-sm whitespace-pre-wrap">
                    {autoResponse.response_template}
                  </p>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Questa risposta verrà aggiunta automaticamente al tuo ticket
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creazione..." : "Crea Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketDialog;
