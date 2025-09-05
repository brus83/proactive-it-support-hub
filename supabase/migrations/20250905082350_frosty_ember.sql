/*
  # Fix store suggestions function type mismatch

  1. Changes
    - Update get_store_suggestions function to properly return double precision for relevance_score
    - Ensure all similarity calculations are cast to double precision before GREATEST function
    - Force type promotion at calculation level rather than just casting the final result

  2. Security
    - Maintains existing RLS policies
    - No changes to table permissions
*/

-- Drop and recreate the function with proper type handling
DROP FUNCTION IF EXISTS get_store_suggestions(text);

CREATE OR REPLACE FUNCTION get_store_suggestions(search_text text)
RETURNS TABLE (
  id uuid,
  store_name text,
  store_code text,
  address text,
  city text,
  state text,
  postal_code text,
  relevance_score double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.store_name,
    sl.store_code,
    sl.address,
    sl.city,
    sl.state,
    sl.postal_code,
    -- Ensure each similarity result is double precision before GREATEST
    GREATEST(
      (similarity(COALESCE(sl.store_name, ''), search_text) * 1.0)::double precision,
      (similarity(COALESCE(sl.city, ''), search_text) * 1.0)::double precision,
      (similarity(COALESCE(sl.store_code, ''), search_text) * 1.0)::double precision,
      (similarity(COALESCE(sl.address, ''), search_text) * 1.0)::double precision
    ) as relevance_score
  FROM public.store_locations sl
  WHERE 
    similarity(COALESCE(sl.store_name, ''), search_text) > 0.1 OR
    similarity(COALESCE(sl.city, ''), search_text) > 0.1 OR
    similarity(COALESCE(sl.store_code, ''), search_text) > 0.1 OR
    similarity(COALESCE(sl.address, ''), search_text) > 0.1
  ORDER BY relevance_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;