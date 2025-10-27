// Script para investigar específicamente a Maria De Jesus Medina Escalera
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function investigateSpecificMaria() {
  console.log('🔍 INVESTIGANDO: Maria De Jesus Medina Escalera (ID: 20022065)\n')

  try {
    // 1. Obtener información del empleado
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', '20022065')
      .single()

    if (employeeError) {
      console.error('❌ Error al obtener empleado:', employeeError)
      return
    }

    console.log('👤 INFORMACIÓN DEL EMPLEADO:')
    console.log(`   Nombre: ${employee.name}`)
    console.log(`   Código: ${employee.employee_code}`)
    console.log(`   ID: ${employee.id}`)
    console.log(`   Fecha de contratación: ${employee.hire_date}`)
    console.log(`   Oficina: ${employee.office_code || 'No asignada'}`)
    console.log(`   Activo: ${employee.is_active ? 'Sí' : 'No'}`)

    // Calcular años de servicio
    const hireDate = new Date(employee.hire_date)
    const currentDate = new Date()
    const yearsOfService = Math.floor((currentDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    console.log(`   Años de servicio: ${yearsOfService}`)

    // 2. Obtener ciclos de vacaciones
    console.log('\n📅 CICLOS DE VACACIONES:')
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', employee.id)
      .order('cycle_start_date', { ascending: true })

    if (cyclesError) {
      console.error('❌ Error al obtener ciclos:', cyclesError)
      return
    }

    console.log(`   Total de ciclos: ${cycles?.length || 0}`)
    
    let totalAvailable = 0
    let cycles2024 = []
    let cycles2025 = []

    cycles?.forEach((cycle, i) => {
      const isExpired = new Date(cycle.cycle_end_date) < new Date()
      const year = new Date(cycle.cycle_start_date).getFullYear()
      const status = isExpired ? '🔴 EXPIRADO' : '🟢 ACTIVO'
      
      console.log(`\n   ${i + 1}. Ciclo ${year} (${cycle.years_of_service} años de servicio):`)
      console.log(`      📅 Inicio: ${cycle.cycle_start_date}`)
      console.log(`      📅 Fin: ${cycle.cycle_end_date}`)
      console.log(`      📊 Ganados: ${cycle.days_earned}`)
      console.log(`      📊 Usados: ${cycle.days_used}`)
      console.log(`      📊 Disponibles: ${cycle.days_available}`)
      console.log(`      🏷️  Estado: ${status}`)

      if (!isExpired) {
        totalAvailable += cycle.days_available
      }

      if (year === 2024) {
        cycles2024.push(cycle)
      } else if (year === 2025) {
        cycles2025.push(cycle)
      }
    })

    console.log(`\n📊 RESUMEN:`)
    console.log(`   Total días disponibles (ciclos activos): ${totalAvailable}`)
    console.log(`   Ciclos del 2024: ${cycles2024.length}`)
    console.log(`   Ciclos del 2025: ${cycles2025.length}`)

    if (cycles2024.length > 0) {
      cycles2024.forEach(cycle => {
        console.log(`   • Ciclo 2024: ${cycle.days_available} días disponibles`)
      })
    }

    if (cycles2025.length > 0) {
      cycles2025.forEach(cycle => {
        console.log(`   • Ciclo 2025: ${cycle.days_available} días disponibles`)
      })
    }

    // 3. Obtener solicitudes de vacaciones
    console.log('\n📝 SOLICITUDES DE VACACIONES:')
    const { data: requests, error: requestsError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('❌ Error al obtener solicitudes:', requestsError)
      return
    }

    console.log(`   Total solicitudes: ${requests?.length || 0}`)
    
    let approvedCount = 0
    let cancelledCount = 0
    let pendingCount = 0

    if (requests && requests.length > 0) {
      requests.forEach((req, i) => {
        let statusIcon = '🟡'
        let statusText = req.status.toUpperCase()
        
        if (req.status === 'approved') {
          statusIcon = '🟢'
          approvedCount++
        } else if (req.status === 'cancelled') {
          statusIcon = '🔴'
          cancelledCount++
        } else {
          pendingCount++
        }
        
        console.log(`   ${i + 1}. ${statusIcon} ${req.start_date} → ${req.end_date} (${req.days_requested} días)`)
        console.log(`       Estado: ${statusText}`)
        if (req.reason) {
          console.log(`       Motivo: ${req.reason}`)
        }
        console.log(`       Creada: ${req.created_at}`)
      })

      console.log(`\n📊 RESUMEN DE SOLICITUDES:`)
      console.log(`   Aprobadas: ${approvedCount}`)
      console.log(`   Canceladas: ${cancelledCount}`)
      console.log(`   Pendientes: ${pendingCount}`)

      if (cancelledCount > 0) {
        console.log(`\n⚠️  ANÁLISIS: ${cancelledCount} solicitudes canceladas`)
        console.log(`   Esto podría explicar días restaurados incorrectamente a los ciclos.`)
        console.log(`   Cuando se cancela una solicitud, los días deberían restaurarse`)
        console.log(`   al ciclo del cual fueron descontados originalmente.`)
      }
    }

    // 4. Análisis de inconsistencias
    console.log('\n🔍 ANÁLISIS DE POSIBLES INCONSISTENCIAS:')
    
    if (cycles2024.length > 0 && cycles2024[0].days_available === 1) {
      console.log(`   ⚠️  El ciclo 2024 tiene solo 1 día disponible de ${cycles2024[0].days_earned} ganados`)
      console.log(`   📊 Días usados del ciclo 2024: ${cycles2024[0].days_used}`)
      console.log(`   🔍 Verificar si alguna cancelación restauró días incorrectamente`)
    }

    if (cycles2025.length > 0 && cycles2025[0].days_available === 13) {
      console.log(`   ⚠️  El ciclo 2025 tiene 13 días disponibles de ${cycles2025[0].days_earned} ganados`)
      console.log(`   📊 Días usados del ciclo 2025: ${cycles2025[0].days_used}`)
      console.log(`   🔍 Verificar si alguna cancelación restauró días aquí en lugar del ciclo 2024`)
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

investigateSpecificMaria()