#!/usr/bin/env tsx

// Script para corregir específicamente los ciclos de Luis Iván Acuña
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Funciones auxiliares
function calculateYearsOfService(hireDate: string): number {
  const hire = new Date(hireDate)
  const today = new Date()
  let years = today.getFullYear() - hire.getFullYear()
  
  // Ajustar si no ha pasado el aniversario este año
  const hasHadAnniversary = (today.getMonth() > hire.getMonth()) ||
    (today.getMonth() === hire.getMonth() && today.getDate() >= hire.getDate())
  
  if (!hasHadAnniversary) {
    years--
  }
  
  return years
}

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

async function fixLuisCycles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log("🔧 Corrigiendo ciclos de Luis Iván Acuña...")
  
  // Buscar a Luis Iván Acuña (ID conocido del script anterior)
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
  
  console.log(`✅ Empleado encontrado: ${luis.name}`)
  console.log(`📅 Fecha de ingreso: ${luis.hire_date}`)
  
  const hireDate = new Date(luis.hire_date)
  const currentDate = new Date()
  
  // 1. ELIMINAR CICLOS EXISTENTES (basados en calendario)
  console.log("\n🗑️ Eliminando ciclos existentes (calendario)...")
  const { error: deleteError } = await supabase
    .from("vacation_cycles")
    .delete()
    .eq("employee_id", luisId)
  
  if (deleteError) {
    console.error("❌ Error eliminando ciclos:", deleteError)
    return
  }
  console.log("✅ Ciclos anteriores eliminados")
  
  // 2. CREAR NUEVOS CICLOS BASADOS EN ANIVERSARIO
  console.log("\n🔄 Creando nuevos ciclos basados en aniversario...")
  
  const cycles: any[] = []
  const yearsOfService = Math.floor((currentDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  
  console.log(`📊 Años de servicio calculados: ${yearsOfService}`)
  
  // Crear ciclos desde el primer aniversario hasta ahora
  for (let year = 1; year <= yearsOfService + 1; year++) {
    // Fecha de aniversario para este ciclo (1 enero cada año desde contratación)
    const anniversaryDate = new Date(hireDate)
    anniversaryDate.setFullYear(hireDate.getFullYear() + year - 1)
    
    // El ciclo vence 18 meses después del aniversario
    const expirationDate = new Date(anniversaryDate)
    expirationDate.setMonth(expirationDate.getMonth() + 18)
    
    // Determinar si este ciclo ya pasó o sigue activo
    const isExpired = expirationDate < currentDate
    const daysEarned = calculateVacationDays(year)
    
    const cycle = {
      employee_id: luisId,
      cycle_start_date: anniversaryDate.toISOString().split('T')[0],
      cycle_end_date: expirationDate.toISOString().split('T')[0],
      days_earned: daysEarned,
      days_used: 0, // Empezamos desde cero
      days_available: daysEarned,
      years_of_service: year,
      is_expired: isExpired
    }
    
    cycles.push(cycle)
    
    const status = isExpired ? "🔴 EXPIRADO" : "🟢 ACTIVO"
    console.log(`  📅 Ciclo ${year}: ${anniversaryDate.toISOString().split('T')[0]} → ${expirationDate.toISOString().split('T')[0]} | ${daysEarned} días | ${status}`)
  }
  
  // 3. INSERTAR NUEVOS CICLOS
  console.log(`\n💾 Insertando ${cycles.length} ciclos nuevos...`)
  const { data: insertedCycles, error: insertError } = await supabase
    .from("vacation_cycles")
    .insert(cycles)
    .select()
  
  if (insertError) {
    console.error("❌ Error insertando ciclos:", insertError)
    return
  }
  
  console.log(`✅ ${insertedCycles?.length || 0} ciclos creados exitosamente`)
  
  // 4. VERIFICAR RESULTADO
  console.log("\n🔍 Verificando ciclos activos...")
  const { data: activeCycles, error: activeError } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", luisId)
    .eq("is_expired", false)
    .order("cycle_start_date", { ascending: true })
  
  if (activeError) {
    console.error("❌ Error verificando ciclos:", activeError)
    return
  }
  
  console.log(`\n🎯 RESULTADO FINAL:`)
  console.log(`📊 Ciclos activos: ${activeCycles?.length || 0}`)
  activeCycles?.forEach((cycle, index) => {
    console.log(`  ${index + 1}. ${cycle.cycle_start_date} → ${cycle.cycle_end_date} | ${cycle.days_available}/${cycle.days_earned} días`)
  })
  
  if (activeCycles && activeCycles.length >= 2) {
    console.log("\n🎉 ¡ÉXITO! Luis ahora tiene múltiples ciclos activos como debería.")
  } else {
    console.log("\n⚠️  Advertencia: Luis debería tener al menos 2 ciclos activos.")
  }
}

// Ejecutar la corrección
fixLuisCycles().catch(console.error)