// CORRECCIÓN DEFINITIVA: Usar solo ciclos ACTIVOS para determinar descuentos
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixVacationLogicWithActiveCycles() {
  console.log('🔧 CORRECCIÓN DEFINITIVA: Solo ciclos ACTIVOS para descuentos\n')

  try {
    // 1. Obtener todos los empleados
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')

    if (empError) throw empError

    console.log(`👥 Procesando ${employees?.length || 0} empleados...\n`)

    for (const employee of employees || []) {
      const fullName = `${employee.first_name} ${employee.last_name}`
      console.log(`\n👤 Procesando: ${fullName}`)

      // 2. Obtener SOLO ciclos ACTIVOS (no expirados)
      const { data: activeCycles, error: cyclesError } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('is_expired', false) // 🔥 SOLO ACTIVOS
        .order('cycle_start_date', { ascending: true })

      if (cyclesError) {
        console.error(`   ❌ Error obteniendo ciclos: ${cyclesError.message}`)
        continue
      }

      if (!activeCycles || activeCycles.length === 0) {
        console.log(`   ⚠️ Sin ciclos ACTIVOS definidos`)
        continue
      }

      // 3. Determinar fecha de inicio del ciclo ACTIVO más antiguo
      const oldestActiveCycle = activeCycles[0]
      const oldestActiveCycleStartDate = new Date(oldestActiveCycle.cycle_start_date)
      console.log(`   📅 Ciclo ACTIVO más antiguo inicia: ${oldestActiveCycle.cycle_start_date}`)

      // 4. Obtener SOLO solicitudes aprobadas
      const { data: allApprovedRequests, error: reqError } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .order('start_date', { ascending: true })

      if (reqError) {
        console.error(`   ❌ Error obteniendo solicitudes: ${reqError.message}`)
        continue
      }

      if (!allApprovedRequests || allApprovedRequests.length === 0) {
        console.log(`   ✅ Sin solicitudes aprobadas - verificando reset de ciclos`)
        
        // Reset cycles if they have used days but no approved requests
        for (const cycle of activeCycles) {
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

      // 5. FILTRAR: Solo solicitudes DENTRO del rango de ciclos ACTIVOS
      const requestsWithinActiveCycles = allApprovedRequests.filter(request => {
        const requestStartDate = new Date(request.start_date)
        return requestStartDate >= oldestActiveCycleStartDate
      })

      const requestsBeforeActiveCycles = allApprovedRequests.filter(request => {
        const requestStartDate = new Date(request.start_date)
        return requestStartDate < oldestActiveCycleStartDate
      })

      console.log(`   📊 Solicitudes aprobadas TOTALES: ${allApprovedRequests.length}`)
      console.log(`   📊 Solicitudes DENTRO de ciclos ACTIVOS: ${requestsWithinActiveCycles.length}`)
      console.log(`   📊 Solicitudes ANTES de ciclos ACTIVOS: ${requestsBeforeActiveCycles.length}`)

      // 6. Mostrar solicitudes que NO se deben descontar
      if (requestsBeforeActiveCycles.length > 0) {
        console.log(`\n   ⚠️ VACACIONES ANTES DE CICLOS ACTIVOS (NO SE DESCONTARÁN):`)
        requestsBeforeActiveCycles.forEach(req => {
          console.log(`      - ${req.start_date}: ${req.days_requested} días 🚫 SOLO REGISTRO`)
        })
      }

      // 7. Mostrar solicitudes que SÍ se deben descontar
      if (requestsWithinActiveCycles.length > 0) {
        console.log(`\n   ✅ VACACIONES DENTRO DE CICLOS ACTIVOS (SE DESCONTARÁN):`)
        requestsWithinActiveCycles.forEach(req => {
          console.log(`      - ${req.start_date}: ${req.days_requested} días ✅ DESCONTAR`)
        })
      }

      // 8. Calcular días que REALMENTE deben descontarse
      const totalDaysToDeduct = requestsWithinActiveCycles.reduce((sum, req) => sum + req.days_requested, 0)
      const totalDaysBeforeActiveCycles = requestsBeforeActiveCycles.reduce((sum, req) => sum + req.days_requested, 0)

      console.log(`\n   🧮 CÁLCULOS:`)
      console.log(`      - Días ANTES de ciclos activos (no descontar): ${totalDaysBeforeActiveCycles}`)
      console.log(`      - Días DENTRO de ciclos activos (descontar): ${totalDaysToDeduct}`)

      // 9. Aplicar distribución CORRECTA (solo días dentro de ciclos ACTIVOS)
      let remainingDaysToDeduct = totalDaysToDeduct

      console.log(`\n   🔧 APLICANDO CORRECCIÓN A CICLOS ACTIVOS:`)

      for (const cycle of activeCycles) {
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
      console.log('   ' + '='.repeat(80))
    }

    console.log('\n🎉 ¡CORRECCIÓN DEFINITIVA CON CICLOS ACTIVOS COMPLETADA!')
    console.log('\n📋 REGLAS APLICADAS:')
    console.log('- 🚫 Vacaciones ANTES del ciclo ACTIVO más antiguo: SOLO registro (NO descontadas)')
    console.log('- ✅ Vacaciones DENTRO de ciclos ACTIVOS: Descontadas con lógica FIFO')
    console.log('- 🔒 Garantía: Los días fuera de ciclos ACTIVOS NUNCA afectan los balances')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixVacationLogicWithActiveCycles()