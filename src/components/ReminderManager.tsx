import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { notificationService, type TicketReminder } from "@/services/notificationService";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ReminderManagerProps {
  ticketId?: string;
}

const ReminderManager = ({ ticketId }: ReminderManagerProps) => {
  const [reminders, setReminders] = useState<TicketReminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reminder_type: 'follow_up',
    scheduled_at: '',
    message: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadReminders = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userReminders = await notificationService.getReminders(user.id);
      
      // Filter by ticket if provided
      const filteredReminders = ticketId 
        ? userReminders.filter(r => r.ticket_id === ticketId)
        : userReminders;
        
      setReminders(filteredReminders);
    } catch (error) {
      console.error('Errore nel caricamento reminder:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i reminder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async () => {
    if (!user?.id || !ticketId) return;
    
    if (!formData.scheduled_at) {
      toast({
        title: "Errore",
        description: "Seleziona data e ora per il reminder",
        variant: "destructive",
      });
      return;
    }

    try {
      await notificationService.createReminder({
        ticket_id: ticketId,
        user_id: user.id,
        reminder_type: formData.reminder_type,
        scheduled_at: formData.scheduled_at,
        message: formData.message || undefined
      });

      setFormData({
        reminder_type: 'follow_up',
        scheduled_at: '',
        message: ''
      });
      setShowForm(false);
      await loadReminders();
      
      toast({
        title: "Successo",
        description: "Reminder creato correttamente",
      });
    } catch (error) {
      console.error('Errore nella creazione reminder:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il reminder",
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      await notificationService.deleteReminder(reminderId);
      await loadReminders();
      toast({
        title: "Successo",
        description: "Reminder eliminato",
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il reminder",
        variant: "destructive",
      });
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'Scadenza';
      case 'follow_up':
        return 'Follow-up';
      case 'escalation':
        return 'Escalation';
      default:
        return type;
    }
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'bg-red-100 text-red-800';
      case 'follow_up':
        return 'bg-blue-100 text-blue-800';
      case 'escalation':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (scheduledAt: string) => {
    return new Date(scheduledAt) < new Date();
  };

  useEffect(() => {
    loadReminders();
  }, [user?.id, ticketId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reminder
            </CardTitle>
            <CardDescription>
              {ticketId ? 'Gestisci i reminder per questo ticket' : 'I tuoi reminder programmati'}
            </CardDescription>
          </div>
          {ticketId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && ticketId && (
          <Card className="border-dashed">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Reminder</Label>
                  <Select
                    value={formData.reminder_type}
                    onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="deadline">Scadenza</SelectItem>
                      <SelectItem value="escalation">Escalation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data e Ora</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Messaggio (opzionale)</Label>
                <Textarea
                  placeholder="Descrizione del reminder..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={createReminder} size="sm">
                  Crea Reminder
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowForm(false)}
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun reminder programmato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <Card 
                key={reminder.id} 
                className={`transition-all duration-200 ${
                  isOverdue(reminder.scheduled_at) ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getReminderTypeColor(reminder.reminder_type)}>
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </Badge>
                        {isOverdue(reminder.scheduled_at) && (
                          <Badge variant="destructive">Scaduto</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium">
                        {new Date(reminder.scheduled_at).toLocaleString('it-IT')}
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reminder.scheduled_at), {
                          addSuffix: true,
                          locale: it
                        })}
                      </p>
                      
                      {reminder.message && (
                        <p className="text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReminderManager;