import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function setupExEmployeesTable() {
  console.log('🏗️  Configurando tabla de ex-empleados...')

  // Crear la tabla ex_employees si no existe
  const { error: createTableError } = await supabase.rpc('create_ex_employees_table', {})
  
  if (createTableError) {
    console.error('❌ Error creando tabla ex_employees:', createTableError)
    
    // Intentar crear manualmente con SQL
    const createTableSQL = `
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
    `

    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (sqlError) {
      console.error('❌ Error ejecutando SQL:', sqlError)
      return
    }
  }

  console.log('✅ Tabla ex_employees configurada exitosamente')

  // Verificar que la tabla existe
  const { data: tables, error: checkError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'ex_employees')
    .eq('table_schema', 'public')

  if (checkError) {
    console.error('❌ Error verificando tabla:', checkError)
    return
  }

  if (tables && tables.length > 0) {
    console.log('✅ Tabla ex_employees confirmada en la base de datos')
  } else {
    console.log('❌ Tabla ex_employees no encontrada')
  }
}

setupExEmployeesTable().catch(console.error)