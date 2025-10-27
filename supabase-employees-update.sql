-- =====================================================
-- ACTUALIZACIÓN: MEJORAS AL SISTEMA DE EMPLEADOS
-- =====================================================

-- 1. Agregar nuevos campos a la tabla employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS employee_comments TEXT,
ADD COLUMN IF NOT EXISTS office_tag VARCHAR(10);

-- 2. Crear tipo enum para puestos si no existe
DO $$ BEGIN
    CREATE TYPE employee_position AS ENUM ('analista', 'supervisor', 'spoc');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Modificar la columna position para usar el enum (si ya existe, convertir)
DO $$ 
BEGIN
    -- Intentar cambiar el tipo de la columna position
    ALTER TABLE employees ALTER COLUMN position TYPE employee_position USING position::employee_position;
EXCEPTION
    WHEN others THEN
        -- Si falla, actualizar valores existentes y luego cambiar tipo
        UPDATE employees SET position = 'analista' WHERE LOWER(position) LIKE '%analista%';
        UPDATE employees SET position = 'supervisor' WHERE LOWER(position) LIKE '%supervisor%';
        UPDATE employees SET position = 'spoc' WHERE LOWER(position) LIKE '%spoc%';
        ALTER TABLE employees ALTER COLUMN position TYPE employee_position USING position::employee_position;
END $$;

-- 4. Crear índices para el número de empleado y búsquedas
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_office_tag ON employees(office_tag);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

-- 3. Actualizar empleados existentes para agregar el tag de oficina
-- Esto agrega el código de oficina como sufijo al nombre
UPDATE employees e
SET office_tag = o.code
FROM offices o
WHERE e.office_id = o.id AND e.office_tag IS NULL;

-- 4. Función para generar automáticamente el siguiente número de empleado por oficina
CREATE OR REPLACE FUNCTION generate_employee_number(p_office_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_office_code VARCHAR(10);
    v_next_number INTEGER;
    v_employee_number VARCHAR(50);
BEGIN
    -- Obtener el código de la oficina
    SELECT code INTO v_office_code
    FROM offices
    WHERE id = p_office_id;
    
    -- Obtener el siguiente número disponible para esta oficina
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM employees
    WHERE office_id = p_office_id
    AND employee_number ~ ('^' || v_office_code || '-[0-9]+$');
    
    -- Formatear el número con 4 dígitos
    v_employee_number := v_office_code || '-' || LPAD(v_next_number::TEXT, 4, '0');
    
    RETURN v_employee_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para agregar tag de oficina al nombre del empleado
CREATE OR REPLACE FUNCTION add_office_tag_to_name(p_name VARCHAR, p_office_code VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    -- Si el nombre ya tiene el tag, no lo agregamos de nuevo
    IF p_name ~ (p_office_code || '$') THEN
        RETURN p_name;
    ELSE
        RETURN p_name || ' ' || UPPER(p_office_code);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para agregar automáticamente el tag y número de empleado al insertar
CREATE OR REPLACE FUNCTION add_employee_metadata()
RETURNS TRIGGER AS $$
DECLARE
    v_office_code VARCHAR(10);
BEGIN
    -- Obtener el código de la oficina
    SELECT code INTO v_office_code
    FROM offices
    WHERE id = NEW.office_id;
    
    -- Agregar tag de oficina si no existe
    IF NEW.office_tag IS NULL THEN
        NEW.office_tag := v_office_code;
    END IF;
    
    -- Generar número de empleado si no existe
    IF NEW.employee_number IS NULL OR NEW.employee_number = '' THEN
        NEW.employee_number := generate_employee_number(NEW.office_id);
    END IF;
    
    -- Agregar tag al nombre si no lo tiene
    IF NEW.name IS NOT NULL AND NOT (NEW.name ~ (v_office_code || '$')) THEN
        NEW.name := add_office_tag_to_name(NEW.name, v_office_code);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_add_employee_metadata ON employees;
CREATE TRIGGER trigger_add_employee_metadata
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION add_employee_metadata();

-- 7. Vista para obtener empleados con información completa
CREATE OR REPLACE VIEW v_employees_complete AS
SELECT 
    e.id,
    e.office_id,
    o.code as office_code,
    o.name as office_name,
    e.employee_code,
    e.employee_number,
    e.first_name,
    e.last_name,
    e.name,
    e.office_tag,
    e.email,
    e.phone,
    e.position,
    e.department,
    e.hire_date,
    e.birth_date,
    e.employee_comments,
    e.is_active,
    e.created_at,
    e.updated_at,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service
FROM employees e
JOIN offices o ON e.office_id = o.id;

-- 8. Función para buscar empleados por oficina
CREATE OR REPLACE FUNCTION search_employees_by_office(
    p_office_id UUID,
    p_search_term VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    employee_number VARCHAR,
    position VARCHAR,
    hire_date DATE,
    years_of_service NUMERIC,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.employee_number,
        e.position,
        e.hire_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service,
        e.is_active
    FROM employees e
    WHERE e.office_id = p_office_id
    AND (
        p_search_term IS NULL 
        OR e.name ILIKE '%' || p_search_term || '%'
        OR e.employee_number ILIKE '%' || p_search_term || '%'
        OR e.position ILIKE '%' || p_search_term || '%'
    )
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
/*
Este script agrega:

1. NUEVOS CAMPOS:
   - employee_number: Número único de empleado por oficina
   - hire_date: Fecha de ingreso del empleado
   - employee_comments: Comentarios sobre el empleado
   - office_tag: Etiqueta de oficina (código)

2. FUNCIONES AUTOMÁTICAS:
   - Generación automática de número de empleado
   - Adición automática del tag de oficina al nombre
   - Búsqueda mejorada de empleados

3. CARACTERÍSTICAS:
   - Números de empleado en formato: TIJ-0001, NLA-0001, etc.
   - Tags agregados automáticamente: "Luis Acuña NLA"
   - Cálculo automático de años de servicio
   - Vista completa con información de oficina

PRÓXIMOS PASOS:
1. Ejecutar este script en Supabase
2. Actualizar la interfaz de empleados en Next.js
3. Crear formulario de captura manual mejorado
*/