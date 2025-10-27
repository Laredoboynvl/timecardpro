// Script para verificar qué oficinas y empleados existen
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAllData() {
  console.log('🔍 Verificando todas las oficinas y empleados...\n')

  try {
    // 1. Verificar oficinas
    console.log('🏢 OFICINAS:')
    const { data: offices, error: officesError } = await supabase
      .from('offices')
      .select('office_code, name')
      .order('office_code', { ascending: true })

    if (officesError) {
      console.error('❌ Error al obtener oficinas:', officesError)
      return
    }

    offices?.forEach((office, i) => {
      console.log(`${i + 1}. ${office.office_code} - ${office.name}`)
    })

    // 2. Verificar empleados por oficina
    console.log('\n👥 EMPLEADOS POR OFICINA:')
    for (const office of offices || []) {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('name, employee_code, hire_date')
        .eq('office_code', office.office_code)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (employeesError) {
        console.error(`❌ Error al obtener empleados de ${office.office_code}:`, employeesError)
        continue
      }

      console.log(`\n📍 ${office.office_code} (${employees?.length || 0} empleados):`)
      employees?.forEach((emp, i) => {
        console.log(`   ${i + 1}. ${emp.name} (${emp.employee_code}) - ${emp.hire_date}`)
      })
    }

    // 3. Buscar empleados con nombres que contengan "María", "Jesús", o "Medina"
    console.log('\n🔍 EMPLEADOS CON NOMBRES SIMILARES:')
    const searchTerms = ['María', 'Jesús', 'Medina']
    
    for (const term of searchTerms) {
      const { data: similarEmployees, error: similarError } = await supabase
        .from('employees')
        .select('name, employee_code, office_code, hire_date')
        .ilike('name', `%${term}%`)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (similarError) {
        console.error(`❌ Error buscando "${term}":`, similarError)
        continue
      }

      if (similarEmployees && similarEmployees.length > 0) {
        console.log(`\n🔍 Empleados con "${term}":`)
        similarEmployees.forEach((emp, i) => {
          console.log(`   ${i + 1}. ${emp.name} (${emp.employee_code}) - ${emp.office_code} - ${emp.hire_date}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkAllData()