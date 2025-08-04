-- Crea tabella per notifiche
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
  category TEXT NOT NULL, -- new_ticket, escalation, reminder, deadline
  ticket_id UUID REFERENCES public.tickets(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}'::jsonb
);

-- Crea tabella per impostazioni notifiche per operatore
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  new_ticket_in_app BOOLEAN NOT NULL DEFAULT true,
  new_ticket_email BOOLEAN NOT NULL DEFAULT true,
  escalation_in_app BOOLEAN NOT NULL DEFAULT true,
  escalation_email BOOLEAN NOT NULL DEFAULT true,
  deadline_in_app BOOLEAN NOT NULL DEFAULT true,
  deadline_email BOOLEAN NOT NULL DEFAULT true,
  reminder_in_app BOOLEAN NOT NULL DEFAULT true,
  reminder_email BOOLEAN NOT NULL DEFAULT false,
  email_frequency TEXT NOT NULL DEFAULT 'immediate', -- immediate, hourly, daily
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Crea tabella per reminder programmati
CREATE TABLE public.ticket_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- deadline, follow_up, escalation
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message TEXT,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_reminders ENABLE ROW LEVEL SECURITY;

-- Policies per notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policies per notification_settings
CREATE POLICY "Users can manage own settings" 
ON public.notification_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies per ticket_reminders
CREATE POLICY "Users can view own reminders" 
ON public.ticket_reminders 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin_or_tech(auth.uid()));

CREATE POLICY "Users can manage reminders for accessible tickets" 
ON public.ticket_reminders 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_reminders.ticket_id 
    AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR is_admin_or_tech(auth.uid()))
  )
);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Funzione per creare notifica
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _category TEXT DEFAULT 'info',
  _ticket_id UUID DEFAULT NULL,
  _data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, category, ticket_id, data)
  VALUES (_user_id, _title, _message, _type, _category, _ticket_id, _data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Funzione per notificare nuovo ticket agli operatori
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tech_user RECORD;
  settings RECORD;
BEGIN
  -- Notifica tutti gli admin e tecnici
  FOR tech_user IN 
    SELECT id, email, full_name 
    FROM profiles 
    WHERE role IN ('admin', 'technician')
  LOOP
    -- Controlla le impostazioni dell'utente
    SELECT * INTO settings 
    FROM notification_settings 
    WHERE user_id = tech_user.id;
    
    -- Se non ha impostazioni, usa default
    IF settings IS NULL THEN
      -- Crea notifica in-app (default: true)
      PERFORM create_notification(
        tech_user.id,
        'Nuovo Ticket Creato',
        'Nuovo ticket #' || NEW.id || ': ' || NEW.title,
        'info',
        'new_ticket',
        NEW.id,
        jsonb_build_object('ticket_id', NEW.id, 'priority', NEW.priority)
      );
    ELSE
      -- Crea notifica in-app se abilitata
      IF settings.new_ticket_in_app THEN
        PERFORM create_notification(
          tech_user.id,
          'Nuovo Ticket Creato',
          'Nuovo ticket #' || NEW.id || ': ' || NEW.title,
          'info',
          'new_ticket',
          NEW.id,
          jsonb_build_object('ticket_id', NEW.id, 'priority', NEW.priority)
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger per nuovo ticket
CREATE TRIGGER trigger_notify_new_ticket
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_ticket();

-- Funzione per notificare escalation
CREATE OR REPLACE FUNCTION public.notify_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tech_user RECORD;
  settings RECORD;
BEGIN
  -- Solo se escalation_count è aumentato
  IF NEW.escalation_count > OLD.escalation_count THEN
    -- Notifica admin e il tecnico assegnato
    FOR tech_user IN 
      SELECT id, email, full_name 
      FROM profiles 
      WHERE role = 'admin' OR id = NEW.assigned_to
    LOOP
      SELECT * INTO settings 
      FROM notification_settings 
      WHERE user_id = tech_user.id;
      
      IF settings IS NULL OR settings.escalation_in_app THEN
        PERFORM create_notification(
          tech_user.id,
          'Ticket Escalato',
          'Il ticket #' || NEW.id || ' è stato escalato (' || NEW.escalation_count || ' volte)',
          'warning',
          'escalation',
          NEW.id,
          jsonb_build_object('ticket_id', NEW.id, 'escalation_count', NEW.escalation_count)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per escalation
CREATE TRIGGER trigger_notify_escalation
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_escalation();