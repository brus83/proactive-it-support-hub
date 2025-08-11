-- 1) Create enum for team roles (safe guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE public.team_role AS ENUM ('owner', 'manager', 'member');
  END IF;
END;
$$;

-- 2) Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_unique_name_per_department UNIQUE (department_id, name)
);

-- 4) Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_role public.team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

-- 5) Application permissions catalog
CREATE TABLE IF NOT EXISTS public.app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Role to permission mapping using existing enum user_role
-- We reuse existing user_role enum used in public.profiles.role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.app_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_unique UNIQUE (role, permission_id)
);

-- 7) Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 8) Policies for departments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='departments' AND policyname='Everyone can view departments'
  ) THEN
    CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='departments' AND policyname='Admins can insert departments'
  ) THEN
    CREATE POLICY "Admins can insert departments" ON public.departments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='departments' AND policyname='Admins can update departments'
  ) THEN
    CREATE POLICY "Admins can update departments" ON public.departments FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='departments' AND policyname='Admins can delete departments'
  ) THEN
    CREATE POLICY "Admins can delete departments" ON public.departments FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- 9) Policies for teams
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='teams' AND policyname='Admins and techs can view all teams or users see own teams'
  ) THEN
    CREATE POLICY "Admins and techs can view all teams or users see own teams" 
    ON public.teams FOR SELECT USING (
      is_admin_or_tech(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='teams' AND policyname='Admins can insert teams'
  ) THEN
    CREATE POLICY "Admins can insert teams" ON public.teams FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='teams' AND policyname='Admins can update teams'
  ) THEN
    CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='teams' AND policyname='Admins can delete teams'
  ) THEN
    CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- 10) Policies for team_members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_members' AND policyname='Admins and techs can view all memberships or users view own'
  ) THEN
    CREATE POLICY "Admins and techs can view all memberships or users view own"
    ON public.team_members FOR SELECT USING (
      is_admin_or_tech(auth.uid()) OR user_id = auth.uid()
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_members' AND policyname='Admins can insert memberships'
  ) THEN
    CREATE POLICY "Admins can insert memberships" ON public.team_members FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_members' AND policyname='Admins can update memberships'
  ) THEN
    CREATE POLICY "Admins can update memberships" ON public.team_members FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_members' AND policyname='Admins can delete memberships'
  ) THEN
    CREATE POLICY "Admins can delete memberships" ON public.team_members FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- 11) Policies for app_permissions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_permissions' AND policyname='Everyone can view app permissions'
  ) THEN
    CREATE POLICY "Everyone can view app permissions" ON public.app_permissions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_permissions' AND policyname='Admins can manage app permissions'
  ) THEN
    CREATE POLICY "Admins can manage app permissions" ON public.app_permissions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- 12) Policies for role_permissions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='Everyone can view role permissions'
  ) THEN
    CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='Admins can manage role permissions'
  ) THEN
    CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- 13) Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departments_updated_at'
  ) THEN
    CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_teams_updated_at'
  ) THEN
    CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_team_members_updated_at'
  ) THEN
    CREATE TRIGGER trg_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_role_permissions_updated_at'
  ) THEN
    CREATE TRIGGER trg_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 14) Optional seed permissions (idempotent)
INSERT INTO public.app_permissions (permission_key, description)
SELECT x.key, x.description
FROM (VALUES
  ('view_admin', 'Accesso al pannello di amministrazione'),
  ('manage_departments', 'Gestione dei dipartimenti'),
  ('manage_teams', 'Gestione dei team'),
  ('manage_permissions', 'Gestione ruoli e permessi')
) AS x(key, description)
LEFT JOIN public.app_permissions ap ON ap.permission_key = x.key
WHERE ap.id IS NULL;

-- Map default permissions to admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::public.user_role, ap.id
FROM public.app_permissions ap
LEFT JOIN public.role_permissions rp ON rp.permission_id = ap.id AND rp.role = 'admin'::public.user_role
WHERE rp.id IS NULL;