import { supabase } from "@/integrations/supabase/client";
import { storeService } from "./storeService";

export interface AutomationLog {
  id: string;
  ticket_id: string;
  action_type: 'auto_assign' | 'auto_categorize' | 'escalation' | 'auto_response' | 'kb_suggestion';
  action_details: any;
  triggered_at: string;
  success: boolean;
  error_message?: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  time_threshold_hours: number;
  escalate_to_role: 'technician' | 'admin';
  is_active: boolean;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  view_count: number;
}

export interface ScheduledIntervention {
  id: string;
  ticket_id: string;
  technician_id: string;
  scheduled_start: string;
  scheduled_end: string;
  intervention_type: 'remote' | 'on_site' | 'phone';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

class AutomationService {
  async getKBSuggestions(searchText: string): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_published', true)
      .or(`title.ilike.%${searchText}%,content.ilike.%${searchText}%`)
      .limit(5);

    if (error) throw error;
    return data || [];
  }

  async searchKBByKeywords(keywords: string[]): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_published', true)
      .overlaps('keywords', keywords)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  async getEscalationRules(): Promise<EscalationRule[]> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('is_active', true)
      .order('time_threshold_hours', { ascending: true });

    if (error) throw error;
    
    // Correzione: Assicurarsi che priority sia del tipo corretto
    const allowedPriorities = ["low", "medium", "high", "urgent"] as const;
    const allowedRoles = ["technician", "admin"] as const;

    return (data || []).map(rule => ({
      ...rule,
      priority: allowedPriorities.includes(rule.priority as any) ? rule.priority as EscalationRule['priority'] : "low",
      escalate_to_role: allowedRoles.includes(rule.escalate_to_role as any) ? rule.escalate_to_role as EscalationRule['escalate_to_role'] : "technician"
    }));
  }

  async checkTicketsForEscalation(): Promise<void> {
    const rules = await this.getEscalationRules();

    for (const rule of rules) {
      // Correzione: Rimuovere .sql che non esiste in Supabase client
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('priority', rule.priority)
        .in('status', ['open', 'in_progress'])
        .lt('created_at', new Date(Date.now() - rule.time_threshold_hours * 60 * 60 * 1000).toISOString());

      if (tickets) {
        for (const ticket of tickets) {
          await this.escalateTicket(ticket.id, rule);
        }
      }
    }
  }

  private async escalateTicket(ticketId: string, rule: EscalationRule): Promise<void> {
    const { data: ticketData, error: fetchError } = await supabase
      .from('tickets')
      .select('escalation_count')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticketData) throw fetchError;

    await supabase
      .from('tickets')
      .update({
        escalation_count: ticketData.escalation_count + 1,
        last_escalation_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    await supabase
      .from('automation_logs')
      .insert({
        ticket_id: ticketId,
        action_type: 'escalation',
        action_details: {
          rule_name: rule.name,
          escalated_to: rule.escalate_to_role,
          threshold_hours: rule.time_threshold_hours
        }
      });

    console.log(`Ticket ${ticketId} escalated using rule: ${rule.name}`);
  }

  async getAutomationLogs(ticketId?: string): Promise<AutomationLog[]> {
    let query = supabase.from('automation_logs').select('*');

    if (ticketId) {
      query = query.eq('ticket_id', ticketId);
    }

    const { data, error } = await query
      .order('triggered_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Correzione: Assicurarsi che action_type sia del tipo corretto
    const allowedActionTypes = ["auto_assign", "auto_categorize", "escalation", "auto_response", "kb_suggestion"] as const;

    return (data || []).map(log => ({
      ...log,
      action_type: allowedActionTypes.includes(log.action_type as any) ? log.action_type as AutomationLog['action_type'] : "auto_response"
    }));
  }

  async scheduleIntervention(intervention: Omit<ScheduledIntervention, 'id'>): Promise<ScheduledIntervention> {
    const { data, error } = await supabase
      .from('scheduled_interventions')
      .insert(intervention)
      .select()
      .single();

    if (error) throw error;
    
    // Correzione: Assicurarsi che intervention_type sia del tipo corretto
    const allowedTypes = ["remote", "on_site", "phone"] as const;
    const allowedStatuses = ["scheduled", "in_progress", "completed", "cancelled"] as const;
    
    return {
      ...data,
      intervention_type: allowedTypes.includes(data.intervention_type as any) ? data.intervention_type as ScheduledIntervention['intervention_type'] : "remote",
      status: allowedStatuses.includes(data.status as any) ? data.status as ScheduledIntervention['status'] : "scheduled"
    };
  }

  async getScheduledInterventions(technicianId?: string): Promise<ScheduledIntervention[]> {
    let query = supabase
      .from('scheduled_interventions')
      .select(`
        *,
        tickets (title, description, priority),
        profiles!scheduled_interventions_technician_id_fkey (full_name)
      `);

    if (technicianId) {
      query = query.eq('technician_id', technicianId);
    }

    const { data, error } = await query.order('scheduled_start', { ascending: true });

    if (error) throw error;

    // Correzione: Assicurarsi che intervention_type sia del tipo corretto
    const allowedTypes = ["remote", "on_site", "phone"] as const;
    const allowedStatuses = ["scheduled", "in_progress", "completed", "cancelled"] as const;

    return (data || []).map(intervention => ({
      ...intervention,
      intervention_type: allowedTypes.includes(intervention.intervention_type as any) ? intervention.intervention_type as ScheduledIntervention['intervention_type'] : "remote",
      status: allowedStatuses.includes(intervention.status as any) ? intervention.status as ScheduledIntervention['status'] : "scheduled"
    }));
  }

  async updateInterventionStatus(
    interventionId: string,
    status: ScheduledIntervention['status'],
    notes?: string
  ): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (notes) updateData.notes = notes;

    const { error } = await supabase
      .from('scheduled_interventions')
      .update(updateData)
      .eq('id', interventionId);

    if (error) throw error;
  }

  async getPredictiveAnalysis(): Promise<{
    peakHours: number[];
    busiestDepartments: string[];
    commonIssues: string[];
    resolutionTrends: any[];
  }> {
    const { data: hourlyData } = await supabase
      .from('tickets')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const hourCounts: { [key: number]: number } = {};
    hourlyData?.forEach(ticket => {
      const hour = new Date(ticket.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const { data: deptData } = await supabase
      .from('tickets')
      .select('department')
      .not('department', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const deptCounts: { [key: string]: number } = {};
    deptData?.forEach(ticket => {
      if (ticket.department) {
        deptCounts[ticket.department] = (deptCounts[ticket.department] || 0) + 1;
      }
    });

    const busiestDepartments = Object.entries(deptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([dept]) => dept);

    return {
      peakHours,
      busiestDepartments,
      commonIssues: ['Password Reset', 'Printer Issues', 'Network Problems'],
      resolutionTrends: []
    };
  }

  async generateSmartSuggestions(ticketId: string, ticketText: string) {
    try {
      console.log('Generazione suggerimenti intelligenti per ticket:', ticketId);

      // Ottieni suggerimenti dai negozi
      const storeSuggestions = await storeService.getStoreSuggestions(ticketText);
      
      // Ottieni suggerimenti dalla knowledge base
      const { data: kbSuggestions } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_published', true)
        .limit(5);

      // Genera azioni suggerite
      const actions = this.generateActionSuggestions(ticketText);

      // Converti in oggetto serializzabile per JSON
      const suggestions = {
        stores: storeSuggestions.map(store => ({
          id: store.id,
          store_name: store.store_name,
          store_code: store.store_code,
          ip_range: store.ip_range,
          city: store.city,
          relevance_score: store.relevance_score
        })),
        knowledgeBase: (kbSuggestions || []).map(kb => ({
          id: kb.id,
          title: kb.title,
          content: kb.content,
          keywords: kb.keywords
        })),
        actions,
        generated_at: new Date().toISOString()
      };

      // Salva i suggerimenti nel ticket
      const { error } = await supabase
        .from('tickets')
        .update({ 
          kb_suggestions: suggestions
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Errore nel salvataggio suggerimenti:', error);
        return;
      }

      // Log dell'azione
      await supabase
        .from('automation_logs')
        .insert({
          ticket_id: ticketId,
          action_type: 'kb_suggestion',
          action_details: {
            suggestions_count: storeSuggestions.length + (kbSuggestions?.length || 0),
            actions_count: actions.length
          },
          success: true
        });

      console.log('Suggerimenti intelligenti generati con successo');
    } catch (error) {
      console.error('Errore nella generazione suggerimenti intelligenti:', error);
      
      // Log dell'errore
      await supabase
        .from('automation_logs')
        .insert({
          ticket_id: ticketId,
          action_type: 'kb_suggestion',
          action_details: { error: 'Failed to generate suggestions' },
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
  }

  private generateActionSuggestions(ticketText: string): string[] {
    const actions = [];
    const lowerText = ticketText.toLowerCase();

    // Azioni basate su parole chiave
    if (lowerText.includes('password') || lowerText.includes('accesso')) {
      actions.push('Verificare credenziali utente');
      actions.push('Controllare se l\'account è bloccato');
    }

    if (lowerText.includes('stampante') || lowerText.includes('stampa')) {
      actions.push('Verificare connessione stampante');
      actions.push('Controllare coda di stampa');
      actions.push('Verificare driver stampante');
    }

    if (lowerText.includes('rete') || lowerText.includes('internet') || lowerText.includes('connessione')) {
      actions.push('Testare connettività di rete');
      actions.push('Verificare configurazione IP');
      if (extractedInfo.possibleIPs.length > 0) {
        actions.push(`Controllare IP: ${extractedInfo.possibleIPs.join(', ')}`);
      }
    }

    if (lowerText.includes('lento') || lowerText.includes('performance')) {
      actions.push('Verificare utilizzo CPU e memoria');
      actions.push('Controllare spazio disco');
    }

    if (extractedInfo.possibleStoreCodes.length > 0) {
      actions.push(`Contattare negozio ${extractedInfo.possibleStoreCodes.join(', ')}`);
    }

    return actions;
  }
}

export const automationService = new AutomationService();
