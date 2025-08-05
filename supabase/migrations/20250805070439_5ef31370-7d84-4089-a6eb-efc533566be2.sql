-- Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  virus_scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view attachments for accessible tickets" 
ON public.ticket_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_attachments.ticket_id 
    AND (
      t.user_id = auth.uid() OR 
      t.assigned_to = auth.uid() OR 
      is_admin_or_tech(auth.uid())
    )
  )
);

CREATE POLICY "Users can upload attachments to accessible tickets" 
ON public.ticket_attachments 
FOR INSERT 
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_attachments.ticket_id 
    AND (
      t.user_id = auth.uid() OR 
      t.assigned_to = auth.uid() OR 
      is_admin_or_tech(auth.uid())
    )
  )
);

CREATE POLICY "Admins and techs can delete attachments" 
ON public.ticket_attachments 
FOR DELETE 
USING (is_admin_or_tech(auth.uid()));

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view attachments for accessible tickets" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM public.ticket_attachments ta
    JOIN public.tickets t ON t.id = ta.ticket_id
    WHERE ta.file_path = storage.objects.name
    AND (
      t.user_id = auth.uid() OR 
      t.assigned_to = auth.uid() OR 
      is_admin_or_tech(auth.uid())
    )
  )
);

CREATE POLICY "Users can upload attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can delete attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ticket-attachments' AND is_admin_or_tech(auth.uid()));

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(attachment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ticket_attachments 
  SET download_count = download_count + 1,
      updated_at = now()
  WHERE id = attachment_id;
END;
$$;

-- Update timestamp trigger
CREATE TRIGGER update_ticket_attachments_updated_at
  BEFORE UPDATE ON public.ticket_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();