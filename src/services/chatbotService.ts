
import { supabase } from "@/integrations/supabase/client";

export interface ChatbotResponse {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
  usage_count: number;
  is_active: boolean;
}

export const chatbotService = {
  async findBestResponse(query: string): Promise<ChatbotResponse | null> {
    const { data: responses, error } = await supabase
      .from('chatbot_responses')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching chatbot responses:', error);
      return null;
    }

    const queryLower = query.toLowerCase();
    let bestMatch: ChatbotResponse | null = null;
    let bestScore = 0;

    for (const response of responses) {
      let score = 0;
      
      // Controlla le keywords
      for (const keyword of response.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 2;
        }
      }
      
      // Controlla somiglianza con la domanda
      if (queryLower.includes(response.question.toLowerCase()) || 
          response.question.toLowerCase().includes(queryLower)) {
        score += 3;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = response;
      }
    }

    // Incrementa usage_count se trovato un match
    if (bestMatch && bestScore > 0) {
      await supabase
        .from('chatbot_responses')
        .update({ usage_count: bestMatch.usage_count + 1 })
        .eq('id', bestMatch.id);
    }

    return bestScore > 0 ? bestMatch : null;
  },

  async getAllResponses(): Promise<ChatbotResponse[]> {
    const { data, error } = await supabase
      .from('chatbot_responses')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching chatbot responses:', error);
      return [];
    }

    return data || [];
  },

  async createResponse(response: Omit<ChatbotResponse, 'id' | 'usage_count'>): Promise<boolean> {
    const { error } = await supabase
      .from('chatbot_responses')
      .insert([{ ...response, usage_count: 0 }]);

    if (error) {
      console.error('Error creating chatbot response:', error);
      return false;
    }

    return true;
  }
};
