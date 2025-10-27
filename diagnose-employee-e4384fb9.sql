-- Script de diagnóstico específico para el empleado con errores
-- ID del empleado: e4384fb9-3383-4160-a29e-e205007d1f12

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
WHERE id = 'e4384fb9-3383-4160-a29e-e205007d1f12';

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
WHERE employee_id = 'e4384fb9-3383-4160-a29e-e205007d1f12'
  AND attendance_date >= '2025-10-01'
  AND attendance_date <= '2025-10-31'
ORDER BY attendance_date;

-- Intentar un UPSERT manual como lo hace la aplicación para la fecha específica del error
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
    'e4384fb9-3383-4160-a29e-e205007d1f12',
    'NLA',
    '2025-10-03',
    regular_type.id,
    'Prueba UPSERT manual para fecha específica del error',
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
WHERE employee_id = 'e4384fb9-3383-4160-a29e-e205007d1f12'
  AND attendance_date = '2025-10-03';

-- Verificar constraints específicos
SELECT 
    'CONSTRAINTS CHECK' as check_type,
    constraint_name,
    constraint_type,
    table_name,
    is_deferrable,
    initially_deferred
FROM information_schema.table_constraints 
WHERE table_name = 'attendance_records'
ORDER BY constraint_type, constraint_name;