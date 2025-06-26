
-- Aggiungere nuove colonne alla tabella tickets per supportare i dati dello storico
ALTER TABLE public.tickets 
ADD COLUMN contact_name TEXT,
ADD COLUMN owner TEXT,
ADD COLUMN channel TEXT,
ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ticket_type TEXT,
ADD COLUMN department TEXT;

-- Aggiungere indici per migliorare le performance delle query
CREATE INDEX idx_tickets_contact_name ON public.tickets(contact_name);
CREATE INDEX idx_tickets_owner ON public.tickets(owner);
CREATE INDEX idx_tickets_channel ON public.tickets(channel);
CREATE INDEX idx_tickets_closed_at ON public.tickets(closed_at);
CREATE INDEX idx_tickets_ticket_type ON public.tickets(ticket_type);
CREATE INDEX idx_tickets_department ON public.tickets(department);
