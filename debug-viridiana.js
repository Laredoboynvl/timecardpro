// Verificación específica de Viridiana Valdez Gonzalez
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugViridiana() {
  console.log('🔍 DIAGNÓSTICO: Viridiana Valdez Gonzalez\n')

  try {
    // 1. Buscar a Viridiana
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .ilike('first_name', '%viridiana%')
      .or('last_name.ilike.%valdez%')

    if (empError) throw empError

    if (!employees || employees.length === 0) {
      console.log('❌ No se encontró a Viridiana Valdez')
      return
    }

    const viridiana = employees[0]
    console.log(`👤 Empleada: ${viridiana.first_name} ${viridiana.last_name}`)
    console.log(`📅 ID: ${viridiana.id}`)
    console.log(`📅 Fecha de contratación: ${viridiana.hire_date}`)

    // 2. Obtener ciclos
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', viridiana.id)
      .order('cycle_start_date', { ascending: true })

    if (cyclesError) throw cyclesError

    console.log('\n📊 CICLOS ACTUALES:')
    if (cycles && cycles.length > 0) {
      cycles.forEach((cycle, index) => {
        const year = cycle.cycle_start_date?.substring(0, 4)
        console.log(`  ${index + 1}. Ciclo ${year}: ${cycle.cycle_start_date} a ${cycle.cycle_end_date}`)
        console.log(`     - Ganados: ${cycle.days_earned} | Usados: ${cycle.days_used} | Disponibles: ${cycle.days_available}`)
      })

      const oldestCycle = cycles[0]
      console.log(`\n🕐 CICLO MÁS ANTIGUO inicia: ${oldestCycle.cycle_start_date}`)
    } else {
      console.log('   ⚠️ NO HAY CICLOS DEFINIDOS')
    }

    // 3. Obtener solicitudes de vacaciones
    const { data: requests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', viridiana.id)
      .order('start_date', { ascending: true })

    if (reqError) throw reqError

    console.log(`\n📝 SOLICITUDES DE VACACIONES (${requests?.length || 0}):`)
    
    if (requests && requests.length > 0) {
      requests.forEach((req, index) => {
        const statusIcon = req.status === 'approved' ? '✅' : req.status === 'rejected' ? '❌' : '⏳'
        
        // Verificar si está antes del ciclo más antiguo
        let dateAnalysis = ''
        if (cycles && cycles.length > 0) {
          const requestDate = new Date(req.start_date)
          const oldestCycleStart = new Date(cycles[0].cycle_start_date)
          
          if (requestDate < oldestCycleStart) {
            dateAnalysis = ' ⚠️ ANTES DEL CICLO MÁS ANTIGUO - NO DEBE DESCONTAR'
          } else {
            dateAnalysis = ' ✓ Dentro de ciclos'
          }
        }
        
        console.log(`  ${index + 1}. ${req.start_date} a ${req.end_date} (${req.days_requested} días) ${statusIcon} ${req.status.toUpperCase()}${dateAnalysis}`)
      })

      // 4. Análisis específico del 8 de junio
      const juneRequest = requests.find(req => req.start_date.includes('2024-06-08') || req.start_date.includes('06-08'))
      
      if (juneRequest) {
        console.log('\n🚨 SOLICITUD DEL 8 DE JUNIO ENCONTRADA:')
        console.log(`   - Fecha: ${juneRequest.start_date}`)
        console.log(`   - Estado: ${juneRequest.status}`)
        console.log(`   - Días: ${juneRequest.days_requested}`)
        
        if (cycles && cycles.length > 0) {
          const requestDate = new Date(juneRequest.start_date)
          const oldestCycleStart = new Date(cycles[0].cycle_start_date)
          
          if (requestDate < oldestCycleStart) {
            console.log(`   - ⚠️ PROBLEMA: Esta fecha está ANTES del ciclo más antiguo (${cycles[0].cycle_start_date})`)
            console.log(`   - 🔥 Si está aprobada, NO debe descontar de ningún ciclo`)
            
            if (juneRequest.status === 'approved') {
              const totalUsedInCycles = cycles.reduce((sum, cycle) => sum + cycle.days_used, 0)
              console.log(`\n💥 INCONSISTENCIA DETECTADA:`)
              console.log(`   - Solicitud del 8 junio: APROBADA`)
              console.log(`   - Total días usados en ciclos: ${totalUsedInCycles}`)
              console.log(`   - PROBLEMA: El día del 8 junio puede estar descontando incorrectamente`)
            }
          }
        }
      } else {
        console.log('\n✅ No se encontró solicitud específica del 8 de junio')
      }

    } else {
      console.log('   No hay solicitudes registradas')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugViridiana()