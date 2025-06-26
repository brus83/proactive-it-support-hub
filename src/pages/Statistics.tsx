
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, BarChart3, TrendingUp, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
}

const Statistics = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = async () => {
    try {
      // Fetch all tickets with categories
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, color)
        `);

      if (error) throw error;

      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      // Calculate statistics
      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0;
      const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;

      // Calculate average resolution time
      const resolvedWithTime = tickets?.filter(t => t.resolved_at && t.created_at) || [];
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
      tickets?.forEach(ticket => {
        const categoryName = ticket.categories?.name || 'Non categorizzato';
        const categoryColor = ticket.categories?.color || '#6B7280';
        const existing = categoryMap.get(categoryName) || { name: categoryName, count: 0, color: categoryColor };
        categoryMap.set(categoryName, { ...existing, count: existing.count + 1 });
      });
      const ticketsByCategory = Array.from(categoryMap.values());

      // Tickets by priority
      const priorityMap = new Map();
      tickets?.forEach(ticket => {
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
        const count = tickets?.filter(ticket => {
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
        const count = tickets?.filter(ticket => {
          const ticketDate = new Date(ticket.created_at);
          return ticketDate.toDateString() === date.toDateString();
        }).length || 0;
        recentActivity.push({ date: dateKey, count });
      }

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
        recentActivity
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
      // Fetch detailed ticket data for export
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
          profiles (full_name)
        `);

      if (error) throw error;

      // Format data for Excel
      const formattedData = tickets?.map(ticket => ({
        'ID Ticket': ticket.id,
        'Titolo': ticket.title,
        'Stato': ticket.status,
        'Priorità': ticket.priority,
        'Categoria': ticket.categories?.name || 'Non categorizzato',
        'Assegnato a': ticket.profiles?.full_name || 'Non assegnato',
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
        ...stats.ticketsByPriority.map(pri => [pri.priority, pri.count])
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
};

export default Statistics;
