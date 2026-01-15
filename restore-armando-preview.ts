import { createClient } from '@supabase/supabase-js'

async function restoreArmandoCorrect() {
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
  console.log("\n📊 VALORES QUE SE VAN A CREAR:")
  console.log("  • days_earned (Días por ley): 16 días")
  console.log("  • days_used (Días tomados): 9 días")
  console.log("  • days_available (Días disponibles): 7 días")
  console.log("  • Ciclo: 01/06/2022 → 31/05/2026")
  console.log("  • Estado: ACTIVO")
  
  const cycleData = {
    employee_id: employeeId,
    cycle_start_date: '2022-06-01',
    cycle_end_date: '2026-05-31',
    days_earned: 16,        // Solo días por ley (3 años)
    days_used: 9,           // Días ya tomados
    days_available: 7,      // Días disponibles (16 - 9 = 7)
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  console.log("\n📝 OBJETO QUE SE INSERTARÁ:")
  console.log(JSON.stringify(cycleData, null, 2))
  
  console.log("\n⚠️  ESTE ES SOLO UN PREVIEW - NO SE HA EJECUTADO NADA")
  console.log("=".repeat(80))
  
  // COMENTADO - NO EJECUTAR AÚN
  /*
  console.log("\n🚀 Insertando ciclo...")
  const { data, error } = await supabase
    .from('vacation_cycles')
    .insert(cycleData)
    .select()
  
  if (error) {
    console.error("❌ Error al insertar:", error)
    return
  }
  
  console.log("\n✅ CICLO CREADO EXITOSAMENTE:")
  console.log(JSON.stringify(data, null, 2))
  */
}

restoreArmandoCorrect()
  .then(() => {
    console.log("\n✅ Preview completado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
