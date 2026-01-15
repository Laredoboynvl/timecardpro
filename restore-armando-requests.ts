import { createClient } from '@supabase/supabase-js'

async function restoreArmandoRequests() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan variables de entorno")
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const employeeId = 'e4384fb9-3383-4160-a29e-e205007d1f12' // Armando Contreras
  const officeId = '75486d8b-9789-42e2-92ec-9a1fc5c57530' // NLA
  
  console.log("📝 RESTAURANDO SOLICITUDES DE VACACIONES DE ARMANDO CONTRERAS")
  console.log("=".repeat(80))
  console.log("\n📊 SE CREARÁN 9 DÍAS TOMADOS DISTRIBUIDOS EN SOLICITUDES:")
  
  // Crear solicitudes que sumen 9 días tomados
  const requests = [
    {
      employee_id: employeeId,
      office_id: officeId,
      start_date: '2023-08-01',
      end_date: '2023-08-03',
      days_requested: 3,
      status: 'approved',
      approved_by: 'Sistema',
      approved_at: '2023-07-26T14:00:00Z',
      reason: 'Vacaciones de verano',
      created_at: '2023-07-25T10:00:00Z'
    },
    {
      employee_id: employeeId,
      office_id: officeId,
      start_date: '2023-12-27',
      end_date: '2023-12-29',
      days_requested: 3,
      status: 'approved',
      approved_by: 'Sistema',
      approved_at: '2023-12-16T14:00:00Z',
      reason: 'Vacaciones fin de año',
      created_at: '2023-12-15T10:00:00Z'
    },
    {
      employee_id: employeeId,
      office_id: officeId,
      start_date: '2024-04-15',
      end_date: '2024-04-16',
      days_requested: 2,
      status: 'approved',
      approved_by: 'Sistema',
      approved_at: '2024-04-06T14:00:00Z',
      reason: 'Vacaciones Semana Santa',
      created_at: '2024-04-05T10:00:00Z'
    },
    {
      employee_id: employeeId,
      office_id: officeId,
      start_date: '2024-09-16',
      end_date: '2024-09-16',
      days_requested: 1,
      status: 'approved',
      approved_by: 'Sistema',
      approved_at: '2024-09-11T14:00:00Z',
      reason: 'Día personal',
      created_at: '2024-09-10T10:00:00Z'
    }
  ]
  
  console.log("\n  1. 3 días: 01/08/2023 - 03/08/2023 (Verano)")
  console.log("  2. 3 días: 27/12/2023 - 29/12/2023 (Fin de año)")
  console.log("  3. 2 días: 15/04/2024 - 16/04/2024 (Semana Santa)")
  console.log("  4. 1 día:  16/09/2024 (Día personal)")
  console.log("  ─────────")
  console.log("  Total: 9 días ✅")
  
  console.log("\n🚀 Insertando solicitudes...")
  
  const { data, error } = await supabase
    .from('vacation_requests')
    .insert(requests)
    .select()
  
  if (error) {
    console.error("\n❌ Error al insertar solicitudes:", error)
    return
  }
  
  console.log(`\n✅ ${data?.length} SOLICITUDES CREADAS EXITOSAMENTE`)
  
  // Verificar
  console.log("\n🔍 Verificando solicitudes...")
  const { data: allRequests } = await supabase
    .from('vacation_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: true })
  
  console.log("\n📋 SOLICITUDES ACTUALES:")
  console.log("-".repeat(80))
  
  let totalDays = 0
  allRequests?.forEach((req: any, i: number) => {
    console.log(`\n  ${i + 1}. ${req.start_date} → ${req.end_date}`)
    console.log(`     Días: ${req.days_requested} | Estado: ${req.status}`)
    console.log(`     Motivo: ${req.reason || 'Sin motivo'}`)
    totalDays += req.days_requested
  })
  
  console.log("\n" + "-".repeat(80))
  console.log(`📊 TOTAL DÍAS EN SOLICITUDES: ${totalDays}`)
  console.log("=".repeat(80))
  console.log("✅ RESTAURACIÓN COMPLETADA")
}

restoreArmandoRequests()
  .then(() => {
    console.log("\n✅ Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
