import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AutomationDashboard from "@/components/AutomationDashboard";

const Automation = () => {
  const { profile } = useAuth();

  // Solo admin e tecnici possono accedere alla dashboard automazione
  if (profile?.role !== 'admin' && profile?.role !== 'technician') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con pulsante per tornare alla dashboard */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Dashboard Automazione</h1>
            <p className="text-muted-foreground">Monitora e gestisci le automazioni del sistema</p>
          </div>
        </div>
        
        <AutomationDashboard />
      </div>
    </div>
  );
};

export default Automation;