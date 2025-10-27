// Script para verificar el esquema de la base de datos
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  console.log('🔍 Verificando esquema de la base de datos...\n')

  try {
    // Verificar qué tablas existen y sus estructuras
    console.log('📋 Intentando obtener estructura de empleados...')
    
    // Intentar obtener un empleado para ver la estructura
    const { data: employeesSample, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .limit(1)

    if (employeesError) {
      console.error('❌ Error al obtener empleados:', employeesError)
    } else {
      console.log('✅ Estructura de employees:')
      if (employeesSample && employeesSample.length > 0) {
        console.log('Columnas disponibles:', Object.keys(employeesSample[0]))
        console.log('Ejemplo de datos:', employeesSample[0])
      } else {
        console.log('No hay datos en la tabla employees')
      }
    }

    console.log('\n📋 Intentando obtener estructura de oficinas...')
    
    // Intentar diferentes nombres para la tabla de oficinas
    const tableNames = ['offices', 'office', 'company_offices']
    
    for (const tableName of tableNames) {
      try {
        const { data: officesSample, error: officesError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!officesError && officesSample) {
          console.log(`✅ Estructura de ${tableName}:`)
          if (officesSample.length > 0) {
            console.log('Columnas disponibles:', Object.keys(officesSample[0]))
            console.log('Ejemplo de datos:', officesSample[0])
          } else {
            console.log(`Tabla ${tableName} existe pero está vacía`)
          }
          break
        }
      } catch (e) {
        console.log(`❌ Tabla ${tableName} no existe o no accesible`)
      }
    }

    // Verificar tabla de ciclos de vacaciones
    console.log('\n📋 Intentando obtener estructura de vacation_cycles...')
    const { data: cyclesSample, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .limit(1)

    if (cyclesError) {
      console.error('❌ Error al obtener vacation_cycles:', cyclesError)
    } else {
      console.log('✅ Estructura de vacation_cycles:')
      if (cyclesSample && cyclesSample.length > 0) {
        console.log('Columnas disponibles:', Object.keys(cyclesSample[0]))
        console.log('Ejemplo de datos:', cyclesSample[0])
      } else {
        console.log('No hay datos en la tabla vacation_cycles')
      }
    }

    // Buscar todos los empleados sin filtros de oficina
    console.log('\n👥 Intentando obtener todos los empleados...')
    const { data: allEmployees, error: allEmployeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .limit(10)

    if (allEmployeesError) {
      console.error('❌ Error al obtener todos los empleados:', allEmployeesError)
    } else {
      console.log(`✅ Empleados encontrados: ${allEmployees?.length || 0}`)
      allEmployees?.forEach((emp, i) => {
        console.log(`${i + 1}. ${emp.name} (${emp.employee_code || 'Sin código'}) - ${emp.office_code || 'Sin oficina'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkSchema()