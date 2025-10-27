const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugMariaMedina() {
  console.log('🔍 Investigando problema de María de Jesús Medina Escalera...\n')

  try {
    // 1. Buscar a la empleada
    console.log('👤 EMPLEADA:')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .ilike('first_name', '%maria%')
      .ilike('last_name', '%medina%')

    if (empError) throw empError

    if (!employees || employees.length === 0) {
      // Buscar con otros criterios
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('*')
        .or('first_name.ilike.%maria%,last_name.ilike.%medina%,name.ilike.%maria%,name.ilike.%medina%')

      console.log('Empleados encontrados con "maria" o "medina":', allEmployees?.map(emp => ({
        id: emp.id,
        name: emp.name,
        first_name: emp.first_name,
        last_name: emp.last_name
      })))
      return
    }

    const maria = employees[0]
    console.log(`- ID: ${maria.id}`)
    console.log(`- Nombre completo: ${maria.name}`)
    console.log(`- Nombres: ${maria.first_name} ${maria.last_name}`)
    console.log(`- Fecha contratación: ${maria.hire_date}`)
    console.log(`- Oficina: ${maria.office_id}\n`)

    // 2. Revisar ciclos de vacaciones
    console.log('🔄 CICLOS DE VACACIONES:')
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', maria.id)
      .order('cycle_start_date', { ascending: false })

    if (cyclesError) throw cyclesError

    for (const cycle of cycles || []) {
      console.log(`\n📅 Ciclo ${cycle.years_of_service} años (${cycle.cycle_start_date} - ${cycle.cycle_end_date}):`)
      console.log(`  - Días ganados: ${cycle.days_earned}`)
      console.log(`  - Días usados: ${cycle.days_used} ⚠️`)
      console.log(`  - Días disponibles: ${cycle.days_available}`)
      console.log(`  - Expirado: ${cycle.is_expired}`)
      console.log(`  - Creado: ${cycle.created_at}`)
      console.log(`  - Actualizado: ${cycle.updated_at}`)
    }

    // 3. Revisar solicitudes de vacaciones
    console.log('\n📝 SOLICITUDES DE VACACIONES:')
    const { data: requests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', maria.id)
      .order('created_at', { ascending: false })

    if (reqError) throw reqError

    if (!requests || requests.length === 0) {
      console.log('❌ NO HAY SOLICITUDES DE VACACIONES REGISTRADAS')
      console.log('\n🚨 PROBLEMA IDENTIFICADO:')
      console.log('- Los ciclos muestran días usados pero no hay solicitudes de vacaciones')
      console.log('- Esto indica inconsistencia en los datos')
    } else {
      for (const request of requests) {
        console.log(`\n📋 Solicitud ${request.id}:`)
        console.log(`  - Período: ${request.start_date} a ${request.end_date}`)
        console.log(`  - Días solicitados: ${request.days_requested}`)
        console.log(`  - Estado: ${request.status}`)
        console.log(`  - Creada: ${request.created_at}`)
        console.log(`  - Motivo: ${request.reason || 'Sin motivo'}`)
      }
    }

    // 4. Análisis de discrepancia
    console.log('\n🔍 ANÁLISIS:')
    const totalUsedInCycles = cycles?.reduce((sum, cycle) => sum + cycle.days_used, 0) || 0
    const totalRequestedDays = requests?.reduce((sum, req) => sum + req.days_requested, 0) || 0

    console.log(`- Total días usados en ciclos: ${totalUsedInCycles}`)
    console.log(`- Total días en solicitudes: ${totalRequestedDays}`)
    console.log(`- Diferencia: ${totalUsedInCycles - totalRequestedDays}`)

    if (totalUsedInCycles > totalRequestedDays) {
      console.log('\n⚠️ INCONSISTENCIA DETECTADA:')
      console.log('Los ciclos tienen más días usados que las solicitudes registradas')
      
      // Proponer corrección
      const cycle2025 = cycles?.find(c => c.cycle_start_date?.includes('2025'))
      if (cycle2025 && cycle2025.days_used > 0) {
        console.log(`\n🔧 CORRECCIÓN SUGERIDA para ciclo 2025:`)
        console.log(`- Días usados actuales: ${cycle2025.days_used}`)
        console.log(`- Días usados correctos: 0 (no hay solicitudes)`)
        console.log(`- Días disponibles actuales: ${cycle2025.days_available}`)
        console.log(`- Días disponibles correctos: ${cycle2025.days_earned}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugMariaMedina()