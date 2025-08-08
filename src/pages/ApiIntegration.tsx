import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Settings, Zap, CheckCircle, AlertTriangle, ExternalLink, Database, Sync } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface IntegrationConfig {
  id: string;
  name: string;
  provider: 'zendesk' | 'freshdesk' | 'jira' | 'servicenow' | 'custom';
  endpoint: string;
  isActive: boolean;
  lastSync?: string;
  status: 'connected' | 'error' | 'pending';
}

const ApiIntegration = () => {
  const { profile } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [configForm, setConfigForm] = useState({
    name: '',
    endpoint: '',
    apiKey: '',
    email: '',
    subdomain: ''
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data per demo
  useEffect(() => {
    setIntegrations([
      {
        id: '1',
        name: 'Zendesk Production',
        provider: 'zendesk',
        endpoint: 'https://company.zendesk.com',
        isActive: true,
        lastSync: new Date().toISOString(),
        status: 'connected'
      },
      {
        id: '2',
        name: 'Freshdesk Support',
        provider: 'freshdesk',
        endpoint: 'https://company.freshdesk.com',
        isActive: false,
        status: 'pending'
      }
    ]);
  }, []);

  const handleCreateIntegration = async () => {
    if (!selectedProvider || !configForm.name || !configForm.endpoint) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsConfiguring(true);
    try {
      // Simula creazione integrazione
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newIntegration: IntegrationConfig = {
        id: Date.now().toString(),
        name: configForm.name,
        provider: selectedProvider as any,
        endpoint: configForm.endpoint,
        isActive: true,
        status: 'connected'
      };

      setIntegrations(prev => [...prev, newIntegration]);
      
      // Reset form
      setConfigForm({
        name: '',
        endpoint: '',
        apiKey: '',
        email: '',
        subdomain: ''
      });
      setSelectedProvider('');
      
      toast.success("Integrazione configurata con successo!");
    } catch (error) {
      toast.error("Errore nella configurazione dell'integrazione");
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      toast.info("Sincronizzazione avviata...");
      
      // Simula sincronizzazione
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIntegrations(prev => prev.map(int => 
        int.id === integrationId 
          ? { ...int, lastSync: new Date().toISOString(), status: 'connected' }
          : int
      ));
      
      toast.success("Sincronizzazione completata!");
    } catch (error) {
      toast.error("Errore durante la sincronizzazione");
    }
  };

  const toggleIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(int => 
      int.id === integrationId 
        ? { ...int, isActive: !int.isActive }
        : int
    ));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'zendesk': return '🎫';
      case 'freshdesk': return '🎯';
      case 'jira': return '🔷';
      case 'servicenow': return '⚡';
      default: return '🔗';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Accesso Negato</CardTitle>
              <CardDescription>
                Solo gli amministratori possono gestire le integrazioni API.
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Integrazioni API</h1>
            <p className="text-muted-foreground">Connetti sistemi esterni di ticketing</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="configure">Configura</TabsTrigger>
            <TabsTrigger value="logs">Log Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Integrazioni Attive</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {integrations.filter(i => i.isActive).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connesse</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {integrations.filter(i => i.status === 'connected').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Errore</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {integrations.filter(i => i.status === 'error').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ultima Sync</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold">
                    {integrations.find(i => i.lastSync) 
                      ? new Date(integrations.find(i => i.lastSync)!.lastSync!).toLocaleTimeString()
                      : 'Mai'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Integrations List */}
            <Card>
              <CardHeader>
                <CardTitle>Integrazioni Configurate</CardTitle>
                <CardDescription>
                  Gestisci le connessioni ai sistemi esterni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {getProviderIcon(integration.provider)}
                        </div>
                        <div>
                          <div className="font-medium">{integration.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {integration.endpoint}
                          </div>
                          {integration.lastSync && (
                            <div className="text-xs text-muted-foreground">
                              Ultima sync: {new Date(integration.lastSync).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(integration.status)}>
                          {integration.status === 'connected' ? 'Connesso' :
                           integration.status === 'error' ? 'Errore' : 'In attesa'}
                        </Badge>
                        
                        <Switch
                          checked={integration.isActive}
                          onCheckedChange={() => toggleIntegration(integration.id)}
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                          disabled={!integration.isActive}
                        >
                          <Sync className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nuova Integrazione</CardTitle>
                <CardDescription>
                  Configura una nuova connessione a un sistema esterno
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zendesk">🎫 Zendesk</SelectItem>
                      <SelectItem value="freshdesk">🎯 Freshdesk</SelectItem>
                      <SelectItem value="jira">🔷 Jira Service Management</SelectItem>
                      <SelectItem value="servicenow">⚡ ServiceNow</SelectItem>
                      <SelectItem value="custom">🔗 Custom API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Integrazione</Label>
                    <Input
                      placeholder="es. Zendesk Production"
                      value={configForm.name}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      placeholder="https://company.zendesk.com"
                      value={configForm.endpoint}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, endpoint: e.target.value }))}
                    />
                  </div>
                </div>

                {selectedProvider === 'zendesk' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        placeholder="admin@company.com"
                        value={configForm.email}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Token</Label>
                      <Input
                        type="password"
                        placeholder="API Token Zendesk"
                        value={configForm.apiKey}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {selectedProvider === 'freshdesk' && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="API Key Freshdesk"
                      value={configForm.apiKey}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleCreateIntegration}
                  disabled={isConfiguring || !selectedProvider}
                  className="w-full"
                >
                  {isConfiguring ? "Configurazione..." : "Crea Integrazione"}
                </Button>
              </CardContent>
            </Card>

            {/* Provider Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Documentazione Provider</CardTitle>
                <CardDescription>
                  Guide per configurare le integrazioni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🎫</span>
                      <div>
                        <h3 className="font-medium">Zendesk</h3>
                        <p className="text-sm text-muted-foreground">Piattaforma di customer service</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong>Endpoint:</strong> https://[subdomain].zendesk.com</p>
                      <p><strong>Auth:</strong> Email + API Token</p>
                      <p><strong>Funzioni:</strong> Sync bidirezionale, webhook</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentazione
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <h3 className="font-medium">Freshdesk</h3>
                        <p className="text-sm text-muted-foreground">Helpdesk cloud-based</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong>Endpoint:</strong> https://[domain].freshdesk.com</p>
                      <p><strong>Auth:</strong> API Key</p>
                      <p><strong>Funzioni:</strong> Sync ticket, automazioni</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentazione
                    </Button>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Log Sincronizzazioni</CardTitle>
                <CardDescription>
                  Cronologia delle sincronizzazioni con sistemi esterni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      timestamp: new Date().toISOString(),
                      provider: 'Zendesk Production',
                      action: 'Sync to External',
                      status: 'success',
                      details: '5 ticket sincronizzati'
                    },
                    {
                      timestamp: new Date(Date.now() - 3600000).toISOString(),
                      provider: 'Freshdesk Support',
                      action: 'Sync from External',
                      status: 'error',
                      details: 'Errore autenticazione API'
                    }
                  ].map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {log.status === 'success' ? 
                            <CheckCircle className="h-4 w-4" /> : 
                            <AlertTriangle className="h-4 w-4" />
                          }
                        </div>
                        <div>
                          <div className="font-medium">{log.provider}</div>
                          <div className="text-sm text-muted-foreground">{log.action}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status === 'success' ? 'Successo' : 'Errore'}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {log.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiIntegration;