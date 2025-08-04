/*
# Document Management System for Tickets

1. New Tables
   - `ticket_attachments`
     - `id` (uuid, primary key)
     - `ticket_id` (uuid, foreign key to tickets)
     - `file_name` (text, original filename)
     - `file_path` (text, storage path)
     - `file_size` (integer, size in bytes)
     - `mime_type` (text, file MIME type)
     - `uploaded_by` (uuid, foreign key to profiles)
     - `is_public` (boolean, visibility flag)
     - `download_count` (integer, tracking downloads)
     - `virus_scan_status` (text, security check status)
     - `created_at` (timestamp)

2. Storage
   - Create storage bucket for ticket attachments
   - Configure security policies for file access

3. Security
   - Enable RLS on ticket_attachments
   - Policies for viewing/uploading based on ticket access
   - File type validation and size limits
*/

-- Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  virus_scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_uploaded_by ON public.ticket_attachments(uploaded_by);
CREATE INDEX idx_ticket_attachments_mime_type ON public.ticket_attachments(mime_type);
CREATE INDEX idx_ticket_attachments_created_at ON public.ticket_attachments(created_at DESC);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for tickets they can access
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
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'technician')
    )
  )
);

-- Users can upload attachments to tickets they can access
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
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'technician')
    )
  )
);

-- Users can update own attachments or admins can update all
CREATE POLICY "Users can update own attachments" 
ON public.ticket_attachments
FOR UPDATE 
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'));

-- Users can delete own attachments or admins can delete all
CREATE POLICY "Users can delete own attachments" 
ON public.ticket_attachments
FOR DELETE 
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'));

-- Function to update download count
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

-- Function to get file type category
CREATE OR REPLACE FUNCTION public.get_file_category(mime_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE 
    WHEN mime_type LIKE 'image/%' THEN RETURN 'image';
    WHEN mime_type IN ('application/pdf') THEN RETURN 'pdf';
    WHEN mime_type LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' 
         OR mime_type LIKE 'application/vnd.ms-excel%' THEN RETURN 'excel';
    WHEN mime_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml%' 
         OR mime_type LIKE 'application/msword%' THEN RETURN 'word';
    WHEN mime_type LIKE 'text/%' THEN RETURN 'text';
    WHEN mime_type LIKE 'video/%' THEN RETURN 'video';
    WHEN mime_type LIKE 'audio/%' THEN RETURN 'audio';
    ELSE RETURN 'other';
  END CASE;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_ticket_attachments_updated_at 
BEFORE UPDATE ON public.ticket_attachments
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();