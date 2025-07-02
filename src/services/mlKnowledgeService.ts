
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery, sanitizeText } from "@/utils/sanitizer";

interface SimilarTicketResponse {
  ticket_id: string;
  title: string;
  description: string;
  resolution_notes: string;
  similarity_score: number;
  resolved_at: string;
  category?: string;
}

interface MLSuggestion {
  suggestion_id: string;
  suggested_solution: string;
  confidence_score: number;
  source_tickets: string[];
  keywords: string[];
  created_at: string;
}

class MLKnowledgeService {
  // Analizza il testo del ticket per estrarre keywords chiave
  private extractKeywords(text: string): string[] {
    const cleanText = sanitizeText(text.toLowerCase());
    
    // Rimuovi parole comuni italiane
    const stopWords = [
      'il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 
      'del', 'non', 'ho', 'mi', 'si', 'ma', 'come', 'anche', 'questo', 'quella',
      'sono', 'essere', 'fare', 'dire', 'andare', 'vedere', 'sapere', 'dare',
      'problema', 'errore', 'aiuto', 'grazie', 'prego', 'problema'
    ];
    
    // Estrai parole tecniche e significative
    const words = cleanText
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !stopWords.includes(word))
      .filter(word => /^[a-zA-Z0-9àèéìíîòóùú]+$/.test(word));
    
    // Conta frequenza e restituisci le più significative
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Calcola similarità semantica semplificata tra due testi
  private calculateTextSimilarity(text1: string, text2: string): number {
    const keywords1 = new Set(this.extractKeywords(text1));
    const keywords2 = new Set(this.extractKeywords(text2));
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Trova ticket risolti simili al ticket corrente
  async findSimilarResolvedTickets(
    currentTitle: string, 
    currentDescription: string,
    limit: number = 5
  ): Promise<SimilarTicketResponse[]> {
    try {
      const sanitizedTitle = sanitizeSearchQuery(currentTitle);
      const sanitizedDescription = sanitizeSearchQuery(currentDescription);
      
      // Estrai keywords dal ticket corrente
      const currentKeywords = this.extractKeywords(`${sanitizedTitle} ${sanitizedDescription}`);
      
      if (currentKeywords.length === 0) {
        return [];
      }

      // Cerca ticket risolti con resolution_notes
      const { data: resolvedTickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          description,
          resolution_notes,
          resolved_at,
          categories (name)
        `)
        .eq('status', 'resolved')
        .not('resolution_notes', 'is', null)
        .neq('resolution_notes', '')
        .order('resolved_at', { ascending: false })
        .limit(50); // Limita per performance

      if (error) throw error;

      if (!resolvedTickets || resolvedTickets.length === 0) {
        return [];
      }

      // Calcola similarità per ogni ticket
      const similarTickets: SimilarTicketResponse[] = resolvedTickets
        .map(ticket => {
          const ticketText = `${ticket.title} ${ticket.description}`;
          const currentText = `${sanitizedTitle} ${sanitizedDescription}`;
          
          const similarity = this.calculateTextSimilarity(currentText, ticketText);
          
          return {
            ticket_id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            resolution_notes: ticket.resolution_notes || '',
            similarity_score: similarity,
            resolved_at: ticket.resolved_at,
            category: ticket.categories?.name
          };
        })
        .filter(ticket => ticket.similarity_score > 0.1) // Soglia minima di similarità
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      return similarTickets;
    } catch (error) {
      console.error('Errore nella ricerca di ticket simili:', error);
      return [];
    }
  }

  // Genera suggerimenti ML basati sui ticket simili
  async generateMLSuggestions(
    currentTitle: string,
    currentDescription: string
  ): Promise<MLSuggestion[]> {
    try {
      const similarTickets = await this.findSimilarResolvedTickets(
        currentTitle, 
        currentDescription, 
        10
      );

      if (similarTickets.length === 0) {
        return [];
      }

      // Raggruppa soluzioni simili
      const solutionGroups: { [key: string]: SimilarTicketResponse[] } = {};
      
      similarTickets.forEach(ticket => {
        const solutionKeywords = this.extractKeywords(ticket.resolution_notes);
        const groupKey = solutionKeywords.slice(0, 3).join('_');
        
        if (!solutionGroups[groupKey]) {
          solutionGroups[groupKey] = [];
        }
        solutionGroups[groupKey].push(ticket);
      });

      // Genera suggerimenti da ogni gruppo
      const suggestions: MLSuggestion[] = Object.entries(solutionGroups)
        .map(([groupKey, tickets]) => {
          const bestTicket = tickets[0]; // Il più simile del gruppo
          const confidence = Math.min(0.95, tickets.length * 0.1 + bestTicket.similarity_score);
          
          // Combina e migliora la soluzione
          const combinedSolution = this.refineSolution(
            tickets.map(t => t.resolution_notes)
          );

          return {
            suggestion_id: `ml_${groupKey}_${Date.now()}`,
            suggested_solution: combinedSolution,
            confidence_score: confidence,
            source_tickets: tickets.map(t => t.ticket_id),
            keywords: this.extractKeywords(combinedSolution),
            created_at: new Date().toISOString()
          };
        })
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, 3); // Massimo 3 suggerimenti

      return suggestions;
    } catch (error) {
      console.error('Errore nella generazione suggerimenti ML:', error);
      return [];
    }
  }

  // Raffina e combina le soluzioni simili
  private refineSolution(solutions: string[]): string {
    if (solutions.length === 1) {
      return sanitizeText(solutions[0]);
    }

    // Trova frasi comuni tra le soluzioni
    const commonPhrases = this.findCommonPhrases(solutions);
    
    if (commonPhrases.length > 0) {
      return sanitizeText(commonPhrases.join('. ') + '.');
    }

    // Se non ci sono frasi comuni, usa la soluzione più dettagliata
    const longestSolution = solutions.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );

    return sanitizeText(longestSolution);
  }

  // Trova frasi comuni tra più soluzioni
  private findCommonPhrases(solutions: string[]): string[] {
    const phrases: { [key: string]: number } = {};
    
    solutions.forEach(solution => {
      const sentences = solution.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        const cleanSentence = sentence.trim().toLowerCase();
        phrases[cleanSentence] = (phrases[cleanSentence] || 0) + 1;
      });
    });

    // Restituisci frasi che appaiono in almeno la metà delle soluzioni
    const threshold = Math.max(1, Math.floor(solutions.length / 2));
    
    return Object.entries(phrases)
      .filter(([, count]) => count >= threshold)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([phrase]) => phrase);
  }

  // Valuta la qualità del suggerimento fornito
  async rateSuggestion(
    suggestionId: string,
    ticketId: string,
    wasHelpful: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      // Salva il feedback per migliorare il sistema
      await supabase
        .from('automation_logs')
        .insert({
          ticket_id: ticketId,
          action_type: 'ml_feedback',
          action_details: {
            suggestion_id: suggestionId,
            was_helpful: wasHelpful,
            feedback: feedback || null,
            timestamp: new Date().toISOString()
          },
          success: wasHelpful
        });

      console.log(`Feedback salvato per suggerimento ${suggestionId}: ${wasHelpful ? 'Utile' : 'Non utile'}`);
    } catch (error) {
      console.error('Errore nel salvare feedback:', error);
    }
  }

  // Ottieni statistiche sulle performance del sistema ML
  async getMLPerformanceStats(): Promise<{
    totalSuggestions: number;
    helpfulSuggestions: number;
    accuracyRate: number;
    lastWeekSuggestions: number;
  }> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: feedbackLogs, error } = await supabase
        .from('automation_logs')
        .select('action_details, success, triggered_at')
        .eq('action_type', 'ml_feedback');

      if (error) throw error;

      const totalSuggestions = feedbackLogs?.length || 0;
      const helpfulSuggestions = feedbackLogs?.filter(log => log.success).length || 0;
      const lastWeekSuggestions = feedbackLogs?.filter(log => log.triggered_at >= oneWeekAgo).length || 0;
      
      const accuracyRate = totalSuggestions > 0 ? (helpfulSuggestions / totalSuggestions) * 100 : 0;

      return {
        totalSuggestions,
        helpfulSuggestions,
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        lastWeekSuggestions
      };
    } catch (error) {
      console.error('Errore nel calcolare statistiche ML:', error);
      return {
        totalSuggestions: 0,
        helpfulSuggestions: 0,
        accuracyRate: 0,
        lastWeekSuggestions: 0
      };
    }
  }
}

export const mlKnowledgeService = new MLKnowledgeService();
export type { MLSuggestion, SimilarTicketResponse };
