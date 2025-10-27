// Verificación detallada de la lógica de ciclos activos vs históricos
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeViridianaCycleLogic() {
  console.log('🔍 ANÁLISIS DETALLADO: Lógica de Ciclos para Viridiana\n')

  try {
    // 1. Obtener Viridiana
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .ilike('first_name', '%viridiana%')

    if (empError) throw empError

    const viridiana = employees[0]
    console.log(`👤 ${viridiana.first_name} ${viridiana.last_name}`)
    console.log(`📅 Contratación: ${viridiana.hire_date}`)

    // 2. Obtener todos los ciclos
    const { data: allCycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', viridiana.id)
      .order('cycle_start_date', { ascending: true })

    if (cyclesError) throw cyclesError

    console.log('\n📊 TODOS LOS CICLOS:')
    const today = new Date()
    
    allCycles?.forEach((cycle, index) => {
      const year = cycle.cycle_start_date?.substring(0, 4)
      const startDate = new Date(cycle.cycle_start_date)
      const endDate = new Date(cycle.cycle_end_date)
      const isExpired = cycle.is_expired
      const isActive = !isExpired && startDate <= today && today <= endDate
      const isFuture = startDate > today
      
      let status = ''
      if (isExpired) status = '❌ EXPIRADO'
      else if (isActive) status = '✅ ACTIVO'
      else if (isFuture) status = '⏳ FUTURO'
      else status = '❓ INACTIVO'
      
      console.log(`  ${index + 1}. Ciclo ${year}: ${cycle.cycle_start_date} a ${cycle.cycle_end_date} ${status}`)
      console.log(`     - Ganados: ${cycle.days_earned} | Usados: ${cycle.days_used} | Disponibles: ${cycle.days_available}`)
    })

    // 3. Diferentes interpretaciones del "ciclo más antiguo"
    console.log('\n🤔 DIFERENTES INTERPRETACIONES:')
    
    // Interpretación 1: Ciclo histórico más antiguo (actual)
    const oldestHistorical = allCycles?.[0]
    console.log(`1️⃣ Ciclo MÁS ANTIGUO (histórico): ${oldestHistorical?.cycle_start_date}`)
    
    // Interpretación 2: Ciclo activo más antiguo
    const activeCycles = allCycles?.filter(cycle => !cycle.is_expired && cycle.days_available >= 0)
    const oldestActive = activeCycles?.[0]
    console.log(`2️⃣ Ciclo ACTIVO más antiguo: ${oldestActive?.cycle_start_date}`)
    
    // Interpretación 3: Ciclo con días disponibles más antiguo
    const availableCycles = allCycles?.filter(cycle => !cycle.is_expired && cycle.days_available > 0)
    const oldestAvailable = availableCycles?.[0]
    console.log(`3️⃣ Ciclo CON DÍAS DISPONIBLES más antiguo: ${oldestAvailable?.cycle_start_date}`)

    // 4. Análisis del 8 de junio con cada interpretación
    const juneDate = new Date('2024-06-08')
    console.log(`\n📅 ANÁLISIS DEL 8 JUNIO 2024:`)
    
    console.log(`\n🔍 Con interpretación 1 (histórico más antiguo):`)
    if (oldestHistorical) {
      const oldestHistoricalDate = new Date(oldestHistorical.cycle_start_date)
      const isWithin1 = juneDate >= oldestHistoricalDate
      console.log(`   - ${juneDate.toISOString().split('T')[0]} >= ${oldestHistorical.cycle_start_date}: ${isWithin1}`)
      console.log(`   - Resultado: ${isWithin1 ? 'SE DESCUENTA' : 'NO SE DESCUENTA'} ❌`)
    }
    
    console.log(`\n🔍 Con interpretación 2 (activo más antiguo):`)
    if (oldestActive) {
      const oldestActiveDate = new Date(oldestActive.cycle_start_date)
      const isWithin2 = juneDate >= oldestActiveDate
      console.log(`   - ${juneDate.toISOString().split('T')[0]} >= ${oldestActive.cycle_start_date}: ${isWithin2}`)
      console.log(`   - Resultado: ${isWithin2 ? 'SE DESCUENTA' : 'NO SE DESCUENTA'} ❌`)
    }
    
    console.log(`\n🔍 Con interpretación 3 (con días disponibles):`)
    if (oldestAvailable) {
      const oldestAvailableDate = new Date(oldestAvailable.cycle_start_date)
      const isWithin3 = juneDate >= oldestAvailableDate
      console.log(`   - ${juneDate.toISOString().split('T')[0]} >= ${oldestAvailable.cycle_start_date}: ${isWithin3}`)
      console.log(`   - Resultado: ${isWithin3 ? 'SE DESCUENTA' : 'NO SE DESCUENTA'} ❌`)
    }

    // 5. Pregunta clave
    console.log(`\n❓ PREGUNTA CLAVE:`)
    console.log(`¿Cuál de estas interpretaciones es la CORRECTA según tu regla de negocio?`)
    console.log(`\n💡 RECOMENDACIÓN:`)
    console.log(`Si el 8 junio 2024 NO debe descontar, entonces probablemente necesitamos:`)
    console.log(`- Usar solo ciclos que INICIARON después de cierta fecha específica`)
    console.log(`- O cambiar la lógica para considerar solo ciclos "relevantes" para descuentos`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

analyzeViridianaCycleLogic()