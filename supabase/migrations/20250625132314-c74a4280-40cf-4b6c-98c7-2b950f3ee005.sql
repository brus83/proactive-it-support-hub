
-- Creo un enum per i ruoli utente
CREATE TYPE public.user_role AS ENUM ('admin', 'technician', 'user');

-- Creo un enum per le priorità dei ticket
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Creo un enum per lo stato dei ticket
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Tabella profili utente
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella categorie ticket
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ticket
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  category_id UUID REFERENCES public.categories(id),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  ai_analysis JSONB,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Abilito Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Funzione per verificare il ruolo utente
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Funzione per verificare se l'utente è admin o tecnico
CREATE OR REPLACE FUNCTION public.is_admin_or_tech(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'technician')
  )
$$;

-- Policy per profiles: utenti possono vedere il proprio profilo, admin e tecnici possono vedere tutti
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins and techs can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_tech(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Policy per categories: tutti possono leggere, solo admin possono modificare
CREATE POLICY "Everyone can view categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policy per tickets: utenti vedono i propri, tecnici e admin vedono tutti
CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Techs and admins can view all tickets" ON public.tickets
  FOR SELECT USING (public.is_admin_or_tech(auth.uid()));

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Techs and admins can update any ticket" ON public.tickets
  FOR UPDATE USING (public.is_admin_or_tech(auth.uid()));

-- Trigger per creare automaticamente il profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserisco alcune categorie predefinite
INSERT INTO public.categories (name, description, color) VALUES
  ('Hardware', 'Problemi con computer, stampanti, dispositivi fisici', '#EF4444'),
  ('Software', 'Problemi con applicazioni, sistemi operativi', '#3B82F6'),
  ('Rete', 'Problemi di connettività, internet, VPN', '#10B981'),
  ('Account', 'Problemi di accesso, password, permessi', '#F59E0B'),
  ('Altro', 'Richieste generiche o non classificate', '#6B7280');

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
