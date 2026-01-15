import { createClient } from '@supabase/supabase-js'

async function cleanArmandoVacations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const employeeId = 'e4384fb9-3383-4160-a29e-e205007d1f12' // Armando Contreras Blanco
  
  console.log("🧹 LIMPIANDO REGISTRO DE VACACIONES DE ARMANDO CONTRERAS")
  console.log("=" .repeat(80))
  
  // 1. Eliminar solicitudes de vacaciones
  console.log("\n📝 Eliminando solicitudes de vacaciones...")
  const { data: requests, error: reqError } = await supabase
    .from('vacation_requests')
    .delete()
    .eq('employee_id', employeeId)
    .select()
  
  if (reqError) {
    console.error("❌ Error eliminando solicitudes:", reqError)
  } else {
    console.log(`✅ Eliminadas ${requests?.length || 0} solicitudes de vacaciones`)
  }
  
  // 2. Eliminar ciclos de vacaciones
  console.log("\n📅 Eliminando ciclos de vacaciones...")
  const { data: cycles, error: cyclesError } = await supabase
    .from('vacation_cycles')
    .delete()
    .eq('employee_id', employeeId)
    .select()
  
  if (cyclesError) {
    console.error("❌ Error eliminando ciclos:", cyclesError)
  } else {
    console.log(`✅ Eliminados ${cycles?.length || 0} ciclos de vacaciones`)
  }
  
  // 3. Verificar que todo fue eliminado
  console.log("\n🔍 Verificando limpieza...")
  
  const { data: remainingRequests } = await supabase
    .from('vacation_requests')
    .select('id')
    .eq('employee_id', employeeId)
  
  const { data: remainingCycles } = await supabase
    .from('vacation_cycles')
    .select('id')
    .eq('employee_id', employeeId)
  
  console.log("\n" + "=" .repeat(80))
  
  if (remainingRequests && remainingRequests.length === 0 && 
      remainingCycles && remainingCycles.length === 0) {
    console.log("✅ LIMPIEZA COMPLETADA EXITOSAMENTE")
    console.log("   - Solicitudes restantes: 0")
    console.log("   - Ciclos restantes: 0")
    console.log("\n📋 El empleado Armando Contreras está limpio y listo para nuevos registros.")
  } else {
    console.log("⚠️  ADVERTENCIA: Aún quedan registros:")
    console.log(`   - Solicitudes restantes: ${remainingRequests?.length || 0}`)
    console.log(`   - Ciclos restantes: ${remainingCycles?.length || 0}`)
  }
  
  console.log("=" .repeat(80))
}

cleanArmandoVacations()
  .then(() => {
    console.log("\n✅ Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error en script:", error)
    process.exit(1)
  })
