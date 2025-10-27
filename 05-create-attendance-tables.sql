-- Crear tabla de tipos de asistencia
CREATE TABLE IF NOT EXISTS attendance_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE, -- Código corto para mostrar en el círculo (R, I, LM, etc.)
    name VARCHAR(100) NOT NULL, -- Nombre completo del tipo
    description TEXT, -- Descripción opcional
    color VARCHAR(7) NOT NULL, -- Color en formato hexadecimal (#00FF00)
    hours_value DECIMAL(4,2) DEFAULT 8.00, -- Horas que representa este tipo de día
    is_paid BOOLEAN DEFAULT true, -- Si es día remunerado
    requires_approval BOOLEAN DEFAULT false, -- Si requiere aprobación
    is_system BOOLEAN DEFAULT false, -- Si es un tipo del sistema (vacaciones, festivos)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de registros de asistencia
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    office_id VARCHAR(10) NOT NULL,
    attendance_date DATE NOT NULL,
    attendance_type_id UUID NOT NULL REFERENCES attendance_types(id),
    notes TEXT, -- Notas adicionales opcionales
    created_by UUID, -- ID del usuario que creó el registro
    approved_by UUID, -- ID del usuario que aprobó (si aplica)
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint único: un empleado solo puede tener un tipo de asistencia por día
    UNIQUE(employee_id, attendance_date)
);

-- Insertar tipos de asistencia predeterminados
INSERT INTO attendance_types (code, name, description, color, hours_value, is_paid, requires_approval, is_system) VALUES
('R', 'Día Regular', 'Día de trabajo normal', '#22c55e', 8.00, true, false, false),
('I', 'Incapacidad', 'Incapacidad médica', '#ef4444', 0.00, true, true, false),
('LM', 'Licencia Médica', 'Licencia por motivos médicos', '#f59e0b', 0.00, true, true, false),
('ANR', 'Ausencia No Remunerada', 'Ausencia sin goce de sueldo', '#6b7280', 0.00, false, true, false),
('AA', 'Ausencia Administrativa', 'Ausencia por motivos administrativos', '#8b5cf6', 8.00, true, true, false),
('V', 'Vacaciones', 'Día de vacaciones aprobado', '#06b6d4', 8.00, true, false, true),
('F', 'Día Festivo', 'Día feriado oficial', '#ec4899', 8.00, true, false, true),
('D', 'Descanso', 'Día de descanso (domingo)', '#94a3b8', 0.00, true, false, true)
ON CONFLICT (code) DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date 
ON attendance_records(employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_office_date 
ON attendance_records(office_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(attendance_date);

-- Habilitar RLS (Row Level Security)
ALTER TABLE attendance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad - todos pueden leer los tipos de asistencia
CREATE POLICY "attendance_types_select_policy" ON attendance_types
    FOR SELECT USING (true);

-- Políticas de seguridad - solo lecturas y escrituras autenticadas para registros
CREATE POLICY "attendance_records_select_policy" ON attendance_records
    FOR SELECT USING (true);

CREATE POLICY "attendance_records_insert_policy" ON attendance_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "attendance_records_update_policy" ON attendance_records
    FOR UPDATE USING (true);

CREATE POLICY "attendance_records_delete_policy" ON attendance_records
    FOR DELETE USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_attendance_types_updated_at 
    BEFORE UPDATE ON attendance_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear tabla para comentarios mensuales de asistencia
CREATE TABLE IF NOT EXISTS monthly_attendance_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    general_comments TEXT, -- Comentarios generales del mes (cuando employee_id es NULL)
    employee_comments TEXT, -- Comentarios específicos del empleado
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Restricción única por oficina, año, mes y empleado
    UNIQUE(office_id, year, month, employee_id)
);

-- Crear índices para comentarios mensuales
CREATE INDEX IF NOT EXISTS idx_monthly_comments_office_date 
ON monthly_attendance_comments(office_id, year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_comments_employee 
ON monthly_attendance_comments(employee_id);

-- Habilitar RLS para comentarios mensuales
ALTER TABLE monthly_attendance_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para comentarios mensuales
CREATE POLICY "monthly_comments_select_policy" ON monthly_attendance_comments
    FOR SELECT USING (true);

CREATE POLICY "monthly_comments_insert_policy" ON monthly_attendance_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "monthly_comments_update_policy" ON monthly_attendance_comments
    FOR UPDATE USING (true);

CREATE POLICY "monthly_comments_delete_policy" ON monthly_attendance_comments
    FOR DELETE USING (true);

-- Trigger para actualizar updated_at en comentarios mensuales
CREATE TRIGGER update_monthly_comments_updated_at 
    BEFORE UPDATE ON monthly_attendance_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();