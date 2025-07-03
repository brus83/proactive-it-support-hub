
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { automationService } from "@/services/automationService";
import type { KnowledgeBase } from "@/services/automationService";
import SafeHtmlRenderer from "./SafeHtmlRenderer";

interface KnowledgeBaseSuggestionsProps {
  ticketDescription: string;
}

const KnowledgeBaseSuggestions = ({ ticketDescription }: KnowledgeBaseSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticketDescription && ticketDescription.length > 10) {
      searchKnowledgeBase();
    }
  }, [ticketDescription]);

  const searchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const results = await automationService.getKBSuggestions(ticketDescription);
      setSuggestions(results.slice(0, 2));
    } catch (error) {
      console.error('Error searching knowledge base:', error);
    } finally {
      setLoading(false);
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
          <BookOpen className="h-5 w-5" />
          Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((article) => (
          <div key={article.id} className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">{article.title}</h4>
            <SafeHtmlRenderer 
              html={article.content.substring(0, 150) + '...'}
              className="text-sm text-muted-foreground mb-2"
            />
            {article.keywords && article.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {article.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseSuggestions;
