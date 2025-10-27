-- Verificar si las tablas de asistencia existen
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('attendance_types', 'attendance_records', 'monthly_attendance_comments')
ORDER BY tablename;

-- Verificar estructura de attendance_types si existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_types'
ORDER BY ordinal_position;

-- Verificar estructura de attendance_records si existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- Verificar datos en attendance_types si existe
SELECT * FROM attendance_types WHERE is_active = true ORDER BY code;

-- Contar registros en attendance_records si existe
SELECT COUNT(*) as total_records FROM attendance_records;