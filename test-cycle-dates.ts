#!/usr/bin/env tsx

// Script para verificar las fechas corregidas de ciclos de vacaciones
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

function calculateVacationDays(yearsOfService: number): number {
  if (yearsOfService < 1) return 6
  if (yearsOfService < 2) return 8
  if (yearsOfService < 3) return 10
  if (yearsOfService < 4) return 12
  if (yearsOfService < 5) return 14
  if (yearsOfService < 10) return 16
  if (yearsOfService < 15) return 18
  if (yearsOfService < 20) return 20
  if (yearsOfService < 25) return 22
  return 24
}

async function testCycleDates() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }

  console.log("🔍 Verificando fechas de ciclos de vacaciones...")

  // Ejemplo 1: Empleado que entra 1 enero 2024
  const hireDate1 = new Date('2024-01-01')
  const currentDate = new Date('2025-10-16') // Fecha actual

  console.log(`\n📅 EJEMPLO 1: Empleado ingresó ${hireDate1.toISOString().split('T')[0]}`)
  console.log(`📅 Fecha actual: ${currentDate.toISOString().split('T')[0]}`)

  const yearsOfService1 = Math.floor((currentDate.getTime() - hireDate1.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  console.log(`⏰ Años de servicio: ${yearsOfService1}`)

  console.log(`\n🔄 Ciclos que DEBERÍAN existir:`)
  
  for (let year = 1; year <= yearsOfService1 + 1; year++) {
    // LÓGICA CORREGIDA: El ciclo comienza en el aniversario
    const anniversaryDate = new Date(hireDate1)
    anniversaryDate.setFullYear(hireDate1.getFullYear() + year)
    
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    const hasStarted = cycleStartDate <= currentDate
    const isExpired = cycleEndDate < currentDate
    const daysEarned = calculateVacationDays(year)
    
    let status = "🔴 NO HA COMENZADO"
    if (hasStarted && !isExpired) {
      status = "🟢 ACTIVO"
    } else if (hasStarted && isExpired) {
      status = "🔴 EXPIRADO"
    }
    
    console.log(`  📅 Ciclo ${year} (año ${year} de servicio):`)
    console.log(`     Inicio: ${cycleStartDate.toISOString().split('T')[0]} (${year}° aniversario)`)
    console.log(`     Fin: ${cycleEndDate.toISOString().split('T')[0]} (18 meses después)`)
    console.log(`     Días ganados: ${daysEarned}`)
    console.log(`     Estado: ${status}`)
    console.log(``)
  }

  // Ejemplo 2: Luis Iván Acuña (entra 1 enero 2020)
  const hireDate2 = new Date('2020-01-01')
  const yearsOfService2 = Math.floor((currentDate.getTime() - hireDate2.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  console.log(`\n📅 EJEMPLO 2: Luis Iván Acuña ingresó ${hireDate2.toISOString().split('T')[0]}`)
  console.log(`⏰ Años de servicio: ${yearsOfService2}`)

  console.log(`\n🔄 Ciclos que DEBERÍAN existir para Luis:`)

  for (let year = 1; year <= yearsOfService2 + 1; year++) {
    const anniversaryDate = new Date(hireDate2)
    anniversaryDate.setFullYear(hireDate2.getFullYear() + year)
    
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    const hasStarted = cycleStartDate <= currentDate
    const isExpired = cycleEndDate < currentDate
    const monthsUntilStart = (cycleStartDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const shouldCreateCycle = hasStarted || (monthsUntilStart <= 6 && monthsUntilStart > 0)
    const daysEarned = calculateVacationDays(year)
    
    let status = "🔴 NO HA COMENZADO"
    if (hasStarted && !isExpired) {
      status = "🟢 ACTIVO"
    } else if (hasStarted && isExpired) {
      status = "🔴 EXPIRADO"
    } else if (!hasStarted && shouldCreateCycle) {
      status = "🟡 PRÓXIMO (se creará)"
    }
    
    if (shouldCreateCycle) { // Mostrar ciclos que ya comenzaron o próximos
      console.log(`  📅 Ciclo ${year} (año ${year} de servicio):`)
      console.log(`     Inicio: ${cycleStartDate.toISOString().split('T')[0]} (${year}° aniversario)`)
      console.log(`     Fin: ${cycleEndDate.toISOString().split('T')[0]} (18 meses después)`)
      console.log(`     Días ganados: ${daysEarned}`)
      console.log(`     Estado: ${status}`)
      console.log(``)
    }
  }

  const activeCycles = []
  for (let year = 1; year <= yearsOfService2 + 1; year++) {
    const anniversaryDate = new Date(hireDate2)
    anniversaryDate.setFullYear(hireDate2.getFullYear() + year)
    
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    const hasStarted = cycleStartDate <= currentDate
    const isExpired = cycleEndDate < currentDate
    const monthsUntilStart = (cycleStartDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const shouldCreateCycle = hasStarted || (monthsUntilStart <= 6 && monthsUntilStart > 0)
    
    if ((hasStarted && !isExpired) || (!hasStarted && shouldCreateCycle)) {
      activeCycles.push(year)
    }
  }

  console.log(`\n🎯 RESULTADO: Luis debería tener ${activeCycles.length} ciclos activos: ${activeCycles.map(y => `Ciclo ${y}`).join(', ')}`)
  
  if (activeCycles.length >= 2) {
    console.log("✅ ¡Correcto! Luis tiene múltiples ciclos activos como debe ser.")
  } else {
    console.log("⚠️ Verificar: Luis debería tener al menos 2 ciclos activos.")
  }
}

testCycleDates().catch(console.error)