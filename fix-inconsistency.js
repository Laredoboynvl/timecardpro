// Script simple para corregir inconsistencias de María Medina
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixInconsistency() {
  console.log('🔧 Buscando inconsistencias en ciclos de vacaciones...\n')

  try {
    // Buscar empleados con inconsistencias: días usados en ciclos sin solicitudes correspondientes
    const { data: inconsistentEmployees, error } = await supabase.rpc('find_vacation_inconsistencies')
    
    if (error) {
      // Si no existe la función, hacer la consulta manual
      console.log('Buscando empleados con nombre Maria Medina...')
      
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .or('name.ilike.%maria%,name.ilike.%medina%')
      
      console.log(`Encontrados ${employees?.length || 0} empleados con "maria" o "medina":`)
      employees?.forEach(emp => {
        console.log(`- ${emp.name} (${emp.first_name} ${emp.last_name})`)
      })

      // Buscar específicamente por María que tenga Medina
      const maria = employees?.find(emp => 
        (emp.name?.toLowerCase().includes('maria') && emp.name?.toLowerCase().includes('medina')) ||
        (emp.first_name?.toLowerCase().includes('maria') && emp.last_name?.toLowerCase().includes('medina'))
      )

      if (!maria) {
        console.log('❌ No se encontró María Medina')
        return
      }

      console.log(`\n👤 Trabajando con: ${maria.name} (ID: ${maria.id})\n`)

      // Obtener ciclos
      const { data: cycles } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', maria.id)
        .order('cycle_start_date', { ascending: false })

      // Obtener solicitudes
      const { data: requests } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', maria.id)

      console.log('📊 ESTADO ACTUAL:')
      console.log(`Ciclos: ${cycles?.length || 0}`)
      console.log(`Solicitudes: ${requests?.length || 0}`)

      if (cycles) {
        for (const cycle of cycles) {
          console.log(`\n📅 Ciclo ${cycle.years_of_service} años (${cycle.cycle_start_date?.substring(0,4)}):`)
          console.log(`  - Ganados: ${cycle.days_earned}`)
          console.log(`  - Usados: ${cycle.days_used} ${cycle.days_used > 0 ? '⚠️' : ''}`)
          console.log(`  - Disponibles: ${cycle.days_available}`)
        }
      }

      if (requests && requests.length > 0) {
        console.log('\n📝 Solicitudes encontradas:')
        for (const req of requests) {
          console.log(`  - ${req.start_date} a ${req.end_date}: ${req.days_requested} días (${req.status})`)
        }
      } else {
        console.log('\n❌ NO HAY SOLICITUDES DE VACACIONES')
      }

      // Identificar el problema
      const totalUsedInCycles = cycles?.reduce((sum, c) => sum + c.days_used, 0) || 0
      const totalInRequests = requests?.reduce((sum, r) => sum + r.days_requested, 0) || 0

      console.log(`\n🔍 ANÁLISIS:`)
      console.log(`Total usado en ciclos: ${totalUsedInCycles}`)
      console.log(`Total en solicitudes: ${totalInRequests}`)
      console.log(`Diferencia: ${totalUsedInCycles - totalInRequests}`)

      if (totalUsedInCycles > totalInRequests) {
        console.log('\n🚨 PROBLEMA CONFIRMADO: Los ciclos tienen días usados sin solicitudes correspondientes')
        
        // Corregir cada ciclo
        console.log('\n🔧 APLICANDO CORRECIÓN...')
        for (const cycle of cycles || []) {
          if (cycle.days_used > 0) {
            const newDaysUsed = 0 // No hay solicitudes, entonces debe ser 0
            const newDaysAvailable = cycle.days_earned

            console.log(`\nCorrigiendo ciclo ${cycle.years_of_service} años:`)
            console.log(`  - Días usados: ${cycle.days_used} → ${newDaysUsed}`)
            console.log(`  - Días disponibles: ${cycle.days_available} → ${newDaysAvailable}`)

            const { error: updateError } = await supabase
              .from('vacation_cycles')
              .update({
                days_used: newDaysUsed,
                days_available: newDaysAvailable,
                updated_at: new Date().toISOString()
              })
              .eq('id', cycle.id)

            if (updateError) {
              console.error(`  ❌ Error:`, updateError)
            } else {
              console.log(`  ✅ Corregido`)
            }
          }
        }
      } else {
        console.log('\n✅ No hay inconsistencias detectadas')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixInconsistency()