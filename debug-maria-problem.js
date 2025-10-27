// Verificación específica del problema de María de Jesús Medina
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugMariaSpecificProblem() {
  console.log('🔍 DIAGNÓSTICO ESPECÍFICO: María de Jesús Medina Escalera\n')

  const mariaId = '6dcdf31b-c3ba-48ad-b088-f5a3085f7951'

  try {
    // 1. Obtener información del empleado
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('first_name, last_name, hire_date')
      .eq('id', mariaId)
      .single()

    if (empError) throw empError

    console.log(`👤 Empleado: ${employee.first_name} ${employee.last_name}`)
    console.log(`📅 Fecha de contratación: ${employee.hire_date}`)

    // 2. Obtener todos los ciclos (ordenados por fecha de inicio)
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', mariaId)
      .order('cycle_start_date', { ascending: true })

    if (cyclesError) throw cyclesError

    console.log('\n📊 CICLOS ACTUALES:')
    cycles?.forEach((cycle, index) => {
      const year = cycle.cycle_start_date?.substring(0, 4)
      console.log(`  ${index + 1}. Ciclo ${year}: ${cycle.cycle_start_date} a ${cycle.cycle_end_date}`)
      console.log(`     - Ganados: ${cycle.days_earned} | Usados: ${cycle.days_used} | Disponibles: ${cycle.days_available}`)
    })

    const oldestCycle = cycles?.[0]
    const oldestCycleStart = oldestCycle ? new Date(oldestCycle.cycle_start_date) : null

    console.log(`\n🕐 CICLO MÁS ANTIGUO inicia: ${oldestCycle?.cycle_start_date || 'N/A'}`)

    // 3. Obtener TODAS las solicitudes (aprobadas y rechazadas)
    const { data: allRequests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', mariaId)
      .order('start_date', { ascending: true })

    if (reqError) throw reqError

    console.log(`\n📝 TODAS LAS SOLICITUDES (${allRequests?.length || 0}):`)
    
    if (allRequests && allRequests.length > 0) {
      allRequests.forEach((req, index) => {
        const requestStart = new Date(req.start_date)
        const isBeforeOldestCycle = oldestCycleStart ? requestStart < oldestCycleStart : false
        const statusIcon = req.status === 'approved' ? '✅' : req.status === 'rejected' ? '❌' : '⏳'
        const dateWarning = isBeforeOldestCycle ? ' ⚠️ ANTES DEL CICLO MÁS ANTIGUO' : ' ✓ Dentro de ciclos'
        
        console.log(`  ${index + 1}. ${req.start_date} a ${req.end_date} (${req.days_requested} días) ${statusIcon} ${req.status.toUpperCase()}${dateWarning}`)
      })

      // 4. Análisis específico del problema
      console.log('\n🚨 ANÁLISIS DEL PROBLEMA:')
      
      const requestsBeforeCycles = allRequests.filter(req => {
        const requestStart = new Date(req.start_date)
        return oldestCycleStart ? requestStart < oldestCycleStart : false
      })

      const approvedRequestsBeforeCycles = requestsBeforeCycles.filter(req => req.status === 'approved')

      console.log(`📊 Solicitudes ANTES del ciclo más antiguo: ${requestsBeforeCycles.length}`)
      console.log(`📊 Solicitudes APROBADAS antes del ciclo más antiguo: ${approvedRequestsBeforeCycles.length}`)

      if (approvedRequestsBeforeCycles.length > 0) {
        console.log('\n🔥 PROBLEMA DETECTADO:')
        console.log('Las siguientes solicitudes APROBADAS están ANTES del ciclo más antiguo pero PUEDEN estar descontando de ciclos actuales:')
        
        approvedRequestsBeforeCycles.forEach(req => {
          console.log(`  - ${req.start_date}: ${req.days_requested} días ❌ NO DEBE DESCONTAR DE NINGÚN CICLO`)
        })

        const totalDaysBeforeCycles = approvedRequestsBeforeCycles.reduce((sum, req) => sum + req.days_requested, 0)
        console.log(`\n📈 Total días que NO deben descontarse: ${totalDaysBeforeCycles}`)

        // 5. Verificar si hay días usados en los ciclos
        const totalUsedInCycles = cycles?.reduce((sum, cycle) => sum + cycle.days_used, 0) || 0
        console.log(`📈 Total días usados en ciclos: ${totalUsedInCycles}`)

        if (totalUsedInCycles > 0) {
          console.log('\n🚨 INCONSISTENCIA CONFIRMADA:')
          console.log(`- Días aprobados ANTES de ciclos: ${totalDaysBeforeCycles}`)
          console.log(`- Días usados EN ciclos: ${totalUsedInCycles}`)
          console.log('- PROBLEMA: Los días antes de ciclos están descontando de los ciclos actuales')
        }
      } else {
        console.log('\n✅ No hay solicitudes aprobadas antes del ciclo más antiguo')
      }

    } else {
      console.log('   No hay solicitudes registradas')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugMariaSpecificProblem()