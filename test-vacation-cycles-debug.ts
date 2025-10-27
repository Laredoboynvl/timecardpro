import { createVacationCyclesForEmployee } from './lib/supabase/db-functions'

async function testVacationCycles() {
  console.log('🧪 Iniciando prueba de creación de ciclos de vacaciones...')
  
  // Reemplaza este ID con un ID de empleado real de tu base de datos
  const testEmployeeId = 'test-employee-id' // Cambiar por un ID real
  
  try {
    const cycles = await createVacationCyclesForEmployee(testEmployeeId)
    console.log(`✅ Prueba completada. Se crearon ${cycles.length} ciclos`)
    console.log('Ciclos creados:', cycles)
  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  }
}

// Ejecutar la prueba
testVacationCycles()