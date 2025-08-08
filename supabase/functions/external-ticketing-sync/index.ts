import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TicketSyncRequest {
  action: 'sync_to_external' | 'sync_from_external' | 'bidirectional_sync';
  ticket_id?: string;
  external_ticket_id?: string;
  provider_config: {
    provider: 'zendesk' | 'freshdesk' | 'jira' | 'servicenow';
    endpoint: string;
    auth_type: 'api_key' | 'oauth' | 'basic';
    credentials: Record<string, string>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ticket_id, external_ticket_id, provider_config } = await req.json() as TicketSyncRequest;

    console.log(`Starting ${action} for ticket: ${ticket_id || external_ticket_id}`);

    switch (action) {
      case 'sync_to_external':
        return await syncToExternal(supabase, ticket_id!, provider_config);
      
      case 'sync_from_external':
        return await syncFromExternal(supabase, external_ticket_id!, provider_config);
      
      case 'bidirectional_sync':
        return await bidirectionalSync(supabase, provider_config);
      
      default:
        throw new Error(`Azione non supportata: ${action}`);
    }

  } catch (error) {
    console.error('Errore sync tickets:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function syncToExternal(supabase: any, ticketId: string, config: any) {
  console.log(`Syncing ticket ${ticketId} to external system`);

  // Recupera il ticket dal database locale
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select(`
      *,
      profiles!tickets_user_id_fkey(full_name, email),
      categories(name),
      comments(content, created_at, profiles(full_name))
    `)
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error(`Ticket non trovato: ${ticketId}`);
  }

  // Prepara i dati per il sistema esterno
  const externalTicketData = {
    subject: ticket.title,
    description: formatDescription(ticket, ticket.comments),
    priority: mapPriority(ticket.priority),
    status: mapStatus(ticket.status),
    requester: {
      name: ticket.profiles?.full_name || 'Utente Sconosciuto',
      email: ticket.profiles?.email || 'noreply@example.com'
    },
    custom_fields: {
      internal_ticket_id: ticketId,
      category: ticket.categories?.name,
      department: ticket.department
    }
  };

  // Invia al sistema esterno
  const externalTicket = await createExternalTicket(externalTicketData, config);

  // Salva l'ID esterno nel database locale
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      channel: `${config.provider}_sync`,
      ticket_type: 'external_synced'
    })
    .eq('id', ticketId);

  if (updateError) {
    console.error('Errore aggiornamento ticket locale:', updateError);
  }

  // Log della sincronizzazione
  await supabase
    .from('automation_logs')
    .insert({
      ticket_id: ticketId,
      action_type: 'external_sync',
      action_details: {
        provider: config.provider,
        external_ticket_id: externalTicket.id,
        sync_direction: 'to_external'
      },
      success: true
    });

  return new Response(
    JSON.stringify({
      success: true,
      internal_ticket_id: ticketId,
      external_ticket_id: externalTicket.id,
      provider: config.provider
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function syncFromExternal(supabase: any, externalTicketId: string, config: any) {
  console.log(`Syncing ticket ${externalTicketId} from external system`);

  // Recupera il ticket dal sistema esterno
  const externalTicket = await fetchExternalTicket(externalTicketId, config);

  // Controlla se esiste già nel database locale
  const { data: existingTicket } = await supabase
    .from('tickets')
    .select('id')
    .eq('ticket_type', 'external_synced')
    .contains('ai_analysis', { external_ticket_id: externalTicketId })
    .single();

  let localTicketId: string;

  if (existingTicket) {
    // Aggiorna il ticket esistente
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        title: externalTicket.subject,
        description: externalTicket.description,
        priority: mapPriorityFromExternal(externalTicket.priority),
        status: mapStatusFromExternal(externalTicket.status),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTicket.id);

    if (updateError) {
      throw new Error(`Errore aggiornamento ticket: ${updateError.message}`);
    }

    localTicketId = existingTicket.id;
  } else {
    // Crea nuovo ticket locale
    const { data: user } = await supabase.auth.getUser();
    
    const { data: newTicket, error: createError } = await supabase
      .from('tickets')
      .insert({
        title: externalTicket.subject,
        description: externalTicket.description,
        priority: mapPriorityFromExternal(externalTicket.priority),
        status: mapStatusFromExternal(externalTicket.status),
        user_id: user?.id || null,
        channel: `${config.provider}_import`,
        ticket_type: 'external_synced',
        ai_analysis: {
          external_ticket_id: externalTicketId,
          external_provider: config.provider,
          imported_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Errore creazione ticket: ${createError.message}`);
    }

    localTicketId = newTicket.id;
  }

  // Log della sincronizzazione
  await supabase
    .from('automation_logs')
    .insert({
      ticket_id: localTicketId,
      action_type: 'external_sync',
      action_details: {
        provider: config.provider,
        external_ticket_id: externalTicketId,
        sync_direction: 'from_external'
      },
      success: true
    });

  return new Response(
    JSON.stringify({
      success: true,
      internal_ticket_id: localTicketId,
      external_ticket_id: externalTicketId,
      provider: config.provider,
      action: existingTicket ? 'updated' : 'created'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function bidirectionalSync(supabase: any, config: any) {
  console.log('Starting bidirectional sync');
  
  const results = {
    synced_to_external: 0,
    synced_from_external: 0,
    errors: [] as string[]
  };

  try {
    // Sincronizza ticket locali non ancora esportati
    const { data: localTickets } = await supabase
      .from('tickets')
      .select('id')
      .neq('ticket_type', 'external_synced')
      .is('channel', null)
      .limit(10);

    for (const ticket of localTickets || []) {
      try {
        await syncToExternal(supabase, ticket.id, config);
        results.synced_to_external++;
      } catch (error) {
        results.errors.push(`Errore sync to external ${ticket.id}: ${error.message}`);
      }
    }

    // TODO: Implementare sync from external - richiede endpoint di ricerca
    // const externalTickets = await searchExternalTickets(config);
    // ...

  } catch (error) {
    results.errors.push(`Errore sync bidirezionale: ${error.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      results
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Utility functions per comunicazione con sistemi esterni
async function createExternalTicket(ticketData: any, config: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Configurazione autenticazione per provider
  switch (config.provider) {
    case 'zendesk':
      headers['Authorization'] = `Bearer ${config.credentials.api_token}`;
      break;
    case 'freshdesk':
      const auth = btoa(`${config.credentials.api_key}:X`);
      headers['Authorization'] = `Basic ${auth}`;
      break;
  }

  const endpoint = config.provider === 'zendesk' 
    ? `${config.endpoint}/api/v2/tickets.json`
    : `${config.endpoint}/api/v2/tickets`;

  const payload = config.provider === 'zendesk'
    ? { ticket: ticketData }
    : ticketData;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.provider} API Error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return config.provider === 'zendesk' ? result.ticket : result;
}

async function fetchExternalTicket(externalTicketId: string, config: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Configurazione autenticazione
  switch (config.provider) {
    case 'zendesk':
      headers['Authorization'] = `Bearer ${config.credentials.api_token}`;
      break;
    case 'freshdesk':
      const auth = btoa(`${config.credentials.api_key}:X`);
      headers['Authorization'] = `Basic ${auth}`;
      break;
  }

  const endpoint = config.provider === 'zendesk'
    ? `${config.endpoint}/api/v2/tickets/${externalTicketId}.json`
    : `${config.endpoint}/api/v2/tickets/${externalTicketId}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`${config.provider} API Error: ${response.status}`);
  }

  const result = await response.json();
  return config.provider === 'zendesk' ? result.ticket : result;
}

// Utility per mapping dati
function formatDescription(ticket: any, comments: any[]) {
  let description = ticket.description;
  
  if (comments && comments.length > 0) {
    description += '\n\n--- Commenti ---\n';
    comments.forEach(comment => {
      description += `\n[${new Date(comment.created_at).toLocaleString()}] ${comment.profiles?.full_name || 'Utente'}:\n${comment.content}\n`;
    });
  }
  
  return description;
}

function mapPriority(priority: string): string | number {
  // Mapping generico - può essere personalizzato per provider
  const priorityMap: Record<string, any> = {
    'low': 'low',
    'medium': 'normal', 
    'high': 'high',
    'urgent': 'urgent'
  };
  return priorityMap[priority] || 'normal';
}

function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'open': 'new',
    'in_progress': 'open',
    'resolved': 'solved',
    'closed': 'closed'
  };
  return statusMap[status] || 'new';
}

function mapPriorityFromExternal(priority: any): string {
  if (typeof priority === 'number') {
    const priorityMap: Record<number, string> = {
      1: 'low',
      2: 'medium',
      3: 'high', 
      4: 'urgent'
    };
    return priorityMap[priority] || 'medium';
  }
  return priority || 'medium';
}

function mapStatusFromExternal(status: any): string {
  const statusMap: Record<string, string> = {
    'new': 'open',
    'open': 'in_progress',
    'pending': 'in_progress',
    'solved': 'resolved',
    'closed': 'closed'
  };
  return statusMap[status] || 'open';
}