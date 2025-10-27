-- Script para verificar las tablas existentes en el proyecto Timecard Pro
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- 1. Mostrar todas las tablas en el esquema público
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Mostrar detalles de las columnas de todas las tablas
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Contar registros en cada tabla (ejecutar después de verificar que las tablas existen)
-- Descomenta las siguientes líneas según las tablas que encuentres:

-- SELECT 'employees' as tabla, COUNT(*) as registros FROM employees
-- UNION ALL
-- SELECT 'offices' as tabla, COUNT(*) as registros FROM offices  
-- UNION ALL
-- SELECT 'vacations' as tabla, COUNT(*) as registros FROM vacations
-- UNION ALL
-- SELECT 'holidays' as tabla, COUNT(*) as registros FROM holidays
-- UNION ALL
-- SELECT 'vacation_cycles' as tabla, COUNT(*) as registros FROM vacation_cycles;

-- 4. Verificar específicamente las tablas principales del proyecto
-- (Ejecutar solo si las tablas existen)

-- Verificar estructura de empleados
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'employees' AND table_schema = 'public';

-- Verificar estructura de oficinas
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'offices' AND table_schema = 'public';

-- Verificar estructura de vacaciones
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'vacations' AND table_schema = 'public';

-- 5. Verificar políticas RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Verificar funciones personalizadas
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 7. Verificar triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;