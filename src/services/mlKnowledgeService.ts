import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery, sanitizeText } from "@/utils/sanitizer";

export interface SimilarTicketResponse {
  ticket_id: string;
  title: string;
  description: string;
  resolution_notes: string;
  similarity_score: number;
  resolved_at: string;
  category?: string;
}

export interface MLSuggestion {
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
      'problema', 'errore', 'aiuto', 'grazie', 'prego'
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
      console.log('ML: Ricerca ticket simili per:', currentTitle);
      
      const sanitizedTitle = sanitizeSearchQuery(currentTitle);
      const sanitizedDescription = sanitizeSearchQuery(currentDescription);
      
      // Estrai keywords dal ticket corrente
      const currentKeywords = this.extractKeywords(`${sanitizedTitle} ${sanitizedDescription}`);
      console.log('ML: Keywords estratte:', currentKeywords);
      
      if (currentKeywords.length === 0) {
        console.log('ML: Nessuna keyword estratta');
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
        .in('status', ['resolved', 'closed'])
        .not('resolution_notes', 'is', null)
        .neq('resolution_notes', '')
        .order('resolved_at', { ascending: false })
        .limit(100); // Aumentato per avere più dati

      if (error) {
        console.error('ML: Errore query database:', error);
        throw error;
      }

      console.log('ML: Ticket risolti trovati:', resolvedTickets?.length || 0);

      if (!resolvedTickets || resolvedTickets.length === 0) {
        console.log('ML: Nessun ticket risolto trovato nel database');
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
        .filter(ticket => ticket.similarity_score > 0.05) // Soglia più bassa
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      console.log('ML: Ticket simili trovati:', similarTickets.length);
      console.log('ML: Migliori similarità:', similarTickets.slice(0, 3).map(t => ({ 
        title: t.title.substring(0, 50), 
        score: t.similarity_score 
      })));

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
      console.log('ML: Generazione suggerimenti per:', currentTitle);
      
      const similarTickets = await this.findSimilarResolvedTickets(
        currentTitle, 
        currentDescription, 
        10
      );

      if (similarTickets.length === 0) {
        console.log('ML: Nessun ticket simile trovato');
        return [];
      }

      console.log('ML: Elaborazione di', similarTickets.length, 'ticket simili');

      // Raggruppa soluzioni simili
      const solutionGroups: { [key: string]: SimilarTicketResponse[] } = {};
      
      similarTickets.forEach(ticket => {
        const solutionKeywords = this.extractKeywords(ticket.resolution_notes);
        const groupKey = solutionKeywords.slice(0, 3).join('_') || 'generic';
        
        if (!solutionGroups[groupKey]) {
          solutionGroups[groupKey] = [];
        }
        solutionGroups[groupKey].push(ticket);
      });

      console.log('ML: Gruppi di soluzioni creati:', Object.keys(solutionGroups).length);

      // Genera suggerimenti da ogni gruppo
      const suggestions: MLSuggestion[] = Object.entries(solutionGroups)
        .map(([groupKey, tickets]) => {
          const bestTicket = tickets[0]; // Il più simile del gruppo
          const confidence = Math.min(0.95, tickets.length * 0.15 + bestTicket.similarity_score);
          
          // Combina e migliora la soluzione
          const combinedSolution = this.refineSolution(
            tickets.map(t => t.resolution_notes)
          );

          return {
            suggestion_id: `ml_${groupKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            suggested_solution: combinedSolution,
            confidence_score: confidence,
            source_tickets: tickets.map(t => t.ticket_id),
            keywords: this.extractKeywords(combinedSolution),
            created_at: new Date().toISOString()
          };
        })
        .filter(suggestion => suggestion.suggested_solution.length > 10) // Filtra soluzioni troppo corte
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, 5); // Massimo 5 suggerimenti

      console.log('ML: Suggerimenti generati:', suggestions.length);
      suggestions.forEach((s, i) => {
        console.log(`ML: Suggerimento ${i + 1}: Confidenza ${s.confidence_score.toFixed(2)}, Lunghezza: ${s.suggested_solution.length}`);
      });

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
        if (cleanSentence.length > 15) { // Solo frasi significative
          phrases[cleanSentence] = (phrases[cleanSentence] || 0) + 1;
        }
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
      console.log('ML: Salvando feedback per suggerimento:', suggestionId, 'Utile:', wasHelpful);
      
      // Salva il feedback per migliorare il sistema
      const { error } = await supabase
        .from('automation_logs')
        .insert({
          ticket_id: ticketId,
          action_type: 'kb_suggestion', // Usa un tipo esistente
          action_details: {
            suggestion_id: suggestionId,
            was_helpful: wasHelpful,
            feedback: feedback || null,
            timestamp: new Date().toISOString(),
            ml_feedback: true
          },
          success: wasHelpful
        });

      if (error) {
        console.error('ML: Errore nel salvare feedback:', error);
        throw error;
      }

      console.log(`ML: Feedback salvato con successo per suggerimento ${suggestionId}`);
    } catch (error) {
      console.error('Errore nel salvare feedback:', error);
      throw error;
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
        .eq('action_type', 'kb_suggestion')
        .not('action_details->ml_feedback', 'is', null);

      if (error) {
        console.error('ML: Errore nel recuperare statistiche:', error);
        throw error;
      }

      const mlFeedbackLogs = feedbackLogs?.filter(log => 
        log.action_details && log.action_details.ml_feedback === true
      ) || [];

      const totalSuggestions = mlFeedbackLogs.length;
      const helpfulSuggestions = mlFeedbackLogs.filter(log => log.success).length;
      const lastWeekSuggestions = mlFeedbackLogs.filter(log => log.triggered_at >= oneWeekAgo).length;
      
      const accuracyRate = totalSuggestions > 0 ? (helpfulSuggestions / totalSuggestions) * 100 : 0;

      console.log('ML: Statistiche calcolate:', {
        totalSuggestions,
        helpfulSuggestions,
        accuracyRate,
        lastWeekSuggestions
      });

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

  // Metodo per testare il sistema con dati di esempio
  async testMLSystem(): Promise<void> {
    console.log('ML: Test del sistema ML...');
    
    try {
      // Test con un esempio
      const suggestions = await this.generateMLSuggestions(
        "Problema stampante non funziona",
        "La stampante dell'ufficio non stampa più, sembra che sia un problema di driver"
      );
      
      console.log('ML: Test completato. Suggerimenti trovati:', suggestions.length);
      suggestions.forEach((s, i) => {
        console.log(`ML: Test Suggerimento ${i + 1}:`, s.suggested_solution.substring(0, 100));
      });
    } catch (error) {
      console.error('ML: Errore nel test:', error);
    }
  }
}

export const mlKnowledgeService = new MLKnowledgeService();