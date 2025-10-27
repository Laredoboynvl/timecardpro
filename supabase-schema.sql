-- =====================================================
-- TIMECARD PRO - ESQUEMA COMPLETO DE BASE DE DATOS
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: companies (Empresas)
-- =====================================================
CREATE TABLE companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: offices (Oficinas)
-- =====================================================
CREATE TABLE offices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_name VARCHAR(255),
    manager_email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: employees (Empleados)
-- =====================================================
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    position VARCHAR(255),
    department VARCHAR(255),
    hire_date DATE,
    birth_date DATE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    salary DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: work_schedules (Horarios de Trabajo)
-- =====================================================
CREATE TABLE work_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    monday_start TIME,
    monday_end TIME,
    tuesday_start TIME,
    tuesday_end TIME,
    wednesday_start TIME,
    wednesday_end TIME,
    thursday_start TIME,
    thursday_end TIME,
    friday_start TIME,
    friday_end TIME,
    saturday_start TIME,
    saturday_end TIME,
    sunday_start TIME,
    sunday_end TIME,
    break_duration INTEGER DEFAULT 0, -- minutos
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: attendance (Registro de Asistencia)
-- =====================================================
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    break_start_time TIMESTAMP WITH TIME ZONE,
    break_end_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    regular_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late, early_departure
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- =====================================================
-- TABLA: time_off_types (Tipos de Ausencias)
-- =====================================================
CREATE TABLE time_off_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_paid BOOLEAN DEFAULT false,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: time_off_requests (Solicitudes de Ausencia)
-- =====================================================
CREATE TABLE time_off_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES time_off_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: employee_notes (Notas de Empleados)
-- =====================================================
CREATE TABLE employee_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES employees(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    category VARCHAR(100), -- performance, disciplinary, recognition, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: payroll_periods (Períodos de Nómina)
-- =====================================================
CREATE TABLE payroll_periods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pay_date DATE,
    status VARCHAR(20) DEFAULT 'draft', -- draft, processing, completed, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: payroll_entries (Entradas de Nómina)
-- =====================================================
CREATE TABLE payroll_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    regular_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    gross_pay DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_period_id, employee_id)
);

-- =====================================================
-- TABLA: users (Usuarios del Sistema)
-- =====================================================
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'employee', -- admin, manager, hr, employee
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_offices_company_id ON offices(company_id);
CREATE INDEX idx_employees_office_id ON employees(office_id);
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_work_schedules_employee_id ON work_schedules(employee_id);
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_time_off_requests_employee_id ON time_off_requests(employee_id);
CREATE INDEX idx_employee_notes_employee_id ON employee_notes(employee_id);
CREATE INDEX idx_payroll_entries_period_id ON payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_employee_id ON payroll_entries(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON work_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_types_updated_at BEFORE UPDATE ON time_off_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_notes_updated_at BEFORE UPDATE ON employee_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_entries_updated_at BEFORE UPDATE ON payroll_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN PARA CALCULAR HORAS TRABAJADAS
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_work_hours(
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0
)
RETURNS DECIMAL AS $$
DECLARE
    total_minutes INTEGER;
    work_hours DECIMAL(5,2);
BEGIN
    IF clock_in IS NULL OR clock_out IS NULL THEN
        RETURN 0;
    END IF;
    
    total_minutes := EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 - COALESCE(break_minutes, 0);
    
    IF total_minutes < 0 THEN
        total_minutes := 0;
    END IF;
    
    work_hours := total_minutes::DECIMAL / 60;
    
    RETURN ROUND(work_hours, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR HORAS EN ATTENDANCE
-- =====================================================
CREATE OR REPLACE FUNCTION update_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
    break_minutes INTEGER := 0;
BEGIN
    -- Calcular minutos de break si existen
    IF NEW.break_start_time IS NOT NULL AND NEW.break_end_time IS NOT NULL THEN
        break_minutes := EXTRACT(EPOCH FROM (NEW.break_end_time - NEW.break_start_time)) / 60;
    END IF;
    
    -- Calcular total de horas
    NEW.total_hours := calculate_work_hours(NEW.clock_in_time, NEW.clock_out_time, break_minutes);
    
    -- Calcular horas regulares y extras (asumiendo 8 horas como jornada normal)
    IF NEW.total_hours <= 8 THEN
        NEW.regular_hours := NEW.total_hours;
        NEW.overtime_hours := 0;
    ELSE
        NEW.regular_hours := 8;
        NEW.overtime_hours := NEW.total_hours - 8;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular horas automáticamente
CREATE TRIGGER calculate_attendance_hours 
    BEFORE INSERT OR UPDATE ON attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_attendance_hours();

-- =====================================================
-- RLS (ROW LEVEL SECURITY) - OPCIONAL
-- =====================================================

-- Habilitar RLS en las tablas principales
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Ejemplo de política RLS (descomentar si necesitas seguridad a nivel de fila)
-- CREATE POLICY "Users can view their own company data" ON companies
--     FOR SELECT USING (auth.uid() IN (
--         SELECT u.id FROM users u 
--         JOIN employees e ON u.employee_id = e.id 
--         JOIN offices o ON e.office_id = o.id 
--         WHERE o.company_id = companies.id
--     ));

-- =====================================================
-- DATOS INICIALES DE EJEMPLO
-- =====================================================

-- Insertar tipos de ausencias básicos
INSERT INTO time_off_types (id, company_id, name, description, is_paid, max_days_per_year, requires_approval) 
SELECT 
    uuid_generate_v4(),
    c.id,
    'Vacaciones',
    'Días de vacaciones anuales',
    true,
    15,
    true
FROM companies c;

INSERT INTO time_off_types (id, company_id, name, description, is_paid, max_days_per_year, requires_approval)
SELECT 
    uuid_generate_v4(),
    c.id,
    'Enfermedad',
    'Días por enfermedad',
    true,
    10,
    false
FROM companies c;

INSERT INTO time_off_types (id, company_id, name, description, is_paid, max_days_per_year, requires_approval)
SELECT 
    uuid_generate_v4(),
    c.id,
    'Asuntos Personales',
    'Días por asuntos personales',
    false,
    5,
    true
FROM companies c;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
/*
Este esquema incluye:

1. TABLAS PRINCIPALES:
   - companies: Gestión multi-empresa
   - offices: Múltiples oficinas por empresa
   - employees: Empleados con información completa
   - work_schedules: Horarios personalizados por empleado
   - attendance: Registro detallado de asistencia
   - time_off_types y time_off_requests: Gestión de ausencias
   - employee_notes: Sistema de notas y evaluaciones
   - payroll_periods y payroll_entries: Gestión básica de nómina
   - users: Sistema de usuarios y autenticación

2. CARACTERÍSTICAS:
   - UUIDs como claves primarias
   - Timestamps automáticos
   - Cálculo automático de horas trabajadas
   - Índices para optimización
   - Funciones auxiliares
   - Estructura preparada para RLS de Supabase

3. PARA USAR:
   - Ejecuta este script completo en el SQL Editor de Supabase
   - Configura las políticas RLS según tus necesidades
   - Ajusta los tipos de ausencias según tu empresa
   - Personaliza los campos según tus requerimientos específicos

4. PRÓXIMOS PASOS:
   - Configurar autenticación en Supabase
   - Implementar políticas de seguridad RLS
   - Crear vistas para reportes complejos
   - Agregar más funciones de negocio específicas
*/