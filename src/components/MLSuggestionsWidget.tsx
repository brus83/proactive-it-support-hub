
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, ThumbsDown, Brain, Lightbulb, TrendingUp } from "lucide-react";
import { mlKnowledgeService, MLSuggestion } from "@/services/mlKnowledgeService";
import { useToast } from "@/hooks/use-toast";
import SafeHtmlRenderer from "./SafeHtmlRenderer";

interface MLSuggestionsWidgetProps {
  ticketTitle: string;
  ticketDescription: string;
  ticketId?: string;
  onSuggestionApply?: (suggestion: string) => void;
  compact?: boolean;
}

const MLSuggestionsWidget = ({ 
  ticketTitle, 
  ticketDescription, 
  ticketId,
  onSuggestionApply,
  compact = false 
}: MLSuggestionsWidgetProps) => {
  const [suggestions, setSuggestions] = useState<MLSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (ticketTitle && ticketDescription) {
      loadMLSuggestions();
    }
  }, [ticketTitle, ticketDescription]);

  useEffect(() => {
    loadMLStats();
  }, []);

  const loadMLSuggestions = async () => {
    setLoading(true);
    try {
      console.log('Caricamento suggerimenti ML per:', ticketTitle);
      const suggestions = await mlKnowledgeService.generateMLSuggestions(
        ticketTitle, 
        ticketDescription
      );
      
      console.log('Suggerimenti ML trovati:', suggestions.length);
      setSuggestions(suggestions);
      
      if (suggestions.length === 0) {
        toast({
          title: "Nessun suggerimento trovato",
          description: "Non sono stati trovati ticket risolti simili nel sistema",
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento suggerimenti ML:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i suggerimenti dal sistema ML",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMLStats = async () => {
    try {
      const performanceStats = await mlKnowledgeService.getMLPerformanceStats();
      setStats(performanceStats);
    } catch (error) {
      console.error('Errore nel caricamento statistiche ML:', error);
    }
  };

  const handleSuggestionFeedback = async (
    suggestion: MLSuggestion, 
    wasHelpful: boolean,
    feedback?: string
  ) => {
    if (!ticketId) return;

    try {
      await mlKnowledgeService.rateSuggestion(
        suggestion.suggestion_id,
        ticketId,
        wasHelpful,
        feedback
      );

      toast({
        title: "Feedback inviato",
        description: `Grazie per il feedback! Ci aiuta a migliorare il sistema.`,
      });

      // Ricarica statistiche
      loadMLStats();
    } catch (error) {
      console.error('Errore nell\'invio del feedback:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il feedback",
        variant: "destructive"
      });
    }
  };

  const handleApplySuggestion = (suggestion: MLSuggestion) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestion.suggested_solution);
    }
    
    // Invia feedback positivo automaticamente quando viene applicato
    if (ticketId) {
      handleSuggestionFeedback(suggestion, true, "Soluzione applicata");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-orange-100 text-orange-800 border-orange-200";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "Alta";
    if (confidence >= 0.6) return "Media";
    return "Bassa";
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {suggestions.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Brain className="h-4 w-4" />
            💡 Suggerimenti ML dal sistema:
          </div>
        )}
        {suggestions.slice(0, 2).map((suggestion) => (
          <Card key={suggestion.suggestion_id} className="p-3">
            <div className="flex items-start justify-between mb-2">
              <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                Confidenza: {getConfidenceText(suggestion.confidence_score)}
              </Badge>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleApplySuggestion(suggestion)}
                >
                  Applica
                </Button>
              </div>
            </div>
            <SafeHtmlRenderer 
              html={suggestion.suggested_solution}
              className="text-sm mb-2"
            />
            <div className="text-xs text-muted-foreground">
              Basato su {suggestion.source_tickets.length} ticket risolti
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Suggerimenti ML
        </CardTitle>
        <CardDescription>
          Soluzioni basate su ticket risolti simili nel sistema
        </CardDescription>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Accuratezza: {stats.accuracyRate}%
            </div>
            <div>
              Suggerimenti utili: {stats.helpfulSuggestions}/{stats.totalSuggestions}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            Analisi ticket risolti simili...
          </div>
        )}

        {suggestions.length > 0 && (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Trovati {suggestions.length} suggerimenti dal sistema ML
              </div>
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.suggestion_id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Suggerimento {index + 1}</span>
                      </div>
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        Confidenza: {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                    
                    <SafeHtmlRenderer 
                      html={suggestion.suggested_solution}
                      className="mb-3 p-3 bg-muted/30 rounded-lg"
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Basato su {suggestion.source_tickets.length} ticket risolti simili
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          Applica Soluzione
                        </Button>
                        {ticketId && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSuggestionFeedback(suggestion, true)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSuggestionFeedback(suggestion, false)}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {suggestion.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.keywords.slice(0, 5).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                  
                  {index < suggestions.length - 1 && <Separator className="my-3" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Nessun suggerimento trovato dal sistema ML.
            </p>
            <p className="text-xs mt-1">
              Il sistema apprende dai ticket risolti per fornire suggerimenti migliori.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MLSuggestionsWidget;
