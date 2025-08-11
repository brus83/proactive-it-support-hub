@@ .. @@
     -- Explicitly cast each similarity result and the GREATEST result to DOUBLE PRECISION
-    GREATEST(
-      (similarity(COALESCE(sl.store_name, ''), search_text) * 1.0::double precision),
-      (similarity(COALESCE(sl.city, ''), search_text) * 1.0::double precision),
-      (similarity(COALESCE(sl.store_code, ''), search_text) * 1.0::double precision),
-      (similarity(COALESCE(sl.address, ''), search_text) * 1.0::double precision)
-    ) as relevance_score
+    CAST(
+      GREATEST(
+        CAST(similarity(COALESCE(sl.store_name, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.city, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.store_code, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.address, ''), search_text) AS DOUBLE PRECISION)
+      ) AS DOUBLE PRECISION
+    ) as relevance_score
   FROM public.store_locations sl