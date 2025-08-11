import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BackToDashboardButton = () => {
  return (
    <div className="mb-4">
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla Dashboard
        </Link>
      </Button>
    </div>
  );
};

export default BackToDashboardButton;
