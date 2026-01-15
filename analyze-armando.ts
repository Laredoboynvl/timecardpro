import { createClient } from '@supabase/supabase-js'

async function analyzeArmandoContreras() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno. Asegúrate de tener .env.local configurado")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log("🔍 Buscando empleado Armando Contreras...")
  
  // Buscar empleado por nombre
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .ilike('name', '%Armando%Contreras%')
    .or('first_name.ilike.%Armando%,last_name.ilike.%Contreras%')
  
  if (empError) {
    console.error("❌ Error buscando empleado:", empError)
    return
  }
  
  if (!employees || employees.length === 0) {
    console.log("❌ No se encontró empleado con ese nombre")
    return
  }
  
  console.log(`\n✅ Encontrado(s) ${employees.length} empleado(s):`)
  employees.forEach((emp: any) => {
    console.log(`  - ID: ${emp.id}`)
    console.log(`  - Nombre: ${emp.name || `${emp.first_name} ${emp.last_name}`}`)
    console.log(`  - Oficina: ${emp.office_id}`)
    console.log(`  - Fecha contratación: ${emp.hire_date}`)
    console.log(`  - Código: ${emp.employee_code}`)
    console.log("")
  })
  
  // Analizar cada empleado encontrado
  for (const employee of employees) {
    console.log(`\n${"=".repeat(80)}`)
    console.log(`📊 ANÁLISIS DETALLADO: ${employee.name || `${employee.first_name} ${employee.last_name}`}`)
    console.log(`${"=".repeat(80)}\n`)
    
    // 1. Obtener ciclos de vacaciones
    const { data: cycles, error: cyclesError } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', employee.id)
      .order('cycle_start_date', { ascending: true })
    
    if (cyclesError) {
      console.error("❌ Error obteniendo ciclos:", cyclesError)
      continue
    }
    
    console.log(`📅 CICLOS DE VACACIONES (${cycles?.length || 0} ciclos):`)
    console.log("-".repeat(80))
    
    let totalDaysEarned = 0
    let totalDaysUsed = 0
    let totalDaysAvailable = 0
    
    cycles?.forEach((cycle: any, index: number) => {
      const startDate = new Date(cycle.cycle_start_date)
      const endDate = new Date(cycle.cycle_end_date)
      const isActive = cycle.is_active
      
      console.log(`\n  Ciclo ${index + 1} (${isActive ? '✅ ACTIVO' : '⏸️  Inactivo'}):`)
      console.log(`    ID: ${cycle.id}`)
      console.log(`    Periodo: ${startDate.toLocaleDateString('es-MX')} → ${endDate.toLocaleDateString('es-MX')}`)
      console.log(`    Días ganados: ${cycle.days_earned}`)
      console.log(`    Días usados: ${cycle.days_used}`)
      console.log(`    Días disponibles: ${cycle.days_available}`)
      console.log(`    Creado: ${new Date(cycle.created_at).toLocaleDateString('es-MX')}`)
      
      totalDaysEarned += cycle.days_earned
      totalDaysUsed += cycle.days_used
      totalDaysAvailable += cycle.days_available
    })
    
    console.log("\n" + "-".repeat(80))
    console.log(`  📊 TOTALES:`)
    console.log(`    Total días ganados: ${totalDaysEarned}`)
    console.log(`    Total días usados: ${totalDaysUsed}`)
    console.log(`    Total días disponibles: ${totalDaysAvailable}`)
    console.log("-".repeat(80))
    
    // 2. Obtener solicitudes de vacaciones
    const { data: requests, error: reqError } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('start_date', { ascending: false })
    
    if (reqError) {
      console.error("❌ Error obteniendo solicitudes:", reqError)
      continue
    }
    
    console.log(`\n\n📝 SOLICITUDES DE VACACIONES (${requests?.length || 0} solicitudes):`)
    console.log("-".repeat(80))
    
    let approvedDays = 0
    let pendingDays = 0
    let rejectedDays = 0
    
    requests?.forEach((req: any, index: number) => {
      const startDate = new Date(req.start_date)
      const endDate = new Date(req.end_date)
      const days = req.days_requested
      const status = req.status
      
      let statusIcon = '❓'
      if (status === 'approved') {
        statusIcon = '✅'
        approvedDays += days
      } else if (status === 'pending') {
        statusIcon = '⏳'
        pendingDays += days
      } else if (status === 'rejected') {
        statusIcon = '❌'
        rejectedDays += days
      }
      
      console.log(`\n  Solicitud ${index + 1} ${statusIcon}:`)
      console.log(`    ID: ${req.id}`)
      console.log(`    Estado: ${status.toUpperCase()}`)
      console.log(`    Periodo: ${startDate.toLocaleDateString('es-MX')} → ${endDate.toLocaleDateString('es-MX')}`)
      console.log(`    Días solicitados: ${days}`)
      console.log(`    Fecha solicitud: ${new Date(req.created_at).toLocaleDateString('es-MX')}`)
      if (req.approved_at) {
        console.log(`    Fecha aprobación: ${new Date(req.approved_at).toLocaleDateString('es-MX')}`)
      }
    })
    
    console.log("\n" + "-".repeat(80))
    console.log(`  📊 RESUMEN SOLICITUDES:`)
    console.log(`    Días aprobados: ${approvedDays}`)
    console.log(`    Días pendientes: ${pendingDays}`)
    console.log(`    Días rechazados: ${rejectedDays}`)
    console.log("-".repeat(80))
    
    // 3. Calcular antigüedad
    const hireDate = new Date(employee.hire_date)
    const today = new Date()
    const yearsWorked = (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    
    console.log(`\n\n👤 INFORMACIÓN DEL EMPLEADO:`)
    console.log("-".repeat(80))
    console.log(`  Fecha contratación: ${hireDate.toLocaleDateString('es-MX')}`)
    console.log(`  Años trabajados: ${yearsWorked.toFixed(2)} años`)
    console.log(`  Días por ley (según años):`)
    
    // Calcular días según Ley Federal del Trabajo
    let daysByLaw = 0
    if (yearsWorked < 1) {
      daysByLaw = 12
      console.log(`    • Menos de 1 año: 12 días`)
    } else if (yearsWorked < 2) {
      daysByLaw = 12
      console.log(`    • 1 año: 12 días`)
    } else if (yearsWorked < 3) {
      daysByLaw = 14
      console.log(`    • 2 años: 14 días`)
    } else if (yearsWorked < 4) {
      daysByLaw = 16
      console.log(`    • 3 años: 16 días ✅`)
    } else if (yearsWorked < 5) {
      daysByLaw = 18
      console.log(`    • 4 años: 18 días`)
    } else {
      daysByLaw = 18 + Math.floor((yearsWorked - 4) / 5) * 2
      console.log(`    • ${Math.floor(yearsWorked)} años: ${daysByLaw} días`)
    }
    
    console.log("-".repeat(80))
    
    // 4. ANÁLISIS Y DIAGNÓSTICO
    console.log(`\n\n🔍 DIAGNÓSTICO:`)
    console.log("=".repeat(80))
    
    console.log(`\n  ✓ Según la ley: ${daysByLaw} días por año`)
    console.log(`  ✓ En sistema (ciclos): ${totalDaysEarned} días ganados`)
    console.log(`  ✓ Días usados en ciclos: ${totalDaysUsed}`)
    console.log(`  ✓ Días disponibles en ciclos: ${totalDaysAvailable}`)
    console.log(`  ✓ Días aprobados en solicitudes: ${approvedDays}`)
    
    const difference = totalDaysEarned - daysByLaw
    if (difference > 0) {
      console.log(`\n  ⚠️  HAY ${difference} DÍAS DE MÁS en el sistema`)
    } else if (difference < 0) {
      console.log(`\n  ⚠️  FALTAN ${Math.abs(difference)} DÍAS en el sistema`)
    } else {
      console.log(`\n  ✅ Los días ganados coinciden con la ley`)
    }
    
    // Verificar consistencia
    const expectedAvailable = totalDaysEarned - totalDaysUsed
    if (expectedAvailable !== totalDaysAvailable) {
      console.log(`\n  ⚠️  INCONSISTENCIA DETECTADA:`)
      console.log(`     Disponibles calculados (ganados - usados): ${expectedAvailable}`)
      console.log(`     Disponibles en sistema: ${totalDaysAvailable}`)
      console.log(`     Diferencia: ${totalDaysAvailable - expectedAvailable}`)
    }
    
    // 5. PROPUESTA DE CORRECCIÓN
    console.log(`\n\n💡 PROPUESTA DE CORRECCIÓN:`)
    console.log("=".repeat(80))
    
    if (yearsWorked >= 3 && yearsWorked < 4) {
      console.log(`\n  Empleado con 3 años debe tener: 16 días por ley`)
      console.log(`  Usuario reporta:`)
      console.log(`    • Días disponibles esperados: 7`)
      console.log(`    • Días tomados esperados: 9`)
      console.log(`    • Total (7 + 9 = 16) ✅ Correcto según ley`)
      
      if (totalDaysUsed !== 9) {
        console.log(`\n  ⚠️  ACCIÓN NECESARIA:`)
        console.log(`     Actualizar días usados de ${totalDaysUsed} a 9`)
      }
      
      if (totalDaysAvailable !== 7) {
        console.log(`     Actualizar días disponibles de ${totalDaysAvailable} a 7`)
      }
      
      if (totalDaysEarned !== 16) {
        console.log(`     Actualizar días ganados de ${totalDaysEarned} a 16`)
      }
      
      // Mostrar query de corrección (SIN EJECUTAR)
      console.log(`\n  📝 QUERY DE CORRECCIÓN (NO EJECUTADO):`)
      console.log(`  -`.repeat(40))
      
      cycles?.forEach((cycle: any) => {
        if (cycle.is_active) {
          console.log(`\n  UPDATE vacation_cycles SET`)
          console.log(`    days_earned = 16,`)
          console.log(`    days_used = 9,`)
          console.log(`    days_available = 7,`)
          console.log(`    updated_at = NOW()`)
          console.log(`  WHERE id = '${cycle.id}';`)
        }
      })
    }
    
    console.log("\n" + "=".repeat(80))
    console.log(`FIN DEL ANÁLISIS PARA: ${employee.name || `${employee.first_name} ${employee.last_name}`}`)
    console.log("=".repeat(80) + "\n")
  }
  
  console.log("\n✅ Análisis completado. NO SE EJECUTARON CAMBIOS en la base de datos.")
  console.log("📋 Revisa el análisis y confirma si deseas aplicar las correcciones propuestas.\n")
}

// Ejecutar análisis
analyzeArmandoContreras()
  .then(() => {
    console.log("Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error en script:", error)
    process.exit(1)
  })
