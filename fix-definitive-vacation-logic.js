// CORRECCIÓN DEFINITIVA: NO descontar días ANTES del ciclo más antiguo
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixVacationLogicDefinitive() {
  console.log('🔧 CORRECCIÓN DEFINITIVA: Días ANTES de ciclos NO deben descontarse\n')

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

      // 2. Obtener ciclos ordenados (más antiguo primero)
      const { data: cycles, error: cyclesError } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', employee.id)
        .order('cycle_start_date', { ascending: true })

      if (cyclesError) {
        console.error(`   ❌ Error obteniendo ciclos: ${cyclesError.message}`)
        continue
      }

      if (!cycles || cycles.length === 0) {
        console.log(`   ⚠️ Sin ciclos definidos`)
        continue
      }

      // 3. Determinar fecha de inicio del ciclo más antiguo
      const oldestCycle = cycles[0]
      const oldestCycleStartDate = new Date(oldestCycle.cycle_start_date)
      console.log(`   📅 Ciclo más antiguo inicia: ${oldestCycle.cycle_start_date}`)

      // 4. Obtener SOLO solicitudes aprobadas DENTRO de los ciclos
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

      // 5. FILTRAR: Solo solicitudes DENTRO del rango de ciclos
      const requestsInsideCycles = allApprovedRequests.filter(request => {
        const requestStartDate = new Date(request.start_date)
        return requestStartDate >= oldestCycleStartDate
      })

      const requestsBeforeCycles = allApprovedRequests.filter(request => {
        const requestStartDate = new Date(request.start_date)
        return requestStartDate < oldestCycleStartDate
      })

      console.log(`   📊 Solicitudes aprobadas TOTALES: ${allApprovedRequests.length}`)
      console.log(`   📊 Solicitudes DENTRO de ciclos: ${requestsInsideCycles.length}`)
      console.log(`   📊 Solicitudes ANTES de ciclos: ${requestsBeforeCycles.length}`)

      // 6. Mostrar solicitudes que NO se deben descontar
      if (requestsBeforeCycles.length > 0) {
        console.log(`\n   ⚠️ VACACIONES ANTES DE CICLOS (NO SE DESCONTARÁN):`)
        requestsBeforeCycles.forEach(req => {
          console.log(`      - ${req.start_date}: ${req.days_requested} días 🚫 SOLO REGISTRO`)
        })
      }

      // 7. Mostrar solicitudes que SÍ se deben descontar
      if (requestsInsideCycles.length > 0) {
        console.log(`\n   ✅ VACACIONES DENTRO DE CICLOS (SE DESCONTARÁN):`)
        requestsInsideCycles.forEach(req => {
          console.log(`      - ${req.start_date}: ${req.days_requested} días ✅ DESCONTAR`)
        })
      }

      // 8. Calcular días que REALMENTE deben descontarse
      const totalDaysToDeduct = requestsInsideCycles.reduce((sum, req) => sum + req.days_requested, 0)
      const totalDaysBeforeCycles = requestsBeforeCycles.reduce((sum, req) => sum + req.days_requested, 0)

      console.log(`\n   🧮 CÁLCULOS:`)
      console.log(`      - Días ANTES de ciclos (no descontar): ${totalDaysBeforeCycles}`)
      console.log(`      - Días DENTRO de ciclos (descontar): ${totalDaysToDeduct}`)

      // 9. Aplicar distribución CORRECTA (solo días dentro de ciclos)
      let remainingDaysToDeduct = totalDaysToDeduct

      console.log(`\n   🔧 APLICANDO CORRECCIÓN:`)

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
      console.log('   ' + '='.repeat(80))
    }

    console.log('\n🎉 ¡CORRECCIÓN DEFINITIVA COMPLETADA!')
    console.log('\n📋 REGLAS APLICADAS:')
    console.log('- 🚫 Vacaciones ANTES del ciclo más antiguo: SOLO registro (NO descontadas)')
    console.log('- ✅ Vacaciones DENTRO de ciclos: Descontadas con lógica FIFO')
    console.log('- 🔒 Garantía: Los días fuera de ciclos NUNCA afectan los balances de ciclos')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixVacationLogicDefinitive()