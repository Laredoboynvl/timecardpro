// Test simple para validar la lógica del constraint
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
  return 12
}

function testConstraintLogic() {
  console.log('🧪 Probando lógica de constraint...')
  
  // Simular datos de empleado contratado hace varios años
  const hireDate = new Date('2020-01-15') // Contratado hace ~5 años
  const currentDate = new Date()
  
  console.log('📅 Fecha de contratación:', hireDate.toISOString().split('T')[0])
  console.log('📅 Fecha actual:', currentDate.toISOString().split('T')[0])
  
  const yearsOfService = Math.floor((currentDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  console.log(`👤 Años de servicio: ${yearsOfService}`)
  
  // Probar creación de ciclos
  for (let year = 1; year <= yearsOfService + 2; year++) {
    console.log(`\n🔄 Procesando año ${year}:`)
    
    // Fecha del aniversario
    const anniversaryDate = new Date(hireDate)
    anniversaryDate.setFullYear(hireDate.getFullYear() + year)
    
    // El ciclo comienza en el aniversario y dura 18 meses
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    // Solo crear ciclos que ya hayan comenzado o estén próximos
    const hasStarted = cycleStartDate <= currentDate
    const monthsUntilStart = (cycleStartDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const shouldCreateCycle = hasStarted || (monthsUntilStart <= 6 && monthsUntilStart > 0)
    
    console.log(`   📅 Inicio del ciclo: ${cycleStartDate.toISOString().split('T')[0]}`)
    console.log(`   📅 Fin del ciclo: ${cycleEndDate.toISOString().split('T')[0]}`)
    console.log(`   ✅ ¿Ya comenzó?: ${hasStarted}`)
    console.log(`   📊 Meses hasta inicio: ${monthsUntilStart.toFixed(1)}`)
    console.log(`   🎯 ¿Debe crear ciclo?: ${shouldCreateCycle}`)
    
    if (!shouldCreateCycle) {
      console.log(`   ⏭️ Saltando año ${year} (ciclo futuro)`)
      continue
    }
    
    const daysEarned = calculateVacationDays(year)
    const isExpired = currentDate > cycleEndDate
    
    // Lógica corregida para cumplir constraint
    const daysUsed = 0
    const daysAvailable = isExpired ? 0 : daysEarned - daysUsed
    const finalDaysUsed = isExpired ? daysEarned : daysUsed
    
    console.log(`   💰 Días ganados: ${daysEarned}`)
    console.log(`   📉 Días usados: ${finalDaysUsed}`)
    console.log(`   📈 Días disponibles: ${daysAvailable}`)
    console.log(`   ⏰ ¿Expirado?: ${isExpired}`)
    
    // Verificar constraint
    const constraintCheck = daysAvailable === (daysEarned - finalDaysUsed)
    console.log(`   🔍 Constraint check: ${constraintCheck} (${daysAvailable} === ${daysEarned} - ${finalDaysUsed} = ${daysEarned - finalDaysUsed})`)
    
    if (!constraintCheck) {
      console.error(`   ❌ CONSTRAINT VIOLATION for year ${year}!`)
    } else {
      console.log(`   ✅ Constraint OK for year ${year}`)
    }
  }
}

testConstraintLogic()