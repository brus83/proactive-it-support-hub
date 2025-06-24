
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Key } from "lucide-react";

interface AIKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  hasApiKey: boolean;
}

const AIKeySetup = ({ onApiKeySet, hasApiKey }: AIKeySetupProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(!hasApiKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySet(apiKey.trim());
      setShowInput(false);
    }
  };

  if (hasApiKey && !showInput) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Brain className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Intelligenza Artificiale Attiva - Il sistema analizzerà automaticamente i tuoi ticket
          <Button 
            variant="link" 
            className="p-0 h-auto ml-2 text-xs"
            onClick={() => setShowInput(true)}
          >
            Cambia API Key
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
          <span>Attiva l'Intelligenza Artificiale</span>
        </CardTitle>
        <CardDescription>
          Inserisci la tua API Key OpenAI per abilitare l'analisi automatica intelligente dei ticket
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" disabled={!apiKey.trim()}>
            <Key className="w-4 h-4 mr-2" />
            Attiva AI
          </Button>
        </form>
        
        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <strong>Senza API Key:</strong> Il sistema utilizzerà comunque l'analisi automatica basata su regole predefinite
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AIKeySetup;
