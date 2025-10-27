-- Script simplificado para crear tablas de asistencia
-- Ejecutar esto primero en Supabase SQL Editor

-- 1. Crear tabla de tipos de asistencia
CREATE TABLE IF NOT EXISTS attendance_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de registros de asistencia
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

-- 3. Insertar tipos de asistencia predeterminados
INSERT INTO attendance_types (code, name, description, color, is_paid, requires_approval, is_system) VALUES
('R', 'Día Regular', 'Día de trabajo normal', '#22c55e', true, false, false),
('I', 'Incapacidad', 'Incapacidad médica', '#ef4444', true, true, false),
('LM', 'Licencia Médica', 'Licencia por motivos médicos', '#f59e0b', true, true, false),
('ANR', 'Ausencia No Remunerada', 'Ausencia sin goce de sueldo', '#6b7280', false, true, false),
('AA', 'Ausencia Administrativa', 'Ausencia por motivos administrativos', '#8b5cf6', true, true, false),
('V', 'Vacaciones', 'Día de vacaciones aprobado', '#06b6d4', true, false, true),
('F', 'Día Festivo', 'Día feriado oficial', '#ec4899', true, false, true),
('D', 'Descanso', 'Día de descanso (domingo)', '#94a3b8', true, false, true)
ON CONFLICT (code) DO NOTHING;

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date 
ON attendance_records(employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_office_date 
ON attendance_records(office_id, attendance_date);