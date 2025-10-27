-- Script de diagnóstico específico para el empleado con errores
-- ID del empleado: 5a57b123-f483-41d5-91c0-3a0e2405ce25

-- Verificar que el empleado existe
SELECT 
    'EMPLEADO VERIFICACIÓN' as check_type,
    id, 
    name, 
    first_name, 
    last_name, 
    employee_code,
    office_code,
    is_active
FROM employees 
WHERE id = '5a57b123-f483-41d5-91c0-3a0e2405ce25';

-- Verificar tipos de asistencia disponibles
SELECT 
    'TIPOS DE ASISTENCIA' as check_type,
    id,
    code, 
    name, 
    color,
    hours_value,
    is_active
FROM attendance_types 
WHERE is_active = true
ORDER BY code;

-- Verificar registros existentes para este empleado en octubre 2025
SELECT 
    'REGISTROS EXISTENTES' as check_type,
    id,
    employee_id,
    office_id,
    attendance_date,
    attendance_type_id,
    created_at
FROM attendance_records 
WHERE employee_id = '5a57b123-f483-41d5-91c0-3a0e2405ce25'
  AND attendance_date >= '2025-10-01'
  AND attendance_date <= '2025-10-31'
ORDER BY attendance_date;

-- Probar inserción manual de un registro específico
-- Primero obtener el ID del tipo "Día Regular"
WITH regular_type AS (
    SELECT id FROM attendance_types WHERE code = 'R' LIMIT 1
)
INSERT INTO attendance_records (
    employee_id,
    office_id,
    attendance_date,
    attendance_type_id,
    notes
)
SELECT 
    '5a57b123-f483-41d5-91c0-3a0e2405ce25',
    'NLA',
    '2025-10-01',
    regular_type.id,
    'Prueba manual de inserción'
FROM regular_type
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_records 
    WHERE employee_id = '5a57b123-f483-41d5-91c0-3a0e2405ce25' 
    AND attendance_date = '2025-10-01'
);

-- Verificar el resultado de la inserción
SELECT 
    'RESULTADO INSERCIÓN' as check_type,
    *
FROM attendance_records 
WHERE employee_id = '5a57b123-f483-41d5-91c0-3a0e2405ce25'
  AND attendance_date = '2025-10-01';

-- Verificar constraints y foreign keys
SELECT 
    'CONSTRAINTS CHECK' as check_type,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'attendance_records';

-- Verificar si hay problemas con los UUIDs
SELECT 
    'UUID VALIDATION' as check_type,
    '5a57b123-f483-41d5-91c0-3a0e2405ce25'::uuid as employee_uuid_test;

-- Verificar permisos RLS
SELECT 
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'attendance_records';

-- Intentar un UPSERT manual como lo hace la aplicación
WITH regular_type AS (
    SELECT id FROM attendance_types WHERE code = 'R' LIMIT 1
)
INSERT INTO attendance_records (
    employee_id,
    office_id,
    attendance_date,
    attendance_type_id,
    notes,
    updated_at
)
SELECT 
    '5a57b123-f483-41d5-91c0-3a0e2405ce25',
    'NLA',
    '2025-10-02',
    regular_type.id,
    'Prueba UPSERT manual',
    NOW()
FROM regular_type
ON CONFLICT (employee_id, attendance_date) 
DO UPDATE SET 
    attendance_type_id = EXCLUDED.attendance_type_id,
    notes = EXCLUDED.notes,
    updated_at = EXCLUDED.updated_at;

-- Verificar el resultado del UPSERT
SELECT 
    'RESULTADO UPSERT' as check_type,
    id,
    employee_id,
    office_id,
    attendance_date,
    attendance_type_id,
    notes,
    created_at,
    updated_at
FROM attendance_records 
WHERE employee_id = '5a57b123-f483-41d5-91c0-3a0e2405ce25'
  AND attendance_date IN ('2025-10-01', '2025-10-02')
ORDER BY attendance_date;