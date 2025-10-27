// Script para debuggear la creación de ciclos de vacaciones
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

// Función para calcular días de vacaciones según años de servicio (LFT México)
function calculateVacationDays(yearsOfService) {
  if (yearsOfService === 1) return 12
  if (yearsOfService === 2) return 14
  if (yearsOfService === 3) return 16
  if (yearsOfService === 4) return 18
  if (yearsOfService >= 5 && yearsOfService <= 9) return 20
  if (yearsOfService >= 10 && yearsOfService <= 14) return 22
  if (yearsOfService >= 15 && yearsOfService <= 19) return 24
  if (yearsOfService >= 20 && yearsOfService <= 24) return 26
  if (yearsOfService >= 25 && yearsOfService <= 29) return 28
  if (yearsOfService >= 30 && yearsOfService <= 34) return 30
  if (yearsOfService >= 35) return 32
  return 12 // Default
}

async function testCycleCreation() {
  console.log('🧪 Iniciando prueba de creación de ciclo...')
  
  try {
    // Obtener un empleado de prueba
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, first_name, last_name, hire_date')
      .limit(1)
    
    if (empError) {
      console.error('❌ Error obteniendo empleados:', empError)
      return
    }
    
    if (!employees || employees.length === 0) {
      console.log('❌ No hay empleados disponibles para la prueba')
      return
    }
    
    const employee = employees[0]
    console.log('👤 Empleado seleccionado:', {
      id: employee.id,
      name: employee.name || `${employee.first_name} ${employee.last_name}`,
      hire_date: employee.hire_date
    })
    
    if (!employee.hire_date) {
      console.log('❌ El empleado no tiene fecha de contratación')
      return
    }
    
    // Calcular datos del ciclo
    const hireDate = new Date(employee.hire_date)
    const currentDate = new Date()
    const year = 1 // Probar con primer año
    
    const anniversaryDate = new Date(hireDate)
    anniversaryDate.setFullYear(hireDate.getFullYear() + year)
    
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    const daysEarned = calculateVacationDays(year)
    const isExpired = currentDate > cycleEndDate
    
    // Lógica corregida para cumplir constraint
    const daysUsed = 0
    const daysAvailable = isExpired ? 0 : daysEarned - daysUsed
    const finalDaysUsed = isExpired ? daysEarned : daysUsed
    
    const cycle = {
      employee_id: employee.id,
      cycle_start_date: cycleStartDate.toISOString().split('T')[0],
      cycle_end_date: cycleEndDate.toISOString().split('T')[0],
      days_earned: daysEarned,
      days_used: finalDaysUsed,
      days_available: daysAvailable,
      years_of_service: year,
      is_expired: isExpired
    }
    
    console.log('📊 Datos del ciclo a crear:', cycle)
    
    // Verificar que cumple el constraint manualmente
    const constraintCheck = cycle.days_available === (cycle.days_earned - cycle.days_used)
    console.log(`🔍 Constraint check (days_available = days_earned - days_used): ${constraintCheck}`)
    console.log(`   ${cycle.days_available} === ${cycle.days_earned} - ${cycle.days_used} = ${cycle.days_earned - cycle.days_used}`)
    
    if (!constraintCheck) {
      console.error('❌ El constraint no se cumple, no se puede insertar')
      return
    }
    
    // Verificar si ya existe este ciclo
    const { data: existingCycle } = await supabase
      .from('vacation_cycles')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('cycle_start_date', cycle.cycle_start_date)
      .single()
    
    if (existingCycle) {
      console.log('⚠️ Ya existe un ciclo con estas características')
      return
    }
    
    // Intentar crear el ciclo
    console.log('🚀 Intentando crear ciclo...')
    const { data: newCycle, error: createError } = await supabase
      .from('vacation_cycles')
      .insert(cycle)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creando ciclo:', {
        error: createError,
        message: createError?.message || 'Sin mensaje',
        details: createError?.details || 'Sin detalles',
        hint: createError?.hint || 'Sin hint',
        code: createError?.code || 'Sin código'
      })
      return
    }
    
    if (newCycle) {
      console.log('✅ Ciclo creado exitosamente:', newCycle)
    } else {
      console.warn('⚠️ No se retornó data del ciclo creado')
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error)
  }
}

// Ejecutar el test
testCycleCreation()