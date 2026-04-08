INSERT INTO regions (name, slug, code) VALUES
  ('Arica y Parinacota', 'arica-y-parinacota', 'AP'),
  ('Tarapacá', 'tarapaca', 'TA'),
  ('Antofagasta', 'antofagasta', 'AN'),
  ('Atacama', 'atacama', 'AT'),
  ('Coquimbo', 'coquimbo', 'CO'),
  ('Valparaíso', 'valparaiso', 'VS'),
  ('Región Metropolitana de Santiago', 'region-metropolitana', 'RM'),
  ('O''Higgins', 'ohiggins', 'LI'),
  ('Maule', 'maule', 'ML'),
  ('Ñuble', 'nuble', 'NB'),
  ('Biobío', 'biobio', 'BI'),
  ('La Araucanía', 'la-araucania', 'AR'),
  ('Los Ríos', 'los-rios', 'LR'),
  ('Los Lagos', 'los-lagos', 'LL'),
  ('Aysén', 'aysen', 'AI'),
  ('Magallanes y la Antártica Chilena', 'magallanes', 'MA')
ON CONFLICT (code) DO NOTHING;
