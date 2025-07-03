
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ThumbsUp, ThumbsDown } from "lucide-react";
import { mlKnowledgeService } from "@/services/mlKnowledgeService";
import type { MLSuggestion } from "@/services/mlKnowledgeService";

interface MLSuggestionsProps {
  ticketDescription: string;
}

const MLSuggestions = ({ ticketDescription }: MLSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<MLSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticketDescription && ticketDescription.length > 20) {
      generateSuggestions();
    }
  }, [ticketDescription]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const results = await mlKnowledgeService.generateMLSuggestions(
        "Ticket correlato", 
        ticketDescription
      );
      setSuggestions(results.slice(0, 3));
    } catch (error) {
      console.error('Error generating ML suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (suggestionId: string, helpful: boolean) => {
    try {
      await mlKnowledgeService.rateSuggestion(suggestionId, "temp-ticket", helpful);
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Suggerimenti ML
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.suggestion_id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">
                Confidenza: {(suggestion.confidence_score * 100).toFixed(0)}%
              </Badge>
            </div>
            <p className="text-sm mb-3">{suggestion.suggested_solution}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFeedback(suggestion.suggestion_id, true)}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Utile
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFeedback(suggestion.suggestion_id, false)}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Non utile
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MLSuggestions;
