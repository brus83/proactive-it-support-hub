
import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStep {
  name: string;
  type: 'auto' | 'manual' | 'approval';
  role?: string;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  category_id?: string;
  description?: string;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  ticket_id: string;
  current_step: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  data: Record<string, any>;
  workflow?: Workflow;
}

export const workflowService = {
  async getWorkflowByCategory(categoryId: string): Promise<Workflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching workflow:', error);
      return null;
    }

    return data;
  },

  async getAllWorkflows(): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }

    return data || [];
  },

  async startWorkflow(workflowId: string, ticketId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert([{
        workflow_id: workflowId,
        ticket_id: ticketId,
        current_step: 0,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error starting workflow:', error);
      return null;
    }

    return data.id;
  },

  async getWorkflowExecution(ticketId: string): Promise<WorkflowExecution | null> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:workflows(*)
      `)
      .eq('ticket_id', ticketId)
      .single();

    if (error) {
      console.error('Error fetching workflow execution:', error);
      return null;
    }

    return data;
  },

  async advanceWorkflowStep(executionId: string, notes?: string): Promise<boolean> {
    const { data: execution, error: fetchError } = await supabase
      .from('workflow_executions')
      .select('*, workflow:workflows(*)')
      .eq('id', executionId)
      .single();

    if (fetchError) {
      console.error('Error fetching execution:', fetchError);
      return false;
    }

    const nextStep = execution.current_step + 1;
    const workflow = execution.workflow as Workflow;
    const isCompleted = nextStep >= workflow.steps.length;

    const { error: updateError } = await supabase
      .from('workflow_executions')
      .update({
        current_step: nextStep,
        status: isCompleted ? 'completed' : 'in_progress'
      })
      .eq('id', executionId);

    if (updateError) {
      console.error('Error updating workflow execution:', updateError);
      return false;
    }

    // Log the action
    await supabase
      .from('workflow_logs')
      .insert([{
        workflow_execution_id: executionId,
        step_number: execution.current_step,
        action: 'step_completed',
        notes: notes || `Completato step: ${workflow.steps[execution.current_step]?.name}`
      }]);

    return true;
  },

  async createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<boolean> {
    const { error } = await supabase
      .from('workflows')
      .insert([workflow]);

    if (error) {
      console.error('Error creating workflow:', error);
      return false;
    }

    return true;
  }
};
