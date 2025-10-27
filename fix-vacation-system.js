// Script para corregir el problema de descuento de días y limpiar datos de Tijuana
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para descontar días de ciclos
async function deductVacationDaysFromCycles(employeeId, daysToDeduct) {
  try {
    console.log(`🔄 Descontando ${daysToDeduct} días para empleado ${employeeId}`)
    
    // Obtener ciclos activos ordenados por antigüedad (más antiguos primero)
    const { data: cycles, error: cyclesError } = await supabase
      .from("vacation_cycles")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_expired", false)
      .gt("days_available", 0)
      .order("cycle_start_date", { ascending: true })

    if (cyclesError || !cycles || cycles.length === 0) {
      console.error(`❌ Error obteniendo ciclos:`, cyclesError)
      return false
    }

    let remainingDaysToDeduct = daysToDeduct

    // Deducir días de los ciclos más antiguos primero
    for (const cycle of cycles) {
      if (remainingDaysToDeduct <= 0) break

      const daysToDeductFromThisCycle = Math.min(remainingDaysToDeduct, cycle.days_available)
      const newDaysUsed = cycle.days_used + daysToDeductFromThisCycle
      const newDaysAvailable = cycle.days_available - daysToDeductFromThisCycle

      // Actualizar el ciclo
      const { error: updateError } = await supabase
        .from("vacation_cycles")
        .update({
          days_used: newDaysUsed,
          days_available: newDaysAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", cycle.id)

      if (updateError) {
        console.error(`❌ Error actualizando ciclo ${cycle.id}:`, updateError)
        return false
      }

      remainingDaysToDeduct -= daysToDeductFromThisCycle
      console.log(`   ✅ Ciclo ${new Date(cycle.cycle_start_date).getFullYear()}: -${daysToDeductFromThisCycle} días (${newDaysAvailable} disponibles)`)
    }

    if (remainingDaysToDeduct > 0) {
      console.error(`❌ No se pudieron deducir todos los días. Faltan ${remainingDaysToDeduct}`)
      return false
    }

    console.log(`✅ Se deducieron exitosamente ${daysToDeduct} días`)
    return true

  } catch (error) {
    console.error("❌ Error en deductVacationDaysFromCycles:", error)
    return false
  }
}

async function fixVacationSystem() {
  console.log('🔧 INICIANDO CORRECCIÓN DEL SISTEMA DE VACACIONES\n')

  try {
    // 1. AUDITAR EMPLEADOS CON DISCREPANCIAS
    console.log('1️⃣ AUDITANDO EMPLEADOS CON DISCREPANCIAS...\n')
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .eq('is_active', true)

    if (employeesError) {
      console.error('❌ Error obteniendo empleados:', employeesError)
      return
    }

    const problematicEmployees = []

    for (const employee of employees) {
      // Obtener solicitudes aprobadas
      const { data: requests } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')

      // Obtener ciclos
      const { data: cycles } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', employee.id)

      if (!requests || !cycles) continue

      const totalApprovedDays = requests.reduce((sum, req) => sum + req.days_requested, 0)
      const totalUsedInCycles = cycles.reduce((sum, cycle) => sum + cycle.days_used, 0)

      if (totalApprovedDays !== totalUsedInCycles && totalApprovedDays > 0) {
        const discrepancy = totalApprovedDays - totalUsedInCycles
        problematicEmployees.push({
          employee,
          totalApprovedDays,
          totalUsedInCycles,
          discrepancy,
          requests,
          cycles
        })
        
        console.log(`⚠️  ${employee.name} (${employee.employee_code}):`)
        console.log(`   Días aprobados: ${totalApprovedDays}`)
        console.log(`   Días descontados: ${totalUsedInCycles}`)
        console.log(`   Diferencia: ${discrepancy} días`)
      }
    }

    console.log(`\n📊 RESUMEN: ${problematicEmployees.length} empleados con discrepancias\n`)

    // 2. CORREGIR DISCREPANCIAS
    console.log('2️⃣ CORRIGIENDO DISCREPANCIAS...\n')
    
    for (const emp of problematicEmployees) {
      console.log(`🔧 Corrigiendo: ${emp.employee.name}`)
      
      if (emp.discrepancy > 0) {
        // Descontar días faltantes
        const success = await deductVacationDaysFromCycles(emp.employee.id, emp.discrepancy)
        if (success) {
          console.log(`✅ Se corrigieron ${emp.discrepancy} días faltantes`)
        } else {
          console.log(`❌ No se pudieron corregir todos los días`)
        }
      }
      console.log('')
    }

    // 3. LIMPIAR DATOS DE TIJUANA
    console.log('3️⃣ LIMPIANDO DATOS DE TIJUANA...\n')
    
    // Obtener empleados de Tijuana/TIJ
    const { data: tijuanaEmployees, error: tijError } = await supabase
      .from('employees')
      .select('id, name, employee_code, office_code')
      .or('office_code.eq.TIJ,office_code.eq.TIJUANA,name.ilike.%tijuana%')

    if (tijError) {
      console.error('❌ Error obteniendo empleados de Tijuana:', tijError)
    } else {
      console.log(`📋 Empleados de Tijuana encontrados: ${tijuanaEmployees?.length || 0}`)
      
      if (tijuanaEmployees && tijuanaEmployees.length > 0) {
        tijuanaEmployees.forEach(emp => {
          console.log(`   • ${emp.name} (${emp.employee_code}) - ${emp.office_code}`)
        })

        console.log('\n🗑️ Eliminando solicitudes de vacaciones de Tijuana...')
        
        for (const emp of tijuanaEmployees) {
          // Eliminar solicitudes de vacaciones
          const { error: deleteRequestsError } = await supabase
            .from('vacation_requests')
            .delete()
            .eq('employee_id', emp.id)

          if (deleteRequestsError) {
            console.error(`❌ Error eliminando solicitudes de ${emp.name}:`, deleteRequestsError)
          } else {
            console.log(`✅ Solicitudes eliminadas: ${emp.name}`)
          }

          // Eliminar ciclos de vacaciones
          const { error: deleteCyclesError } = await supabase
            .from('vacation_cycles')
            .delete()
            .eq('employee_id', emp.id)

          if (deleteCyclesError) {
            console.error(`❌ Error eliminando ciclos de ${emp.name}:`, deleteCyclesError)
          } else {
            console.log(`✅ Ciclos eliminados: ${emp.name}`)
          }
        }

        console.log('\n🗑️ Eliminando empleados de Tijuana...')
        
        for (const emp of tijuanaEmployees) {
          const { error: deleteEmployeeError } = await supabase
            .from('employees')
            .delete()
            .eq('id', emp.id)

          if (deleteEmployeeError) {
            console.error(`❌ Error eliminando empleado ${emp.name}:`, deleteEmployeeError)
          } else {
            console.log(`✅ Empleado eliminado: ${emp.name}`)
          }
        }
      } else {
        console.log('✅ No se encontraron empleados de Tijuana para eliminar')
      }
    }

    // 4. VERIFICAR CORRECCIONES
    console.log('\n4️⃣ VERIFICANDO CORRECCIONES...\n')
    
    // Verificar Angélica específicamente
    const { data: angelica } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', '20029290')
      .single()

    if (angelica) {
      console.log(`👤 Verificando Angélica Morales Nakazono:`)
      
      const { data: angelicaRequests } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', angelica.id)
        .eq('status', 'approved')

      const { data: angelicaCycles } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', angelica.id)

      const totalApproved = angelicaRequests?.reduce((sum, req) => sum + req.days_requested, 0) || 0
      const totalUsed = angelicaCycles?.reduce((sum, cycle) => sum + cycle.days_used, 0) || 0

      console.log(`   Días aprobados: ${totalApproved}`)
      console.log(`   Días descontados: ${totalUsed}`)
      console.log(`   Estado: ${totalApproved === totalUsed ? '✅ CORRECTO' : '❌ AÚN HAY DISCREPANCIA'}`)
      
      if (angelicaCycles) {
        angelicaCycles.forEach(cycle => {
          const year = new Date(cycle.cycle_start_date).getFullYear()
          console.log(`   Ciclo ${year}: ${cycle.days_used} usados, ${cycle.days_available} disponibles`)
        })
      }
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixVacationSystem()