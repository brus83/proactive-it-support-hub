import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, BarChart3, TrendingUp, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionTime: number;
  ticketsByCategory: Array<{ name: string; count: number; color: string }>;
  ticketsByPriority: Array<{ priority: string; count: number }>;
  ticketsByMonth: Array<{ month: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
  operatorStats: Array<{ 
    name: string; 
    totalAssigned: number; 
    resolved: number; 
    inProgress: number; 
    averageResolutionTime: number;
  }>;
}

interface DatabaseTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  contact_name?: string;
  categories?: {
    name: string;
    color: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
  assigned_user?: {
    full_name: string;
  } | null;
}

const Statistics = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);

  const fetchStatistics = async () => {
    try {
      // Fetch all tickets with categories and assigned users
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color),
          assigned_user:profiles!tickets_assigned_to_fkey (full_name)
        `);

      if (error) throw error;

      const typedTickets = ticketsData as any[];
      const validTickets: DatabaseTicket[] = typedTickets?.map(ticket => ({
        ...ticket,
        categories: ticket.categories || null,
        assigned_user: ticket.assigned_user || null
      })) || [];

      setTickets(validTickets);

      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      // Calculate statistics
      const totalTickets = validTickets?.length || 0;
      const openTickets = validTickets?.filter(t => t.status === 'open').length || 0;
      const inProgressTickets = validTickets?.filter(t => t.status === 'in_progress').length || 0;
      const resolvedTickets = validTickets?.filter(t => t.status === 'resolved').length || 0;
      const closedTickets = validTickets?.filter(t => t.status === 'closed').length || 0;

      // Calculate average resolution time
      const resolvedWithTime = validTickets?.filter(t => t.resolved_at && t.created_at) || [];
      const totalResolutionTime = resolvedWithTime.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.resolved_at!);
        return sum + (resolved.getTime() - created.getTime());
      }, 0);
      const averageResolutionTime = resolvedWithTime.length > 0 
        ? Math.round(totalResolutionTime / resolvedWithTime.length / (1000 * 60 * 60 * 24)) 
        : 0;

      // Tickets by category
      const categoryMap = new Map();
      validTickets?.forEach(ticket => {
        const categoryName = ticket.categories?.name || 'Non categorizzato';
        const categoryColor = ticket.categories?.color || '#6B7280';
        const existing = categoryMap.get(categoryName) || { name: categoryName, count: 0, color: categoryColor };
        categoryMap.set(categoryName, { ...existing, count: existing.count + 1 });
      });
      const ticketsByCategory = Array.from(categoryMap.values());

      // Tickets by priority
      const priorityMap = new Map();
      validTickets?.forEach(ticket => {
        const priority = ticket.priority;
        const existing = priorityMap.get(priority) || { priority, count: 0 };
        priorityMap.set(priority, { ...existing, count: existing.count + 1 });
      });
      const ticketsByPriority = Array.from(priorityMap.values());

      // Tickets by month (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
        const count = validTickets?.filter(ticket => {
          const ticketDate = new Date(ticket.created_at);
          return ticketDate.getMonth() === date.getMonth() && 
                 ticketDate.getFullYear() === date.getFullYear();
        }).length || 0;
        monthlyData.push({ month: monthKey, count });
      }

      // Recent activity (last 30 days)
      const recentActivity = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('it-IT');
        const count = validTickets?.filter(ticket => {
          const ticketDate = new Date(ticket.created_at);
          return ticketDate.toDateString() === date.toDateString();
        }).length || 0;
        recentActivity.push({ date: dateKey, count });
      }

      // Operator statistics
      const operatorMap = new Map();
      validTickets?.forEach(ticket => {
        if (ticket.assigned_user?.full_name) {
          const operatorName = ticket.assigned_user.full_name;
          const existing = operatorMap.get(operatorName) || {
            name: operatorName,
            totalAssigned: 0,
            resolved: 0,
            inProgress: 0,
            resolutionTimes: []
          };
          
          existing.totalAssigned += 1;
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            existing.resolved += 1;
            if (ticket.resolved_at) {
              const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
              existing.resolutionTimes.push(resolutionTime);
            }
          }
          if (ticket.status === 'in_progress') {
            existing.inProgress += 1;
          }
          
          operatorMap.set(operatorName, existing);
        }
      });

      const operatorStats = Array.from(operatorMap.values()).map(op => ({
        name: op.name,
        totalAssigned: op.totalAssigned,
        resolved: op.resolved,
        inProgress: op.inProgress,
        averageResolutionTime: op.resolutionTimes.length > 0 
          ? Math.round(op.resolutionTimes.reduce((sum, time) => sum + time, 0) / op.resolutionTimes.length / (1000 * 60 * 60 * 24))
          : 0
      }));

      setStats({
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        averageResolutionTime,
        ticketsByCategory,
        ticketsByPriority,
        ticketsByMonth: monthlyData,
        recentActivity,
        operatorStats
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!stats) return;

    try {
      // Fetch detailed ticket data for export with explicit relationship hints
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          updated_at,
          resolved_at,
          categories (name),
          assigned_user:profiles!tickets_assigned_to_fkey (full_name),
          creator_user:profiles!tickets_user_id_fkey (full_name)
        `);

      if (error) throw error;

      // Format data for Excel
      const formattedData = tickets?.map(ticket => ({
        'ID Ticket': ticket.id,
        'Titolo': ticket.title,
        'Stato': ticket.status,
        'Priorità': ticket.priority,
        'Categoria': ticket.categories?.name || 'Non categorizzato',
        'Assegnato a': ticket.assigned_user?.full_name || 'Non assegnato',
        'Creato da': ticket.creator_user?.full_name || 'Sconosciuto',
        'Data Creazione': new Date(ticket.created_at).toLocaleDateString('it-IT'),
        'Ultimo Aggiornamento': new Date(ticket.updated_at).toLocaleDateString('it-IT'),
        'Data Risoluzione': ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString('it-IT') : 'Non risolto'
      })) || [];

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: All tickets
      const ws1 = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Tutti i Ticket');

      // Sheet 2: Statistics summary
      const statsData = [
        ['Statistiche Generali', ''],
        ['Totale Ticket', stats.totalTickets],
        ['Ticket Aperti', stats.openTickets],
        ['Ticket in Lavorazione', stats.inProgressTickets],
        ['Ticket Risolti', stats.resolvedTickets],
        ['Ticket Chiusi', stats.closedTickets],
        ['Tempo Medio di Risoluzione (giorni)', stats.averageResolutionTime],
        ['', ''],
        ['Ticket per Categoria', ''],
        ...stats.ticketsByCategory.map(cat => [cat.name, cat.count]),
        ['', ''],
        ['Ticket per Priorità', ''],
        ...stats.ticketsByPriority.map(pri => [pri.priority, pri.count]),
        ['', ''],
        ['Statistiche Operatori', ''],
        ...stats.operatorStats.map(op => [op.name, `Assegnati: ${op.totalAssigned}, Risolti: ${op.resolved}, In Lavorazione: ${op.inProgress}`])
      ];
      
      const ws2 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Statistiche');

      // Generate and download file
      const fileName = `statistiche-ticket-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const getFilteredTickets = (status?: string) => {
    if (!status || status === 'all') return tickets;
    return tickets.filter(t => t.status === status);
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento statistiche...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Statistiche Ticket</h1>
              <p className="text-muted-foreground">Analisi dettagliata del sistema</p>
            </div>
          </div>
          
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Esporta Excel
          </Button>
        </div>

        {/* Tabs per filtrare le statistiche */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tutti ({stats.totalTickets})
            </TabsTrigger>
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Aperti ({stats.openTickets})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              In Lavorazione ({stats.inProgressTickets})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Risolti ({stats.resolvedTickets})
            </TabsTrigger>
            <TabsTrigger value="closed" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              Chiusi ({stats.closedTickets})
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Operatori
            </TabsTrigger>
          </TabsList>

          {/* Content for each tab */}
          <TabsContent value="all">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totale Ticket</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTickets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aperti</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.openTickets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Lavorazione</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.inProgressTickets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risolti</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Medio</CardTitle>
                  <Clock className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.averageResolutionTime}g</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Tickets by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione per Stato</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      open: { label: "Aperti", color: "hsl(var(--chart-1))" },
                      in_progress: { label: "In Lavorazione", color: "hsl(var(--chart-2))" },
                      resolved: { label: "Risolti", color: "hsl(var(--chart-3))" },
                      closed: { label: "Chiusi", color: "hsl(var(--chart-4))" }
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aperti', value: stats.openTickets },
                            { name: 'In Lavorazione', value: stats.inProgressTickets },
                            { name: 'Risolti', value: stats.resolvedTickets },
                            { name: 'Chiusi', value: stats.closedTickets }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.ticketsByPriority.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Tickets by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket per Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{}}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ticketsByCategory}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Trend Mensile (Ultimi 6 Mesi)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{}}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.ticketsByMonth}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione per Priorità</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.ticketsByPriority.map((item, index) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            item.priority === 'urgent' ? 'destructive' :
                            item.priority === 'high' ? 'secondary' :
                            item.priority === 'medium' ? 'outline' : 'default'
                          }>
                            {item.priority === 'urgent' ? 'Urgente' :
                             item.priority === 'high' ? 'Alta' :
                             item.priority === 'medium' ? 'Media' : 'Bassa'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(item.count / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Filtered views for each status */}
          {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {status === 'open' ? 'Ticket Aperti' :
                     status === 'in_progress' ? 'Ticket in Lavorazione' :
                     status === 'resolved' ? 'Ticket Risolti' :
                     'Ticket Chiusi'}
                  </CardTitle>
                  <CardDescription>
                    Statistiche specifiche per i ticket con stato: {
                      status === 'open' ? 'aperti' :
                      status === 'in_progress' ? 'in lavorazione' :
                      status === 'resolved' ? 'risolti' : 'chiusi'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Totale</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{getFilteredTickets(status).length}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Priorità Alta/Urgente</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {getFilteredTickets(status).filter(t => t.priority === 'high' || t.priority === 'urgent').length}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Con Operatore Assegnato</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {getFilteredTickets(status).filter(t => t.assigned_user?.full_name).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Category breakdown for filtered tickets */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Distribuzione per Categoria</h3>
                    <div className="space-y-2">
                      {Array.from(
                        getFilteredTickets(status).reduce((acc, ticket) => {
                          const category = ticket.categories?.name || 'Non categorizzato';
                          acc.set(category, (acc.get(category) || 0) + 1);
                          return acc;
                        }, new Map())
                      ).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>{category}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* Operators Tab */}
          <TabsContent value="operators">
            <Card>
              <CardHeader>
                <CardTitle>Statistiche Operatori</CardTitle>
                <CardDescription>Performance e carico di lavoro degli operatori</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.operatorStats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>Nessun operatore con ticket assegnati</p>
                    </div>
                  ) : (
                    stats.operatorStats.map((operator) => (
                      <div key={operator.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{operator.name}</h3>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {Math.round((operator.resolved / operator.totalAssigned) * 100)}% risolti
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{operator.totalAssigned}</div>
                            <div className="text-sm text-muted-foreground">Totale Assegnati</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{operator.resolved}</div>
                            <div className="text-sm text-muted-foreground">Risolti</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{operator.inProgress}</div>
                            <div className="text-sm text-muted-foreground">In Lavorazione</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{operator.averageResolutionTime}g</div>
                            <div className="text-sm text-muted-foreground">Tempo Medio</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Statistics;
