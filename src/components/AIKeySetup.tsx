
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain } from "lucide-react";

interface AIKeySetupProps {
  onProviderChange: (provider: 'huggingface') => void;
  currentProvider: 'huggingface';
}

const AIKeySetup = ({ onProviderChange, currentProvider }: AIKeySetupProps) => {
  // Automatically set Hugging Face as the provider
  if (currentProvider !== 'huggingface') {
    onProviderChange('huggingface');
  }

  return (
    <Alert className="text-purple-600 border-purple-200 bg-purple-50">
      <Brain className="h-4 w-4" />
      <AlertDescription>
        🤗 <strong>Attivo:</strong> Hugging Face AI - Analisi AI avanzata offline nel browser
      </AlertDescription>
    </Alert>
  );
};

export default AIKeySetup;
