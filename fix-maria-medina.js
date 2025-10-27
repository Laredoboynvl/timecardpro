import { createClientSupabaseClient } from './lib/supabase/db-functions.js'

async function fixMariaMedinaInconsistency() {
  console.log('🔧 Corrigiendo inconsistencia de María de Jesús Medina Escalera...\n')

  const supabase = createClientSupabaseClient()

  try {
    // 1. Buscar empleados con nombres similares
    console.log('👤 Buscando empleada...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .or('name.ilike.%maria%medina%,name.ilike.%medina%escalera%,first_name.ilike.%maria%,last_name.ilike.%medina%')

    if (empError) {
      console.error('Error buscando empleada:', empError)
      return
    }

    console.log(`Encontrados ${employees?.length || 0} empleados:`)
    employees?.forEach(emp => {
      console.log(`- ${emp.name} (ID: ${emp.id.substring(0, 8)}...)`)
    })

    // Si hay múltiples, usar el que más se parezca
    const maria = employees?.find(emp => 
      emp.name?.toLowerCase().includes('maria') && 
      emp.name?.toLowerCase().includes('medina')
    ) || employees?.[0]

    if (!maria) {
      console.log('❌ No se encontró la empleada')
      return
    }

    console.log(`\nTrabajando con: ${maria.name}\n`)

    // 2. Revisar ciclos de vacaciones
    console.log('🔄 Revisando ciclos de vacaciones...')
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', maria.id)
      .order('cycle_start_date', { ascending: false })

    if (cyclesError) {
      console.error('Error obteniendo ciclos:', cyclesError)
      return
    }

    // 3. Revisar solicitudes de vacaciones
    console.log('📝 Revisando solicitudes de vacaciones...')
    const { data: requests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', maria.id)

    if (reqError) {
      console.error('Error obteniendo solicitudes:', reqError)
      return
    }

    console.log(`Ciclos encontrados: ${cycles?.length || 0}`)
    console.log(`Solicitudes encontradas: ${requests?.length || 0}`)

    // 4. Identificar inconsistencias
    const totalUsedInCycles = cycles?.reduce((sum, cycle) => sum + cycle.days_used, 0) || 0
    const totalRequestedDays = requests?.reduce((sum, req) => sum + req.days_requested, 0) || 0

    console.log(`\nTotal días usados en ciclos: ${totalUsedInCycles}`)
    console.log(`Total días en solicitudes: ${totalRequestedDays}`)
    console.log(`Diferencia: ${totalUsedInCycles - totalRequestedDays}`)

    if (totalUsedInCycles > totalRequestedDays) {
      console.log('\n⚠️ INCONSISTENCIA DETECTADA - Corrigiendo...')

      // 5. Corregir cada ciclo
      for (const cycle of cycles || []) {
        if (cycle.days_used > 0) {
          // Calcular días que deberían estar usados basado en solicitudes
          const requestsForThisCycle = requests?.filter(req => {
            const reqDate = new Date(req.start_date)
            const cycleStart = new Date(cycle.cycle_start_date)
            const cycleEnd = new Date(cycle.cycle_end_date)
            return reqDate >= cycleStart && reqDate <= cycleEnd
          }) || []

          const correctDaysUsed = requestsForThisCycle.reduce((sum, req) => sum + req.days_requested, 0)
          const correctDaysAvailable = cycle.days_earned - correctDaysUsed

          if (cycle.days_used !== correctDaysUsed) {
            console.log(`\n🔧 Corrigiendo ciclo ${cycle.years_of_service} años:`)
            console.log(`  - Días usados: ${cycle.days_used} → ${correctDaysUsed}`)
            console.log(`  - Días disponibles: ${cycle.days_available} → ${correctDaysAvailable}`)

            const { error: updateError } = await supabase
              .from('vacation_cycles')
              .update({
                days_used: correctDaysUsed,
                days_available: correctDaysAvailable,
                updated_at: new Date().toISOString()
              })
              .eq('id', cycle.id)

            if (updateError) {
              console.error(`  ❌ Error actualizando ciclo:`, updateError)
            } else {
              console.log(`  ✅ Ciclo corregido exitosamente`)
            }
          }
        }
      }

      console.log('\n✅ Corrección completada')
    } else {
      console.log('\n✅ No se encontraron inconsistencias')
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixMariaMedinaInconsistency()