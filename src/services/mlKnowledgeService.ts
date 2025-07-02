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
    
    // Rimuovi parole comuni italiane ma mantieni termini tecnici
    const stopWords = [
      'il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 
      'del', 'non', 'ho', 'mi', 'si', 'ma', 'come', 'anche', 'questo', 'quella',
      'sono', 'essere', 'fare', 'dire', 'andare', 'vedere', 'sapere', 'dare',
      'grazie', 'prego', 'saluti'
    ];
    
    // Estrai parole tecniche e significative, inclusi termini come "ipos", "aggiornamento"
    const words = cleanText
      .split(/\s+/)
      .filter(word => word.length > 2) // Ridotto da 3 a 2 per catturare "pos", "ip" etc
      .filter(word => !stopWords.includes(word))
      .filter(word => /^[a-zA-Z0-9àèéìíîòóùú]+$/.test(word));
    
    // Aggiungi peso extra per termini tecnici specifici
    const technicalTerms = ['ipos', 'pos', 'aggiornamento', 'update', 'software', 'sistema', 'errore', 'problema'];
    const weightedWords: { [key: string]: number } = {};
    
    words.forEach(word => {
      const weight = technicalTerms.includes(word) ? 3 : 1;
      weightedWords[word] = (weightedWords[word] || 0) + weight;
    });
    
    console.log('ML: Keywords estratte con pesi:', weightedWords);
    
    return Object.entries(weightedWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15) // Aumentato per catturare più termini
      .map(([word]) => word);
  }

  // Calcola similarità semantica migliorata tra due testi
  private calculateTextSimilarity(text1: string, text2: string): number {
    const keywords1 = this.extractKeywords(text1);
    const keywords2 = this.extractKeywords(text2);
    
    console.log('ML: Confronto keywords:', { keywords1, keywords2 });
    
    // Calcola similarità basata su keywords comuni
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    let jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // Bonus per termini tecnici specifici che matchano esattamente
    const technicalMatches = [...intersection].filter(word => 
      ['ipos', 'pos', 'aggiornamento', 'update', 'software'].includes(word)
    );
    
    if (technicalMatches.length > 0) {
      jaccardSimilarity += technicalMatches.length * 0.2; // Bonus significativo
      console.log('ML: Bonus per termini tecnici:', technicalMatches, 'Similarità aumentata a:', jaccardSimilarity);
    }
    
    // Calcola anche similarità per substring matching per termini come "ipos"
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();
    
    let substringBonus = 0;
    if (text1Lower.includes('ipos') && text2Lower.includes('ipos')) {
      substringBonus += 0.3;
      console.log('ML: Bonus IPOS substring match applicato');
    }
    if (text1Lower.includes('aggiornamento') && text2Lower.includes('aggiornamento')) {
      substringBonus += 0.2;
      console.log('ML: Bonus aggiornamento substring match applicato');
    }
    
    const finalSimilarity = Math.min(1.0, jaccardSimilarity + substringBonus);
    console.log('ML: Similarità finale:', finalSimilarity);
    
    return finalSimilarity;
  }

  // Trova ticket risolti simili al ticket corrente
  async findSimilarResolvedTickets(
    currentTitle: string, 
    currentDescription: string,
    limit: number = 10
  ): Promise<SimilarTicketResponse[]> {
    try {
      console.log('ML: Ricerca ticket simili per:', currentTitle);
      console.log('ML: Descrizione:', currentDescription.substring(0, 100));
      
      const sanitizedTitle = sanitizeSearchQuery(currentTitle);
      const sanitizedDescription = sanitizeSearchQuery(currentDescription);
      
      // Estrai keywords dal ticket corrente
      const currentKeywords = this.extractKeywords(`${sanitizedTitle} ${sanitizedDescription}`);
      console.log('ML: Keywords estratte dal ticket corrente:', currentKeywords);
      
      if (currentKeywords.length === 0) {
        console.log('ML: Nessuna keyword estratta');
        return [];
      }

      // Cerca ticket risolti con resolution_notes, includendo anche quelli chiusi
      const { data: resolvedTickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          description,
          resolution_notes,
          resolved_at,
          closed_at,
          status,
          categories (name)
        `)
        .in('status', ['resolved', 'closed'])
        .not('resolution_notes', 'is', null)
        .neq('resolution_notes', '')
        .order('resolved_at', { ascending: false })
        .limit(200); // Aumentato per avere più dati

      if (error) {
        console.error('ML: Errore query database:', error);
        throw error;
      }

      console.log('ML: Ticket risolti trovati nel database:', resolvedTickets?.length || 0);

      if (!resolvedTickets || resolvedTickets.length === 0) {
        console.log('ML: Nessun ticket risolto trovato nel database');
        return [];
      }

      // Debug: mostra alcuni ticket per verificare i dati
      console.log('ML: Primi 3 ticket risolti:');
      resolvedTickets.slice(0, 3).forEach((ticket, i) => {
        console.log(`ML: Ticket ${i + 1}:`, {
          title: ticket.title,
          hasResolution: !!ticket.resolution_notes,
          resolutionLength: ticket.resolution_notes?.length || 0
        });
      });

      // Calcola similarità per ogni ticket
      const similarTickets: SimilarTicketResponse[] = resolvedTickets
        .map(ticket => {
          const ticketText = `${ticket.title} ${ticket.description}`;
          const currentText = `${sanitizedTitle} ${sanitizedDescription}`;
          
          const similarity = this.calculateTextSimilarity(currentText, ticketText);
          
          console.log(`ML: Ticket "${ticket.title.substring(0, 50)}" - Similarità: ${similarity.toFixed(3)}`);
          
          return {
            ticket_id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            resolution_notes: ticket.resolution_notes || '',
            similarity_score: similarity,
            resolved_at: ticket.resolved_at || ticket.closed_at,
            category: ticket.categories?.name
          };
        })
        .filter(ticket => {
          const isRelevant = ticket.similarity_score > 0.01; // Soglia molto bassa per debug
          if (!isRelevant) {
            console.log(`ML: Scartato ticket "${ticket.title.substring(0, 30)}" - Similarità troppo bassa: ${ticket.similarity_score.toFixed(3)}`);
          }
          return isRelevant;
        })
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      console.log('ML: Ticket simili trovati dopo filtro:', similarTickets.length);
      console.log('ML: Top 5 ticket simili:');
      similarTickets.slice(0, 5).forEach((ticket, i) => {
        console.log(`ML: ${i + 1}. "${ticket.title.substring(0, 50)}" - Score: ${ticket.similarity_score.toFixed(3)}`);
        console.log(`ML:    Risoluzione: "${ticket.resolution_notes.substring(0, 100)}..."`);
      });

      return similarTickets;
    } catch (error) {
      console.error('ML: Errore nella ricerca di ticket simili:', error);
      return [];
    }
  }

  // Genera suggerimenti ML basati sui ticket simili
  async generateMLSuggestions(
    currentTitle: string,
    currentDescription: string
  ): Promise<MLSuggestion[]> {
    try {
      console.log('ML: === INIZIO GENERAZIONE SUGGERIMENTI ===');
      console.log('ML: Titolo:', currentTitle);
      console.log('ML: Descrizione:', currentDescription.substring(0, 200));
      
      const similarTickets = await this.findSimilarResolvedTickets(
        currentTitle, 
        currentDescription, 
        15 // Aumentato per avere più opzioni
      );

      if (similarTickets.length === 0) {
        console.log('ML: ❌ Nessun ticket simile trovato');
        return [];
      }

      console.log('ML: ✅ Elaborazione di', similarTickets.length, 'ticket simili');

      // Crea suggerimenti diretti dai ticket più simili
      const suggestions: MLSuggestion[] = [];
      
      // Prendi i migliori ticket e crea suggerimenti individuali
      const topTickets = similarTickets.slice(0, 5);
      
      topTickets.forEach((ticket, index) => {
        if (ticket.resolution_notes && ticket.resolution_notes.trim().length > 10) {
          const suggestion: MLSuggestion = {
            suggestion_id: `ml_direct_${ticket.ticket_id}_${Date.now()}_${index}`,
            suggested_solution: this.cleanAndFormatSolution(ticket.resolution_notes),
            confidence_score: Math.min(0.95, ticket.similarity_score + 0.1), // Boost confidence
            source_tickets: [ticket.ticket_id],
            keywords: this.extractKeywords(`${ticket.title} ${ticket.resolution_notes}`),
            created_at: new Date().toISOString()
          };
          
          suggestions.push(suggestion);
          console.log(`ML: ✅ Suggerimento ${index + 1} creato:`, {
            confidence: suggestion.confidence_score.toFixed(3),
            solution: suggestion.suggested_solution.substring(0, 100),
            sourceTicket: ticket.title.substring(0, 50)
          });
        }
      });

      // Se abbiamo più ticket simili, crea anche un suggerimento combinato
      if (similarTickets.length >= 2) {
        const combinedSolution = this.combineSolutions(
          similarTickets.slice(0, 3).map(t => t.resolution_notes)
        );
        
        if (combinedSolution && combinedSolution.length > 20) {
          const combinedSuggestion: MLSuggestion = {
            suggestion_id: `ml_combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            suggested_solution: combinedSolution,
            confidence_score: Math.min(0.9, similarTickets[0].similarity_score + 0.05),
            source_tickets: similarTickets.slice(0, 3).map(t => t.ticket_id),
            keywords: this.extractKeywords(combinedSolution),
            created_at: new Date().toISOString()
          };
          
          suggestions.push(combinedSuggestion);
          console.log('ML: ✅ Suggerimento combinato creato:', {
            confidence: combinedSuggestion.confidence_score.toFixed(3),
            solution: combinedSolution.substring(0, 100)
          });
        }
      }

      // Ordina per confidenza e prendi i migliori
      const finalSuggestions = suggestions
        .filter(s => s.suggested_solution.length > 15)
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, 5);

      console.log('ML: === RISULTATO FINALE ===');
      console.log('ML: Suggerimenti generati:', finalSuggestions.length);
      finalSuggestions.forEach((s, i) => {
        console.log(`ML: Suggerimento finale ${i + 1}:`, {
          id: s.suggestion_id,
          confidence: s.confidence_score.toFixed(3),
          solution: s.suggested_solution.substring(0, 150),
          sourceTickets: s.source_tickets.length
        });
      });

      return finalSuggestions;
    } catch (error) {
      console.error('ML: ❌ Errore nella generazione suggerimenti:', error);
      return [];
    }
  }

  // Pulisce e formatta una soluzione
  private cleanAndFormatSolution(solution: string): string {
    let cleaned = sanitizeText(solution);
    
    // Rimuovi caratteri extra e normalizza
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Assicurati che finisca con un punto
    if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
    
    return cleaned;
  }

  // Combina più soluzioni in una sola
  private combineSolutions(solutions: string[]): string {
    const validSolutions = solutions.filter(s => s && s.trim().length > 10);
    
    if (validSolutions.length === 0) return '';
    if (validSolutions.length === 1) return this.cleanAndFormatSolution(validSolutions[0]);
    
    // Trova frasi comuni o usa la soluzione più dettagliata
    const longestSolution = validSolutions.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    
    // Se le soluzioni sono molto simili, usa quella più lunga
    const similarity = this.calculateTextSimilarity(validSolutions[0], validSolutions[1]);
    if (similarity > 0.7) {
      return this.cleanAndFormatSolution(longestSolution);
    }
    
    // Altrimenti combina le prime due soluzioni
    const combined = `${validSolutions[0].trim()}. Inoltre: ${validSolutions[1].trim()}`;
    return this.cleanAndFormatSolution(combined);
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
          action_type: 'kb_suggestion',
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

      console.log(`ML: ✅ Feedback salvato con successo per suggerimento ${suggestionId}`);
    } catch (error) {
      console.error('ML: ❌ Errore nel salvare feedback:', error);
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
      console.error('ML: Errore nel calcolare statistiche:', error);
      return {
        totalSuggestions: 0,
        helpfulSuggestions: 0,
        accuracyRate: 0,
        lastWeekSuggestions: 0
      };
    }
  }

  // Metodo per testare il sistema con dati specifici IPOS
  async testMLSystemWithIPOS(): Promise<void> {
    console.log('ML: === TEST SISTEMA ML CON IPOS ===');
    
    try {
      // Test specifico per IPOS
      const suggestions = await this.generateMLSuggestions(
        "Problema aggiornamento IPOS",
        "Il sistema IPOS non si aggiorna correttamente, errore durante l'aggiornamento del software"
      );
      
      console.log('ML: Test IPOS completato. Suggerimenti trovati:', suggestions.length);
      suggestions.forEach((s, i) => {
        console.log(`ML: Test IPOS Suggerimento ${i + 1}:`, {
          confidence: s.confidence_score,
          solution: s.suggested_solution.substring(0, 200)
        });
      });

      // Test anche con varianti
      const suggestions2 = await this.generateMLSuggestions(
        "IPOS non funziona",
        "Problemi con il sistema IPOS dopo aggiornamento"
      );
      
      console.log('ML: Test IPOS variante completato. Suggerimenti trovati:', suggestions2.length);
      
    } catch (error) {
      console.error('ML: ❌ Errore nel test IPOS:', error);
    }
  }
}

export const mlKnowledgeService = new MLKnowledgeService();