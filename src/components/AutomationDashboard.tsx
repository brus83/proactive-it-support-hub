
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  BarChart3,
  Settings,
  Play,
  Pause
} from "lucide-react";
import { automationService, AutomationLog, EscalationRule, ScheduledIntervention } from "@/services/automationService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const AutomationDashboard = () => {
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [interventions, setInterventions] = useState<ScheduledIntervention[]>([]);
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      const [logs, rules, scheduledInterventions, analysis] = await Promise.all([
        automationService.getAutomationLogs(),
        automationService.getEscalationRules(),
        automationService.getScheduledInterventions(),
        automationService.getPredictiveAnalysis()
      ]);

      setAutomationLogs(logs);
      setEscalationRules(rules);
      setInterventions(scheduledInterventions);
      setPredictiveData(analysis);
    } catch (error) {
      console.error('Errore caricamento dati automazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati di automazione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runEscalationCheck = async () => {
    try {
      await automationService.checkTicketsForEscalation();
      toast({
        title: "Controllo Escalation",
        description: "Controllo escalation eseguito con successo",
      });
      loadAutomationData();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il controllo escalation",
        variant: "destructive"
      });
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'auto_assign': return 'bg-blue-100 text-blue-800';
      case 'escalation': return 'bg-red-100 text-red-800';
      case 'auto_response': return 'bg-green-100 text-green-800';
      case 'kb_suggestion': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'auto_assign': return <Zap className="h-4 w-4" />;
      case 'escalation': return <AlertTriangle className="h-4 w-4" />;
      case 'auto_response': return <CheckCircle className="h-4 w-4" />;
      case 'kb_suggestion': return <BarChart3 className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Automazione</h2>
          <p className="text-muted-foreground">Monitora e gestisci le automazioni del sistema</p>
        </div>
        
        {profile?.role === 'admin' && (
          <Button onClick={runEscalationCheck}>
            <Play className="h-4 w-4 mr-2" />
            Esegui Controllo Escalation
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="logs">Log Automazioni</TabsTrigger>
          <TabsTrigger value="interventions">Interventi</TabsTrigger>
          <TabsTrigger value="analytics">Analisi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Auto-assegnati</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {automationLogs.filter(log => log.action_type === 'auto_assign').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalation Attive</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {automationLogs.filter(log => log.action_type === 'escalation').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interventi Programmati</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {interventions.filter(i => i.status === 'scheduled').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regole Attive</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {escalationRules.filter(rule => rule.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regole di Escalation</CardTitle>
                <CardDescription>Configurazione delle escalation automatiche</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {escalationRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Priorità: {rule.priority} • {rule.time_threshold_hours}h • {rule.escalate_to_role}
                        </div>
                      </div>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Attiva" : "Inattiva"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attività Recenti</CardTitle>
                <CardDescription>Ultime azioni automatiche del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automationLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-full ${getActionTypeColor(log.action_type)}`}>
                        {getActionTypeIcon(log.action_type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium capitalize">
                          {log.action_type.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(log.triggered_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Successo" : "Errore"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Log Completo Automazioni</CardTitle>
              <CardDescription>Tutte le azioni automatiche eseguite dal sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {automationLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className={`p-2 rounded-full ${getActionTypeColor(log.action_type)} mt-1`}>
                      {getActionTypeIcon(log.action_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium capitalize">
                          {log.action_type.replace('_', ' ')}
                        </span>
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Successo" : "Errore"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.triggered_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {log.action_details && (
                        <div className="text-sm text-muted-foreground">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.action_details, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {log.error_message && (
                        <div className="text-sm text-red-600 mt-2">
                          Errore: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card>
            <CardHeader>
              <CardTitle>Interventi Programmati</CardTitle>
              <CardDescription>Gestione degli interventi tecnici pianificati</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {interventions.map((intervention) => (
                  <div key={intervention.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
                        <div>
                          <div className="font-medium">
                            {new Date(intervention.scheduled_start).toLocaleString()} - 
                            {new Date(intervention.scheduled_end).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tipo: {intervention.intervention_type}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          intervention.status === 'completed' ? 'default' :
                          intervention.status === 'in_progress' ? 'secondary' :
                          intervention.status === 'cancelled' ? 'destructive' : 'outline'
                        }
                      >
                        {intervention.status}
                      </Badge>
                    </div>
                    
                    {intervention.notes && (
                      <div className="text-sm text-muted-foreground">
                        Note: {intervention.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Orari di Picco</CardTitle>
                <CardDescription>Ore con maggior numero di ticket</CardDescription>
              </CardHeader>
              <CardContent>
                {predictiveData?.peakHours && (
                  <div className="space-y-2">
                    {predictiveData.peakHours.map((hour: number) => (
                      <div key={hour} className="flex items-center gap-3">
                        <Clock className="h-4 w-4" />
                        <span>{hour}:00 - {hour + 1}:00</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dipartimenti più Attivi</CardTitle>
                <CardDescription>Reparti con più richieste</CardDescription>
              </CardHeader>
              <CardContent>
                {predictiveData?.busiestDepartments && (
                  <div className="space-y-2">
                    {predictiveData.busiestDepartments.map((dept: string, index: number) => (
                      <div key={dept} className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span>{dept}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDashboard;
