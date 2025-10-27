// Script para investigar el caso de María de Jesús Medina Escalera
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function investigateMaria() {
  console.log('🔍 INVESTIGANDO: María de Jesús Medina Escalera\n')

  try {
    // 1. Buscar empleados que contengan "María" en el nombre
    console.log('📋 Buscando empleados con "María" en el nombre...')
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .ilike('name', '%María%')
      .eq('office_code', 'NLA')

    if (employeesError) {
      console.error('❌ Error al buscar empleados:', employeesError)
      return
    }

    console.log(`Encontrados ${employees?.length || 0} empleados con "María" en NLA:`)
    employees?.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.name} (${emp.employee_code || emp.employee_number}) - ${emp.hire_date}`)
    })

    // 2. Buscar empleados que contengan "Jesús" en el nombre
    console.log('\n📋 Buscando empleados con "Jesús" en el nombre...')
    const { data: employees2, error: employees2Error } = await supabase
      .from('employees')
      .select('*')
      .ilike('name', '%Jesús%')
      .eq('office_code', 'NLA')

    if (employees2Error) {
      console.error('❌ Error al buscar empleados:', employees2Error)
      return
    }

    console.log(`Encontrados ${employees2?.length || 0} empleados con "Jesús" en NLA:`)
    employees2?.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.name} (${emp.employee_code || emp.employee_number}) - ${emp.hire_date}`)
    })

    // 3. Buscar empleados que contengan "Medina" en el nombre
    console.log('\n📋 Buscando empleados con "Medina" en el nombre...')
    const { data: employees3, error: employees3Error } = await supabase
      .from('employees')
      .select('*')
      .ilike('name', '%Medina%')
      .eq('office_code', 'NLA')

    if (employees3Error) {
      console.error('❌ Error al buscar empleados:', employees3Error)
      return
    }

    console.log(`Encontrados ${employees3?.length || 0} empleados con "Medina" en NLA:`)
    employees3?.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.name} (${emp.employee_code || emp.employee_number}) - ${emp.hire_date}`)
    })

    // 4. Si encontramos algún empleado con características similares, investigar sus ciclos
    const allEmployees = [...(employees || []), ...(employees2 || []), ...(employees3 || [])]
    const uniqueEmployees = allEmployees.filter((emp, index, self) => 
      self.findIndex(e => e.id === emp.id) === index
    )

    if (uniqueEmployees.length > 0) {
      console.log('\n🔍 INVESTIGANDO CICLOS DE VACACIONES...')
      
      for (const employee of uniqueEmployees) {
        console.log(`\n👤 Empleado: ${employee.name}`)
        console.log(`   ID: ${employee.id}`)
        console.log(`   Contratado: ${employee.hire_date}`)
        
        // Obtener ciclos de vacaciones
        const { data: cycles, error: cyclesError } = await supabase
          .from('vacation_cycles')
          .select('*')
          .eq('employee_id', employee.id)
          .order('cycle_start_date', { ascending: true })

        if (cyclesError) {
          console.error(`❌ Error al obtener ciclos:`, cyclesError)
          continue
        }

        console.log(`   Ciclos encontrados: ${cycles?.length || 0}`)
        
        cycles?.forEach((cycle, i) => {
          const isExpired = new Date(cycle.cycle_end_date) < new Date()
          const year = new Date(cycle.cycle_start_date).getFullYear()
          
          console.log(`   ${i + 1}. Ciclo ${year} (${cycle.years_of_service} años):`)
          console.log(`      📅 ${cycle.cycle_start_date} → ${cycle.cycle_end_date}`)
          console.log(`      📊 Ganados: ${cycle.days_earned}, Usados: ${cycle.days_used}, Disponibles: ${cycle.days_available}`)
          console.log(`      🏷️  Estado: ${isExpired ? '🔴 EXPIRADO' : '🟢 ACTIVO'}`)
        })

        // Calcular años de servicio actuales
        const hireDate = new Date(employee.hire_date)
        const currentDate = new Date()
        const yearsOfService = Math.floor((currentDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        console.log(`   📈 Años de servicio actuales: ${yearsOfService}`)

        // Verificar si hay solicitudes de vacaciones canceladas
        const { data: requests, error: requestsError } = await supabase
          .from('vacation_requests')
          .select('*')
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false })

        if (requestsError) {
          console.error(`❌ Error al obtener solicitudes:`, requestsError)
          continue
        }

        console.log(`   📝 Solicitudes de vacaciones: ${requests?.length || 0}`)
        
        if (requests && requests.length > 0) {
          let cancelledCount = 0
          requests.forEach((req, i) => {
            const status = req.status === 'cancelled' ? '🔴 CANCELADA' : req.status === 'approved' ? '🟢 APROBADA' : '🟡 PENDIENTE'
            if (req.status === 'cancelled') cancelledCount++
            console.log(`   ${i + 1}. ${req.start_date} → ${req.end_date} (${req.days_requested} días) - ${status}`)
          })
          
          if (cancelledCount > 0) {
            console.log(`   ⚠️  TIENE ${cancelledCount} SOLICITUDES CANCELADAS - Esto puede explicar días restaurados incorrectamente`)
          }
        }
      }
    } else {
      console.log('\n❌ No se encontró ningún empleado con características similares a "María de Jesús Medina Escalera" en NLA')
      
      // Mostrar todos los empleados de NLA para referencia
      console.log('\n📋 Todos los empleados de NLA:')
      const { data: allNLA, error: allNLAError } = await supabase
        .from('employees')
        .select('*')
        .eq('office_code', 'NLA')
        .eq('is_active', true)

      if (allNLAError) {
        console.error('❌ Error al obtener empleados de NLA:', allNLAError)
        return
      }

      allNLA?.forEach((emp, i) => {
        console.log(`${i + 1}. ${emp.name} (${emp.employee_code || emp.employee_number}) - ${emp.hire_date}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

investigateMaria().catch(console.error)