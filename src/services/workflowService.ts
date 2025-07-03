
import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStep {
  name: string;
  type: 'auto' | 'manual' | 'approval';
  description: string;
  role?: 'admin' | 'technician' | 'manager' | 'user';
  assignedTo?: string;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  steps: WorkflowStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  ticket_id: string;
  current_step: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
}

class WorkflowService {
  async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      steps: this.parseSteps(data.steps)
    };
  }

  async getWorkflows(): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return (data || []).map(workflow => ({
      ...workflow,
      steps: this.parseSteps(workflow.steps)
    }));
  }

  async getWorkflowExecutions(ticketId?: string): Promise<WorkflowExecution[]> {
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        workflows (*)
      `);

    if (ticketId) {
      query = query.eq('ticket_id', ticketId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(execution => ({
      ...execution,
      status: this.parseStatus(execution.status),
      data: this.parseData(execution.data),
      workflow: execution.workflows ? {
        ...execution.workflows,
        steps: this.parseSteps(execution.workflows.steps)
      } : undefined
    }));
  }

  async createWorkflowExecution(workflowId: string, ticketId: string): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflowById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        ticket_id: ticketId,
        current_step: 0,
        status: 'pending',
        data: {}
      })
      .select(`
        *,
        workflows (*)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      status: this.parseStatus(data.status),
      data: this.parseData(data.data),
      workflow: data.workflows ? {
        ...data.workflows,
        steps: this.parseSteps(data.workflows.steps)
      } : undefined
    };
  }

  async updateWorkflowStep(executionId: string, stepNumber: number, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        current_step: stepNumber + 1,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (error) throw error;

    // Log the action
    await supabase
      .from('workflow_logs')
      .insert({
        workflow_execution_id: executionId,
        step_number: stepNumber,
        action: 'step_completed',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        notes
      });
  }

  async completeWorkflow(executionId: string): Promise<void> {
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (error) throw error;
  }

  async createWorkflows(workflows: Omit<Workflow, 'id'>[]): Promise<void> {
    const workflowsToInsert = workflows.map(workflow => ({
      ...workflow,
      steps: JSON.stringify(workflow.steps)
    }));

    const { error } = await supabase
      .from('workflows')
      .insert(workflowsToInsert);

    if (error) throw error;
  }

  private parseSteps(steps: any): WorkflowStep[] {
    if (Array.isArray(steps)) {
      return steps as WorkflowStep[];
    }
    if (typeof steps === 'string') {
      try {
        return JSON.parse(steps);
      } catch {
        return [];
      }
    }
    return [];
  }

  private parseStatus(status: any): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    return validStatuses.includes(status) ? status : 'pending';
  }

  private parseData(data: any): Record<string, any> {
    if (typeof data === 'object' && data !== null) {
      return data as Record<string, any>;
    }
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return {};
  }
}

export const workflowService = new WorkflowService();
