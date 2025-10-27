// Script simple para verificar empleados en NLA
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkNLAEmployees() {
  console.log('🔍 Verificando empleados en oficina NLA...\n')

  try {
    // Obtener todos los empleados de NLA
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, employee_code, hire_date, is_active')
      .eq('office_code', 'NLA')
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log(`📋 Empleados encontrados en NLA: ${employees?.length || 0}`)
    
    if (employees && employees.length > 0) {
      employees.forEach((emp, i) => {
        const code = emp.employee_code || 'Sin código'
        const status = emp.is_active ? '🟢' : '🔴'
        console.log(`${i + 1}. ${status} ${emp.name} (${code}) - Contratado: ${emp.hire_date}`)
      })
    } else {
      console.log('❌ No se encontraron empleados en NLA')
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkNLAEmployees()