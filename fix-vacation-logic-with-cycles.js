// Corrección de lógica de vacaciones considerando fechas de ciclos
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixVacationLogicWithCycles() {
  console.log('🔧 Corrección de lógica de vacaciones considerando fechas de ciclos\n')

  try {
    // 1. Obtener todos los empleados con sus ciclos y solicitudes
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        vacation_cycles!inner(
          id,
          cycle_start_date,
          cycle_end_date,
          days_earned,
          days_used,
          days_available
        ),
        vacation_requests!inner(
          id,
          start_date,
          end_date,
          days_requested,
          status
        )
      `)

    if (empError) throw empError

    console.log(`👥 Procesando ${employees?.length || 0} empleados con ciclos y solicitudes...\n`)

    for (const employee of employees || []) {
      const fullName = `${employee.first_name} ${employee.last_name}`
      console.log(`\n👤 Procesando: ${fullName}`)
      console.log(`   ID: ${employee.id}`)

      // 2. Obtener ciclos ordenados por fecha de inicio (más antiguo primero)
      const { data: cycles, error: cyclesError } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', employee.id)
        .order('cycle_start_date', { ascending: true })

      if (cyclesError) {
        console.error(`   ❌ Error obteniendo ciclos: ${cyclesError.message}`)
        continue
      }

      // 3. Obtener solicitudes aprobadas ordenadas por fecha
      const { data: approvedRequests, error: reqError } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .order('start_date', { ascending: true })

      if (reqError) {
        console.error(`   ❌ Error obteniendo solicitudes: ${reqError.message}`)
        continue
      }

      if (!cycles || cycles.length === 0) {
        console.log(`   ⚠️ Sin ciclos definidos`)
        continue
      }

      if (!approvedRequests || approvedRequests.length === 0) {
        console.log(`   ✅ Sin solicitudes aprobadas - verificando si ciclos necesitan reset`)
        
        // Reset cycles if they have used days but no approved requests
        for (const cycle of cycles) {
          if (cycle.days_used > 0) {
            console.log(`   🔄 Reseteando ciclo ${cycle.cycle_start_date.substring(0, 4)}: ${cycle.days_used} → 0 días usados`)
            
            const { error: updateError } = await supabase
              .from('vacation_cycles')
              .update({
                days_used: 0,
                days_available: cycle.days_earned,
                updated_at: new Date().toISOString()
              })
              .eq('id', cycle.id)

            if (updateError) {
              console.error(`   ❌ Error actualizando: ${updateError.message}`)
            } else {
              console.log(`   ✅ Ciclo reseteado`)
            }
          }
        }
        continue
      }

      // 4. Determinar la fecha de inicio del ciclo más antiguo
      const oldestCycle = cycles[0]
      const oldestCycleStartDate = new Date(oldestCycle.cycle_start_date)
      console.log(`   📅 Ciclo más antiguo inicia: ${oldestCycle.cycle_start_date}`)

      // 5. Clasificar solicitudes: dentro y fuera de ciclos
      const requestsInsideCycles = []
      const requestsOutsideCycles = []

      for (const request of approvedRequests) {
        const requestStartDate = new Date(request.start_date)
        
        if (requestStartDate >= oldestCycleStartDate) {
          requestsInsideCycles.push(request)
        } else {
          requestsOutsideCycles.push(request)
        }
      }

      console.log(`   📊 Solicitudes dentro de ciclos: ${requestsInsideCycles.length}`)
      console.log(`   📊 Solicitudes fuera de ciclos (no se descontarán): ${requestsOutsideCycles.length}`)

      // 6. Mostrar solicitudes fuera de ciclos (solo como registro)
      if (requestsOutsideCycles.length > 0) {
        console.log(`   📝 Vacaciones ANTES del ciclo más antiguo (solo registro):`)
        requestsOutsideCycles.forEach(req => {
          console.log(`      - ${req.start_date} a ${req.end_date}: ${req.days_requested} días ⚠️ NO DESCONTADOS`)
        })
      }

      // 7. Calcular días que deben descontarse (solo de solicitudes dentro de ciclos)
      const totalDaysToDeduct = requestsInsideCycles.reduce((sum, req) => sum + req.days_requested, 0)
      console.log(`   🧮 Total días a descontar de ciclos: ${totalDaysToDeduct}`)

      if (requestsInsideCycles.length > 0) {
        console.log(`   📝 Vacaciones DENTRO de ciclos (se descontarán):`)
        requestsInsideCycles.forEach(req => {
          console.log(`      - ${req.start_date} a ${req.end_date}: ${req.days_requested} días ✅ DESCONTADO`)
        })
      }

      // 8. Distribuir días solo entre ciclos (FIFO - First In, First Out)
      let remainingDaysToDeduct = totalDaysToDeduct

      console.log(`\n   🔧 APLICANDO CORRECCIÓN A CICLOS:`)

      for (const cycle of cycles) {
        const currentlyUsed = cycle.days_used
        let shouldBeUsed = 0

        if (remainingDaysToDeduct > 0) {
          shouldBeUsed = Math.min(remainingDaysToDeduct, cycle.days_earned)
          remainingDaysToDeduct -= shouldBeUsed
        }

        const shouldBeAvailable = cycle.days_earned - shouldBeUsed
        const year = cycle.cycle_start_date?.substring(0, 4)

        console.log(`\n   📅 Ciclo ${year}:`)
        console.log(`      - Días usados: ${currentlyUsed} → ${shouldBeUsed}`)
        console.log(`      - Días disponibles: ${cycle.days_available} → ${shouldBeAvailable}`)

        if (currentlyUsed !== shouldBeUsed || cycle.days_available !== shouldBeAvailable) {
          console.log('      🔄 Actualizando...')
          
          const { error: updateError } = await supabase
            .from('vacation_cycles')
            .update({
              days_used: shouldBeUsed,
              days_available: shouldBeAvailable,
              updated_at: new Date().toISOString()
            })
            .eq('id', cycle.id)

          if (updateError) {
            console.error(`      ❌ Error actualizando: ${updateError.message}`)
          } else {
            console.log(`      ✅ Actualizado exitosamente`)
          }
        } else {
          console.log('      ✅ Ya está correcto')
        }
      }

      console.log(`\n   ✅ Procesamiento completo para ${fullName}`)
      console.log('   ' + '='.repeat(60))
    }

    console.log('\n🎉 ¡Corrección de lógica de vacaciones completada!')
    console.log('\n📋 RESUMEN:')
    console.log('- ✅ Vacaciones ANTES del ciclo más antiguo: Solo como registro (NO descontadas)')
    console.log('- ✅ Vacaciones DENTRO de ciclos: Descontadas correctamente')
    console.log('- ✅ Ciclos actualizados con lógica FIFO (primero entra, primero sale)')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixVacationLogicWithCycles()