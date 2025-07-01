
-- Elimino la funzione esistente e la ricreo con il tipo corretto
DROP FUNCTION IF EXISTS get_store_suggestions(text);

-- Creo la tabella comments che manca nel database
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per ottimizzare le query
CREATE INDEX idx_comments_ticket_id ON public.comments(ticket_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

-- RLS policies per i commenti
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere i commenti dei ticket che possono vedere
CREATE POLICY "Users can view comments on accessible tickets" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'))
    )
  );

-- Gli utenti possono creare commenti sui ticket che possono vedere
CREATE POLICY "Users can create comments on accessible tickets" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'))
    )
  );

-- Gli utenti possono aggiornare solo i propri commenti
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Gli utenti possono eliminare solo i propri commenti o gli admin possono eliminare tutti
CREATE POLICY "Users can delete own comments or admins can delete all" ON public.comments
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Ricreo la funzione get_store_suggestions con il tipo corretto
CREATE OR REPLACE FUNCTION get_store_suggestions(search_text TEXT)
RETURNS TABLE (
  id UUID,
  store_code TEXT,
  store_name TEXT,
  ip_range TEXT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.store_code,
    sl.store_name,
    sl.ip_range,
    sl.address,
    sl.city,
    sl.is_active,
    -- Calcola un punteggio di rilevanza
    GREATEST(
      similarity(COALESCE(sl.store_name, ''), search_text),
      similarity(COALESCE(sl.city, ''), search_text),
      similarity(COALESCE(sl.store_code, ''), search_text),
      similarity(COALESCE(sl.address, ''), search_text)
    ) as relevance_score
  FROM public.store_locations sl
  WHERE sl.is_active = true
    AND (
      sl.store_name ILIKE '%' || search_text || '%' OR
      sl.city ILIKE '%' || search_text || '%' OR
      sl.store_code ILIKE '%' || search_text || '%' OR
      sl.address ILIKE '%' || search_text || '%' OR
      sl.ip_range ILIKE '%' || search_text || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
