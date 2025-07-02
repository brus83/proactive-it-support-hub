
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Building, Network, Search, Copy, Check } from "lucide-react";
import { storeService, StoreLocation } from "@/services/storeService";
import { toast } from "sonner";

interface StoreSuggestionsWidgetProps {
  ticketTitle: string;
  ticketDescription: string;
}

const StoreSuggestionsWidget: React.FC<StoreSuggestionsWidgetProps> = ({
  ticketTitle,
  ticketDescription
}) => {
  const [suggestions, setSuggestions] = useState<StoreLocation[]>([]);
  const [searchResults, setSearchResults] = useState<StoreLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState<string | null>(null);

  useEffect(() => {
    loadAutomaticSuggestions();
  }, [ticketTitle, ticketDescription]);

  const loadAutomaticSuggestions = async () => {
    setLoading(true);
    try {
      const fullText = `${ticketTitle} ${ticketDescription}`;
      console.log('StoreSuggestions - Caricamento automatico per:', fullText);
      
      const extractedInfo = storeService.extractStoreInfo(fullText);
      console.log('StoreSuggestions - Info estratte:', extractedInfo);
      
      let allSuggestions: StoreLocation[] = [];

      // Cerca per codici negozio estratti
      for (const code of extractedInfo.possibleStoreCodes) {
        console.log('StoreSuggestions - Ricerca per codice:', code);
        const store = await storeService.getStoreByCode(code);
        if (store) {
          allSuggestions.push({ ...store, relevance_score: 1.0 });
        }
      }

      // Cerca per IP estratti
      for (const ip of extractedInfo.possibleIPs) {
        console.log('StoreSuggestions - Ricerca per IP:', ip);
        const store = await storeService.getStoreByIpRange(ip);
        if (store) {
          allSuggestions.push({ ...store, relevance_score: 0.9 });
        }
      }

      // Cerca per località menzionate
      for (const location of extractedInfo.locations) {
        console.log('StoreSuggestions - Ricerca per località:', location);
        const stores = await storeService.getStoreSuggestions(location);
        allSuggestions.push(...stores.map(s => ({ ...s, relevance_score: 0.7 })));
      }

      // Cerca suggerimenti generali basati sul testo completo
      if (fullText.trim().length > 3) {
        console.log('StoreSuggestions - Ricerca generale per:', fullText);
        const generalSuggestions = await storeService.getStoreSuggestions(fullText);
        allSuggestions.push(...generalSuggestions.map(s => ({ 
          ...s, 
          relevance_score: s.relevance_score || 0.5 
        })));
      }

      // Rimuovi duplicati e ordina per rilevanza
      const uniqueSuggestions = allSuggestions
        .filter((store, index, self) => 
          index === self.findIndex(s => s.id === store.id)
        )
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, 5);

      console.log('StoreSuggestions - Suggerimenti finali:', uniqueSuggestions.length);
      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error('Errore nel caricamento suggerimenti:', error);
      toast.error('Errore nel caricamento suggerimenti negozi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      toast.error('Inserisci almeno 2 caratteri per la ricerca');
      return;
    }
    
    setLoading(true);
    try {
      console.log('StoreSuggestions - Ricerca manuale per:', searchTerm);
      const results = await storeService.getStoreSuggestions(searchTerm);
      console.log('StoreSuggestions - Risultati ricerca manuale:', results.length);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast.info('Nessun negozio trovato per la ricerca');
      } else {
        toast.success(`Trovati ${results.length} negozi`);
      }
    } catch (error) {
      console.error('Errore nella ricerca:', error);
      toast.error('Errore nella ricerca negozi');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInfo(`${type}-${text}`);
      toast.success(`${type} copiato negli appunti`);
      setTimeout(() => setCopiedInfo(null), 2000);
    } catch (error) {
      toast.error('Errore nella copia');
    }
  };

  const StoreCard: React.FC<{ store: StoreLocation; relevance?: number }> = ({ 
    store, 
    relevance 
  }) => (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">{store.store_name}</span>
              {store.store_code && (
                <Badge variant="outline" className="text-xs">
                  {store.store_code}
                </Badge>
              )}
            </div>
            
            {store.address && (
              <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{store.address}</span>
                {store.city && <span>, {store.city}</span>}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2 text-sm">
              <Network className="w-3 h-3 text-green-600" />
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                {store.ip_range}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(store.ip_range, 'IP Range')}
              >
                {copiedInfo === `IP Range-${store.ip_range}` ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>

            {relevance && relevance > 0.7 && (
              <Badge variant="secondary" className="text-xs">
                Alta rilevanza ({Math.round(relevance * 100)}%)
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {store.store_code && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => copyToClipboard(store.store_code!, 'Codice Negozio')}
            >
              {copiedInfo === `Codice Negozio-${store.store_code}` ? (
                <Check className="w-3 h-3 mr-1 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              Copia Codice
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => copyToClipboard(store.ip_range, 'IP Range')}
          >
            {copiedInfo === `IP Range-${store.ip_range}` ? (
              <Check className="w-3 h-3 mr-1 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 mr-1" />
            )}
            Copia IP
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          Suggerimenti Negozi
        </CardTitle>
        <p className="text-sm text-gray-600">
          Informazioni sui negozi basate sul contenuto del ticket
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Ricerca manuale */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Cerca per nome, codice, città o IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={loading || searchTerm.trim().length < 2}
            size="sm"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4 text-sm text-gray-500">
            Caricamento suggerimenti...
          </div>
        )}

        {/* Suggerimenti automatici */}
        {suggestions.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium text-sm mb-2 text-blue-800">
              📍 Suggerimenti Automatici
            </h3>
            {suggestions.map((store) => (
              <StoreCard 
                key={`auto-${store.id}`} 
                store={store} 
                relevance={store.relevance_score} 
              />
            ))}
          </div>
        )}

        {/* Risultati ricerca */}
        {searchResults.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2 text-gray-700">
              🔍 Risultati Ricerca ({searchResults.length})
            </h3>
            {searchResults.map((store) => (
              <StoreCard 
                key={`search-${store.id}`} 
                store={store} 
                relevance={store.relevance_score} 
              />
            ))}
          </div>
        )}

        {!loading && suggestions.length === 0 && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Nessun suggerimento automatico trovato.
              <br />
              Usa la ricerca per trovare negozi specifici.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreSuggestionsWidget;
