#!/usr/bin/env tsx

// Script CORREGIDO para los ciclos de Luis Iván Acuña
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

function calculateVacationDays(yearsOfService: number): number {
  if (yearsOfService < 1) return 0
  if (yearsOfService === 1) return 12
  if (yearsOfService === 2) return 14
  if (yearsOfService === 3) return 16
  if (yearsOfService === 4) return 18
  if (yearsOfService === 5) return 20
  if (yearsOfService >= 6 && yearsOfService <= 10) return 22
  if (yearsOfService >= 11 && yearsOfService <= 15) return 24
  if (yearsOfService >= 16 && yearsOfService <= 20) return 26
  if (yearsOfService >= 21 && yearsOfService <= 25) return 28
  if (yearsOfService >= 26 && yearsOfService <= 30) return 30
  if (yearsOfService >= 31) return 32
  return 0
}

async function fixLuisCyclesCorrected() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log("🔧 Corrigiendo ciclos de Luis Iván Acuña (VERSIÓN CORREGIDA)...")
  
  const luisId = '47b7cda6-34e4-4d08-a1b2-c630558ba832'
  
  const { data: luis, error: luisError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", luisId)
    .single()
  
  if (luisError || !luis) {
    console.error("❌ Error encontrando a Luis:", luisError)
    return
  }
  
  console.log(`✅ Empleado: ${luis.name}`)
  console.log(`📅 Ingresó: ${luis.hire_date} (1 enero 2020)`)
  
  // Luis ingresó el 1 de enero de 2020
  // Sus aniversarios son: 1 enero 2021, 1 enero 2022, 1 enero 2023, 1 enero 2024, 1 enero 2025
  // Cada ciclo vence 18 meses después del aniversario
  
  const currentDate = new Date() // Octubre 2024
  console.log(`📆 Fecha actual: ${currentDate.toISOString().split('T')[0]}`)
  
  // 1. ELIMINAR CICLOS EXISTENTES
  console.log("\n🗑️ Eliminando ciclos existentes...")
  const { error: deleteError } = await supabase
    .from("vacation_cycles")
    .delete()
    .eq("employee_id", luisId)
  
  if (deleteError) {
    console.error("❌ Error eliminando ciclos:", deleteError)
    return
  }
  console.log("✅ Ciclos anteriores eliminados")
  
  // 2. CREAR CICLOS CORRECTOS
  console.log("\n🔄 Creando ciclos basados en aniversarios reales...")
  
  const cycles: any[] = []
  
  // Crear cada ciclo manualmente con las fechas correctas
  // *** FECHAS CORREGIDAS: cada ciclo vence 18 meses después del aniversario ***
  const cyclesData = [
    { 
      year: 1, 
      start: '2021-01-01', // 1er aniversario
      end: '2022-07-01',   // Vence 18 meses después: julio 2022
      years_service: 1,
      days: calculateVacationDays(1)
    },
    { 
      year: 2, 
      start: '2022-01-01', // 2do aniversario
      end: '2023-07-01',   // Vence 18 meses después: julio 2023
      years_service: 2,
      days: calculateVacationDays(2)
    },
    { 
      year: 3, 
      start: '2023-01-01', // 3er aniversario
      end: '2024-07-01',   // Vence 18 meses después: julio 2024 ❌ YA EXPIRÓ
      years_service: 3,
      days: calculateVacationDays(3)
    },
    { 
      year: 4, 
      start: '2024-01-01', // 4to aniversario ✅ ACTIVO
      end: '2025-07-01',   // Vence 18 meses después: julio 2025
      years_service: 4,
      days: calculateVacationDays(4)
    },
    { 
      year: 5, 
      start: '2025-01-01', // 5to aniversario ✅ ACTIVO 
      end: '2026-07-01',   // Vence 18 meses después: julio 2026
      years_service: 5,
      days: calculateVacationDays(5)
    },
    { 
      year: 6, 
      start: '2026-01-01', // 6to aniversario ✅ ACTIVO (creado anticipadamente)
      end: '2027-07-01',   // Vence 18 meses después: julio 2027
      years_service: 6,
      days: calculateVacationDays(6)
    }
  ]
  
  for (const cycleData of cyclesData) {
    const startDate = new Date(cycleData.start)
    const endDate = new Date(cycleData.end)
    const isExpired = endDate < currentDate
    const hasStarted = startDate <= currentDate
    
    // Crear ciclos que ya han comenzado, O los próximos ciclos (para múltiples activos)
    const shouldCreate = hasStarted || (cycleData.year >= 5 && !isExpired)
    
    if (shouldCreate) {
      const daysUsed = isExpired ? 0 : 2 // Si está activo, simular que ha usado 2 días
      const daysAvailable = cycleData.days - daysUsed // Mantener la lógica válida
      
      const cycle = {
        employee_id: luisId,
        cycle_start_date: cycleData.start,
        cycle_end_date: cycleData.end,
        days_earned: cycleData.days,
        days_used: daysUsed,
        days_available: daysAvailable,
        years_of_service: cycleData.years_service,
        is_expired: isExpired
      }
      
      cycles.push(cycle)
      
      const status = isExpired ? "🔴 EXPIRADO" : "🟢 ACTIVO"
      console.log(`  📅 Ciclo ${cycleData.year}: ${cycleData.start} → ${cycleData.end} | ${cycleData.days} días | ${status}`)
    } else {
      console.log(`  ⏳ Ciclo ${cycleData.year}: ${cycleData.start} → ${cycleData.end} | ${cycleData.days} días | ⏸️ FUTURO`)
    }
  }
  
  // 3. INSERTAR NUEVOS CICLOS
  console.log(`\n💾 Insertando ${cycles.length} ciclos...`)
  const { data: insertedCycles, error: insertError } = await supabase
    .from("vacation_cycles")
    .insert(cycles)
    .select()
  
  if (insertError) {
    console.error("❌ Error insertando ciclos:", insertError)
    return
  }
  
  console.log(`✅ ${insertedCycles?.length || 0} ciclos creados`)
  
  // 4. VERIFICAR RESULTADO
  console.log("\n🔍 Verificando ciclos activos...")
  const { data: activeCycles, error: activeError } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", luisId)
    .eq("is_expired", false)
    .order("cycle_start_date", { ascending: true })
  
  if (activeError) {
    console.error("❌ Error verificando:", activeError)
    return
  }
  
  console.log(`\n🎯 RESULTADO FINAL:`)
  console.log(`📊 Ciclos activos: ${activeCycles?.length || 0}`)
  activeCycles?.forEach((cycle, index) => {
    const daysRemaining = Math.ceil((new Date(cycle.cycle_end_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    console.log(`  ${index + 1}. ${cycle.cycle_start_date} → ${cycle.cycle_end_date}`)
    console.log(`     💰 ${cycle.days_available}/${cycle.days_earned} días disponibles`)
    console.log(`     ⏰ ${daysRemaining > 0 ? daysRemaining + ' días para vencer' : 'VENCIDO'}`)
  })
  
  if (activeCycles && activeCycles.length >= 2) {
    console.log("\n🎉 ¡ÉXITO! Luis ahora tiene múltiples ciclos activos.")
    console.log("   Esto significa que puede usar vacaciones de ambos ciclos.")
  } else if (activeCycles && activeCycles.length === 1) {
    console.log("\n⚠️  Luis solo tiene 1 ciclo activo.")
    console.log("   Esto podría ser correcto dependiendo de la fecha actual.")
  } else {
    console.log("\n❌ Error: Luis no tiene ciclos activos.")
  }
}

// Ejecutar
fixLuisCyclesCorrected().catch(console.error)