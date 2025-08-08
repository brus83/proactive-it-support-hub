/**
 * MODULO API UNIVERSALE PER INTEGRAZIONI TICKETING
 * 
 * Connettore modulare per integrare sistemi esterni di ticketing
 * Supporta: Zendesk, Freshdesk, Jira Service Management, ServiceNow, ecc.
 * 
 * CONFIGURAZIONE:
 * - Configurare variabili d'ambiente in Supabase Secrets
 * - Adattare i mapping in base al provider scelto
 * 
 * ESTENSIONE:
 * - Aggiungere nuovi provider implementando TicketingProvider interface
 * - Personalizzare field mapping per ogni sistema
 */

// Interfacce comuni per tutti i provider
export interface TicketData {
  id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: string;
  assignee?: string;
  requester: {
    name: string;
    email: string;
  };
  custom_fields?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderConfig {
  provider: 'zendesk' | 'freshdesk' | 'jira' | 'servicenow' | 'custom';
  endpoint: string;
  auth: {
    type: 'api_key' | 'oauth' | 'basic';
    credentials: Record<string, string>;
  };
  field_mapping?: Record<string, string>;
  custom_headers?: Record<string, string>;
}

export interface TicketingProvider {
  createTicket(ticket: TicketData): Promise<TicketData>;
  getTicket(ticketId: string): Promise<TicketData>;
  updateTicket(ticketId: string, updates: Partial<TicketData>): Promise<TicketData>;
  closeTicket(ticketId: string, resolution?: string): Promise<TicketData>;
  searchTickets(query: string): Promise<TicketData[]>;
}

// Provider Zendesk
class ZendeskProvider implements TicketingProvider {
  private config: ProviderConfig;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseUrl = `${config.endpoint}/api/v2`;
    
    // Configurazione headers per Zendesk
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.custom_headers
    };

    // Gestione autenticazione
    if (config.auth.type === 'api_key') {
      this.headers['Authorization'] = `Bearer ${config.auth.credentials.api_token}`;
    } else if (config.auth.type === 'basic') {
      const auth = btoa(`${config.auth.credentials.email}:${config.auth.credentials.password}`);
      this.headers['Authorization'] = `Basic ${auth}`;
    }
  }

  private mapToZendesk(ticket: TicketData): any {
    return {
      ticket: {
        subject: ticket.title,
        comment: { body: ticket.description },
        priority: ticket.priority,
        status: this.mapStatus(ticket.status),
        type: ticket.category || 'question',
        requester: {
          name: ticket.requester.name,
          email: ticket.requester.email
        },
        custom_fields: ticket.custom_fields || []
      }
    };
  }

  private mapFromZendesk(zendeskTicket: any): TicketData {
    return {
      id: zendeskTicket.id?.toString(),
      title: zendeskTicket.subject,
      description: zendeskTicket.description,
      priority: zendeskTicket.priority as any,
      status: this.mapStatusFromZendesk(zendeskTicket.status),
      category: zendeskTicket.type,
      requester: {
        name: zendeskTicket.requester?.name || '',
        email: zendeskTicket.requester?.email || ''
      },
      created_at: zendeskTicket.created_at,
      updated_at: zendeskTicket.updated_at
    };
  }

  private mapStatus(status: string): string {
    const mapping = {
      'open': 'new',
      'in_progress': 'open',
      'resolved': 'solved',
      'closed': 'closed'
    };
    return mapping[status] || 'new';
  }

  private mapStatusFromZendesk(status: string): TicketData['status'] {
    const mapping = {
      'new': 'open',
      'open': 'in_progress',
      'pending': 'in_progress',
      'solved': 'resolved',
      'closed': 'closed'
    };
    return mapping[status] as TicketData['status'] || 'open';
  }

  async createTicket(ticket: TicketData): Promise<TicketData> {
    try {
      const payload = this.mapToZendesk(ticket);
      
      const response = await fetch(`${this.baseUrl}/tickets.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Zendesk API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapFromZendesk(data.ticket);
    } catch (error) {
      console.error('Errore creazione ticket Zendesk:', error);
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<TicketData> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}.json`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Zendesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFromZendesk(data.ticket);
    } catch (error) {
      console.error('Errore recupero ticket Zendesk:', error);
      throw error;
    }
  }

  async updateTicket(ticketId: string, updates: Partial<TicketData>): Promise<TicketData> {
    try {
      const payload = {
        ticket: {
          ...(updates.title && { subject: updates.title }),
          ...(updates.description && { comment: { body: updates.description } }),
          ...(updates.priority && { priority: updates.priority }),
          ...(updates.status && { status: this.mapStatus(updates.status) })
        }
      };

      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}.json`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Zendesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFromZendesk(data.ticket);
    } catch (error) {
      console.error('Errore aggiornamento ticket Zendesk:', error);
      throw error;
    }
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<TicketData> {
    return this.updateTicket(ticketId, { 
      status: 'closed',
      ...(resolution && { description: resolution })
    });
  }

  async searchTickets(query: string): Promise<TicketData[]> {
    try {
      const searchUrl = `${this.baseUrl}/search.json?query=${encodeURIComponent(query)}&type:ticket`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Zendesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.results.map((ticket: any) => this.mapFromZendesk(ticket));
    } catch (error) {
      console.error('Errore ricerca ticket Zendesk:', error);
      throw error;
    }
  }
}

// Provider Freshdesk
class FreshdeskProvider implements TicketingProvider {
  private config: ProviderConfig;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseUrl = `${config.endpoint}/api/v2`;
    
    this.headers = {
      'Content-Type': 'application/json',
      ...config.custom_headers
    };

    // Freshdesk usa API Key + Basic Auth
    if (config.auth.type === 'api_key') {
      const auth = btoa(`${config.auth.credentials.api_key}:X`);
      this.headers['Authorization'] = `Basic ${auth}`;
    }
  }

  private mapToFreshdesk(ticket: TicketData): any {
    return {
      subject: ticket.title,
      description: ticket.description,
      priority: this.mapPriority(ticket.priority),
      status: this.mapStatus(ticket.status),
      email: ticket.requester.email,
      name: ticket.requester.name,
      custom_fields: ticket.custom_fields || {}
    };
  }

  private mapFromFreshdesk(freshdeskTicket: any): TicketData {
    return {
      id: freshdeskTicket.id?.toString(),
      title: freshdeskTicket.subject,
      description: freshdeskTicket.description_text || freshdeskTicket.description,
      priority: this.mapPriorityFromFreshdesk(freshdeskTicket.priority),
      status: this.mapStatusFromFreshdesk(freshdeskTicket.status),
      requester: {
        name: freshdeskTicket.name || '',
        email: freshdeskTicket.email || ''
      },
      created_at: freshdeskTicket.created_at,
      updated_at: freshdeskTicket.updated_at
    };
  }

  private mapPriority(priority: string): number {
    const mapping = { 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4 };
    return mapping[priority] || 2;
  }

  private mapPriorityFromFreshdesk(priority: number): TicketData['priority'] {
    const mapping = { 1: 'low', 2: 'medium', 3: 'high', 4: 'urgent' };
    return mapping[priority] as TicketData['priority'] || 'medium';
  }

  private mapStatus(status: string): number {
    const mapping = {
      'open': 2,
      'in_progress': 3,
      'resolved': 4,
      'closed': 5
    };
    return mapping[status] || 2;
  }

  private mapStatusFromFreshdesk(status: number): TicketData['status'] {
    const mapping = {
      2: 'open',
      3: 'in_progress', 
      4: 'resolved',
      5: 'closed'
    };
    return mapping[status] as TicketData['status'] || 'open';
  }

  async createTicket(ticket: TicketData): Promise<TicketData> {
    try {
      const payload = this.mapToFreshdesk(ticket);
      
      const response = await fetch(`${this.baseUrl}/tickets`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Freshdesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFromFreshdesk(data);
    } catch (error) {
      console.error('Errore creazione ticket Freshdesk:', error);
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<TicketData> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Freshdesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFromFreshdesk(data);
    } catch (error) {
      console.error('Errore recupero ticket Freshdesk:', error);
      throw error;
    }
  }

  async updateTicket(ticketId: string, updates: Partial<TicketData>): Promise<TicketData> {
    try {
      const payload: any = {};
      if (updates.title) payload.subject = updates.title;
      if (updates.description) payload.description = updates.description;
      if (updates.priority) payload.priority = this.mapPriority(updates.priority);
      if (updates.status) payload.status = this.mapStatus(updates.status);

      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Freshdesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapFromFreshdesk(data);
    } catch (error) {
      console.error('Errore aggiornamento ticket Freshdesk:', error);
      throw error;
    }
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<TicketData> {
    return this.updateTicket(ticketId, { status: 'closed' });
  }

  async searchTickets(query: string): Promise<TicketData[]> {
    try {
      const searchUrl = `${this.baseUrl}/search/tickets?query="${encodeURIComponent(query)}"`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Freshdesk API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.results.map((ticket: any) => this.mapFromFreshdesk(ticket));
    } catch (error) {
      console.error('Errore ricerca ticket Freshdesk:', error);
      throw error;
    }
  }
}

// Classe principale del servizio
export class TicketingApiService {
  private provider: TicketingProvider;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  private createProvider(config: ProviderConfig): TicketingProvider {
    switch (config.provider) {
      case 'zendesk':
        return new ZendeskProvider(config);
      case 'freshdesk':
        return new FreshdeskProvider(config);
      case 'jira':
        // TODO: Implementare JiraProvider
        throw new Error('Jira provider non ancora implementato');
      case 'servicenow':
        // TODO: Implementare ServiceNowProvider  
        throw new Error('ServiceNow provider non ancora implementato');
      default:
        throw new Error(`Provider non supportato: ${config.provider}`);
    }
  }

  // Metodi pubblici - interfaccia unificata
  async createTicket(ticket: TicketData): Promise<TicketData> {
    return this.provider.createTicket(ticket);
  }

  async getTicket(ticketId: string): Promise<TicketData> {
    return this.provider.getTicket(ticketId);
  }

  async updateTicket(ticketId: string, updates: Partial<TicketData>): Promise<TicketData> {
    return this.provider.updateTicket(ticketId, updates);
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<TicketData> {
    return this.provider.closeTicket(ticketId, resolution);
  }

  async searchTickets(query: string): Promise<TicketData[]> {
    return this.provider.searchTickets(query);
  }

  // Metodi di utilità
  static validateConfig(config: ProviderConfig): boolean {
    if (!config.provider || !config.endpoint) {
      return false;
    }

    if (!config.auth || !config.auth.type || !config.auth.credentials) {
      return false;
    }

    return true;
  }

  static getRequiredCredentials(provider: string): string[] {
    switch (provider) {
      case 'zendesk':
        return ['api_token', 'email'];
      case 'freshdesk':
        return ['api_key'];
      case 'jira':
        return ['username', 'api_token'];
      case 'servicenow':
        return ['username', 'password'];
      default:
        return [];
    }
  }
}

// Factory per creare configurazioni standard
export class ConfigFactory {
  static createZendeskConfig(subdomain: string, email: string, apiToken: string): ProviderConfig {
    return {
      provider: 'zendesk',
      endpoint: `https://${subdomain}.zendesk.com`,
      auth: {
        type: 'api_key',
        credentials: {
          email,
          api_token: apiToken
        }
      }
    };
  }

  static createFreshdeskConfig(domain: string, apiKey: string): ProviderConfig {
    return {
      provider: 'freshdesk',
      endpoint: `https://${domain}.freshdesk.com`,
      auth: {
        type: 'api_key',
        credentials: {
          api_key: apiKey
        }
      }
    };
  }
}

// Esempio di utilizzo:
/*
// Configurazione Zendesk
const zendeskConfig = ConfigFactory.createZendeskConfig(
  'miazienda',
  'admin@miazienda.com', 
  'api_token_zendesk'
);

// Configurazione Freshdesk  
const freshdeskConfig = ConfigFactory.createFreshdeskConfig(
  'miazienda',
  'api_key_freshdesk'
);

// Inizializzazione servizio
const ticketingService = new TicketingApiService(zendeskConfig);

// Creazione ticket
const nuovoTicket = await ticketingService.createTicket({
  title: 'Problema stampante',
  description: 'La stampante dell\'ufficio non stampa',
  priority: 'medium',
  status: 'open',
  requester: {
    name: 'Mario Rossi',
    email: 'mario.rossi@azienda.com'
  }
});

// Recupero ticket
const ticket = await ticketingService.getTicket('123');

// Aggiornamento ticket
const ticketAggiornato = await ticketingService.updateTicket('123', {
  status: 'in_progress',
  priority: 'high'
});

// Chiusura ticket
await ticketingService.closeTicket('123', 'Problema risolto sostituendo cartuccia');
*/