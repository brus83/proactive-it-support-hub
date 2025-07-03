import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "./AdminSidebar";

const AdminMenuButton = () => {
  const { profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Solo admin e tecnici vedono il pulsante
  if (profile?.role !== 'admin' && profile?.role !== 'technician') {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="lg"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Settings className="w-4 h-4 mr-2" />
        Amministrazione
      </Button>
      
      <AdminSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </>
  );
};

export default AdminMenuButton;