-- Script para agregar columna office_code a la tabla employees
-- Esta columna almacenará el código de la oficina donde está registrado el empleado

-- Agregar la columna office_code
ALTER TABLE employees 
ADD COLUMN office_code VARCHAR(10);

-- Agregar comentario a la columna
COMMENT ON COLUMN employees.office_code IS 'Código de la oficina donde está registrado el empleado (TIJ, CDJ, CDMX, NVL, MTY, MAM, HMO, MID)';

-- Crear índice para mejorar consultas por office_code
CREATE INDEX idx_employees_office_code ON employees(office_code);

-- Opcional: Actualizar registros existentes basándose en employee_code si existe
-- (esto es solo si ya tienes datos y quieres migrarlos)
UPDATE employees 
SET office_code = 
  CASE 
    WHEN employee_code LIKE 'TIJ%' THEN 'TIJ'
    WHEN employee_code LIKE 'CDJ%' THEN 'CDJ'
    WHEN employee_code LIKE 'CDMX%' THEN 'CDMX'
    WHEN employee_code LIKE 'NVL%' THEN 'NVL'
    WHEN employee_code LIKE 'MTY%' THEN 'MTY'
    WHEN employee_code LIKE 'MAM%' THEN 'MAM'
    WHEN employee_code LIKE 'HMO%' THEN 'HMO'
    WHEN employee_code LIKE 'MID%' THEN 'MID'
    ELSE NULL
  END
WHERE office_code IS NULL AND employee_code IS NOT NULL;

-- Verificar los cambios
SELECT office_code, COUNT(*) as total_empleados 
FROM employees 
WHERE office_code IS NOT NULL
GROUP BY office_code 
ORDER BY office_code;