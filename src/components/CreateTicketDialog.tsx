
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Lightbulb, Upload, Brain, Zap, Clock, Target } from "lucide-react";
import { aiService, type TicketAnalysis } from "@/services/aiService";
import AIKeySetup from "./AIKeySetup";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateTicketDialog = ({ isOpen, onClose }: CreateTicketDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    urgency: ""
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<TicketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showAIResults, setShowAIResults] = useState(false);

  // Debounce per analisi automatica
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title.length > 5 && formData.description.length > 10) {
        analyzeTicketWithAI();
      }
    }, 2000); // Analizza dopo 2 secondi di inattività

    return () => clearTimeout(timer);
  }, [formData.title, formData.description]);

  const analyzeTicketWithAI = async () => {
    if (!formData.title || !formData.description) return;
    
    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeTicket(formData.title, formData.description);
      setAiAnalysis(analysis);
      setShowAIResults(true);
      
      // Auto-popola i campi suggeriti dall'AI
      setFormData(prev => ({
        ...prev,
        category: prev.category || analysis.category,
        priority: prev.priority === "medium" ? analysis.priority : prev.priority,
        urgency: prev.urgency || analysis.urgency
      }));
    } catch (error) {
      console.error('Errore analisi AI:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApiKeySet = (apiKey: string) => {
    aiService.setApiKey(apiKey);
    setHasApiKey(true);
    if (formData.title && formData.description) {
      analyzeTicketWithAI();
    }
  };

  const applySuggestedSolution = (solution: any) => {
    toast({
      title: "Soluzione Suggerita Applicata",
      description: `Prova: ${solution.title}`,
    });
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

    // Simulazione invio ticket con dati AI
    const ticketData = {
      ...formData,
      aiAnalysis,
      estimatedResolution: aiAnalysis?.estimatedResolutionTime,
      isUrgent: aiAnalysis?.isUrgent
    };

    toast({
      title: "Ticket Creato con Successo! 🎉",
      description: `Il tuo ticket "${formData.title}" è stato analizzato dall'AI e assegnato automaticamente.`,
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
    setAiAnalysis(null);
    setShowAIResults(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-500" />
            <span>Crea Ticket IT con Intelligenza Artificiale</span>
          </DialogTitle>
          <DialogDescription>
            Il sistema AI analizzerà automaticamente il tuo problema e suggerirà soluzioni personalizzate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Setup AI Key */}
          <AIKeySetup onApiKeySet={handleApiKeySet} hasApiKey={hasApiKey} />

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
                    placeholder="Descrivi il problema nel dettaglio... L'AI analizzerà automaticamente il tuo testo."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 min-h-[120px]"
                  />
                  {isAnalyzing && (
                    <div className="flex items-center space-x-2 mt-2 text-sm text-blue-600">
                      <Brain className="w-4 h-4 animate-pulse" />
                      <span>L'AI sta analizzando il tuo problema...</span>
                    </div>
                  )}
                </div>

                {/* AI Auto-filled fields */}
                <div>
                  <Label htmlFor="category">Categoria {aiAnalysis && "🤖 (Suggerita dall'AI)"}</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className={`mt-1 ${aiAnalysis ? 'border-blue-300 bg-blue-50' : ''}`}>
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
                  <Label>Priorità {aiAnalysis && "🤖 (Suggerita dall'AI)"}</Label>
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
                      {aiAnalysis?.isUrgent && <Badge variant="destructive" className="text-xs">AI: Urgente!</Badge>}
                    </div>
                  </RadioGroup>
                </div>

                {aiAnalysis && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Tempo Stimato di Risoluzione:</strong> {aiAnalysis.estimatedResolutionTime}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Colonna Destra - AI Results e Suggerimenti */}
              <div className="space-y-4">
                {showAIResults && aiAnalysis && aiAnalysis.suggestedSolutions.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-green-500" />
                        <span>Soluzioni AI Personalizzate</span>
                      </CardTitle>
                      <CardDescription>
                        L'intelligenza artificiale ha analizzato il tuo problema e suggerisce:
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiAnalysis.suggestedSolutions.map((solution, index) => (
                        <div key={index} className="p-4 border rounded-lg hover:bg-green-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm flex items-center space-x-2">
                                <Target className="w-4 h-4 text-green-600" />
                                <span>{solution.title}</span>
                              </h4>
                              <p className="text-xs text-muted-foreground mt-2">{solution.solution}</p>
                              <Badge variant="outline" className="text-xs mt-2">
                                Confidenza AI: {Math.round(solution.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto text-xs mt-2 text-green-600"
                            onClick={() => applySuggestedSolution(solution)}
                          >
                            Prova questa soluzione AI →
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {aiAnalysis && aiAnalysis.keywords.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">🏷️ Keywords Identificate dall'AI</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suggerimenti sempre visibili */}
                <Card>
                  <CardHeader>
                    <CardTitle>💡 Suggerimenti</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• Più dettagli fornisci, più accurata sarà l'analisi AI</p>
                    <p>• L'AI imparerà dai tuoi ticket per migliorare</p>
                    <p>• Includi messaggi di errore se presenti</p>
                    <p>• Specifica sistema operativo e browser</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>📊 Tempi di Risposta AI-Ottimizzati</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>🔴 Alta (AI):</span>
                      <span>1-2 ore</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🟡 Media (AI):</span>
                      <span>4-8 ore</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🟢 Bassa (AI):</span>
                      <span>1-2 giorni</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Brain className="w-4 h-4 mr-2" />
                Crea Ticket AI
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketDialog;
