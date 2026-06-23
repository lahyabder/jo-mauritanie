-- ============================================================
-- Migration 012: Seed Data (Reference & Demo)
-- ============================================================

-- ------------------------------------
-- Mauritanian Wilayas (Regions) as reference data
-- ------------------------------------
INSERT INTO institutions (code, category, name_ar, name_fr, level, is_active) VALUES
  ('WILAYA-NOUAKCHOTT-NORD',   'regional_authority', 'ولاية نواكشوط الشمالية',  'Wilaya de Nouakchott Nord',   1, TRUE),
  ('WILAYA-NOUAKCHOTT-OUEST',  'regional_authority', 'ولاية نواكشوط الغربية',   'Wilaya de Nouakchott Ouest',  1, TRUE),
  ('WILAYA-NOUAKCHOTT-SUD',    'regional_authority', 'ولاية نواكشوط الجنوبية',   'Wilaya de Nouakchott Sud',    1, TRUE),
  ('WILAYA-HODH-CHARGUI',      'regional_authority', 'ولاية الحوض الشرقي',        'Wilaya du Hodh El Chargui',   1, TRUE),
  ('WILAYA-HODH-GHARBI',       'regional_authority', 'ولاية الحوض الغربي',        'Wilaya du Hodh El Gharbi',    1, TRUE),
  ('WILAYA-ASSABA',            'regional_authority', 'ولاية العصابة',             'Wilaya de l''Assaba',         1, TRUE),
  ('WILAYA-GORGOL',            'regional_authority', 'ولاية كوركول',              'Wilaya du Gorgol',            1, TRUE),
  ('WILAYA-BRAKNA',            'regional_authority', 'ولاية البراكنة',             'Wilaya du Brakna',            1, TRUE),
  ('WILAYA-TRARZA',            'regional_authority', 'ولاية الترارزة',             'Wilaya du Trarza',            1, TRUE),
  ('WILAYA-ADRAR',             'regional_authority', 'ولاية آدرار',               'Wilaya de l''Adrar',          1, TRUE),
  ('WILAYA-DAKHLET-NOUADHIBOU','regional_authority', 'ولاية داخلة نواذيبو',       'Wilaya de Dakhlet Nouadhibou',1, TRUE),
  ('WILAYA-TAGANT',            'regional_authority', 'ولاية تكانت',               'Wilaya du Tagant',            1, TRUE),
  ('WILAYA-GUIDIMAKA',         'regional_authority', 'ولاية كيدي ماغة',           'Wilaya du Guidimakha',        1, TRUE),
  ('WILAYA-TIRIS-ZEMMOUR',     'regional_authority', 'ولاية تيرس زمور',           'Wilaya du Tiris Zemmour',     1, TRUE),
  ('WILAYA-INCHIRI',           'regional_authority', 'ولاية انشيري',              'Wilaya de l''Inchiri',        1, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------
-- Key Institutions
-- ------------------------------------
INSERT INTO institutions (code, category, name_ar, name_fr, short_name_ar, short_name_fr, level, is_active) VALUES
  ('PRESIDENCE',        'presidency',           'رئاسة الجمهورية الإسلامية الموريتانية',   'Présidence de la République Islamique de Mauritanie', 'الرئاسة',        'Présidence',          1, TRUE),
  ('PREMIER-MINISTERE', 'ministry',             'الوزارة الأولى',                           'Premier Ministère',                                   'الوزارة الأولى', 'PM',                  1, TRUE),
  ('MIN-INT',           'ministry',             'وزارة الداخلية واللامركزية',               'Ministère de l''Intérieur et de la Décentralisation', 'داخلية',         'MIN INT',             1, TRUE),
  ('MIN-FIN',           'ministry',             'وزارة المالية',                             'Ministère des Finances',                              'مالية',          'MIN FIN',             1, TRUE),
  ('MIN-JUST',          'ministry',             'وزارة العدل',                               'Ministère de la Justice',                             'عدل',            'MIN JUST',            1, TRUE),
  ('MIN-EDU',           'ministry',             'وزارة التربية الوطنية',                    'Ministère de l''Éducation Nationale',                 'تعليم',          'MIN EDU',             1, TRUE),
  ('MIN-SANTE',         'ministry',             'وزارة الصحة',                               'Ministère de la Santé',                               'صحة',            'MIN SANTE',           1, TRUE),
  ('MIN-AFFETRANG',     'ministry',             'وزارة الشؤون الخارجية والتعاون',           'Ministère des Affaires Étrangères et de la Coopération','خارجية',       'MAE',                 1, TRUE),
  ('ASSEMBLEE',         'parliament',           'الجمعية الوطنية',                          'Assemblée Nationale',                                 'الجمعية',        'AN',                  1, TRUE),
  ('SENAT',             'parliament',           'مجلس الشيوخ',                               'Sénat',                                               'الشيوخ',         'Sénat',               1, TRUE),
  ('CONSEIL-CONST',     'constitutional_council','المجلس الدستوري',                         'Conseil Constitutionnel',                             'دستوري',         'CC',                  1, TRUE),
  ('COUR-SUP',          'supreme_court',        'المحكمة العليا',                            'Cour Suprême',                                        'عليا',           'CS',                  1, TRUE),
  ('BCM',               'public_agency',        'البنك المركزي الموريتاني',                 'Banque Centrale de Mauritanie',                       'بنك مركزي',      'BCM',                 1, TRUE),
  ('SOMELEC',           'public_enterprise',    'الشركة الموريتانية للكهرباء',              'Société Mauritanienne d''Électricité',                'سوملك',          'SOMELEC',             1, TRUE),
  ('SNDE',              'public_enterprise',    'الشركة الوطنية للماء',                     'Société Nationale de l''Eau',                         'صندوق الماء',    'SNDE',                1, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------
-- Demo: One sample gazette issue
-- ------------------------------------
INSERT INTO issues (
  issue_number, issue_number_display,
  publication_date,
  title_ar, title_fr,
  is_published, is_special_edition
) VALUES (
  1456, '1456',
  '2024-01-15',
  'الجريدة الرسمية للجمهورية الإسلامية الموريتانية - العدد 1456',
  'Journal Officiel de la République Islamique de Mauritanie - N° 1456',
  TRUE, FALSE
) ON CONFLICT (issue_number) DO NOTHING;
