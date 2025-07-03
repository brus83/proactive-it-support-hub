import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, Filter, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  ticket_id: string;
  action_type: string;
  action_details: any;
  triggered_at: string;
  success: boolean;
  error_message?: string;
}

const AuditLogsPage = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error("Errore nel caricamento dei log");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.ticket_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "success" && log.success) ||
                         (statusFilter === "error" && !log.success);
    return matchesSearch && matchesAction && matchesStatus;
  });

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'auto_assign': return 'bg-blue-100 text-blue-800';
      case 'escalation': return 'bg-red-100 text-red-800';
      case 'auto_response': return 'bg-green-100 text-green-800';
      case 'kb_suggestion': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'auto_assign': return 'Auto Assegnazione';
      case 'escalation': return 'Escalation';
      case 'auto_response': return 'Risposta Automatica';
      case 'kb_suggestion': return 'Suggerimento KB';
      default: return actionType;
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Data', 'Ticket ID', 'Azione', 'Stato', 'Dettagli'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.triggered_at).toLocaleString('it-IT'),
        log.ticket_id,
        getActionTypeLabel(log.action_type),
        log.success ? 'Successo' : 'Errore',
        JSON.stringify(log.action_details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Accesso Negato</CardTitle>
              <CardDescription>
                Solo gli amministratori possono visualizzare i log di controllo.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Log di Controllo</h1>
            <p className="text-muted-foreground">Monitora tutte le attività automatiche del sistema</p>
          </div>
          
          <Button onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Esporta CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Attività Sistema ({filteredLogs.length})
            </CardTitle>
            <CardDescription>
              Cronologia completa delle azioni automatiche e manuali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cerca per ticket ID o tipo azione..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le azioni</SelectItem>
                  <SelectItem value="auto_assign">Auto Assegnazione</SelectItem>
                  <SelectItem value="escalation">Escalation</SelectItem>
                  <SelectItem value="auto_response">Risposta Auto</SelectItem>
                  <SelectItem value="kb_suggestion">Suggerimenti KB</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="success">Successo</SelectItem>
                  <SelectItem value="error">Errori</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Caricamento log...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Azione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Dettagli</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(log.triggered_at).toLocaleString('it-IT')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ticket_id?.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionTypeColor(log.action_type)}>
                          {getActionTypeLabel(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Successo" : "Errore"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {log.error_message ? (
                            <span className="text-red-600 text-sm">{log.error_message}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {JSON.stringify(log.action_details || {}).substring(0, 50)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditLogsPage;