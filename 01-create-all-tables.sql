-- ============================================
-- TIMECARD PRO - SCRIPT COMPLETO DE INSTALACIÓN
-- Base de datos completa para sistema de control de asistencia
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. ELIMINAR TABLAS EXISTENTES (si las hay)
DROP TABLE IF EXISTS vacation_requests CASCADE;
DROP TABLE IF EXISTS vacation_cycles CASCADE;
DROP TABLE IF EXISTS vacations CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS ex_employees CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS offices CASCADE;

-- 2. CREAR TABLA DE OFICINAS
CREATE TABLE offices (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    manager VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'America/Tijuana',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREAR TABLA DE EMPLEADOS
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    position VARCHAR(100) DEFAULT 'analista',
    hire_date DATE NOT NULL,
    office_code VARCHAR(10) NOT NULL,
    salary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (office_code) REFERENCES offices(code) ON DELETE CASCADE
);

-- 4. CREAR TABLA DE EX-EMPLEADOS
CREATE TABLE ex_employees (
    id SERIAL PRIMARY KEY,
    employee_number VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    termination_date DATE NOT NULL,
    termination_reason VARCHAR(500),
    office_code VARCHAR(10) NOT NULL,
    salary DECIMAL(10,2),
    notes TEXT,
    original_employee_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CREAR TABLA DE DÍAS FESTIVOS
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    office_code VARCHAR(10),
    is_national BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (office_code) REFERENCES offices(code) ON DELETE CASCADE
);

-- 6. CREAR TABLA DE CICLOS DE VACACIONES
CREATE TABLE vacation_cycles (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    cycle_year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER NOT NULL,
    is_expired BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, cycle_year)
);

-- 7. CREAR TABLA DE VACACIONES
CREATE TABLE vacations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    vacation_cycle_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'approved',
    reason TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (vacation_cycle_id) REFERENCES vacation_cycles(id) ON DELETE CASCADE
);

-- 8. CREAR TABLA DE SOLICITUDES DE VACACIONES (OPCIONAL)
CREATE TABLE vacation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 9. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX idx_employees_office_code ON employees(office_code);
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_vacations_employee_id ON vacations(employee_id);
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);
CREATE INDEX idx_vacation_cycles_employee ON vacation_cycles(employee_id);
CREATE INDEX idx_vacation_cycles_year ON vacation_cycles(cycle_year);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_office ON holidays(office_code);

-- 10. CREAR TRIGGERS PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vacation_cycles_updated_at BEFORE UPDATE ON vacation_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vacations_updated_at BEFORE UPDATE ON vacations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ex_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;

-- 12. CREAR POLÍTICAS RLS BÁSICAS (PERMITIR TODO POR AHORA)
-- Políticas para offices
CREATE POLICY "Allow all operations on offices" ON offices FOR ALL USING (true);

-- Políticas para employees
CREATE POLICY "Allow all operations on employees" ON employees FOR ALL USING (true);

-- Políticas para ex_employees
CREATE POLICY "Allow all operations on ex_employees" ON ex_employees FOR ALL USING (true);

-- Políticas para holidays
CREATE POLICY "Allow all operations on holidays" ON holidays FOR ALL USING (true);

-- Políticas para vacation_cycles
CREATE POLICY "Allow all operations on vacation_cycles" ON vacation_cycles FOR ALL USING (true);

-- Políticas para vacations
CREATE POLICY "Allow all operations on vacations" ON vacations FOR ALL USING (true);

-- Políticas para vacation_requests
CREATE POLICY "Allow all operations on vacation_requests" ON vacation_requests FOR ALL USING (true);

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================

-- Verificar que todas las tablas se crearon correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('offices', 'employees', 'ex_employees', 'holidays', 'vacation_cycles', 'vacations', 'vacation_requests')
ORDER BY table_name;