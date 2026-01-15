import { createClient } from '@supabase/supabase-js'

async function addArmandoCycle2024() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const employeeId = 'a56b3ab0-1357-4578-9a88-4ca7540912d4' // Armando Contreras Blanco
  
  console.log("📅 AGREGANDO CICLO 2024 PARA ARMANDO CONTRERAS")
  console.log("=".repeat(80))
  
  // Ciclo 2024 - Segundo año (14 días por ley)
  const cycle2024 = {
    employee_id: employeeId,
    cycle_start_date: '2023-06-01',
    cycle_end_date: '2024-05-31',
    days_earned: 14,         // 2 años de servicio = 14 días
    days_used: 0,            // Sin usar (o puedes asignar los días que quieras)
    days_available: 14,      // Todos disponibles
    years_of_service: 2,     // 2 años de servicio
    is_expired: false,       // Lo dejamos como NO expirado para que esté habilitado
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  console.log("\n📊 CICLO QUE SE VA A CREAR:")
  console.log("  • Periodo: 01/06/2023 → 31/05/2024")
  console.log("  • Días por ley: 14 (segundo año)")
  console.log("  • Días disponibles: 14")
  console.log("  • Estado: NO EXPIRADO (habilitado)")
  console.log("\n📝 OBJETO:")
  console.log(JSON.stringify(cycle2024, null, 2))
  
  console.log("\n🚀 Insertando ciclo 2024...")
  
  const { data, error } = await supabase
    .from('vacation_cycles')
    .insert(cycle2024)
    .select()
  
  if (error) {
    console.error("\n❌ Error al insertar:", error)
    return
  }
  
  console.log("\n✅ CICLO 2024 CREADO EXITOSAMENTE")
  console.log(JSON.stringify(data, null, 2))
  
  // Verificar todos los ciclos
  console.log("\n🔍 Verificando todos los ciclos de Armando...")
  const { data: allCycles } = await supabase
    .from('vacation_cycles')
    .select('*')
    .eq('employee_id', employeeId)
    .order('cycle_start_date', { ascending: true })
  
  console.log("\n📊 CICLOS ACTUALES:")
  console.log("-".repeat(80))
  
  allCycles?.forEach((cycle: any, i: number) => {
    console.log(`\n  Ciclo ${i + 1}: ${cycle.cycle_start_date} → ${cycle.cycle_end_date}`)
    console.log(`    • Días por ley: ${cycle.days_earned}`)
    console.log(`    • Días disponibles: ${cycle.days_available}`)
    console.log(`    • Días usados: ${cycle.days_used}`)
    console.log(`    • Años servicio: ${cycle.years_of_service}`)
    console.log(`    • Expirado: ${cycle.is_expired ? 'SÍ' : 'NO'}`)
  })
  
  console.log("\n" + "=".repeat(80))
  console.log("✅ CICLO 2024 AGREGADO Y HABILITADO")
}

addArmandoCycle2024()
  .then(() => {
    console.log("\n✅ Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
