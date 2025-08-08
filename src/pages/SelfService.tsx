import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ThumbsUp, ThumbsDown, ExternalLink, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SafeHtmlRenderer from "@/components/SafeHtmlRenderer";
import { Link } from "react-router-dom";

interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  view_count: number;
  category_id?: string;
}

const SelfService = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseItem | null>(null);

  const popularKeywords = [
    "password reset", "stampante", "rete", "email", "software", "accesso"
  ];

  useEffect(() => {
    loadPopularArticles();
  }, []);

  const loadPopularArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error loading popular articles:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPopularArticles();
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_published', true)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .order('view_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      toast.error("Errore durante la ricerca");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = async (article: KnowledgeBaseItem) => {
    setSelectedArticle(article);
    
    try {
      await supabase
        .from('knowledge_base')
        .update({ view_count: article.view_count + 1 })
        .eq('id', article.id);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleFeedback = async (articleId: string, isHelpful: boolean) => {
    toast.success(isHelpful ? "Grazie per il feedback positivo!" : "Grazie per il feedback, ci aiuterà a migliorare");
  };

  const createTicketFromSearch = () => {
    window.location.href = `/dashboard?create_ticket=true&query=${encodeURIComponent(searchQuery)}`;
  };

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setSelectedArticle(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna ai Risultati
            </Button>
            <h1 className="text-3xl font-bold mb-2">{selectedArticle.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{selectedArticle.view_count} visualizzazioni</span>
              {selectedArticle.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <SafeHtmlRenderer html={selectedArticle.content} />
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Questo articolo è stato utile?</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(selectedArticle.id, true)}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Sì
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(selectedArticle.id, false)}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
          </div>

          <div className="mt-4 p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Non hai trovato quello che cercavi?
            </p>
            <Button onClick={createTicketFromSearch}>
              Crea un Ticket di Supporto
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold">Centro Self-Service</h1>
            <p className="text-lg text-muted-foreground">
              Trova rapidamente le risposte alle tue domande
            </p>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              placeholder="Cerca nella base di conoscenza..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="text-lg py-3"
            />
            <Button onClick={handleSearch} disabled={isLoading} size="lg">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {popularKeywords.map((keyword) => (
              <Button
                key={keyword}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery(keyword);
                  handleSearch();
                }}
                className="text-xs"
              >
                {keyword}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((item) => (
            <Card 
              key={item.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleArticleClick(item)}
            >
              <CardHeader>
                <CardTitle className="flex items-start gap-2">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{item.title}</span>
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.slice(0, 3).map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{item.view_count}</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {searchResults.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nessun risultato trovato</h3>
            <p className="text-muted-foreground mb-4">
              Non abbiamo trovato articoli per "{searchQuery}"
            </p>
            <Button onClick={createTicketFromSearch}>
              Crea un Ticket di Supporto
            </Button>
          </div>
        )}

        {!searchQuery && (
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Hai bisogno di aiuto personalizzato?</h2>
            <p className="text-muted-foreground mb-6">
              Se non trovi quello che cerchi, il nostro team di supporto è qui per aiutarti
            </p>
            <Button size="lg" onClick={createTicketFromSearch}>
              Contatta il Supporto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfService;