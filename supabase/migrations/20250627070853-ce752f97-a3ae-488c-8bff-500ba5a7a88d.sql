
-- Tabella per i template delle email automatiche
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('confirmation', 'escalation', 'resolution', 'assignment')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per la knowledge base
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  keywords TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per le regole di escalation
CREATE TABLE public.escalation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  time_threshold_hours INTEGER NOT NULL,
  escalate_to_role TEXT NOT NULL CHECK (escalate_to_role IN ('technician', 'admin')),
  notification_template_id UUID REFERENCES public.email_templates(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per la pianificazione degli interventi
CREATE TABLE public.scheduled_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.profiles(id),
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('remote', 'on_site', 'phone')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per tracciare le azioni automatiche
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_assign', 'auto_categorize', 'escalation', 'auto_response', 'kb_suggestion')),
  action_details JSONB,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Tabella per informazioni Active Directory
CREATE TABLE public.ad_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  computer_name TEXT,
  ip_address TEXT,
  os_version TEXT,
  department TEXT,
  location TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  ad_sync_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  additional_info JSONB DEFAULT '{}'::jsonb
);

-- Aggiorna la tabella tickets per supportare automazione
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS last_escalation_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS response_sent BOOLEAN DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS kb_suggestions JSONB DEFAULT '[]'::jsonb;

-- Funzione per auto-assegnazione basata su carico di lavoro
CREATE OR REPLACE FUNCTION auto_assign_ticket(ticket_id UUID, category_name TEXT)
RETURNS UUID AS $$
DECLARE
  available_technician UUID;
BEGIN
  -- Trova il tecnico con meno ticket aperti nella categoria specifica
  SELECT p.id INTO available_technician
  FROM profiles p
  LEFT JOIN tickets t ON t.assigned_to = p.id AND t.status IN ('open', 'in_progress')
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE p.role IN ('technician', 'admin')
    AND (c.name = category_name OR category_name IS NULL)
  GROUP BY p.id
  ORDER BY COUNT(t.id) ASC, RANDOM()
  LIMIT 1;
  
  -- Assegna il ticket
  IF available_technician IS NOT NULL THEN
    UPDATE tickets 
    SET assigned_to = available_technician, 
        auto_assigned = true,
        updated_at = now()
    WHERE id = ticket_id;
  END IF;
  
  RETURN available_technician;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-assegnazione quando si crea un ticket
CREATE OR REPLACE FUNCTION trigger_auto_assign()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
BEGIN
  -- Ottieni il nome della categoria
  SELECT c.name INTO category_name
  FROM categories c
  WHERE c.id = NEW.category_id;
  
  -- Auto-assegna il ticket
  PERFORM auto_assign_ticket(NEW.id, category_name);
  
  -- Log dell'azione
  INSERT INTO automation_logs (ticket_id, action_type, action_details)
  VALUES (NEW.id, 'auto_assign', jsonb_build_object('category', category_name));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger
DROP TRIGGER IF EXISTS auto_assign_new_ticket ON tickets;
CREATE TRIGGER auto_assign_new_ticket
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign();

-- Abilita RLS per le nuove tabelle
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_assets ENABLE ROW LEVEL SECURITY;

-- Policy per email_templates (solo admin)
CREATE POLICY "Admin can manage email templates" ON public.email_templates
  FOR ALL USING (is_admin_or_tech(auth.uid()));

-- Policy per knowledge_base (tutti possono leggere, admin possono modificare)
CREATE POLICY "Everyone can read knowledge base" ON public.knowledge_base
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admin can manage knowledge base" ON public.knowledge_base
  FOR ALL USING (is_admin_or_tech(auth.uid()));

-- Policy per escalation_rules (solo admin)
CREATE POLICY "Admin can manage escalation rules" ON public.escalation_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policy per scheduled_interventions
CREATE POLICY "Technicians can view their interventions" ON public.scheduled_interventions
  FOR SELECT USING (
    technician_id = auth.uid() OR 
    is_admin_or_tech(auth.uid()) OR
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

CREATE POLICY "Technicians can manage interventions" ON public.scheduled_interventions
  FOR ALL USING (is_admin_or_tech(auth.uid()));

-- Policy per automation_logs (solo admin e tech)
CREATE POLICY "Admin and tech can view automation logs" ON public.automation_logs
  FOR SELECT USING (is_admin_or_tech(auth.uid()));

-- Policy per ad_assets
CREATE POLICY "Users can view their own AD assets" ON public.ad_assets
  FOR SELECT USING (user_id = auth.uid() OR is_admin_or_tech(auth.uid()));

CREATE POLICY "Admin can manage AD assets" ON public.ad_assets
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Inserisci alcuni template email di base
INSERT INTO public.email_templates (name, subject, body, template_type) VALUES
('Conferma Ticket', 'Ticket #{ticket_number} - Ricevuto', 
 'Gentile {user_name},<br><br>Il suo ticket #{ticket_number} è stato ricevuto e preso in carico.<br><br><strong>Oggetto:</strong> {ticket_title}<br><strong>Priorità:</strong> {priority}<br><strong>Tempo stimato:</strong> {estimated_time}<br><br>Può monitorare lo stato del ticket accedendo al portale.<br><br>Cordiali saluti,<br>Team IT', 
 'confirmation'),
 
('Escalation Alert', 'ALERT: Ticket #{ticket_number} - Escalation', 
 'Il ticket #{ticket_number} è rimasto inattivo per {hours} ore e richiede attenzione immediata.<br><br><strong>Utente:</strong> {user_name}<br><strong>Oggetto:</strong> {ticket_title}<br><strong>Priorità:</strong> {priority}<br><br>Si prega di intervenire tempestivamente.', 
 'escalation'),
 
('Assegnazione Automatica', 'Ticket #{ticket_number} - Assegnato', 
 'Il ticket #{ticket_number} è stato automaticamente assegnato a {technician_name}.<br><br><strong>Categoria:</strong> {category}<br><strong>Priorità:</strong> {priority}<br><br>Il tecnico la contatterà a breve.', 
 'assignment');

-- Inserisci alcune regole di escalation di base
INSERT INTO public.escalation_rules (name, priority, time_threshold_hours, escalate_to_role) VALUES
('Escalation Urgente', 'urgent', 1, 'admin'),
('Escalation Alta', 'high', 4, 'admin'),
('Escalation Media', 'medium', 24, 'technician'),
('Escalation Bassa', 'low', 72, 'technician');

-- Inserisci alcuni articoli di knowledge base di base
INSERT INTO public.knowledge_base (title, content, keywords) VALUES
('Reset Password Windows', 
 'Per reimpostare la password di Windows:<br>1. Premere Ctrl+Alt+Del<br>2. Cliccare su "Cambia password"<br>3. Inserire la vecchia password e la nuova<br>4. Confermare la nuova password',
 ARRAY['password', 'reset', 'windows', 'login', 'accesso']),
 
('Problemi Stampante', 
 'Risoluzione problemi comuni stampante:<br>1. Verificare che sia accesa<br>2. Controllare connessione USB/rete<br>3. Verificare carta e toner<br>4. Riavviare il servizio di stampa<br>5. Reinstallare driver se necessario',
 ARRAY['stampante', 'stampa', 'driver', 'carta', 'toner']),
 
('Connessione WiFi', 
 'Per connettersi al WiFi aziendale:<br>1. Selezionare la rete "COMPANY-WIFI"<br>2. Inserire username e password aziendali<br>3. Accettare il certificato di sicurezza<br>4. Se persiste il problema, dimenticare e riconnettere la rete',
 ARRAY['wifi', 'wireless', 'connessione', 'rete', 'internet']);
