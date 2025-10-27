-- Crear tabla ex_employees si no existe
CREATE TABLE IF NOT EXISTS ex_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  employee_code VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  termination_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_reason TEXT,
  original_employee_id UUID, -- Referencia al empleado original
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_ex_employees_office_id ON ex_employees(office_id);
CREATE INDEX IF NOT EXISTS idx_ex_employees_employee_code ON ex_employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_ex_employees_termination_date ON ex_employees(termination_date);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ex_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ex_employees_updated_at ON ex_employees;
CREATE TRIGGER update_ex_employees_updated_at
  BEFORE UPDATE ON ex_employees
  FOR EACH ROW EXECUTE PROCEDURE update_ex_employees_updated_at();

-- Mensaje de confirmación
SELECT 'Tabla ex_employees configurada exitosamente' as status;