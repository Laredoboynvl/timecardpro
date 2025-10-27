-- Script simplificado para reparar tabla attendance_types existente
-- Usar este script si el principal falla

-- Paso 1: Agregar columnas faltantes a attendance_types
ALTER TABLE attendance_types ADD COLUMN IF NOT EXISTS hours_value DECIMAL(4,2) DEFAULT 8.00;
ALTER TABLE attendance_types ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true;
ALTER TABLE attendance_types ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE attendance_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE attendance_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Paso 2: Actualizar tipos existentes con valores de horas
UPDATE attendance_types SET hours_value = 8.00 WHERE code IN ('R', 'AA', 'V', 'F') AND hours_value IS NULL;
UPDATE attendance_types SET hours_value = 0.00 WHERE code IN ('I', 'LM', 'ANR', 'D') AND hours_value IS NULL;

-- Paso 3: Insertar tipos faltantes uno por uno (esto es más seguro)
INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'R', 'Día Regular', 'Día de trabajo normal', '#22c55e', 8.00, true, false, false
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'R');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'I', 'Incapacidad', 'Incapacidad médica', '#ef4444', 0.00, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'I');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'LM', 'Licencia Médica', 'Licencia por motivos médicos', '#f59e0b', 0.00, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'LM');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'ANR', 'Ausencia No Remunerada', 'Ausencia sin goce de sueldo', '#6b7280', 0.00, false, true, false
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'ANR');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'AA', 'Ausencia Administrativa', 'Ausencia por motivos administrativos', '#8b5cf6', 8.00, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'AA');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'V', 'Vacaciones', 'Día de vacaciones aprobado', '#06b6d4', 8.00, true, false, true
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'V');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'F', 'Día Festivo', 'Día feriado oficial', '#ec4899', 8.00, true, false, true
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'F');

INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system)
SELECT 'D', 'Descanso', 'Día de descanso (domingo)', '#94a3b8', 0.00, true, false, true
WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE code = 'D');

-- Paso 4: Crear tabla attendance_records si no existe
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    office_id VARCHAR(10) NOT NULL,
    attendance_date DATE NOT NULL,
    attendance_type_id UUID NOT NULL REFERENCES attendance_types(id),
    notes TEXT,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- Paso 5: Crear tabla monthly_attendance_comments si no existe
CREATE TABLE IF NOT EXISTS monthly_attendance_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    general_comments TEXT,
    employee_comments TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(office_id, year, month, employee_id)
);

-- Paso 6: Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_office_date ON attendance_records(office_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_monthly_comments_office_date ON monthly_attendance_comments(office_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_comments_employee ON monthly_attendance_comments(employee_id);

-- Paso 7: Habilitar RLS
ALTER TABLE attendance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_attendance_comments ENABLE ROW LEVEL SECURITY;

-- Paso 8: Crear políticas básicas
DROP POLICY IF EXISTS "attendance_types_select_policy" ON attendance_types;
CREATE POLICY "attendance_types_select_policy" ON attendance_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "attendance_records_select_policy" ON attendance_records;
CREATE POLICY "attendance_records_select_policy" ON attendance_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "attendance_records_insert_policy" ON attendance_records;
CREATE POLICY "attendance_records_insert_policy" ON attendance_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_records_update_policy" ON attendance_records;
CREATE POLICY "attendance_records_update_policy" ON attendance_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "attendance_records_delete_policy" ON attendance_records;
CREATE POLICY "attendance_records_delete_policy" ON attendance_records FOR DELETE USING (true);

DROP POLICY IF EXISTS "monthly_comments_select_policy" ON monthly_attendance_comments;
CREATE POLICY "monthly_comments_select_policy" ON monthly_attendance_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "monthly_comments_insert_policy" ON monthly_attendance_comments;
CREATE POLICY "monthly_comments_insert_policy" ON monthly_attendance_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_comments_update_policy" ON monthly_attendance_comments;
CREATE POLICY "monthly_comments_update_policy" ON monthly_attendance_comments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "monthly_comments_delete_policy" ON monthly_attendance_comments;
CREATE POLICY "monthly_comments_delete_policy" ON monthly_attendance_comments FOR DELETE USING (true);

-- Paso 9: Crear función y triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_attendance_types_updated_at ON attendance_types;
CREATE TRIGGER update_attendance_types_updated_at 
    BEFORE UPDATE ON attendance_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_comments_updated_at ON monthly_attendance_comments;
CREATE TRIGGER update_monthly_comments_updated_at 
    BEFORE UPDATE ON monthly_attendance_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificación final
SELECT 'Configuración completada' as status;
SELECT code, name, color, hours_value FROM attendance_types ORDER BY code;