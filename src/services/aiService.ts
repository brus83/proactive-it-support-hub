
interface TicketAnalysis {
  category: string;
  priority: 'low' | 'medium' | 'high';
  urgency: string;
  suggestedSolutions: Array<{
    title: string;
    solution: string;
    confidence: number;
  }>;
  estimatedResolutionTime: string;
  keywords: string[];
  isUrgent: boolean;
}

class AIService {
  private provider: 'huggingface' = 'huggingface';

  constructor() {
    this.provider = 'huggingface';
  }

  setProvider(provider: 'huggingface') {
    this.provider = provider;
  }

  async analyzeTicket(title: string, description: string): Promise<TicketAnalysis> {
    console.log(`Analizzando ticket con Hugging Face AI`);
    return this.analyzeWithHuggingFace(title, description);
  }

  private async analyzeWithHuggingFace(title: string, description: string): Promise<TicketAnalysis> {
    try {
      const { huggingFaceAI } = await import('./huggingFaceAI');
      await huggingFaceAI.initialize();
      const analysis = await huggingFaceAI.analyzeTicket(title, description);
      
      return {
        category: analysis.category,
        priority: analysis.priority,
        urgency: analysis.urgency,
        suggestedSolutions: analysis.suggestedSolutions,
        estimatedResolutionTime: analysis.estimatedResolutionTime,
        keywords: analysis.keywords,
        isUrgent: analysis.isUrgent
      };
    } catch (error) {
      console.error('Hugging Face AI error:', error);
      return this.analyzeWithHeuristics(title, description);
    }
  }

  private analyzeWithHeuristics(title: string, description: string): TicketAnalysis {
    const text = `${title} ${description}`.toLowerCase();
    
    // Classificazione categoria
    let category = 'other';
    if (text.includes('wifi') || text.includes('internet') || text.includes('rete') || text.includes('connessione')) {
      category = 'network';
    } else if (text.includes('password') || text.includes('accesso') || text.includes('login')) {
      category = 'access';
    } else if (text.includes('stampante') || text.includes('monitor') || text.includes('mouse') || text.includes('tastiera')) {
      category = 'hardware';
    } else if (text.includes('software') || text.includes('applicazione') || text.includes('programma')) {
      category = 'software';
    } else if (text.includes('email') || text.includes('posta') || text.includes('outlook')) {
      category = 'email';
    }

    // Priorità
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (text.includes('urgente') || text.includes('non funziona') || text.includes('bloccato')) {
      priority = 'high';
    } else if (text.includes('lento') || text.includes('problema minore')) {
      priority = 'low';
    }

    // Urgenza
    let urgency = 'week';
    if (priority === 'high') urgency = 'immediate';
    else if (priority === 'medium') urgency = 'today';

    // Suggerimenti
    const suggestedSolutions = this.generateHeuristicSolutions(category, text);

    return {
      category,
      priority,
      urgency,
      suggestedSolutions,
      estimatedResolutionTime: priority === 'high' ? '2-4 ore' : priority === 'medium' ? '1-2 giorni' : '3-5 giorni',
      keywords: this.extractKeywords(text),
      isUrgent: priority === 'high'
    };
  }

  private generateHeuristicSolutions(category: string, text: string): Array<{title: string, solution: string, confidence: number}> {
    const solutions = [];

    switch (category) {
      case 'network':
        solutions.push({
          title: 'Riavvio Router/Modem',
          solution: 'Spegnere il router per 30 secondi, poi riaccenderlo. Attendere 2-3 minuti per la riconnessione.',
          confidence: 0.8
        });
        if (text.includes('wifi')) {
          solutions.push({
            title: 'Verifica Credenziali Wi-Fi',
            solution: 'Verificare nome rete e password Wi-Fi. Rimuovere e riaggiungere la rete salvata.',
            confidence: 0.75
          });
        }
        break;

      case 'access':
        solutions.push({
          title: 'Reset Password Self-Service',
          solution: 'Utilizzare il portale self-service aziendale per reimpostare autonomamente la password.',
          confidence: 0.9
        });
        break;

      case 'hardware':
        if (text.includes('stampante')) {
          solutions.push({
            title: 'Controllo Base Stampante',
            solution: 'Verificare che la stampante sia accesa, collegata alla rete e abbia carta e toner sufficienti.',
            confidence: 0.85
          });
        }
        break;

      case 'software':
        solutions.push({
          title: 'Riavvio Applicazione',
          solution: 'Chiudere completamente l\'applicazione e riaprirla. Se persiste, riavviare il computer.',
          confidence: 0.7
        });
        break;
    }

    return solutions;
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 'del', 'non', 'ho', 'mi', 'si'];
    return text.split(' ')
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
  }
}

export const aiService = new AIService();
export type { TicketAnalysis };
