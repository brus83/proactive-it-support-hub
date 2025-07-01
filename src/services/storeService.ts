
import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase
      .rpc('get_store_suggestions', { search_text: searchText });

    if (error) {
      console.error('Errore nel recupero suggerimenti negozi:', error);
      return [];
    }

    return data || [];
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
    // Cerca il negozio che contiene l'IP fornito
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Errore nel recupero negozi per IP:', error);
      return null;
    }

    // Trova il negozio che contiene l'IP (logica semplificata)
    const store = data?.find(store => {
      const baseIp = store.ip_range.split('/')[0];
      const baseIpParts = baseIp.split('.');
      const inputIpParts = ipAddress.split('.');
      
      // Confronta i primi 3 ottetti
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

  // Analizza il testo del ticket per estrarre informazioni rilevanti
  extractStoreInfo(ticketText: string): {
    possibleStoreCodes: string[];
    possibleIPs: string[];
    locations: string[];
  } {
    const text = ticketText.toLowerCase();
    
    // Cerca codici negozio (pattern: 3-4 caratteri alfanumerici)
    const storeCodePattern = /\b[0-9][a-z0-9]{1,3}\b/gi;
    const possibleStoreCodes = ticketText.match(storeCodePattern) || [];

    // Cerca indirizzi IP
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const possibleIPs = ticketText.match(ipPattern) || [];

    // Cerca nomi di città italiane comuni
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
