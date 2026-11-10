-- Fictional example locations for development and demos.
-- These are NOT real Tuwaiq Academy room records.
insert into public.locations (code, name_ar, building, floor, area) values
  ('WC-F2',     'دورة مياه الدور الثاني', 'المبنى أ', 'الدور الثاني', 'الجناح الشرقي'),
  ('ROOM-204',  'قاعة 204',               'المبنى أ', 'الدور الثاني', 'القاعات'),
  ('LAB-3',     'معمل الحاسب 3',          'المبنى ب', 'الدور الأول',  'المعامل'),
  ('HALL-MAIN', 'الممر الرئيسي',          'المبنى أ', 'الدور الأرضي', 'الممرات'),
  ('LOUNGE',    'استراحة المتدربين',      'المبنى ب', 'الدور الأرضي', 'المساحات المشتركة'),
  ('ROOM-105',  'قاعة التدريب 105',       'المبنى أ', 'الدور الأول',  'القاعات'),
  ('ENTRANCE',  'المدخل الرئيسي',         'المبنى أ', 'الدور الأرضي', 'الاستقبال')
on conflict (code) do nothing;
