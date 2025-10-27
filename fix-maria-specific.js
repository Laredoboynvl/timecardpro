// Corrección específica para María de Jesús Medina Escalera
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixMariaSpecific() {
  console.log('🔧 Corrección específica para María de Jesús Medina Escalera\n')

  const mariaId = '6dcdf31b-c3ba-48ad-b088-f5a3085f7951'

  try {
    // 1. Obtener solicitudes aprobadas únicamente 
    const { data: approvedRequests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', mariaId)
      .eq('status', 'approved') // Solo aprobadas
      .order('start_date', { ascending: true })

    if (reqError) throw reqError

    console.log(`📝 Solicitudes APROBADAS encontradas: ${approvedRequests?.length || 0}`)
    
    if (approvedRequests && approvedRequests.length > 0) {
      approvedRequests.forEach(req => {
        console.log(`  - ${req.start_date} a ${req.end_date}: ${req.days_requested} días`)
      })
    } else {
      console.log('  ❌ NO HAY SOLICITUDES APROBADAS')
    }

    // 2. Obtener ciclos actuales
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', mariaId)
      .order('cycle_start_date', { ascending: false })

    if (cyclesError) throw cyclesError

    console.log('\n📅 CICLOS ACTUALES:')
    cycles?.forEach(cycle => {
      const year = cycle.cycle_start_date?.substring(0, 4)
      console.log(`  - Ciclo ${year}: ${cycle.days_earned} ganados, ${cycle.days_used} usados, ${cycle.days_available} disponibles`)
    })

    // 3. Calcular días que deberían estar usados (solo de solicitudes aprobadas)
    const totalApprovedDays = approvedRequests?.reduce((sum, req) => sum + req.days_requested, 0) || 0
    console.log(`\n🧮 Total días que deberían estar usados: ${totalApprovedDays}`)

    // 4. Distribuir días aprobados entre ciclos (FIFO - First In, First Out)
    if (cycles) {
      // Ordenar ciclos por fecha de inicio (más antiguos primero para FIFO)
      const sortedCycles = [...cycles].sort((a, b) => 
        new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime()
      )

      let remainingDaysToDeduct = totalApprovedDays

      console.log('\n🔧 APLICANDO CORRECCIÓN:')

      for (const cycle of sortedCycles) {
        const currentlyUsed = cycle.days_used
        let shouldBeUsed = 0

        if (remainingDaysToDeduct > 0) {
          shouldBeUsed = Math.min(remainingDaysToDeduct, cycle.days_earned)
          remainingDaysToDeduct -= shouldBeUsed
        }

        const shouldBeAvailable = cycle.days_earned - shouldBeUsed
        const year = cycle.cycle_start_date?.substring(0, 4)

        console.log(`\n📅 Ciclo ${year}:`)
        console.log(`  - Días usados: ${currentlyUsed} → ${shouldBeUsed}`)
        console.log(`  - Días disponibles: ${cycle.days_available} → ${shouldBeAvailable}`)

        if (currentlyUsed !== shouldBeUsed || cycle.days_available !== shouldBeAvailable) {
          console.log('  🔄 Actualizando...')
          
          const { error: updateError } = await supabase
            .from('vacation_cycles')
            .update({
              days_used: shouldBeUsed,
              days_available: shouldBeAvailable,
              updated_at: new Date().toISOString()
            })
            .eq('id', cycle.id)

          if (updateError) {
            console.error(`  ❌ Error actualizando:`, updateError)
          } else {
            console.log(`  ✅ Actualizado exitosamente`)
          }
        } else {
          console.log('  ✅ Ya está correcto')
        }
      }
    }

    console.log('\n✅ Corrección completada para María de Jesús Medina Escalera')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixMariaSpecific()