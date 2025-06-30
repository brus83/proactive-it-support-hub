import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, User, Tag, Eye, Edit, MessageSquare } from "lucide-react";

export type TicketStatus = "pending" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  onView?: (ticketId: string) => void;
  onEdit?: (ticketId: string) => void;
}

const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
    case "resolved": return "bg-green-100 text-green-800 border-green-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: TicketPriority) => {
  switch (priority) {
    case "high": return "bg-red-100 text-red-800 border-red-200";
    case "medium": return "bg-orange-100 text-orange-800 border-orange-200";
    case "low": return "bg-gray-100 text-gray-800 border-gray-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusText = (status: TicketStatus) => {
  switch (status) {
    case "pending": return "In Attesa";
    case "in_progress": return "In Lavorazione";
    case "resolved": return "Risolto";
    default: return status;
  }
};

const getPriorityText = (priority: TicketPriority) => {
  switch (priority) {
    case "high": return "Alta";
    case "medium": return "Media";
    case "low": return "Bassa";
    default: return priority;
  }
};

const TicketCard = ({ ticket, onView, onEdit }: TicketCardProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleViewClick = () => {
    if (onView) {
      onView(ticket.id);
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(ticket.id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start space-x-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold truncate">{ticket.title}</h3>
              <Badge variant="outline" className="text-xs">
                #{ticket.id.substring(0, 8).toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {ticket.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Creato: {formatDate(ticket.createdAt)}</span>
              </div>
              
              {ticket.assignedTo && (
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>Assegnato a: {ticket.assignedTo}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Tag className="w-4 h-4" />
                <span className="capitalize">{ticket.category}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusText(ticket.status)}
            </Badge>
            
            <Badge className={getPriorityColor(ticket.priority)}>
              Priorità {getPriorityText(ticket.priority)}
            </Badge>
            
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleViewClick}
                className="flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Visualizza
              </Button>
              
              {ticket.status !== 'resolved' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleEditClick}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  Commenta
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;