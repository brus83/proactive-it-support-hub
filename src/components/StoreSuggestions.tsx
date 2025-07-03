
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { storeService } from "@/services/storeService";

interface StoreSuggestionsProps {
  ticketDescription: string;
}

interface StoreSuggestion {
  id: string;
  store_name: string;
  store_code: string;
  city: string;
  address: string;
  relevance_score: number;
}

const StoreSuggestions = ({ ticketDescription }: StoreSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<StoreSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticketDescription && ticketDescription.length > 10) {
      searchStores();
    }
  }, [ticketDescription]);

  const searchStores = async () => {
    setLoading(true);
    try {
      const results = await storeService.getStoreSuggestions(ticketDescription);
      setSuggestions(results.slice(0, 3));
    } catch (error) {
      console.error('Error searching stores:', error);
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
          <MapPin className="h-5 w-5" />
          Negozi Correlati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((store) => (
          <div key={store.id} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{store.store_name}</h4>
              <Badge variant="secondary">{store.store_code}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {store.address}, {store.city}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Rilevanza: {(store.relevance_score * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StoreSuggestions;
