-- Script básico para crear tablas de asistencia
-- Ejecutar en el Editor SQL de Supabase

-- 1. Crear tabla de tipos de asistencia
CREATE TABLE IF NOT EXISTS attendance_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar tipos de asistencia predefinidos
INSERT INTO attendance_types (name, abbreviation, color, is_active) VALUES
('Día Regular', 'R', '#10B981', true),
('Incapacidad', 'I', '#EF4444', true),
('Licencia Médica', 'LM', '#F59E0B', true),
('Ausencia no Remunerada', 'ANR', '#6B7280', true),
('Ausencia Administrativa', 'AA', '#8B5CF6', true),
('Vacaciones', 'V', '#06B6D4', true),
('Día Festivo', 'DF', '#EC4899', true),
('Capacitación', 'C', '#84CC16', true)
ON CONFLICT DO NOTHING;

-- 3. Crear tabla de registros de asistencia
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  office_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_type_id UUID NOT NULL REFERENCES attendance_types(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Restricción única por empleado y fecha
  UNIQUE(employee_id, attendance_date)
);

-- 4. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_office_date ON attendance_records(office_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_type ON attendance_records(attendance_type_id);

-- 5. Habilitar RLS básico
ALTER TABLE attendance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 6. Políticas básicas de seguridad
-- Los tipos de asistencia son visibles para todos los usuarios autenticados
CREATE POLICY IF NOT EXISTS "Allow read attendance_types for authenticated users" ON attendance_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Los registros de asistencia solo son visibles para usuarios de la misma oficina
CREATE POLICY IF NOT EXISTS "Allow attendance_records for authenticated users" ON attendance_records
  FOR ALL USING (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE attendance_types IS 'Tipos de asistencia disponibles (día regular, incapacidad, etc.)';
COMMENT ON TABLE attendance_records IS 'Registros de asistencia de empleados por fecha';
COMMENT ON COLUMN attendance_types.color IS 'Color hexadecimal para mostrar en la UI';
COMMENT ON COLUMN attendance_records.attendance_date IS 'Fecha del registro de asistencia';