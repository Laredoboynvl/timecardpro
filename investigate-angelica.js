// Script para investigar el caso de Angélica Nakasono
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function investigateAngelica() {
  console.log('🔍 INVESTIGANDO: Angélica Nakasono - 30 diciembre 2024\n')

  try {
    // 1. Buscar empleados con nombres similares a Angélica Nakasono
    console.log('👤 Buscando empleados con "Angélica" o "Nakasono"...')
    
    const searchTerms = ['Angélica', 'Angelica', 'Nakasono']
    let foundEmployees = []

    for (const term of searchTerms) {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('name', `%${term}%`)
        .eq('is_active', true)

      if (!error && employees) {
        foundEmployees = [...foundEmployees, ...employees]
      }
    }

    // Eliminar duplicados
    const uniqueEmployees = foundEmployees.filter((emp, index, self) => 
      self.findIndex(e => e.id === emp.id) === index
    )

    console.log(`Empleados encontrados: ${uniqueEmployees.length}`)
    
    if (uniqueEmployees.length === 0) {
      console.log('❌ No se encontró a Angélica Nakasono')
      console.log('\n📋 Mostrando todos los empleados activos para referencia...')
      
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('name, employee_code, office_code, hire_date')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(20)

      allEmployees?.forEach((emp, i) => {
        console.log(`${i + 1}. ${emp.name} (${emp.employee_code}) - ${emp.office_code}`)
      })
      return
    }

    // 2. Analizar cada empleado encontrado
    for (const employee of uniqueEmployees) {
      console.log(`\n👤 EMPLEADO: ${employee.name}`)
      console.log(`   ID: ${employee.id}`)
      console.log(`   Código: ${employee.employee_code}`)
      console.log(`   Oficina: ${employee.office_code || 'No asignada'}`)
      console.log(`   Contratado: ${employee.hire_date}`)

      // Obtener ciclos de vacaciones
      const { data: cycles, error: cyclesError } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', employee.id)
        .order('cycle_start_date', { ascending: true })

      if (cyclesError) {
        console.error(`❌ Error al obtener ciclos:`, cyclesError)
        continue
      }

      console.log(`\n📅 CICLOS DE VACACIONES (${cycles?.length || 0}):`)
      
      if (!cycles || cycles.length === 0) {
        console.log('   ❌ No tiene ciclos de vacaciones creados')
        continue
      }

      cycles.forEach((cycle, i) => {
        const isExpired = new Date(cycle.cycle_end_date) < new Date()
        const year = new Date(cycle.cycle_start_date).getFullYear()
        const status = isExpired ? '🔴 EXPIRADO' : '🟢 ACTIVO'
        
        console.log(`   ${i + 1}. Ciclo ${year}:`)
        console.log(`      📅 ${cycle.cycle_start_date} → ${cycle.cycle_end_date}`)
        console.log(`      📊 Ganados: ${cycle.days_earned}, Usados: ${cycle.days_used}, Disponibles: ${cycle.days_available}`)
        console.log(`      🏷️  Estado: ${status}`)
      })

      // Buscar solicitudes de vacaciones específicamente para 30 diciembre 2024
      console.log(`\n📝 BUSCANDO SOLICITUD PARA 30 DICIEMBRE 2024:`)
      
      const { data: dec30Request, error: requestError } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('start_date', '2024-12-30')

      if (requestError) {
        console.error('❌ Error al buscar solicitud:', requestError)
        continue
      }

      if (!dec30Request || dec30Request.length === 0) {
        console.log('   ❌ No se encontró solicitud para 30 diciembre 2024')
      } else {
        dec30Request.forEach(req => {
          console.log(`   ✅ Solicitud encontrada:`)
          console.log(`      📅 ${req.start_date} → ${req.end_date}`)
          console.log(`      📊 Días solicitados: ${req.days_requested}`)
          console.log(`      🏷️  Estado: ${req.status}`)
          console.log(`      📝 Motivo: ${req.reason || 'Sin motivo'}`)
          console.log(`      🕒 Creada: ${new Date(req.created_at).toLocaleString('es-ES')}`)
        })
      }

      // Buscar todas las solicitudes de vacaciones del empleado
      console.log(`\n📝 TODAS LAS SOLICITUDES:`)
      
      const { data: allRequests, error: allRequestsError } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('start_date', { ascending: true })

      if (allRequestsError) {
        console.error('❌ Error al obtener todas las solicitudes:', allRequestsError)
        continue
      }

      if (!allRequests || allRequests.length === 0) {
        console.log('   ❌ No tiene solicitudes de vacaciones')
      } else {
        console.log(`   Total solicitudes: ${allRequests.length}`)
        allRequests.forEach((req, i) => {
          const statusIcon = req.status === 'approved' ? '🟢' : 
                            req.status === 'cancelled' ? '🔴' : 
                            req.status === 'rejected' ? '🟡' : '⚪'
          console.log(`   ${i + 1}. ${statusIcon} ${req.start_date} → ${req.end_date} (${req.days_requested} días) - ${req.status.toUpperCase()}`)
        })

        // Verificar si hay discrepancias
        const approvedRequests = allRequests.filter(req => req.status === 'approved')
        const totalApprovedDays = approvedRequests.reduce((sum, req) => sum + req.days_requested, 0)
        const totalUsedInCycles = cycles.reduce((sum, cycle) => sum + cycle.days_used, 0)

        console.log(`\n🔍 VERIFICACIÓN DE BALANCE:`)
        console.log(`   Días en solicitudes aprobadas: ${totalApprovedDays}`)
        console.log(`   Días usados en ciclos: ${totalUsedInCycles}`)
        console.log(`   Diferencia: ${Math.abs(totalApprovedDays - totalUsedInCycles)}`)

        if (totalApprovedDays !== totalUsedInCycles) {
          console.log(`   ⚠️  HAY DISCREPANCIA - Los números no coinciden`)
          console.log(`   🔧 Posible problema en el algoritmo de descuento`)
        } else {
          console.log(`   ✅ Balance correcto`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

investigateAngelica()