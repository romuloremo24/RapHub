-- Sample properties for testing Vesta
INSERT INTO properties (
  slug, title, description, price_clp, price_uf, currency, price_per_m2_uf,
  operation, property_type, bedrooms, bathrooms, parking_spots,
  total_area_m2, built_area_m2, address, commune_id, sector,
  latitude, longitude, images, image_count,
  primary_source, primary_source_url, primary_external_id,
  content_hash, fingerprint, is_active
) VALUES
(
  'depto-2d-providencia-antonio-varas',
  'Departamento 2D 1B en Providencia, cerca de metro',
  'Amplio departamento de 2 dormitorios y 1 baño en excelente ubicación. Cerca de metro Los Leones, supermercados y comercio. Piso 8 con buena vista. Cocina equipada, living-comedor amplio.',
  650000, 15.2, 'CLP', 0.27,
  'arriendo', 'departamento', 2, 1, 0,
  60.00, 56.00, 'Antonio Varas 1250', 2, 'Providencia Centro',
  -33.4255, -70.6106, ARRAY['https://via.placeholder.com/800x600/1a365d/ffffff?text=Depto+Providencia'], 1,
  'portalinmobiliario', 'https://portalinmobiliario.com/123', 'PI-001',
  'hash001', 'fp001', true
),
(
  'depto-3d-las-condes-apoquindo',
  'Moderno departamento 3D 2B en Las Condes',
  'Departamento nuevo de 3 dormitorios, 2 baños completos, estacionamiento y bodega. Edificio con piscina, gimnasio y quincho. Excelente conectividad por Apoquindo.',
  1450000, 34.0, 'CLP', 0.39,
  'arriendo', 'departamento', 3, 2, 1,
  92.00, 87.00, 'Apoquindo 4500', 3, 'Las Condes Norte',
  -33.4178, -70.5890, ARRAY['https://via.placeholder.com/800x600/2a4a7f/ffffff?text=Depto+Las+Condes'], 1,
  'toctoc', 'https://toctoc.com/456', 'TT-001',
  'hash002', 'fp002', true
),
(
  'casa-4d-nunoa-iran',
  'Casa 4D 3B con patio en Ñuñoa',
  'Hermosa casa de 4 dormitorios con amplio patio trasero. 3 baños, estacionamiento para 2 autos. Barrio residencial tranquilo, cerca de Plaza Ñuñoa.',
  2800000, 65.7, 'CLP', 0.44,
  'arriendo', 'casa', 4, 3, 2,
  160.00, 150.00, 'Irán 3200', 6, 'Plaza Ñuñoa',
  -33.4530, -70.5970, ARRAY['https://via.placeholder.com/800x600/e53e3e/ffffff?text=Casa+Nunoa'], 1,
  'portalinmobiliario', 'https://portalinmobiliario.com/789', 'PI-002',
  'hash003', 'fp003', true
),
(
  'depto-1d-santiago-centro-moneda',
  'Estudio amoblado Santiago Centro',
  'Estudio completamente amoblado en pleno centro. Ideal para profesional joven. Edificio con conserjería 24/7, lavandería y bicicletero.',
  380000, 8.9, 'CLP', 0.28,
  'arriendo', 'departamento', 1, 1, 0,
  32.00, 32.00, 'Moneda 1020', 1, 'Santiago Centro',
  -33.4420, -70.6530, ARRAY['https://via.placeholder.com/800x600/718096/ffffff?text=Estudio+Santiago'], 1,
  'mercadolibre', 'https://mercadolibre.cl/111', 'ML-001',
  'hash004', 'fp004', true
),
(
  'depto-2d-vitacura-kennedy',
  'Departamento premium 2D en Vitacura',
  'Departamento de alto estándar en Kennedy con Vespucio. 2 dormitorios en suite, terraza con vista a la cordillera. Edificio con áreas verdes y seguridad.',
  1900000, 44.6, 'CLP', 0.56,
  'arriendo', 'departamento', 2, 2, 2,
  85.00, 80.00, 'Av. Kennedy 5600', 4, 'Kennedy',
  -33.3990, -70.5780, ARRAY['https://via.placeholder.com/800x600/1a365d/ffffff?text=Depto+Vitacura'], 1,
  'toctoc', 'https://toctoc.com/222', 'TT-002',
  'hash005', 'fp005', true
),
(
  'casa-venta-la-reina',
  'Casa 5D con piscina en La Reina',
  'Espectacular casa de 5 dormitorios con piscina y jardín. Living doble altura, cocina americana, quincho techado. Barrio consolidado y seguro.',
  NULL, 12500.0, 'UF', 0.52,
  'venta', 'casa', 5, 4, 3,
  280.00, 240.00, 'Príncipe de Gales 8200', 7, 'La Reina Alta',
  -33.4480, -70.5530, ARRAY['https://via.placeholder.com/800x600/e53e3e/ffffff?text=Casa+La+Reina'], 1,
  'portalinmobiliario', 'https://portalinmobiliario.com/333', 'PI-003',
  'hash006', 'fp006', true
),
(
  'depto-venta-maipu-pajaritos',
  'Departamento nuevo 3D en Maipú',
  'Departamento a estrenar en proyecto nuevo. 3 dormitorios, 2 baños, estacionamiento y bodega. Cerca de metro Pajaritos. Entrega inmediata.',
  NULL, 3200.0, 'UF', 0.46,
  'venta', 'departamento', 3, 2, 1,
  72.00, 70.00, 'Av. Pajaritos 3500', 17, 'Pajaritos',
  -33.5010, -70.7450, ARRAY['https://via.placeholder.com/800x600/2a4a7f/ffffff?text=Depto+Maipu'], 1,
  'mercadolibre', 'https://mercadolibre.cl/444', 'ML-002',
  'hash007', 'fp007', true
),
(
  'depto-2d-estacion-central',
  'Departamento 2D cerca de Estación Central',
  'Departamento de 2 dormitorios a pasos del metro y terminal de buses. Ideal para inversión, alta demanda de arriendo en la zona.',
  NULL, 2100.0, 'UF', 0.38,
  'venta', 'departamento', 2, 1, 0,
  55.00, 55.00, 'Av. Libertador Bernardo OHiggins 3450', 18, 'Estación Central',
  -33.4520, -70.6830, ARRAY['https://via.placeholder.com/800x600/718096/ffffff?text=Depto+Est+Central'], 1,
  'yapo', 'https://yapo.cl/555', 'YP-001',
  'hash008', 'fp008', true
),
(
  'terreno-colina-chicureo',
  'Terreno 5.000 m² en Chicureo, Colina',
  'Parcela urbanizada con factibilidad de agua y luz. Excelente ubicación en zona de crecimiento. Vista a la cordillera.',
  NULL, 8500.0, 'UF', 1.70,
  'venta', 'terreno', NULL, NULL, NULL,
  5000.00, NULL, 'Camino a Chicureo km 5', 35, 'Chicureo',
  -33.2850, -70.5680, ARRAY['https://via.placeholder.com/800x600/00A651/ffffff?text=Terreno+Colina'], 1,
  'yapo', 'https://yapo.cl/666', 'YP-002',
  'hash009', 'fp009', true
),
(
  'oficina-providencia-costanera',
  'Oficina 120 m² en Costanera Center',
  'Oficina implementada con 4 privados, sala de reuniones y recepción. Edificio AAA con estacionamientos de visita. Vista panorámica piso 25.',
  3200000, 75.1, 'CLP', 0.63,
  'arriendo', 'oficina', NULL, 2, 2,
  130.00, 120.00, 'Av. Andrés Bello 2457', 2, 'Costanera Center',
  -33.4170, -70.6070, ARRAY['https://via.placeholder.com/800x600/FF6600/ffffff?text=Oficina+Costanera'], 1,
  'portalinmobiliario', 'https://portalinmobiliario.com/777', 'PI-004',
  'hash010', 'fp010', true
),
(
  'depto-3d-la-florida-walker',
  'Departamento familiar 3D en La Florida',
  'Amplio departamento de 3 dormitorios en condominio con áreas verdes, juegos infantiles y piscina. Cerca de Mall Plaza Vespucio.',
  780000, 18.3, 'CLP', 0.26,
  'arriendo', 'departamento', 3, 2, 1,
  75.00, 70.00, 'Walker Martínez 5200', 10, 'La Florida Centro',
  -33.5170, -70.5920, ARRAY['https://via.placeholder.com/800x600/00B4D8/ffffff?text=Depto+La+Florida'], 1,
  'toctoc', 'https://toctoc.com/888', 'TT-003',
  'hash011', 'fp011', true
),
(
  'depto-2d-macul-quilin',
  'Departamento 2D nuevo en Macul',
  'Departamento recién entregado, 2 dormitorios, 1 baño, estacionamiento. Edificio con sala multiuso y bicicletero. Cerca de metro Quilín.',
  520000, 12.2, 'CLP', 0.24,
  'arriendo', 'departamento', 2, 1, 1,
  52.00, 50.00, 'Av. Quilín 4200', 8, 'Quilín',
  -33.4850, -70.5760, ARRAY['https://via.placeholder.com/800x600/FFE600/333333?text=Depto+Macul'], 1,
  'mercadolibre', 'https://mercadolibre.cl/999', 'ML-003',
  'hash012', 'fp012', true
);
