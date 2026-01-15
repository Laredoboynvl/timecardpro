import { createClient } from '@supabase/supabase-js'

async function restoreArmandoFinal() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const employeeId = 'e4384fb9-3383-4160-a29e-e205007d1f12' // Armando Contreras Blanco
  
  console.log("🔧 RESTAURACIÓN DE ARMANDO CONTRERAS")
  console.log("=".repeat(80))
  
  const cycleData = {
    employee_id: employeeId,
    cycle_start_date: '2022-06-01',
    cycle_end_date: '2026-05-31',
    days_earned: 16,        // Solo días por ley (3 años)
    days_used: 9,           // Días ya tomados
    days_available: 7,      // Días disponibles (16 - 9 = 7)
    years_of_service: 3,    // 3 años de servicio
    is_expired: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  console.log("\n🚀 Insertando ciclo...")
  console.log(JSON.stringify(cycleData, null, 2))
  
  const { data, error } = await supabase
    .from('vacation_cycles')
    .insert(cycleData)
    .select()
  
  if (error) {
    console.error("\n❌ Error al insertar:", error)
    return
  }
  
  console.log("\n✅ CICLO CREADO EXITOSAMENTE")
  console.log(JSON.stringify(data, null, 2))
  
  // Verificar
  console.log("\n🔍 Verificando registro...")
  const { data: cycles } = await supabase
    .from('vacation_cycles')
    .select('*')
    .eq('employee_id', employeeId)
  
  console.log("\n📊 CICLOS ACTUALES PARA ARMANDO:")
  cycles?.forEach((cycle: any) => {
    console.log(`  • Días por ley: ${cycle.days_earned}`)
    console.log(`  • Días tomados: ${cycle.days_used}`)
    console.log(`  • Días disponibles: ${cycle.days_available}`)
    console.log(`  • Periodo: ${cycle.cycle_start_date} → ${cycle.cycle_end_date}`)
    console.log(`  • Expirado: ${cycle.is_expired ? 'SÍ' : 'NO'}`)
    console.log("")
  })
  
  console.log("=".repeat(80))
  console.log("✅ RESTAURACIÓN COMPLETADA")
}

restoreArmandoFinal()
  .then(() => {
    console.log("\n✅ Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
