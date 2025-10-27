-- Script para verificar la estructura de la tabla employees
-- Ejecuta estas consultas una por una en tu consola de Supabase

-- 1. Ver la estructura de la tabla employees
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;

-- 2. Ver algunos registros de ejemplo para entender la estructura real
SELECT * FROM employees LIMIT 3;

-- 3. Contar cuántos empleados hay por oficina (si existe office_code)
SELECT 
    office_code, 
    COUNT(*) as total_empleados 
FROM employees 
WHERE office_code IS NOT NULL
GROUP BY office_code 
ORDER BY office_code;

-- 4. Ver todos los campos de un empleado específico
SELECT * FROM employees WHERE id IS NOT NULL LIMIT 1;