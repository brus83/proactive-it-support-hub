
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface HistoricalTicket {
  contact_name: string;
  ticket_id: string;
  title: string;
  owner: string;
  status: string;
  priority: string;
  channel: string;
  created_at: string;
  closed_at: string;
  ticket_type: string;
  department: string;
}

const ImportData = () => {
  const { profile } = useAuth();
  const [importing, setImporting] = useState(false);

  // Dati storici forniti dall'utente
  const historicalData: HistoricalTicket[] = [
    {
      contact_name: "Nau! Roma - Tor Vergata",
      ticket_id: "13334",
      title: "PV Roma Tor Vergata - SW - WO chiuso erroneamente",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Phone",
      created_at: "27/02/2025 10:10",
      closed_at: "27/02/2025 11:50",
      ticket_type: "Problematica WorkOrder",
      department: "Supporto IT - Da Gestire"
    },
    {
      contact_name: "Nau! Orio - Aeroporto",
      ticket_id: "13335",
      title: "PV Orio Aeroporto - SW - problema outlook",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Phone",
      created_at: "27/02/2025 10:36",
      closed_at: "27/02/2025 10:37",
      ticket_type: "Problemi Applicativi",
      department: "Supporto IT - Da Gestire"
    },
    {
      contact_name: "Marco Galimberti",
      ticket_id: "13338",
      title: "SEDE - SW - Abilitazione gruppo di posta",
      owner: "Thomas Tridello",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Email",
      created_at: "27/02/2025 14:26",
      closed_at: "03/03/2025 12:29",
      ticket_type: "Altro",
      department: "Supporto IT - Sede"
    },
    {
      contact_name: "Giorgia Romata",
      ticket_id: "13339",
      title: "BARI SANTA CATERINA_PIN PAD",
      owner: "Matteo Martignetti",
      status: "CHIUSO",
      priority: "-",
      channel: "Email",
      created_at: "27/02/2025 14:55",
      closed_at: "27/02/2025 15:40",
      ticket_type: "-",
      department: "-"
    },
    {
      contact_name: "Nau! Cantù",
      ticket_id: "13340",
      title: "PV Cantù - SW - Problema Ticket system",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Email",
      created_at: "27/02/2025 15:01",
      closed_at: "27/02/2025 15:08",
      ticket_type: "Altro",
      department: "Supporto IT - Da Gestire"
    },
    {
      contact_name: "Nau! Bologna - Casalecchio",
      ticket_id: "13341",
      title: "PV Casalecchio - SW - Mancato accesso ipos",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Phone",
      created_at: "27/02/2025 16:20",
      closed_at: "27/02/2025 16:21",
      ticket_type: "Problemi Applicativi",
      department: "Supporto IT - Retail"
    },
    {
      contact_name: "Simona Zitelli",
      ticket_id: "13342",
      title: "Fw: Apertura ticket D.D.T Arona",
      owner: "Roberto Bruno",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Email",
      created_at: "27/02/2025 16:21",
      closed_at: "10/03/2025 10:38",
      ticket_type: "Training - How-to",
      department: "Supporto IT - Retail"
    },
    {
      contact_name: "Laura Zapparata",
      ticket_id: "13343",
      title: "alessandria - perchè non passano gli scontrini?",
      owner: "Matteo Martignetti",
      status: "CHIUSO",
      priority: "-",
      channel: "Email",
      created_at: "27/02/2025 17:15",
      closed_at: "27/02/2025 17:30",
      ticket_type: "-",
      department: "-"
    },
    {
      contact_name: "Nau! Milano - Sarca",
      ticket_id: "13344",
      title: "PV Milano Sarca - SW - Stampante offline",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Phone",
      created_at: "27/02/2025 17:25",
      closed_at: "27/02/2025 17:25",
      ticket_type: "Problema Stampante (A4)",
      department: "Supporto IT - Sede"
    },
    {
      contact_name: "Nau! Crema",
      ticket_id: "13345",
      title: "WO 6904",
      owner: "Supporto Fati",
      status: "CHIUSO",
      priority: "NORMALE",
      channel: "Email",
      created_at: "27/02/2025 18:03",
      closed_at: "27/02/2025 18:42",
      ticket_type: "Modifica Anagrafica NAU!Card",
      department: "Supporto IT - Da Gestire"
    },
    {
      contact_name: "Giulia Oricci",
      ticket_id: "13347",
      title: "SEDE - HW - Accesso Utente",
      owner: "Thomas Tridello",
      status: "IN GESTIONE",
      priority: "NORMALE",
      channel: "Email",
      created_at: "28/02/2025 09:18",
      closed_at: "-",
      ticket_type: "Problemi Applicativi",
      department: "Supporto IT - Sede"
    },
    {
      contact_name: "Enzo Zoppi",
      ticket_id: "13348",
      title: "Problemi Genova Sestri",
      owner: "Matteo Martignetti",
      status: "CHIUSO",
      priority: "-",
      channel: "Email",
      created_at: "28/02/2025 09:22",
      closed_at: "03/03/2025 15:23",
      ticket_type: "-",
      department: "-"
    }
  ];

  const parseDate = (dateStr: string): Date | null => {
    if (dateStr === "-" || !dateStr) return null;
    
    try {
      // Formato: 27/02/2025 10:10
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hours, minutes] = timePart ? timePart.split(':') : ['00', '00'];
      
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  };

  const mapStatus = (status: string): 'open' | 'in_progress' | 'resolved' | 'closed' => {
    switch (status.toUpperCase()) {
      case 'CHIUSO':
        return 'closed';
      case 'IN GESTIONE':
        return 'in_progress';
      case 'APERTO':
        return 'open';
      default:
        return 'closed';
    }
  };

  const mapPriority = (priority: string): 'low' | 'medium' | 'high' | 'urgent' => {
    switch (priority.toUpperCase()) {
      case 'NORMALE':
        return 'medium';
      case 'ALTA':
        return 'high';
      case 'URGENTE':
        return 'urgent';
      case 'BASSA':
        return 'low';
      default:
        return 'medium';
    }
  };

  const importHistoricalData = async () => {
    if (!profile?.id) {
      toast.error("Errore: utente non autenticato");
      return;
    }

    setImporting(true);
    
    try {
      // Ottieni la categoria "Altro" o creala se non esiste
      let { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Altro')
        .single();

      let categoryId = categories?.id;

      if (!categoryId) {
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({ name: 'Altro', description: 'Ticket importati da dati storici' })
          .select('id')
          .single();

        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      }

      // Prepara i dati per l'inserimento
      const ticketsToInsert = historicalData.map(item => ({
        title: item.title,
        description: `Ticket importato da dati storici. Tipo: ${item.ticket_type}`,
        status: mapStatus(item.status),
        priority: mapPriority(item.priority),
        category_id: categoryId,
        user_id: profile.id, // Usa l'utente corrente come creatore
        contact_name: item.contact_name,
        owner: item.owner,
        channel: item.channel,
        ticket_type: item.ticket_type === "-" ? null : item.ticket_type,
        department: item.department === "-" ? null : item.department,
        created_at: parseDate(item.created_at)?.toISOString(),
        updated_at: parseDate(item.created_at)?.toISOString(),
        closed_at: parseDate(item.closed_at)?.toISOString(),
        resolved_at: item.status === 'CHIUSO' ? parseDate(item.closed_at)?.toISOString() : null
      }));

      // Inserisci i dati
      const { error } = await supabase
        .from('tickets')
        .insert(ticketsToInsert);

      if (error) throw error;

      toast.success(`Importati con successo ${ticketsToInsert.length} ticket storici!`);
      
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      toast.error("Errore durante l'importazione dei dati");
    } finally {
      setImporting(false);
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
                Solo gli amministratori possono importare dati storici.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Importazione Dati Storici</h1>
            <p className="text-muted-foreground">Importa ticket da dati storici esistenti</p>
          </div>
        </div>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importa Ticket Storici
            </CardTitle>
            <CardDescription>
              Sono stati trovati {historicalData.length} ticket da importare dai dati storici forniti.
              Questi ticket verranno inseriti nel sistema con le informazioni disponibili.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Anteprima dati:</h3>
              <div className="space-y-2 text-sm">
                <div>• Ticket da {historicalData[0].created_at} a {historicalData[historicalData.length - 1].created_at}</div>
                <div>• Proprietari: Supporto Fati, Thomas Tridello, Matteo Martignetti, Roberto Bruno</div>
                <div>• Canali: Email, Phone</div>
                <div>• Stati: CHIUSO, IN GESTIONE</div>
                <div>• Dipartimenti: Supporto IT - Da Gestire, Supporto IT - Sede, Supporto IT - Retail</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={importHistoricalData}
                disabled={importing}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importazione in corso...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importa {historicalData.length} Ticket
                  </>
                )}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Nota:</strong> I ticket importati saranno associati al tuo account utente. 
                Le date e le informazioni verranno preserve come da dati originali.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Dati da Importare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Contatto</th>
                    <th className="text-left p-2">Titolo</th>
                    <th className="text-left p-2">Proprietario</th>
                    <th className="text-left p-2">Stato</th>
                    <th className="text-left p-2">Data Creazione</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.slice(0, 10).map((ticket, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{ticket.contact_name}</td>
                      <td className="p-2">{ticket.title}</td>
                      <td className="p-2">{ticket.owner}</td>
                      <td className="p-2">{ticket.status}</td>
                      <td className="p-2">{ticket.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historicalData.length > 10 && (
                <p className="text-muted-foreground mt-2 text-center">
                  ... e altri {historicalData.length - 10} ticket
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImportData;
