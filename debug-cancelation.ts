import { createClient } from '@supabase/supabase-js'

// Variables de entorno hardcodeadas para prueba rápida
const supabaseUrl = 'https://mypxhgghxkpdlpqksmdj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHhoZ2doeGtwZGxwcWtzbWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyOTA3MzEsImV4cCI6MjA0Mjg2NjczMX0.FlfOX9PpgupgPGrCSXdHHptxfR8qFs0SsCupZzE6-QQ'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas')
  console.log('SUPABASE_URL:', supabaseUrl ? 'Definida' : 'No definida')
  console.log('SUPABASE_KEY:', supabaseKey ? 'Definida' : 'No definida')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCancelation() {
  console.log('🔍 Diagnosticando funcionalidad de cancelación...')
  
  try {
    // 1. Verificar conexión a Supabase
    console.log('\n1️⃣ Verificando conexión a Supabase...')
    const { data: offices, error: officesError } = await supabase
      .from('offices')
      .select('id, name, code')
      .limit(1)
    
    if (officesError) {
      console.error('❌ Error conectando a Supabase:', officesError)
      return
    }
    console.log('✅ Conexión a Supabase exitosa')
    
    // 2. Verificar tabla vacation_requests
    console.log('\n2️⃣ Verificando solicitudes de vacaciones...')
    const { data: requests, error: requestsError } = await supabase
      .from('vacation_requests')
      .select('id, employee_id, status, days_requested, start_date, end_date')
      .limit(5)
    
    if (requestsError) {
      console.error('❌ Error obteniendo solicitudes:', requestsError)
      return
    }
    
    console.log(`✅ Encontradas ${requests?.length || 0} solicitudes de vacaciones`)
    
    if (requests && requests.length > 0) {
      console.log('📋 Primeras 5 solicitudes:')
      requests.forEach((req, index) => {
        console.log(`   ${index + 1}. ID: ${req.id} | Status: ${req.status} | Días: ${req.days_requested}`)
      })
    }
    
    // 3. Buscar solicitudes aprobadas específicamente
    console.log('\n3️⃣ Verificando solicitudes aprobadas...')
    const { data: approvedRequests, error: approvedError } = await supabase
      .from('vacation_requests')
      .select('id, employee_id, status, days_requested, start_date, end_date')
      .eq('status', 'approved')
    
    if (approvedError) {
      console.error('❌ Error obteniendo solicitudes aprobadas:', approvedError)
      return
    }
    
    console.log(`✅ Encontradas ${approvedRequests?.length || 0} solicitudes aprobadas`)
    
    if (approvedRequests && approvedRequests.length > 0) {
      console.log('📋 Solicitudes aprobadas:')
      approvedRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ID: ${req.id} | Empleado: ${req.employee_id} | Días: ${req.days_requested}`)
      })
      
      // 4. Probar cancelación con la primera solicitud aprobada
      const testRequest = approvedRequests[0]
      console.log(`\n4️⃣ Probando cancelación con solicitud ID: ${testRequest.id}`)
      
      // Primero obtener información del empleado
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('id', testRequest.employee_id)
        .single()
      
      if (empError) {
        console.error('❌ Error obteniendo empleado:', empError)
        return
      }
      
      console.log(`👤 Empleado: ${employee?.first_name} ${employee?.last_name}`)
      
      // Verificar ciclos activos del empleado
      const { data: cycles, error: cyclesError } = await supabase
        .from('vacation_cycles')
        .select('*')
        .eq('employee_id', testRequest.employee_id)
        .eq('is_expired', false)
      
      if (cyclesError) {
        console.error('❌ Error obteniendo ciclos:', cyclesError)
        return
      }
      
      console.log(`📅 Ciclos activos: ${cycles?.length || 0}`)
      if (cycles && cycles.length > 0) {
        cycles.forEach((cycle, index) => {
          console.log(`   ${index + 1}. Disponibles: ${cycle.days_available} | Usados: ${cycle.days_used}`)
        })
      }
      
      // Calcular espacio disponible
      const totalAvailableSpace = cycles?.reduce((total, cycle) => {
        return total + (cycle.days_earned - cycle.days_used)
      }, 0) || 0
      
      console.log(`💡 Espacio total disponible: ${totalAvailableSpace} días`)
      console.log(`🎯 Días a restaurar: ${testRequest.days_requested}`)
      
      if (totalAvailableSpace >= testRequest.days_requested) {
        console.log('✅ HAY ESPACIO SUFICIENTE - La cancelación debería funcionar')
      } else {
        console.log('❌ NO HAY ESPACIO SUFICIENTE - Este es el problema')
      }
    } else {
      console.log('ℹ️  No hay solicitudes aprobadas para probar')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

debugCancelation().catch(console.error)