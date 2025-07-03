
-- Tabella per le risposte automatiche
CREATE TABLE public.auto_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  trigger_categories TEXT[] DEFAULT '{}',
  response_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i workflow
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per tracciare l'esecuzione dei workflow
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id),
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i log delle azioni dei workflow
CREATE TABLE public.workflow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_execution_id UUID NOT NULL REFERENCES public.workflow_executions(id),
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per il chatbot
CREATE TABLE public.chatbot_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_responses ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per auto_responses
CREATE POLICY "Admin can manage auto responses" ON public.auto_responses
  FOR ALL USING (is_admin_or_tech(auth.uid()));

CREATE POLICY "Everyone can read active auto responses" ON public.auto_responses
  FOR SELECT USING (is_active = true);

-- Politiche RLS per workflows
CREATE POLICY "Admin can manage workflows" ON public.workflows
  FOR ALL USING (is_admin_or_tech(auth.uid()));

CREATE POLICY "Everyone can read active workflows" ON public.workflows
  FOR SELECT USING (is_active = true);

-- Politiche RLS per workflow_executions
CREATE POLICY "Users can view relevant executions" ON public.workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = workflow_executions.ticket_id 
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR is_admin_or_tech(auth.uid()))
    )
  );

CREATE POLICY "Techs can manage executions" ON public.workflow_executions
  FOR ALL USING (is_admin_or_tech(auth.uid()));

-- Politiche RLS per workflow_logs
CREATE POLICY "Users can view relevant logs" ON public.workflow_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflow_executions we
      JOIN public.tickets t ON t.id = we.ticket_id
      WHERE we.id = workflow_logs.workflow_execution_id
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR is_admin_or_tech(auth.uid()))
    )
  );

CREATE POLICY "Techs can manage logs" ON public.workflow_logs
  FOR ALL USING (is_admin_or_tech(auth.uid()));

-- Politiche RLS per chatbot_responses
CREATE POLICY "Admin can manage chatbot responses" ON public.chatbot_responses
  FOR ALL USING (is_admin_or_tech(auth.uid()));

CREATE POLICY "Everyone can read active chatbot responses" ON public.chatbot_responses
  FOR SELECT USING (is_active = true);

-- Inserimento dati di esempio
INSERT INTO public.auto_responses (name, trigger_keywords, response_template, priority) VALUES
('Password Scaduta', ARRAY['password', 'scaduta', 'accesso', 'login'], 
 'La tua password è scaduta. Per reimpostarla, vai su [link reset password] o contatta l''IT. Tempo stimato: 5 minuti.', 1),
('Stampante Non Raggiungibile', ARRAY['stampante', 'stampa', 'non funziona', 'offline'], 
 'Problema stampante rilevato. Soluzioni rapide: 1) Verifica connessione rete 2) Riavvia stampante 3) Controlla driver. Se persiste, contatta IT.', 2),
('Rete Internet', ARRAY['internet', 'rete', 'connessione', 'wifi'], 
 'Problema di connettività rilevato. Prova: 1) Riavvia router 2) Controlla cavi 3) Verifica impostazioni rete. Contatta IT se persiste.', 2);

INSERT INTO public.workflows (name, description, steps) VALUES
('Richiesta Nuovo Accesso', 'Workflow per creazione nuovo account utente',
 '[
   {"name": "Apertura Richiesta", "type": "auto", "description": "Ticket aperto automaticamente"},
   {"name": "Approvazione Manager", "type": "approval", "role": "manager", "description": "Il manager deve approvare la richiesta"},
   {"name": "Creazione Account", "type": "manual", "role": "technician", "description": "IT crea l''account utente"},
   {"name": "Invio Credenziali", "type": "auto", "description": "Invio automatico credenziali"},
   {"name": "Conferma Attivazione", "type": "manual", "role": "user", "description": "Utente conferma funzionamento"}
 ]'),
('Richiesta Hardware', 'Workflow per richieste di nuovo hardware',
 '[
   {"name": "Valutazione Richiesta", "type": "manual", "role": "technician", "description": "Valutazione necessità hardware"},
   {"name": "Approvazione Budget", "type": "approval", "role": "admin", "description": "Approvazione spesa"},
   {"name": "Ordine Hardware", "type": "manual", "role": "admin", "description": "Effettuazione ordine"},
   {"name": "Installazione", "type": "manual", "role": "technician", "description": "Installazione e configurazione"},
   {"name": "Test Funzionamento", "type": "manual", "role": "user", "description": "Test finale utente"}
 ]');

INSERT INTO public.chatbot_responses (question, answer, keywords, category) VALUES
('Come resetto la password?', 'Per resettare la password: 1) Vai alla pagina di login 2) Clicca "Password dimenticata" 3) Inserisci la tua email 4) Controlla la posta per il link di reset', ARRAY['password', 'reset', 'dimenticata'], 'Accesso'),
('La stampante non stampa', 'Soluzioni per problemi stampante: 1) Verifica che sia accesa 2) Controlla connessione USB/rete 3) Verifica coda di stampa 4) Riavvia spooler di stampa', ARRAY['stampante', 'stampa', 'non funziona'], 'Hardware'),
('Come richiedo nuovo software?', 'Per richiedere nuovo software: 1) Apri ticket specificando il software 2) Indica la motivazione business 3) Attendi approvazione manager 4) IT procederà con installazione', ARRAY['software', 'installazione', 'programma'], 'Software'),
('Internet è lento', 'Per problemi di connessione lenta: 1) Testa velocità su speedtest.net 2) Riavvia router 3) Controlla dispositivi connessi 4) Contatta IT se persiste', ARRAY['internet', 'lento', 'connessione'], 'Rete');
