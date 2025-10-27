// Función de diagnóstico para identificar problemas en la creación de ciclos de vacaciones
import { createClientSupabaseClient } from './lib/supabase/client'

export async function diagnoseCycleCreation(employeeId: string) {
  console.log(`🔍 Iniciando diagnóstico para empleado: ${employeeId}`)
  
  const supabase = createClientSupabaseClient()
  
  // 1. Verificar que el empleado existe
  console.log('1️⃣ Verificando empleado...')
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single()

  if (employeeError) {
    console.error("❌ Error al obtener empleado:", employeeError)
    return
  }
  
  console.log("✅ Empleado encontrado:", { 
    id: (employee as any).id, 
    name: (employee as any).name || `${(employee as any).first_name} ${(employee as any).last_name}`,
    hire_date: (employee as any).hire_date 
  })
  
  // 2. Verificar si hay ciclos existentes
  console.log('2️⃣ Verificando ciclos existentes...')
  const { data: existingCycles, error: cyclesError } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", employeeId)
  
  if (cyclesError) {
    console.error("❌ Error al obtener ciclos existentes:", cyclesError)
    return
  }
  
  console.log(`📋 Ciclos existentes: ${existingCycles?.length || 0}`)
  if (existingCycles && existingCycles.length > 0) {
    console.log("Ciclos:", existingCycles)
  }
  
  // 3. Intentar crear un ciclo de prueba simple
  console.log('3️⃣ Intentando crear ciclo de prueba...')
  
  const hireDate = new Date((employee as any).hire_date)
  const currentDate = new Date()
  
  // Calcular primer aniversario
  const firstAnniversary = new Date(hireDate)
  firstAnniversary.setFullYear(hireDate.getFullYear() + 1)
  
  // Ciclo termina 18 meses después del aniversario
  const cycleEnd = new Date(firstAnniversary)
  cycleEnd.setMonth(cycleEnd.getMonth() + 18)
  
  const testCycle = {
    employee_id: employeeId,
    cycle_start_date: firstAnniversary.toISOString().split('T')[0],
    cycle_end_date: cycleEnd.toISOString().split('T')[0],
    days_earned: 15, // Días por defecto
    days_used: 0,
    days_available: 15,
    years_of_service: 1,
    is_expired: currentDate > cycleEnd
  }
  
  console.log("📋 Datos del ciclo de prueba:", testCycle)
  
  const { data: newCycle, error: insertError } = await supabase
    .from("vacation_cycles")
    .insert(testCycle as any)
    .select()
    .single()
  
  if (insertError) {
    console.error("❌ Error al insertar ciclo de prueba:", {
      error: insertError,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    })
  } else {
    console.log("✅ Ciclo de prueba creado exitosamente:", newCycle)
    
    // Limpiar el ciclo de prueba
    await supabase
      .from("vacation_cycles")
      .delete()
      .eq("id", (newCycle as any).id)
    
    console.log("🧹 Ciclo de prueba eliminado")
  }
}