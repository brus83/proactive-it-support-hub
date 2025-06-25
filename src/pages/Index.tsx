
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      navigate('/dashboard');
    }
  }, [navigate, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Sistema Ticketing IT</h1>
        <p className="text-xl text-muted-foreground">Caricamento in corso...</p>
      </div>
    </div>
  );
};

export default Index;
