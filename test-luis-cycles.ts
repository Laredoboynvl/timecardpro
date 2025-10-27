#!/usr/bin/env tsx

// Script para probar y corregir los ciclos de Luis Iván Acuña
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

async function testLuisCycles() {
  // Verificar que las variables de entorno estén disponibles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log("🔍 Buscando empleado: Luis Iván Acuña")
  
  // Buscar a Luis Iván Acuña
  const { data: employees, error: searchError } = await supabase
    .from("employees")
    .select("*")
    .or("first_name.ilike.%luis%, name.ilike.%luis%, first_name.ilike.%ivan%, name.ilike.%ivan%")
  
  if (searchError) {
    console.error("❌ Error buscando empleados:", searchError)
    return
  }
  
  console.log(`📋 Empleados encontrados (${employees?.length || 0}):`)
  employees?.forEach((emp: any) => {
    console.log(`  - ${emp.name || emp.first_name + ' ' + emp.last_name} (ID: ${emp.id})`)
    console.log(`    Fecha ingreso: ${emp.hire_date}`)
    if (emp.hire_date) {
      const years = calculateYearsOfService(emp.hire_date)
      const days = calculateVacationDays(years)
      console.log(`    Años servicio: ${years}, Días por ley: ${days}`)
    }
  })
  
  if (!employees || employees.length === 0) {
    console.log("❌ No se encontró a Luis Iván Acuña")
    return
  }
  
  // Tomar el primer empleado que coincida
  const luis = employees[0]
  console.log(`\n✅ Trabajando con: ${luis.name || luis.first_name + ' ' + luis.last_name}`)
  
  // Verificar sus ciclos actuales
  const { data: existingCycles, error: cyclesError } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", luis.id)
    .order("cycle_start_date", { ascending: true })
  
  if (cyclesError) {
    console.error("❌ Error obteniendo ciclos existentes:", cyclesError)
    return
  }
  
  console.log(`\n📊 Ciclos existentes (${existingCycles?.length || 0}):`)
  existingCycles?.forEach((cycle: any) => {
    const isExpired = new Date(cycle.cycle_end_date) < new Date()
    const daysUntilExpiry = Math.ceil((new Date(cycle.cycle_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    console.log(`  🔄 Ciclo ${new Date(cycle.cycle_start_date).getFullYear()}:`)
    console.log(`     Período: ${cycle.cycle_start_date} a ${cycle.cycle_end_date}`)
    console.log(`     Años servicio: ${cycle.years_of_service}`)
    console.log(`     Días ganados: ${cycle.days_earned}, Usados: ${cycle.days_used}, Disponibles: ${cycle.days_available}`)
    console.log(`     Expirado: ${isExpired ? '✅ SÍ' : `❌ NO (${daysUntilExpiry} días restantes)`}`)
  })
  
  // Calcular qué ciclos DEBERÍAN existir
  if (!luis.hire_date) {
    console.log("❌ El empleado no tiene fecha de ingreso")
    return
  }
  
  const hireDate = new Date(luis.hire_date)
  const currentDate = new Date()
  const yearsOfService = calculateYearsOfService(luis.hire_date)
  
  console.log(`\n🎯 Análisis esperado:`)
  console.log(`📅 Fecha ingreso: ${hireDate.toLocaleDateString('es-ES')}`)
  console.log(`⏰ Años de servicio: ${yearsOfService}`)
  console.log(`📋 Días por ley actual: ${calculateVacationDays(yearsOfService)}`)
  
  // Calcular ciclos que deberían existir
  console.log(`\n✅ Ciclos que DEBERÍAN existir:`)
  
  for (let year = 1; year <= yearsOfService + 1; year++) {
    const cycleStartDate = new Date(hireDate)
    cycleStartDate.setFullYear(hireDate.getFullYear() + year - 1)
    
    // Solo mostrar ciclos que ya comenzaron
    if (cycleStartDate > currentDate) continue
    
    const cycleEndDate = new Date(cycleStartDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    const daysEarned = calculateVacationDays(year)
    const isExpired = currentDate > cycleEndDate
    const daysUntilExpiry = Math.ceil((cycleEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log(`  📅 Ciclo ${year} (${cycleStartDate.getFullYear()}):`)
    console.log(`     Inicio: ${cycleStartDate.toLocaleDateString('es-ES')}`)
    console.log(`     Fin: ${cycleEndDate.toLocaleDateString('es-ES')}`)
    console.log(`     Días ganados: ${daysEarned}`)
    console.log(`     Estado: ${isExpired ? '🔴 EXPIRADO' : '🟢 ACTIVO'}`)
    if (!isExpired) {
      console.log(`     Días hasta expirar: ${daysUntilExpiry}`)
    }
    
    // Verificar si existe este ciclo
    const exists = existingCycles?.find((c: any) => c.cycle_start_date === cycleStartDate.toISOString().split('T')[0])
    console.log(`     En BD: ${exists ? '✅ SÍ' : '❌ NO - NECESITA CREARSE'}`)
  }
  
  console.log("\n🔧 Para corregir los ciclos, ejecuta la función createVacationCyclesForEmployee en el sistema.")
}

// Ejecutar la prueba
testLuisCycles().catch(console.error)