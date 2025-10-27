-- Script de verificación rápida de tablas - Timecard Pro
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- PASO 2: Si encuentras tablas, ejecuta este bloque para ver su contenido
-- (Descomenta según las tablas que veas en el PASO 1)

-- Verificar empleados
-- SELECT COUNT(*) as total_empleados FROM employees;
-- SELECT * FROM employees LIMIT 5;

-- Verificar oficinas  
-- SELECT COUNT(*) as total_oficinas FROM offices;
-- SELECT * FROM offices;

-- Verificar vacaciones
-- SELECT COUNT(*) as total_vacaciones FROM vacations;
-- SELECT * FROM vacations LIMIT 5;

-- Verificar días festivos
-- SELECT COUNT(*) as total_holidays FROM holidays;
-- SELECT * FROM holidays LIMIT 5;

-- PASO 3: Verificar estructura específica de una tabla (ejemplo: employees)
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'employees' 
-- ORDER BY ordinal_position;