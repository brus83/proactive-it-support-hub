@@ .. @@
     -- Explicitly cast each similarity result and the GREATEST result to DOUBLE PRECISION
-    CAST(
-      GREATEST(
-        CAST(similarity(COALESCE(sl.store_name, ''), search_text) AS DOUBLE PRECISION),
-        CAST(similarity(COALESCE(sl.city, ''), search_text) AS DOUBLE PRECISION),
-        CAST(similarity(COALESCE(sl.store_code, ''), search_text) AS DOUBLE PRECISION),
-        CAST(similarity(COALESCE(sl.address, ''), search_text) AS DOUBLE PRECISION)
-      ) AS DOUBLE PRECISION
-    ) as relevance_score
+    CAST(
+      GREATEST(
+        CAST(similarity(COALESCE(sl.store_name, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.city, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.store_code, ''), search_text) AS DOUBLE PRECISION),
+        CAST(similarity(COALESCE(sl.address, ''), search_text) AS DOUBLE PRECISION)
+      ) AS NUMERIC
+    )::DOUBLE PRECISION as relevance_score