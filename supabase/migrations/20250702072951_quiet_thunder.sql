/*
# Fix get_store_suggestions function type mismatch

1. Database Changes
   - Drop and recreate the get_store_suggestions function with correct DOUBLE PRECISION type
   - Ensure the relevance_score column returns the expected type

2. Function Updates
   - Properly cast similarity function results to DOUBLE PRECISION
   - Maintain all existing functionality while fixing the type issue
*/

-- Drop the existing function to ensure clean recreation
DROP FUNCTION IF EXISTS get_store_suggestions(text);

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION get_store_suggestions(search_text TEXT)
RETURNS TABLE (
  id UUID,
  store_code TEXT,
  store_name TEXT,
  ip_range TEXT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN,
  relevance_score DOUBLE PRECISION
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
    -- Explicitly cast the similarity result to DOUBLE PRECISION
    CAST(
      GREATEST(
        similarity(COALESCE(sl.store_name, ''), search_text),
        similarity(COALESCE(sl.city, ''), search_text),
        similarity(COALESCE(sl.store_code, ''), search_text),
        similarity(COALESCE(sl.address, ''), search_text)
      ) AS DOUBLE PRECISION
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