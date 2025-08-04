import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { notificationService, type NotificationSettings } from "@/services/notificationService";
import { Bell, Mail, Clock, Moon } from "lucide-react";

const NotificationSettingsComponent = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadSettings = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userSettings = await notificationService.getUserSettings(user.id);
      setSettings(userSettings || {
        id: '',
        user_id: user.id,
        new_ticket_in_app: true,
        new_ticket_email: true,
        escalation_in_app: true,
        escalation_email: true,
        deadline_in_app: true,
        deadline_email: true,
        reminder_in_app: true,
        reminder_email: false,
        email_frequency: 'immediate',
        quiet_hours_start: undefined,
        quiet_hours_end: undefined
      });
    } catch (error) {
      console.error('Errore nel caricamento impostazioni:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le impostazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id || !settings) return;
    
    try {
      setSaving(true);
      await notificationService.updateSettings(user.id, settings);
      toast({
        title: "Successo",
        description: "Impostazioni salvate correttamente",
      });
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Impostazioni Notifiche</h2>
        <p className="text-muted-foreground">
          Configura come e quando ricevere le notifiche
        </p>
      </div>

      {/* Notifiche Nuovi Ticket */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Nuovi Ticket
          </CardTitle>
          <CardDescription>
            Notifiche quando vengono creati nuovi ticket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-ticket-app">Notifiche in-app</Label>
            <Switch
              id="new-ticket-app"
              checked={settings.new_ticket_in_app}
              onCheckedChange={(checked) => updateSetting('new_ticket_in_app', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-ticket-email">Notifiche email</Label>
            <Switch
              id="new-ticket-email"
              checked={settings.new_ticket_email}
              onCheckedChange={(checked) => updateSetting('new_ticket_email', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifiche Escalation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Escalation
          </CardTitle>
          <CardDescription>
            Notifiche quando i ticket vengono escalati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="escalation-app">Notifiche in-app</Label>
            <Switch
              id="escalation-app"
              checked={settings.escalation_in_app}
              onCheckedChange={(checked) => updateSetting('escalation_in_app', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="escalation-email">Notifiche email</Label>
            <Switch
              id="escalation-email"
              checked={settings.escalation_email}
              onCheckedChange={(checked) => updateSetting('escalation_email', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifiche Scadenze */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Scadenze e Deadline
          </CardTitle>
          <CardDescription>
            Notifiche per scadenze e deadline dei ticket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="deadline-app">Notifiche in-app</Label>
            <Switch
              id="deadline-app"
              checked={settings.deadline_in_app}
              onCheckedChange={(checked) => updateSetting('deadline_in_app', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="deadline-email">Notifiche email</Label>
            <Switch
              id="deadline-email"
              checked={settings.deadline_email}
              onCheckedChange={(checked) => updateSetting('deadline_email', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifiche Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Reminder
          </CardTitle>
          <CardDescription>
            Notifiche per i reminder programmati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-app">Notifiche in-app</Label>
            <Switch
              id="reminder-app"
              checked={settings.reminder_in_app}
              onCheckedChange={(checked) => updateSetting('reminder_in_app', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-email">Notifiche email</Label>
            <Switch
              id="reminder-email"
              checked={settings.reminder_email}
              onCheckedChange={(checked) => updateSetting('reminder_email', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Impostazioni Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Impostazioni Email
          </CardTitle>
          <CardDescription>
            Configura la frequenza delle email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-frequency">Frequenza email</Label>
            <Select
              value={settings.email_frequency}
              onValueChange={(value) => updateSetting('email_frequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediata</SelectItem>
                <SelectItem value="hourly">Ogni ora</SelectItem>
                <SelectItem value="daily">Giornaliera</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orari di Silenzio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Orari di Silenzio
          </CardTitle>
          <CardDescription>
            Non ricevere notifiche durante questi orari
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Inizio</Label>
              <Input
                id="quiet-start"
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Fine</Label>
              <Input
                id="quiet-end"
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva Impostazioni"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettingsComponent;