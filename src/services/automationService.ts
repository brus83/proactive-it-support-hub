
import { supabase } from "@/integrations/supabase/client";

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
  category_id?: string;
  keywords: string[];
  view_count: number;
  is_published: boolean;
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
  // Ottieni suggerimenti dalla knowledge base
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

  // Cerca nella knowledge base per parole chiave
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

  // Ottieni regole di escalation
  async getEscalationRules(): Promise<EscalationRule[]> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('is_active', true)
      .order('time_threshold_hours', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Controlla ticket per escalation
  async checkTicketsForEscalation(): Promise<void> {
    const rules = await this.getEscalationRules();
    
    for (const rule of rules) {
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

  // Escalation di un ticket
  private async escalateTicket(ticketId: string, rule: EscalationRule): Promise<void> {
    // Aggiorna il ticket
    await supabase
      .from('tickets')
      .update({
        escalation_count: supabase.sql`escalation_count + 1`,
        last_escalation_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    // Log dell'escalation
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

  // Ottieni log delle automazioni
  async getAutomationLogs(ticketId?: string): Promise<AutomationLog[]> {
    let query = supabase.from('automation_logs').select('*');
    
    if (ticketId) {
      query = query.eq('ticket_id', ticketId);
    }
    
    const { data, error } = await query
      .order('triggered_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Pianifica intervento
  async scheduleIntervention(intervention: Omit<ScheduledIntervention, 'id'>): Promise<ScheduledIntervention> {
    const { data, error } = await supabase
      .from('scheduled_interventions')
      .insert(intervention)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Ottieni interventi programmati
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

    const { data, error } = await query
      .order('scheduled_start', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Aggiorna stato intervento
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

  // Analisi predittiva semplice per carico di lavoro
  async getPredictiveAnalysis(): Promise<{
    peakHours: number[];
    busiestDepartments: string[];
    commonIssues: string[];
    resolutionTrends: any[];
  }> {
    // Analisi degli orari di picco
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
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Dipartimenti più impegnati
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
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([dept]) => dept);

    return {
      peakHours,
      busiestDepartments,
      commonIssues: ['Password Reset', 'Printer Issues', 'Network Problems'], // Placeholder
      resolutionTrends: [] // Placeholder
    };
  }
}

export const automationService = new AutomationService();
