-- Add ticket merging capability
ALTER TABLE tickets ADD COLUMN merged_into_ticket_id UUID REFERENCES tickets(id);
ALTER TABLE tickets ADD COLUMN is_merged BOOLEAN DEFAULT FALSE;

-- Create ticket merge history table
CREATE TABLE ticket_merges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_ticket_id UUID NOT NULL REFERENCES tickets(id),
  target_ticket_id UUID NOT NULL REFERENCES tickets(id),
  merged_by UUID NOT NULL,
  merged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  merge_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ticket_merges ENABLE ROW LEVEL SECURITY;

-- Create policy for ticket merges
CREATE POLICY "Admin and techs can manage ticket merges"
ON ticket_merges
FOR ALL
USING (is_admin_or_tech(auth.uid()));

-- Improve auto-assignment with skill-based routing
CREATE TABLE technician_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 5) DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, skill_name)
);

-- Enable RLS for technician skills
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage technician skills"
ON technician_skills
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Techs can view all skills"
ON technician_skills
FOR SELECT
USING (is_admin_or_tech(auth.uid()));

-- Create workload tracking for better assignment
CREATE TABLE technician_workload (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL,
  current_tickets INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 10,
  is_available BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id)
);

-- Enable RLS for workload
ALTER TABLE technician_workload ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage workload"
ON technician_workload
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Techs can view workload"
ON technician_workload
FOR SELECT
USING (is_admin_or_tech(auth.uid()));

-- Function to update workload automatically
CREATE OR REPLACE FUNCTION update_technician_workload()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO technician_workload (technician_id, current_tickets)
    VALUES (NEW.assigned_to, 1)
    ON CONFLICT (technician_id) 
    DO UPDATE SET 
      current_tickets = technician_workload.current_tickets + 1,
      updated_at = now();
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Handle assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      -- Decrease count for old technician
      IF OLD.assigned_to IS NOT NULL THEN
        UPDATE technician_workload 
        SET current_tickets = GREATEST(0, current_tickets - 1),
            updated_at = now()
        WHERE technician_id = OLD.assigned_to;
      END IF;
      
      -- Increase count for new technician
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO technician_workload (technician_id, current_tickets)
        VALUES (NEW.assigned_to, 1)
        ON CONFLICT (technician_id) 
        DO UPDATE SET 
          current_tickets = technician_workload.current_tickets + 1,
          updated_at = now();
      END IF;
    END IF;
    
    -- Handle status changes
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('closed', 'resolved') AND NEW.assigned_to IS NOT NULL THEN
      UPDATE technician_workload 
      SET current_tickets = GREATEST(0, current_tickets - 1),
          updated_at = now()
      WHERE technician_id = NEW.assigned_to;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workload management
CREATE TRIGGER manage_technician_workload
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_workload();

-- Improved auto-assignment function with skill matching
CREATE OR REPLACE FUNCTION smart_auto_assign_ticket(ticket_id uuid, category_name text, ticket_description text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  best_technician UUID;
  tech_record RECORD;
  max_score FLOAT := 0;
  current_score FLOAT;
BEGIN
  -- Find best technician based on skills, workload, and availability
  FOR tech_record IN
    SELECT 
      p.id,
      COALESCE(tw.current_tickets, 0) as current_workload,
      COALESCE(tw.max_capacity, 10) as capacity,
      COALESCE(tw.is_available, true) as available,
      COUNT(t.id) as total_tickets
    FROM profiles p
    LEFT JOIN technician_workload tw ON tw.technician_id = p.id
    LEFT JOIN tickets t ON t.assigned_to = p.id AND t.status IN ('open', 'in_progress')
    WHERE p.role IN ('technician', 'admin')
      AND COALESCE(tw.is_available, true) = true
      AND COALESCE(tw.current_tickets, 0) < COALESCE(tw.max_capacity, 10)
    GROUP BY p.id, tw.current_tickets, tw.max_capacity, tw.is_available
  LOOP
    -- Calculate score based on workload and skills
    current_score := 0;
    
    -- Base score from workload (higher available capacity = higher score)
    current_score := (tech_record.capacity - tech_record.current_workload) * 10;
    
    -- Skill bonus (check if technician has relevant skills)
    SELECT COALESCE(AVG(skill_level), 0) INTO current_score
    FROM technician_skills ts
    WHERE ts.technician_id = tech_record.id
      AND (ts.skill_name ILIKE '%' || category_name || '%' 
           OR ticket_description ILIKE '%' || ts.skill_name || '%');
    
    current_score := current_score + (current_score * 5); -- Skill multiplier
    
    -- Add randomness to prevent always picking the same person
    current_score := current_score + (RANDOM() * 2);
    
    IF current_score > max_score THEN
      max_score := current_score;
      best_technician := tech_record.id;
    END IF;
  END LOOP;
  
  -- Assign the ticket if we found someone
  IF best_technician IS NOT NULL THEN
    UPDATE tickets 
    SET assigned_to = best_technician, 
        auto_assigned = true,
        updated_at = now()
    WHERE id = ticket_id;
    
    -- Log the assignment
    INSERT INTO automation_logs (ticket_id, action_type, action_details, success)
    VALUES (ticket_id, 'auto_assign', 
            jsonb_build_object(
              'assigned_to', best_technician,
              'category', category_name,
              'assignment_score', max_score
            ), true);
  END IF;
  
  RETURN best_technician;
END;
$$;