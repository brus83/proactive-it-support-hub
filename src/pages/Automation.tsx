
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
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
        <AutomationDashboard />
      </div>
    </div>
  );
};

export default Automation;
