
import { supabase } from "@/integrations/supabase/client";

export interface AutoResponse {
  id: string;
  name: string;
  trigger_keywords: string[];
  trigger_categories: string[];
  response_template: string;
  is_active: boolean;
  priority: number;
}

export const autoResponseService = {
  async findMatchingResponse(title: string, description: string, categoryName?: string): Promise<AutoResponse | null> {
    const { data: responses, error } = await supabase
      .from('auto_responses')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching auto responses:', error);
      return null;
    }

    const text = `${title} ${description}`.toLowerCase();
    
    for (const response of responses) {
      // Controlla se le keywords sono presenti nel testo
      const keywordMatch = response.trigger_keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      // Controlla se la categoria corrisponde
      const categoryMatch = categoryName && response.trigger_categories.includes(categoryName);
      
      if (keywordMatch || categoryMatch) {
        return response;
      }
    }
    
    return null;
  },

  async getAllResponses(): Promise<AutoResponse[]> {
    const { data, error } = await supabase
      .from('auto_responses')
      .select('*')
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching auto responses:', error);
      return [];
    }

    return data || [];
  },

  async createResponse(response: Omit<AutoResponse, 'id'>): Promise<boolean> {
    const { error } = await supabase
      .from('auto_responses')
      .insert([response]);

    if (error) {
      console.error('Error creating auto response:', error);
      return false;
    }

    return true;
  },

  async updateResponse(id: string, updates: Partial<AutoResponse>): Promise<boolean> {
    const { error } = await supabase
      .from('auto_responses')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating auto response:', error);
      return false;
    }

    return true;
  },

  async deleteResponse(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('auto_responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting auto response:', error);
      return false;
    }

    return true;
  }
};
