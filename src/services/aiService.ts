
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

interface AIServiceConfig {
  apiKey?: string;
}

class AIService {
  private apiKey: string | null = null;

  constructor(config?: AIServiceConfig) {
    this.apiKey = config?.apiKey || null;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeTicket(title: string, description: string): Promise<TicketAnalysis> {
    if (!this.apiKey) {
      // Fallback a logica euristica migliorata
      return this.analyzeWithHeuristics(title, description);
    }

    try {
      const prompt = `
Analizza questo ticket IT e fornisci una classificazione dettagliata in formato JSON:

Titolo: "${title}"
Descrizione: "${description}"

Fornisci la risposta in questo formato JSON esatto:
{
  "category": "hardware|software|network|access|email|other",
  "priority": "low|medium|high",
  "urgency": "immediate|today|week|month",
  "suggestedSolutions": [
    {
      "title": "Titolo soluzione",
      "solution": "Descrizione dettagliata della soluzione",
      "confidence": 0.95
    }
  ],
  "estimatedResolutionTime": "2-4 ore|1-2 giorni|3-5 giorni",
  "keywords": ["parola1", "parola2"],
  "isUrgent": true|false
}

Considera:
- Hardware: problemi fisici, stampanti, monitor, mouse, tastiera
- Software: applicazioni, installazioni, licenze, aggiornamenti
- Network: wifi, internet, connessioni, VPN
- Access: password, login, permessi, account
- Email: posta elettronica, outlook, configurazioni email
- Priorità alta per: sistema non funziona, impossibile lavorare, sicurezza
- Priorità media per: rallentamenti, funzionalità parziali
- Priorità bassa per: richieste miglioramenti, domande generali
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sei un esperto sistema di analisi per ticket IT. Rispondi sempre e solo in formato JSON valido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON response
      const analysis = JSON.parse(content.trim());
      return analysis;

    } catch (error) {
      console.error('AI Analysis error:', error);
      // Fallback a analisi euristica
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
