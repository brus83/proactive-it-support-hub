import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/utils/sanitizer";

export interface StoreLocation {
  id: string;
  store_code: string | null;
  store_name: string;
  ip_range: string;
  address: string | null;
  city: string | null;
  is_active: boolean;
  relevance_score?: number;
}

class StoreService {
  async getStoreSuggestions(searchText: string): Promise<StoreLocation[]> {
    try {
      console.log('Ricerca negozi - Input originale:', searchText);
      
      // Sanitize the search text to prevent SQL injection
      const cleanSearchText = sanitizeSearchQuery(searchText);

      if (!cleanSearchText || cleanSearchText.length < 2) {
        console.log('Testo di ricerca troppo breve:', cleanSearchText);
        return [];
      }

      console.log('Ricerca negozi - Testo pulito:', cleanSearchText);

      // Use parameterized query with proper escaping
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_store_suggestions', { search_text: cleanSearchText });

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('Risultati RPC trovati:', rpcData.length);
        return rpcData.map(store => ({
          ...store,
          relevance_score: store.relevance_score || 0.5
        }));
      }

      console.log('RPC fallita o senza risultati, provo query diretta. Errore RPC:', rpcError);

      // Fallback to direct query using proper parameterization
      const { data: directData, error: directError } = await supabase
        .from('store_locations')
        .select('*')
        .eq('is_active', true)
        .or(`store_name.ilike.%${cleanSearchText}%,city.ilike.%${cleanSearchText}%,store_code.ilike.%${cleanSearchText}%,address.ilike.%${cleanSearchText}%`)
        .limit(10);

      if (directError) {
        console.error('Errore query diretta:', directError);
        return [];
      }

      console.log('Risultati query diretta:', directData?.length || 0);
      
      return (directData || []).map(store => ({
        ...store,
        relevance_score: 0.5
      }));

    } catch (error) {
      console.error('Errore in getStoreSuggestions:', error);
      return [];
    }
  }

  async getStoreByCode(storeCode: string): Promise<StoreLocation | null> {
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('store_code', storeCode)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Errore nel recupero negozio per codice:', error);
      return null;
    }

    return data;
  }

  async getStoreByIpRange(ipAddress: string): Promise<StoreLocation | null> {
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Errore nel recupero negozi per IP:', error);
      return null;
    }

    const store = data?.find(store => {
      const baseIp = store.ip_range.split('/')[0];
      const baseIpParts = baseIp.split('.');
      const inputIpParts = ipAddress.split('.');
      
      return baseIpParts[0] === inputIpParts[0] &&
             baseIpParts[1] === inputIpParts[1] &&
             baseIpParts[2] === inputIpParts[2];
    });

    return store || null;
  }

  async getAllStores(): Promise<StoreLocation[]> {
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true)
      .order('store_name', { ascending: true });

    if (error) {
      console.error('Errore nel recupero tutti i negozi:', error);
      return [];
    }

    return data || [];
  }

  extractStoreInfo(ticketText: string): {
    possibleStoreCodes: string[];
    possibleIPs: string[];
    locations: string[];
  } {
    const text = ticketText.toLowerCase();
    
    const storeCodePattern = /\b[0-9][a-z0-9]{1,3}\b/gi;
    const possibleStoreCodes = ticketText.match(storeCodePattern) || [];

    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const possibleIPs = ticketText.match(ipPattern) || [];

    const italianCities = [
      'roma', 'milano', 'napoli', 'torino', 'palermo', 'genova', 'bologna', 
      'firenze', 'bari', 'catania', 'venezia', 'verona', 'messina', 'padova',
      'trieste', 'brescia', 'prato', 'taranto', 'modena', 'reggio emilia',
      'parma', 'perugia', 'livorno', 'cagliari', 'foggia', 'rimini', 'salerno',
      'ferrara', 'sassari', 'monza', 'bergamo', 'pescara', 'latina', 'vicenza',
      'terni', 'novara', 'piacenza', 'ancona', 'andria', 'udine', 'arezzo',
      'cesena', 'lecce', 'pesaro', 'como', 'varese', 'pisa', 'lucca'
    ];

    const locations = italianCities.filter(city => 
      text.includes(city) || text.includes(city.replace(' ', ''))
    );

    return {
      possibleStoreCodes: [...new Set(possibleStoreCodes.map(code => code.toUpperCase()))],
      possibleIPs: [...new Set(possibleIPs)],
      locations: [...new Set(locations)]
    };
  }
}

export const storeService = new StoreService();
