-- Script SQL para crear las tablas de gestión de vacaciones
-- Ejecutar este script en el editor SQL de Supabase

-- Verificar y agregar columna 'name' si no existe (para compatibilidad)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'name') THEN
        ALTER TABLE employees ADD COLUMN name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
    END IF;
END $$;

-- Tabla: vacation_requests
-- Almacena todas las solicitudes de vacaciones de los empleados
CREATE TABLE IF NOT EXISTS vacation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    office_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL CHECK (days_requested > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
    reason TEXT,
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Índices para vacation_requests
CREATE INDEX IF NOT EXISTS idx_vacation_requests_employee ON vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_office ON vacation_requests(office_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests(start_date, end_date);

-- Tabla: vacation_cycles
-- Almacena los ciclos de vacaciones de cada empleado
-- Un empleado puede tener múltiples ciclos activos según los años de servicio
CREATE TABLE IF NOT EXISTS vacation_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    days_earned INTEGER NOT NULL CHECK (days_earned > 0),
    days_used INTEGER NOT NULL DEFAULT 0 CHECK (days_used >= 0),
    days_available INTEGER NOT NULL CHECK (days_available >= 0),
    years_of_service INTEGER NOT NULL CHECK (years_of_service > 0),
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_cycle_dates CHECK (cycle_end_date > cycle_start_date),
    CONSTRAINT valid_days_logic CHECK (days_available = days_earned - days_used)
);

-- Índices para vacation_cycles
CREATE INDEX IF NOT EXISTS idx_vacation_cycles_employee ON vacation_cycles(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_cycles_dates ON vacation_cycles(cycle_start_date, cycle_end_date);
CREATE INDEX IF NOT EXISTS idx_vacation_cycles_expired ON vacation_cycles(is_expired);

-- Trigger para actualizar updated_at en vacation_requests
CREATE OR REPLACE FUNCTION update_vacation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vacation_requests_updated_at
    BEFORE UPDATE ON vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_requests_updated_at();

-- Trigger para actualizar updated_at en vacation_cycles
CREATE OR REPLACE FUNCTION update_vacation_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vacation_cycles_updated_at
    BEFORE UPDATE ON vacation_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_cycles_updated_at();

-- Trigger para marcar ciclos como expirados automáticamente
-- Se ejecuta cuando se actualiza o inserta un ciclo
CREATE OR REPLACE FUNCTION check_vacation_cycle_expiration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cycle_end_date < CURRENT_DATE THEN
        NEW.is_expired = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_vacation_cycle_expiration
    BEFORE INSERT OR UPDATE ON vacation_cycles
    FOR EACH ROW
    EXECUTE FUNCTION check_vacation_cycle_expiration();

-- Comentarios en las tablas para documentación
COMMENT ON TABLE vacation_requests IS 'Almacena las solicitudes de vacaciones de los empleados';
COMMENT ON COLUMN vacation_requests.status IS 'Estados: pending (pendiente), approved (aprobada), rejected (rechazada), in_progress (en curso), completed (completada)';
COMMENT ON COLUMN vacation_requests.days_requested IS 'Número de días solicitados para las vacaciones';

COMMENT ON TABLE vacation_cycles IS 'Almacena los ciclos de vacaciones de cada empleado. Cada ciclo tiene vigencia de 1.5 años desde el aniversario';
COMMENT ON COLUMN vacation_cycles.days_earned IS 'Días de vacaciones ganados según años de servicio (12-32 días según LFT)';
COMMENT ON COLUMN vacation_cycles.days_used IS 'Días de vacaciones ya utilizados en este ciclo';
COMMENT ON COLUMN vacation_cycles.days_available IS 'Días de vacaciones disponibles (earned - used)';
COMMENT ON COLUMN vacation_cycles.is_expired IS 'Indica si el ciclo ha expirado (después de 1.5 años)';

-- RLS (Row Level Security) - Opcional pero recomendado
-- Descomentar si se usa autenticación de Supabase

-- ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vacation_cycles ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view vacation requests from their office"
--     ON vacation_requests FOR SELECT
--     USING (auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can insert vacation requests"
--     ON vacation_requests FOR INSERT
--     WITH CHECK (auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can update vacation requests from their office"
--     ON vacation_requests FOR UPDATE
--     USING (auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can view vacation cycles"
--     ON vacation_cycles FOR SELECT
--     USING (auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can manage vacation cycles"
--     ON vacation_cycles FOR ALL
--     USING (auth.uid() IS NOT NULL);

-- Vista útil: Resumen de vacaciones por empleado
CREATE OR REPLACE VIEW vacation_summary AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.hire_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service,
    COALESCE(SUM(vc.days_earned), 0) as total_days_earned,
    COALESCE(SUM(vc.days_used), 0) as total_days_used,
    COALESCE(SUM(vc.days_available), 0) as total_days_available,
    COUNT(DISTINCT vc.id) FILTER (WHERE vc.is_expired = FALSE) as active_cycles,
    COUNT(DISTINCT vr.id) FILTER (WHERE vr.status = 'pending') as pending_requests,
    COUNT(DISTINCT vr.id) FILTER (WHERE vr.status = 'approved') as approved_requests
FROM employees e
LEFT JOIN vacation_cycles vc ON e.id = vc.employee_id
LEFT JOIN vacation_requests vr ON e.id = vr.employee_id
GROUP BY e.id, e.name, e.hire_date;

COMMENT ON VIEW vacation_summary IS 'Vista consolidada del estado de vacaciones de cada empleado';

-- Función útil: Obtener días de vacaciones según años de servicio
CREATE OR REPLACE FUNCTION get_vacation_days_by_years(years_of_service INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE
        WHEN years_of_service = 1 THEN 12
        WHEN years_of_service = 2 THEN 14
        WHEN years_of_service = 3 THEN 16
        WHEN years_of_service = 4 THEN 18
        WHEN years_of_service = 5 THEN 20
        WHEN years_of_service BETWEEN 6 AND 10 THEN 22
        WHEN years_of_service BETWEEN 11 AND 15 THEN 24
        WHEN years_of_service BETWEEN 16 AND 20 THEN 26
        WHEN years_of_service BETWEEN 21 AND 25 THEN 28
        WHEN years_of_service BETWEEN 26 AND 30 THEN 30
        WHEN years_of_service >= 31 THEN 32
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_vacation_days_by_years IS 'Calcula los días de vacaciones según la Ley Federal del Trabajo de México';

-- Script completado
-- Verificar creación de tablas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'vacation%';
