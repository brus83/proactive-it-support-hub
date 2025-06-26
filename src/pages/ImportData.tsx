import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Download, FileUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import FileUploader from "@/components/FileUploader";

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
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'predefined' | 'upload'>('predefined');

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

  const mapUploadedData = (data: any[]): HistoricalTicket[] => {
    return data.map(item => ({
      contact_name: item["Nome contatto"] || item["contact_name"] || item["Nome"] || "",
      ticket_id: item["ID Ticket"] || item["ticket_id"] || item["ID"] || "",
      title: item["Oggetto"] || item["title"] || item["Titolo"] || "",
      owner: item["Proprietario Ticket"] || item["owner"] || item["Proprietario"] || "",
      status: item["Stato (Ticket)"] || item["Stato"] || item["status"] || "",
      priority: item["Priorità (Ticket)"] || item["Priorità"] || item["priority"] || "",
      channel: item["Canale"] || item["channel"] || "",
      created_at: item["Ora di creazione (Ticket)"] || item["created_at"] || item["Creazione"] || "",
      closed_at: item["Ora di chiusura Ticket"] || item["closed_at"] || item["Chiusura"] || "",
      ticket_type: item["Tipologia"] || item["ticket_type"] || item["Tipo"] || "",
      department: item["Dipartimento"] || item["department"] || ""
    }));
  };

  const importData = async (dataToImport: HistoricalTicket[]) => {
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
      const ticketsToInsert = dataToImport.map(item => ({
        title: item.title,
        description: `Ticket importato da dati storici. Tipo: ${item.ticket_type}`,
        status: mapStatus(item.status),
        priority: mapPriority(item.priority),
        category_id: categoryId,
        user_id: profile.id,
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

      const { error } = await supabase
        .from('tickets')
        .insert(ticketsToInsert);

      if (error) throw error;

      toast.success(`Importati con successo ${ticketsToInsert.length} ticket!`);
      
      // Reset uploaded data after successful import
      if (activeTab === 'upload') {
        setUploadedData([]);
      }
      
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      toast.error("Errore durante l'importazione dei dati");
    } finally {
      setImporting(false);
    }
  };

  const handleFileDataParsed = (data: any[]) => {
    const mappedData = mapUploadedData(data);
    setUploadedData(mappedData);
    setActiveTab('upload');
    toast.success(`Dati caricati: ${mappedData.length} ticket pronti per l'importazione`);
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

  const currentData = activeTab === 'predefined' ? historicalData : uploadedData;

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
            <p className="text-muted-foreground">Importa ticket da dati storici esistenti o carica nuovi file</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'predefined' ? 'default' : 'outline'}
            onClick={() => setActiveTab('predefined')}
          >
            Dati Predefiniti
          </Button>
          <Button
            variant={activeTab === 'upload' ? 'default' : 'outline'}
            onClick={() => setActiveTab('upload')}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Carica File
          </Button>
        </div>

        {/* File Uploader */}
        {activeTab === 'upload' && (
          <FileUploader onDataParsed={handleFileDataParsed} />
        )}

        {/* Import Card */}
        {currentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {activeTab === 'predefined' ? 'Importa Ticket Storici Predefiniti' : 'Importa Dati Caricati'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'predefined' 
                  ? `Sono stati trovati ${currentData.length} ticket da importare dai dati storici forniti.`
                  : `Sono stati caricati ${currentData.length} ticket dal file. Controlla i dati e procedi con l'importazione.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Anteprima dati:</h3>
                <div className="space-y-2 text-sm">
                  <div>• Numero ticket: {currentData.length}</div>
                  {currentData.length > 0 && (
                    <>
                      <div>• Primo ticket: {currentData[0].created_at}</div>
                      <div>• Ultimo ticket: {currentData[currentData.length - 1].created_at}</div>
                    </>
                  )}
                </div>
              </div>

              <Button 
                onClick={() => importData(currentData)}
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importazione in corso...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importa {currentData.length} Ticket
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Nota:</strong> I ticket importati saranno associati al tuo account utente. 
                  Le date e le informazioni verranno preserve come da dati originali.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Table */}
        {currentData.length > 0 && (
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
                    {currentData.slice(0, 10).map((ticket, index) => (
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
                {currentData.length > 10 && (
                  <p className="text-muted-foreground mt-2 text-center">
                    ... e altri {currentData.length - 10} ticket
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImportData;
