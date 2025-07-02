/*
# Fix get_store_suggestions function type mismatch

1. Database Changes
   - Drop and recreate the get_store_suggestions function with explicit DOUBLE PRECISION casting
   - Ensure all similarity calculations return DOUBLE PRECISION type
   - Add proper type conversion for all numeric operations

2. Function Updates
   - Use explicit CAST operations for all similarity functions
   - Ensure GREATEST function returns DOUBLE PRECISION
   - Maintain backward compatibility with existing queries
*/

-- Drop the existing function completely
DROP FUNCTION IF EXISTS get_store_suggestions(text);

-- Recreate the function with explicit DOUBLE PRECISION casting
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
    -- Explicitly cast each similarity result and the GREATEST result to DOUBLE PRECISION
    CAST(
      GREATEST(
        CAST(similarity(COALESCE(sl.store_name, ''), search_text) AS DOUBLE PRECISION),
        CAST(similarity(COALESCE(sl.city, ''), search_text) AS DOUBLE PRECISION),
        CAST(similarity(COALESCE(sl.store_code, ''), search_text) AS DOUBLE PRECISION),
        CAST(similarity(COALESCE(sl.address, ''), search_text) AS DOUBLE PRECISION)
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_store_suggestions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_suggestions(TEXT) TO anon;