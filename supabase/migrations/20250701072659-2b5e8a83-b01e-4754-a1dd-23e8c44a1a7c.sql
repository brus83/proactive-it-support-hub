
-- Tabella per i dati dei negozi/clienti
CREATE TABLE public.store_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_code TEXT,
  store_name TEXT NOT NULL,
  ip_range TEXT NOT NULL, -- es. 192.168.101.0/24
  address TEXT,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  additional_info JSONB DEFAULT '{}'::jsonb
);

-- Indici per ottimizzare le ricerche
CREATE INDEX idx_store_locations_code ON public.store_locations(store_code) WHERE store_code IS NOT NULL AND store_code != '';
CREATE INDEX idx_store_locations_city ON public.store_locations(city);
CREATE INDEX idx_store_locations_ip ON public.store_locations(ip_range);
CREATE INDEX idx_store_locations_name ON public.store_locations USING gin(to_tsvector('italian', store_name));

-- RLS policy per store_locations
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti autenticati possono leggere i dati dei negozi
CREATE POLICY "Authenticated users can read store locations" ON public.store_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admin possono modificare i dati dei negozi
CREATE POLICY "Admin can manage store locations" ON public.store_locations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Funzione per cercare suggerimenti basati sul testo del ticket
CREATE OR REPLACE FUNCTION get_store_suggestions(search_text TEXT)
RETURNS TABLE (
  id UUID,
  store_code TEXT,
  store_name TEXT,
  ip_range TEXT,
  address TEXT,
  city TEXT,
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

-- Abilita l'estensione pg_trgm per la ricerca fuzzy se non è già abilitata
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Inserisci tutti i dati dei negozi forniti (gestendo i valori nulli correttamente)
INSERT INTO public.store_locations (ip_range, store_code, store_name, address, city) VALUES
('192.168.101.0/24', '00E', 'GRAVELLONA TOCE', 'Via Marconi', 'GRAVELLONA TOCE'),
('192.168.102.0/24', '0Y1', 'Milano C.so Genova', 'Corso Genova', 'Milano'),
('192.168.103.0/24', '0Y4', 'Mantova la Favorita', NULL, NULL),
('192.168.104.0/24', '0Y8', 'RIMINI C.SO AUGUSTO', NULL, NULL),
('192.168.105.0/24', NULL, 'Sede Vuota 105', NULL, NULL),
('192.168.106.0/24', '00U', 'CARUGATE', 'Strada Provinciale 208', 'Carugate'),
('192.168.107.0/24', '00D', 'Rozzano CC Fiordaliso', 'Via Eugenio Curiel', 'ROZZANO'),
('192.168.109.0/24', '002', 'MALPENSA T2', NULL, NULL),
('192.168.111.0/24', '0A8', 'RESCALDINA', 'Via Togliatti', 'RESCALDINA'),
('192.168.112.0/24', '00R', 'BOLOGNA OREFICI', 'Via Orefici', 'BOLOGNA'),
('192.168.114.0/24', '0H6', 'ORIO AEREPORTO', 'Via Aeroporto', 'ORIO AL SERIO'),
('192.168.115.0/24', '0A6', 'Livorno', 'VIA GRANDE', 'LIVORNO'),
('192.168.116.0/24', '0B5', 'LA SPEZIA CC LE TERRAZZE', 'VIA FONTEVIVO', 'LA SPEZIA'),
('192.168.117.0/24', '0B7', 'SAVONA IL GABBIANO', 'Corso Ricci', 'SAVONA'),
('192.168.119.0/24', '00V', 'COMO', 'Via Plinio', 'COMO'),
('192.168.120.0/24', '0A7', 'ALESSANDRIA', 'Via dei Martiri', 'ALESSANDRIA'),
('192.168.121.0/24', '0C2', 'PAVIA CARREFOUR', 'Via Vigentina ang. Via Cassani', 'PAVIA'),
('192.168.122.0/24', '0C3', 'NOVARA', 'Via Fratelli Rosselli', 'NOVARA'),
('192.168.123.0/24', '0C8', 'TORINO CASELLE', 'Strada San Maurizio', 'CASELLE TORINESE'),
('192.168.124.0/24', 'A03', 'VIGNATE', 'Via Cassanese', 'VIGNATE'),
('192.168.125.0/24', NULL, 'PESCARA', NULL, NULL),
('192.168.126.0/24', '0D9', 'VARESE MATTEOTTI', 'Corso Matteotti', 'VARESE'),
('192.168.127.0/24', NULL, 'Sede Vuota 127', NULL, NULL),
('192.168.128.0/24', '0E1', 'BASSANO CC EMISFERO', 'Viale Alcide de Gasperi', 'BASSANO DEL GRAPPA'),
('192.168.129.0/24', NULL, 'RAVENNA', NULL, NULL),
('192.168.130.0/24', NULL, 'MILANO VIA DANTE', NULL, NULL),
('192.168.131.0/24', '0E6', 'AFFI', 'Località Canove', 'AFFI'),
('192.168.132.0/24', '0E9', 'LINATE AEROPORTO', 'Viale Enrico Forlanini - Area partenze Piano Primo - Corpo F', 'SEGRATE'),
('192.168.133.0/24', NULL, 'Milano C.so Buon Aires', NULL, NULL),
('192.168.134.0/24', NULL, 'Imola', NULL, NULL),
('192.168.135.0/24', '0E8', 'VIMODRONE', 'Strada Statale Padana Superiore', 'VIMODRONE'),
('192.168.136.0/24', NULL, 'Sede Vuota 136', NULL, NULL),
('192.168.137.0/24', '0F6', 'PARMA CC TORRI', 'Via San Leonardo', 'PARMA'),
('192.168.138.0/24', '0F7', 'TORINO CC LINGOTTO', 'VIA NIZZA', 'TORINO'),
('192.168.139.0/24', '0F8', 'MARGHERA', 'Strada Statale Romea, ang. Via Arduino', 'MARGHERA'),
('192.168.140.0/24', '0F9', 'FORLI''', 'Piazzale della Cooperazione', 'FORLI'),
('192.168.141.0/24', '0Y9', 'BIELLA ORSI', NULL, NULL),
('192.168.142.0/24', NULL, 'Sede Vuota 142', NULL, NULL),
('192.168.143.0/24', '0G2', 'CREMONA', 'Via E. Berlinguer', 'GADESCO PIEVE DELMONA (CA'' DE'' MARI)'),
('192.168.144.0/24', NULL, 'Sede Vuota 144', NULL, NULL),
('192.168.145.0/24', '0G5', 'BREMBATE', 'Strada Provinviale', 'BREMBATE'),
('192.168.146.0/24', '0G9', 'ASCOLI', 'Via del Commercio', 'ASCOLI PICENO'),
('192.168.147.0/24', '0H1', 'ORIOCENTER', 'Via Portico', 'ORIO AL SERIO'),
('192.168.148.0/24', NULL, 'Sede Vuota 148', NULL, NULL),
('192.168.149.0/24', NULL, 'Sede Vuota 149', NULL, NULL),
('192.168.150.0/24', '0I6', 'EMPOLI', 'Via Raffaello Sanzio', 'EMPOLI'),
('192.168.151.0/24', '0I8', 'ROMA CC EUROMA', 'VIALE CRISTOFORO COLOMBO ang Oceano Pacifico', 'ROMA'),
('192.168.152.0/24', NULL, 'Sede Vuota 152', NULL, NULL),
('192.168.153.0/24', '0L1', 'TORINO G CESARE CC AUCHAN', 'C.so Romania', 'TORINO'),
('192.168.154.0/24', NULL, 'REGGIO EMILIA', NULL, NULL),
('192.168.155.0/24', '01K', 'Mondo Juve', NULL, NULL),
('192.168.156.0/24', NULL, 'Sede Vuota 156', NULL, NULL),
('192.168.157.0/24', '01O', 'Milano Corso 22 Marzo', 'Corso XXII Marzo', 'MILANO'),
('192.168.158.0/24', NULL, 'ALESSANDRIA 2', NULL, NULL),
('192.168.159.0/24', NULL, 'LA SPEZIA NUOVO', NULL, NULL),
('192.168.160.0/24', '0L5', 'CONEGLIANO', 'Via San Giuseppe', 'CONEGLIANO');

-- Continua inserimento con tutti gli altri negozi...
INSERT INTO public.store_locations (ip_range, store_code, store_name, address, city) VALUES
('192.168.161.0/24', NULL, 'FROSINONE (CHIUSO)', NULL, NULL),
('192.168.162.0/24', '0M1', 'ARESE', 'Via Giuseppe Luraghi', 'ARESE'),
('192.168.163.0/24', '0M6', 'BARI CASAMASSIMA', 'Via Noicattaro', 'CASAMASSIMA'),
('192.168.164.0/24', '0M7', 'MILANO B.AIRES', 'CORSO BUENOS AIRES', 'MILANO'),
('192.168.165.0/24', NULL, 'ANCONA', NULL, NULL),
('192.168.166.0/24', NULL, 'BRINDISI (CHIUSO)', NULL, NULL),
('192.168.167.0/24', '0N2', 'FERRARA CC CASTELLO', 'Via Giusti', 'FERRARA'),
('192.168.168.0/24', '0N1', 'Brescia Zanardelli', 'CORSO GIUSEPPE ZANARDELLI', 'BRESCIA'),
('192.168.169.0/24', NULL, 'VENEZIA (CHIUSO)', NULL, NULL),
('192.168.170.0/24', '0N4', 'MILANO VIA TORINO', 'VIA TORINO', 'MILANO'),
('192.168.171.0/24', NULL, 'PISA NUOVO', NULL, NULL),
('192.168.172.0/24', '0N6', 'BARI CC MONGOLFIERA', 'VIA SANTA CATERINA', 'BARI'),
('192.168.173.0/24', NULL, 'SENIGALLIA', NULL, NULL),
('192.168.174.0/24', NULL, 'Sede Vuota 174', NULL, NULL),
('192.168.175.0/24', '0I3', 'FIRENZE SMN', 'PIAZZA DELLA STAZIONE', 'FIRENZE'),
('192.168.176.0/24', '0H5', 'IMOLA CC LEONARDO', 'Viale Giogio Amendola', 'IMOLA'),
('192.168.177.0/24', '0I2', 'MILANO DANTE', 'VIA DANTE', 'MILANO'),
('192.168.178.0/24', '0L8', 'MILANO GOTTARDO', 'Corso San Gottardo', 'Milano'),
('192.168.179.0/24', '0H7', 'ROMA APPIA', 'VIA APPIA NUOVA', 'ROMA'),
('192.168.180.0/24', '0I1', 'ROMA CC CINECITTA'' 2', 'VIALE PALMIRO TOGLIATTI', 'ROMA'),
('192.168.181.0/24', '0H9', 'ROMA CC EST', 'VIA COLLATINA', 'ROMA'),
('192.168.182.0/24', NULL, 'FIRENZE VIA DEL CORSO', NULL, NULL),
('192.168.183.0/24', NULL, 'Sede Vuota 183', NULL, NULL),
('192.168.184.0/24', '0N9', 'LUCCA', 'VIA FILLUNGO', 'LUCCA'),
('192.168.185.0/24', '01l', 'LECCO VIA ROMA', NULL, NULL),
('192.168.186.0/24', NULL, 'Sede Vuota 186', NULL, NULL),
('192.168.187.0/24', NULL, 'FOGGIA', NULL, NULL),
('192.168.188.0/24', NULL, 'TARANTO', NULL, NULL),
('192.168.189.0/24', '0S4', 'MALPENSA T1', 'TERMINAL 1 PARTENZE', 'FERNO'),
('192.168.190.0/24', '0S7', 'SAN MARTINO CC BENNET', 'Strada Provinciale per Mortara', 'SAN MARTINO SICCOMARIO'),
('192.168.191.0/24', '0S9', 'PADOVA ROMA', 'VIA ROMA', 'PADOVA'),
('192.168.192.0/24', NULL, 'Sede Vuota 192', NULL, NULL),
('192.168.193.0/24', '0O6', 'AREZZO', 'C.SO ITALIA', 'AREZZO'),
('192.168.194.0/24', '0P4', 'MILANO LA FOPPA', 'LARGO LA FOPPA', 'MILANO'),
('192.168.195.0/24', '0P7', 'GAVIRATE CC CAMPO DEI FIORI', 'Viale Ticino', 'GAVIRATE'),
('192.168.196.0/24', '0Q5', 'MODENA', 'VIA EMILIA', 'MODENA'),
('192.168.197.0/24', '0Q4', 'SIENA', 'VIA BANCHI DI SOPRA', 'SIENA'),
('192.168.198.0/24', '0P9', 'ROMA CC VALLE AURELIA', 'VIA DI VALLE AURELIA', 'ROMA'),
('192.168.199.0/24', NULL, 'Sede Vuota 199', NULL, NULL),
('192.168.200.0/24', '0P6', 'MILANO C.SO VERCELLI', 'CORSO VERCELLI', 'MILANO'),
('192.168.201.0/24', '0M8', 'RIMINI CC LE BEFANE', 'VIA CADUTI DI NASSIRIYA', 'RIMINI'),
('192.168.202.0/24', NULL, 'Sede Vuota 202', NULL, NULL),
('192.168.203.0/24', '0P8', 'NOVARA SAN MARTINO', 'Via Ugo Porzio Giovanola', 'NOVARA'),
('192.168.204.0/24', NULL, 'Sede Vuota 204', NULL, NULL),
('192.168.205.0/24', '0Q2', 'UDINE VIA RIALTO', 'Via Rialto', 'UDINE'),
('192.168.206.0/24', '0Q3', 'VERCELLI CC BENNET', 'Strada Vicinale Cantarana', 'VERCELLI'),
('192.168.207.0/24', '0R2', 'SESTO FIORENTINO', 'Via Petrosa', 'Sesto Fiorentino'),
('192.168.208.0/24', '01C', 'COMO RELOOVE', 'Via Cantù', NULL),
('192.168.209.0/24', NULL, 'Sede Vuota 209', NULL, NULL),
('192.168.210.0/24', '0P3', 'ROMA TOR VERGATA', 'VIA LUIGI SCHIAVONETTI', 'ROMA'),
('192.168.211.0/24', NULL, 'Sede Vuota 211', NULL, NULL),
('192.168.212.0/24', '0R3', 'CASSINA RIZZARDI', 'Via Risorgimento', 'Cassina Rizzardi'),
('192.168.213.0/24', '0R6', 'COLLE UMBERTO CC BENNET', 'Via Calate', 'Colle Umberto'),
('192.168.214.0/24', '0R5', 'LIMBIATE CC CARREFOUR', 'Via Giuseppe Garibaldi Ex SS 527', 'Limbiate'),
('192.168.215.0/24', '0R4', 'PISTOIA BUOZZI', 'Via B.Buozzi', 'Pistoia'),
('192.168.216.0/24', '0N5', 'BARI CC MONGOLFIERA VIA JAPIGIA', 'VIA NATALE LOIACONO', 'BARI'),
('192.168.217.0/24', '0K3', 'Roma CC Porta di Roma', 'Via Alberto Lionello', 'Roma'),
('192.168.218.0/24', '0K2', 'VARESE BELFORTE', 'Viale Belforte', 'Varese'),
('192.168.219.0/24', NULL, 'Sede Vuota 219', NULL, NULL),
('192.168.220.0/24', '0K7', 'Arona Via Cavour', 'Via Cavour', 'Arona'),
('192.168.221.0/24', '0T3', 'UDINE CITTA'' FIERA', 'Via Antonio Bardelli', 'TORREANO DI MARTIGNACCO'),
('192.168.222.0/24', '0H4', 'FERMO CC GIRASOLE', 'Via Prosperi', 'FERMO'),
('192.168.223.0/24', '0U2', 'CENTO CC GUERCINO', 'Via Matteo Loves', 'Cento'),
('192.168.224.0/24', '0U4', 'REGGIO EMILIA CC ARIOSTO', 'Viale Rodolfo Morandi', 'Reggio Emilia'),
('192.168.225.0/24', '0V1', 'LENTATE CC BENNET', 'Via Nazionale dei Giovi', 'Lentate sul Seveso'),
('192.168.226.0/24', '0U8', 'BRUGHERIO CC BENNET', 'Via Lombardia', 'Brugherio'),
('192.168.227.0/24', '0U9', 'PONTEDERA CC COOP', 'Via Umberto Terracini', 'Pontedera'),
('192.168.228.0/24', NULL, 'Sede Vuota 228', NULL, NULL),
('192.168.229.0/24', '0V2', 'San Giovanni Teatino CC Centro d''Abruzzo', 'Via Po', 'San Giovanni Teatino'),
('192.168.230.0/24', '0V9', 'Padova CC Le Centurie', 'Via Caselle', 'San Giorgio Delle Pertiche'),
('192.168.231.0/24', '0V4', 'Quarto CC Quartonuovo', 'Via Masullo', 'Quarto'),
('192.168.232.0/24', '0V5', 'Chieti CC Megalò', 'Località Santa Filomena', 'Chieti'),
('192.168.233.0/24', '0Z1', 'San Rocco al Porto CC Belpò', 'SS9 Via Emilia', 'San Rocco al Porto'),
('192.168.234.0/24', '0Z2', 'Livorno CC Fonti del Corallo', 'Via Gino Graziani', 'Livorno'),
('192.168.235.0/24', '0V6', 'Roma CC I Granai', 'Via Mario Rigamonti', 'Roma'),
('192.168.236.0/24', '0V8', 'Pesaro Via Branca', 'Via Branca', 'Pesaro'),
('192.168.237.0/24', '0Z7', 'Assago cc Milanofiori', 'Viale Milanofiori', 'Assago'),
('192.168.238.0/24', '0Z8', 'Formia CC Itaca', 'Via Mamurrano', 'Formia'),
('192.168.239.0/24', '0Z9', 'Marcianise CC Campania', 'S.S. Sannitica – Località Aurno', 'Marcianise'),
('192.168.240.0/24', '0U5', 'Modena CC I Portali', 'Viale Dello Sport', 'Modena'),
('192.168.241.0/24', '0J4', 'VITERBO CC TUSCIA', 'Tangenziale Ovest', 'Viterbo'),
('192.168.242.0/24', '0W9', 'Torino Via Lagrange', 'Via Giuseppe Luigi Lagrange', 'Torino'),
('192.168.243.0/24', '0X4', 'Piediripa CC Val di Chienti', 'Via Giovan Battista Velluti', 'Piediripa'),
('192.168.244.0/24', '0X9', 'Bologna CC Gran Reno', 'Via Marilyn Monroe', 'Casalecchio di Reno'),
('192.168.245.0/24', '0X8', 'TERAMO CC GRAN SASSO', 'Località Piano D''Accio', 'Teramo');

-- Aggiungi vincolo unique per store_code solo se non è null
ALTER TABLE public.store_locations ADD CONSTRAINT unique_store_code UNIQUE (store_code) DEFERRABLE INITIALLY DEFERRED;
