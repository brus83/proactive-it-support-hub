import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, Eye } from "lucide-react";
import { automationService, KnowledgeBase } from "@/services/automationService";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeBaseWidgetProps {
  searchQuery?: string;
  onSuggestionClick?: (article: KnowledgeBase) => void;
  compact?: boolean;
}

const KnowledgeBaseWidget = ({ 
  searchQuery = "", 
  onSuggestionClick,
  compact = false 
}: KnowledgeBaseWidgetProps) => {
  const [suggestions, setSuggestions] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 2) {
      setLocalSearch(searchQuery);
      searchKnowledgeBase(searchQuery);
    }
  }, [searchQuery]);

  const searchKnowledgeBase = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await automationService.getKBSuggestions(query);
      setSuggestions(results);
      
      if (results.length === 0) {
        toast({
          title: "Nessun risultato",
          description: `Nessun articolo trovato per "${query}"`,
        });
      }
    } catch (error) {
      console.error('Errore ricerca KB:', error);
      toast({
        title: "Errore",
        description: "Impossibile cercare nella knowledge base",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (localSearch.trim().length < 2) {
      toast({
        title: "Ricerca troppo breve",
        description: "Inserisci almeno 2 caratteri per la ricerca",
        variant: "destructive"
      });
      return;
    }
    searchKnowledgeBase(localSearch);
  };

  const handleArticleClick = (article: KnowledgeBase) => {
    // Incrementa view count
    automationService.searchKBByKeywords([]).catch(console.error);
    
    if (onSuggestionClick) {
      onSuggestionClick(article);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {suggestions.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2">
            💡 Suggerimenti dalla Knowledge Base:
          </div>
        )}
        {suggestions.slice(0, 3).map((article) => (
          <Card key={article.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">{article.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
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
          <BookOpen className="h-5 w-5" />
          Knowledge Base
        </CardTitle>
        <CardDescription>
          Cerca soluzioni rapide ai problemi comuni
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Cerca nella knowledge base..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            onClick={handleSearch} 
            disabled={loading || localSearch.trim().length < 2}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Ricerca in corso...
          </div>
        )}

        {suggestions.length > 0 && (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-2">
                Trovati {suggestions.length} articoli
              </div>
              {suggestions.map((article) => (
                <Card 
                  key={article.id} 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{article.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {article.view_count || 0}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {article.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                  
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.keywords.slice(0, 5).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {localSearch && suggestions.length === 0 && !loading && (
          <div className="text-center py-4 text-muted-foreground">
            Nessun risultato trovato per "{localSearch}"
          </div>
        )}

        {!localSearch && suggestions.length === 0 && !loading && (
          <div className="text-center py-4 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Inserisci un termine di ricerca per trovare articoli nella knowledge base
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseWidget;