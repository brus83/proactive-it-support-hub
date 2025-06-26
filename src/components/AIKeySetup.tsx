import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Key } from "lucide-react";

interface AIKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  onProviderChange: (provider: 'openai' | 'huggingface' | 'heuristic') => void;
  hasApiKey: boolean;
  currentProvider: 'openai' | 'huggingface' | 'heuristic';
}

const AIKeySetup = ({ onApiKeySet, onProviderChange, hasApiKey, currentProvider }: AIKeySetupProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(!hasApiKey);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'huggingface' | 'heuristic'>(currentProvider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProvider === 'openai' && apiKey.trim()) {
      onApiKeySet(apiKey.trim());
      setShowInput(false);
    } else if (selectedProvider !== 'openai') {
      onProviderChange(selectedProvider);
      setShowInput(false);
    }
  };

  const handleProviderChange = (provider: 'openai' | 'huggingface' | 'heuristic') => {
    setSelectedProvider(provider);
    if (provider !== 'openai') {
      onProviderChange(provider);
    }
  };

  const getProviderInfo = () => {
    switch (currentProvider) {
      case 'openai':
        return {
          icon: '🤖',
          name: 'OpenAI GPT',
          description: 'Analisi AI avanzata con OpenAI',
          color: 'text-blue-600 border-blue-200 bg-blue-50'
        };
      case 'huggingface':
        return {
          icon: '🤗',
          name: 'Hugging Face AI',
          description: 'Analisi AI gratuita offline nel browser',
          color: 'text-purple-600 border-purple-200 bg-purple-50'
        };
      default:
        return {
          icon: '⚙️',
          name: 'Analisi Euristica',
          description: 'Analisi basata su regole predefinite',
          color: 'text-gray-600 border-gray-200 bg-gray-50'
        };
    }
  };

  if ((currentProvider === 'openai' && hasApiKey && !showInput) || (currentProvider !== 'openai' && !showInput)) {
    const info = getProviderInfo();
    return (
      <Alert className={info.color}>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          {info.icon} <strong>Attivo:</strong> {info.name} - {info.description}
          <Button 
            variant="link" 
            className="p-0 h-auto ml-2 text-xs"
            onClick={() => setShowInput(true)}
          >
            Cambia Provider AI
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-500" />
          <span>Configura Intelligenza Artificiale</span>
        </CardTitle>
        <CardDescription>
          Scegli il provider AI per l'analisi automatica dei ticket
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Provider AI</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="heuristic"
                  name="provider"
                  value="heuristic"
                  checked={selectedProvider === 'heuristic'}
                  onChange={() => handleProviderChange('heuristic')}
                  className="w-4 h-4"
                />
                <Label htmlFor="heuristic" className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>⚙️</span>
                    <div>
                      <div className="font-medium">Analisi Euristica (Gratis)</div>
                      <div className="text-xs text-muted-foreground">Analisi basata su regole predefinite - Sempre disponibile</div>
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="huggingface"
                  name="provider"
                  value="huggingface"
                  checked={selectedProvider === 'huggingface'}
                  onChange={() => handleProviderChange('huggingface')}
                  className="w-4 h-4"
                />
                <Label htmlFor="huggingface" className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>🤗</span>
                    <div>
                      <div className="font-medium">Hugging Face AI (Gratis)</div>
                      <div className="text-xs text-muted-foreground">Analisi AI avanzata offline nel browser - Nessuna API key richiesta</div>
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="openai"
                  name="provider"
                  value="openai"
                  checked={selectedProvider === 'openai'}
                  onChange={() => handleProviderChange('openai')}
                  className="w-4 h-4"
                />
                <Label htmlFor="openai" className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>🤖</span>
                    <div>
                      <div className="font-medium">OpenAI GPT (API Key richiesta)</div>
                      <div className="text-xs text-muted-foreground">Analisi AI più potente ma richiede API key</div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          {selectedProvider === 'openai' && (
            <div>
              <Label htmlFor="apikey">OpenAI API Key</Label>
              <Input
                id="apikey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                La tua API key è sicura e viene utilizzata solo per l'analisi dei ticket
              </p>
            </div>
          )}

          <Button type="submit" disabled={selectedProvider === 'openai' && !apiKey.trim()}>
            <Key className="w-4 h-4 mr-2" />
            {selectedProvider === 'openai' ? 'Attiva OpenAI' : `Attiva ${selectedProvider === 'huggingface' ? 'Hugging Face AI' : 'Analisi Euristica'}`}
          </Button>
        </form>
        
        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <strong>Raccomandazione:</strong> Hugging Face AI offre un'ottima analisi gratuita senza bisogno di API key, mentre l'analisi euristica è sempre disponibile come fallback.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AIKeySetup;
