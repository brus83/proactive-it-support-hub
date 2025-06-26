
import { pipeline } from '@huggingface/transformers';

interface HuggingFaceAnalysis {
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
  sentiment: string;
}

class HuggingFaceAIService {
  private classifier: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Usa un modello leggero per la classificazione del testo
      this.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      this.isInitialized = true;
      console.log('Hugging Face AI inizializzato con successo');
    } catch (error) {
      console.error('Errore inizializzazione Hugging Face:', error);
      this.isInitialized = false;
    }
  }

  async analyzeTicket(title: string, description: string): Promise<HuggingFaceAnalysis> {
    const text = `${title} ${description}`.toLowerCase();
    
    // Analisi del sentiment se il modello è disponibile
    let sentiment = 'neutral';
    if (this.isInitialized && this.classifier) {
      try {
        const sentimentResult = await this.classifier(text);
        sentiment = sentimentResult[0]?.label === 'POSITIVE' ? 'positive' : 'negative';
      } catch (error) {
        console.error('Errore analisi sentiment:', error);
      }
    }

    // Analisi euristica migliorata con ML-inspired features
    const analysis = this.performAdvancedHeuristics(title, description, sentiment);
    
    return {
      ...analysis,
      sentiment
    };
  }

  private performAdvancedHeuristics(title: string, description: string, sentiment: string): Omit<HuggingFaceAnalysis, 'sentiment'> {
    const text = `${title} ${description}`.toLowerCase();
    
    // Classificazione categoria con pattern più sofisticati
    const categoryPatterns = {
      hardware: [
        'stampante', 'monitor', 'schermo', 'mouse', 'tastiera', 'computer', 'pc', 'laptop',
        'hard disk', 'memoria', 'ram', 'cpu', 'ventola', 'rumore', 'surriscaldamento',
        'usb', 'cavo', 'alimentatore', 'battery', 'batteria'
      ],
      software: [
        'applicazione', 'programma', 'app', 'software', 'windows', 'office', 'excel',
        'word', 'browser', 'chrome', 'firefox', 'aggiornamento', 'installazione',
        'licenza', 'errore', 'crash', 'bug', 'virus', 'antivirus'
      ],
      network: [
        'wifi', 'internet', 'rete', 'connessione', 'router', 'modem', 'ethernet',
        'vpn', 'firewall', 'dns', 'ip', 'ping', 'banda', 'velocità', 'timeout'
      ],
      access: [
        'password', 'accesso', 'login', 'autenticazione', 'credenziali', 'account',
        'permessi', 'autorizzazione', 'utente', 'profilo', 'dominio', 'active directory'
      ],
      email: [
        'email', 'posta', 'outlook', 'thunderbird', 'smtp', 'pop3', 'imap',
        'allegato', 'spam', 'mailbox', 'sincronizzazione'
      ]
    };

    let category = 'other';
    let maxScore = 0;
    
    for (const [cat, patterns] of Object.entries(categoryPatterns)) {
      const score = patterns.reduce((acc, pattern) => {
        return acc + (text.includes(pattern) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        category = cat;
      }
    }

    // Classificazione priorità basata su urgenza e impatto
    const urgencyWords = ['urgente', 'immediato', 'critico', 'bloccante', 'fermo', 'non funziona'];
    const impactWords = ['tutti', 'sistema', 'server', 'produzione', 'clienti', 'fatturazione'];
    const minorWords = ['lento', 'miglioramento', 'suggerimento', 'consiglio', 'estetico'];

    const urgencyScore = urgencyWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
    const impactScore = impactWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
    const minorScore = minorWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);

    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (urgencyScore > 0 || impactScore > 1) {
      priority = 'high';
    } else if (minorScore > 0) {
      priority = 'low';
    }

    // Sentiment influenza la priorità
    if (sentiment === 'negative' && priority === 'medium') {
      priority = 'high';
    }

    const urgency = priority === 'high' ? 'immediate' : priority === 'medium' ? 'today' : 'week';
    const isUrgent = priority === 'high';

    // Genera soluzioni contestuali
    const suggestedSolutions = this.generateContextualSolutions(category, text, urgencyScore > 0);

    // Estrai keywords più intelligentemente
    const keywords = this.extractSmartKeywords(text);

    return {
      category,
      priority,
      urgency,
      suggestedSolutions,
      estimatedResolutionTime: this.calculateResolutionTime(priority, category),
      keywords,
      isUrgent
    };
  }

  private generateContextualSolutions(category: string, text: string, isUrgent: boolean): Array<{title: string, solution: string, confidence: number}> {
    const solutions = [];
    const baseConfidence = isUrgent ? 0.9 : 0.8;

    switch (category) {
      case 'hardware':
        if (text.includes('stampante')) {
          solutions.push({
            title: 'Controllo Stato Stampante',
            solution: 'Verificare che la stampante sia accesa, collegata alla rete e abbia carta e toner. Controllare la coda di stampa.',
            confidence: baseConfidence
          });
        }
        if (text.includes('monitor') || text.includes('schermo')) {
          solutions.push({
            title: 'Verifica Connessioni Monitor',
            solution: 'Controllare i cavi video (VGA, HDMI, DisplayPort). Testare con un altro cavo se disponibile.',
            confidence: baseConfidence - 0.1
          });
        }
        break;

      case 'software':
        solutions.push({
          title: 'Riavvio Applicazione',
          solution: 'Chiudere completamente l\'applicazione dal Task Manager e riaprirla. Se persiste, riavviare il computer.',
          confidence: baseConfidence - 0.1
        });
        if (text.includes('aggiornamento')) {
          solutions.push({
            title: 'Verifica Aggiornamenti',
            solution: 'Controllare Windows Update e gli aggiornamenti dell\'applicazione specifica.',
            confidence: baseConfidence
          });
        }
        break;

      case 'network':
        solutions.push({
          title: 'Riavvio Dispositivi di Rete',
          solution: 'Spegnere il router per 30 secondi, poi riaccenderlo. Attendere 2-3 minuti per la riconnessione completa.',
          confidence: baseConfidence
        });
        if (text.includes('wifi')) {
          solutions.push({
            title: 'Riconnessione Wi-Fi',
            solution: 'Dimenticare la rete Wi-Fi dalle impostazioni e riconnettersi inserendo nuovamente la password.',
            confidence: baseConfidence - 0.05
          });
        }
        break;

      case 'access':
        solutions.push({
          title: 'Reset Password Self-Service',
          solution: 'Utilizzare il portale aziendale per il reset autonomo della password o contattare l\'amministratore.',
          confidence: baseConfidence + 0.05
        });
        break;

      case 'email':
        solutions.push({
          title: 'Sincronizzazione Email',
          solution: 'Controllare le impostazioni del server email e forzare la sincronizzazione. Verificare la connessione internet.',
          confidence: baseConfidence
        });
        break;
    }

    // Aggiunge sempre una soluzione generica
    solutions.push({
      title: 'Documentazione e Supporto',
      solution: 'Consultare la documentazione interna o aprire un ticket per supporto specializzato.',
      confidence: 0.6
    });

    return solutions;
  }

  private extractSmartKeywords(text: string): string[] {
    const stopWords = ['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 'del', 'non', 'ho', 'mi', 'si', 'sono', 'stato', 'fatto', 'fare'];
    const words = text.split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Conta frequenza e prendi le più comuni
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([word]) => word);
  }

  private calculateResolutionTime(priority: 'low' | 'medium' | 'high', category: string): string {
    const baseTimes = {
      high: '1-3 ore',
      medium: '4-8 ore',
      low: '1-2 giorni'
    };
    
    // Aggiusta basandosi sulla categoria
    if (category === 'hardware' && priority === 'high') {
      return '30 minuti - 2 ore';
    }
    if (category === 'access') {
      return priority === 'high' ? '15-30 minuti' : '1-2 ore';
    }
    
    return baseTimes[priority];
  }
}

export const huggingFaceAI = new HuggingFaceAIService();
