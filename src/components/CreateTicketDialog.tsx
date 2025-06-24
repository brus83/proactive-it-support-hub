
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Lightbulb, Upload } from "lucide-react";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Suggerimenti automatici basati su keywords
const getSuggestions = (description: string) => {
  const keywords = description.toLowerCase();
  const suggestions = [];
  
  if (keywords.includes("wifi") || keywords.includes("internet") || keywords.includes("rete")) {
    suggestions.push({
      title: "Problemi di Connessione Wi-Fi",
      solution: "Prova a riavviare il router e verificare le credenziali di accesso",
      category: "network"
    });
  }
  
  if (keywords.includes("password") || keywords.includes("accesso") || keywords.includes("login")) {
    suggestions.push({
      title: "Reset Password",
      solution: "Puoi reimpostare la password autonomamente dal portale self-service",
      category: "access"
    });
  }
  
  if (keywords.includes("stampante") || keywords.includes("stampa")) {
    suggestions.push({
      title: "Problemi Stampante",
      solution: "Verifica che la stampante sia accesa e collegata alla rete",
      category: "hardware"
    });
  }
  
  return suggestions;
};

const CreateTicketDialog = ({ isOpen, onClose }: CreateTicketDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    urgency: ""
  });
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    
    if (value.length > 10) {
      const newSuggestions = getSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive"
      });
      return;
    }

    // Simulazione invio ticket
    toast({
      title: "Ticket Creato!",
      description: `Il tuo ticket "${formData.title}" è stato creato con successo.`,
    });
    
    onClose();
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "medium",
      urgency: ""
    });
    setShowSuggestions(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Ticket di Supporto</DialogTitle>
          <DialogDescription>
            Descrivi il tuo problema e ti aiuteremo a risolverlo nel minor tempo possibile
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonna Sinistra - Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titolo del Problema *</Label>
                <Input
                  id="title"
                  placeholder="Es. Non riesco ad accedere al Wi-Fi"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrizione Dettagliata *</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi il problema nel dettaglio..."
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Rete/Connessione</SelectItem>
                    <SelectItem value="access">Accessi/Password</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorità</Label>
                <RadioGroup 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low">Bassa - Non urgente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium">Media - Normale</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high">Alta - Urgente</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="urgency">Quando hai bisogno della soluzione?</Label>
                <Select value={formData.urgency} onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona tempistica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediatamente</SelectItem>
                    <SelectItem value="today">Entro oggi</SelectItem>
                    <SelectItem value="week">Entro questa settimana</SelectItem>
                    <SelectItem value="month">Entro questo mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Allegati (Opzionale)</Label>
                <div className="mt-1 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Trascina file qui o clicca per selezionare
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Screenshot, log, documenti (Max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Colonna Destra - Suggerimenti e Aiuto */}
            <div className="space-y-4">
              {showSuggestions && suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>Soluzioni Suggerite</span>
                    </CardTitle>
                    <CardDescription>
                      Basate sulla tua descrizione, potresti risolvere autonomamente:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{suggestion.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{suggestion.solution}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            {suggestion.category}
                          </Badge>
                        </div>
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2">
                          Prova questa soluzione →
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>💡 Suggerimenti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• Fornisci quanti più dettagli possibili</p>
                  <p>• Includi messaggi di errore se presenti</p>
                  <p>• Specifica sistema operativo e browser</p>
                  <p>• Allega screenshot se utili</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📊 Tempi di Risposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>🔴 Alta:</span>
                    <span>2-4 ore</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🟡 Media:</span>
                    <span>1-2 giorni</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🟢 Bassa:</span>
                    <span>3-5 giorni</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit">
              Crea Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketDialog;
