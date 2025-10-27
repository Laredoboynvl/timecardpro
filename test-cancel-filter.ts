import { createClient } from '@supabase/supabase-js'

// Variables de entorno hardcodeadas para prueba rápida
const supabaseUrl = 'https://mypxhgghxkpdlpqksmdj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHhoZ2doeGtwZGxwcWtzbWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyOTA3MzEsImV4cCI6MjA0Mjg2NjczMX0.FlfOX9PpgupgPGrCSXdHHptxfR8qFs0SsCupZzE6-QQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCancelFilter() {
  console.log('🔍 Probando filtro de solicitudes canceladas...')
  
  try {
    // 1. Obtener TODAS las solicitudes sin filtro
    console.log('\n1️⃣ Obteniendo TODAS las solicitudes...')
    const { data: allRequests, error: allError } = await supabase
      .from('vacation_requests')
      .select('id, status, days_requested, start_date, end_date')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ Error obteniendo todas las solicitudes:', allError)
      return
    }
    
    console.log(`📊 Total solicitudes en DB: ${allRequests?.length || 0}`)
    if (allRequests && allRequests.length > 0) {
      console.log('📋 Estados de solicitudes:')
      const statusCounts: { [key: string]: number } = {}
      allRequests.forEach(req => {
        statusCounts[req.status] = (statusCounts[req.status] || 0) + 1
      })
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`)
      })
    }

    // 2. Obtener solicitudes con filtro (como lo hace la app)
    console.log('\n2️⃣ Obteniendo solicitudes con filtro (sin cancelled)...')
    const { data: filteredRequests, error: filteredError } = await supabase
      .from('vacation_requests')
      .select('id, status, days_requested, start_date, end_date')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    
    if (filteredError) {
      console.error('❌ Error obteniendo solicitudes filtradas:', filteredError)
      return
    }
    
    console.log(`📊 Solicitudes filtradas (sin cancelled): ${filteredRequests?.length || 0}`)
    if (filteredRequests && filteredRequests.length > 0) {
      console.log('📋 Estados de solicitudes filtradas:')
      const statusCounts: { [key: string]: number } = {}
      filteredRequests.forEach(req => {
        statusCounts[req.status] = (statusCounts[req.status] || 0) + 1
      })
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`)
      })
    }

    // 3. Buscar específicamente solicitudes canceladas
    console.log('\n3️⃣ Buscando solicitudes canceladas específicamente...')
    const { data: cancelledRequests, error: cancelledError } = await supabase
      .from('vacation_requests')
      .select('id, status, days_requested, start_date, end_date')
      .eq('status', 'cancelled')
    
    if (cancelledError) {
      console.error('❌ Error obteniendo solicitudes canceladas:', cancelledError)
      return
    }
    
    console.log(`📊 Solicitudes canceladas: ${cancelledRequests?.length || 0}`)
    if (cancelledRequests && cancelledRequests.length > 0) {
      console.log('📋 Solicitudes canceladas encontradas:')
      cancelledRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ID: ${req.id} | Días: ${req.days_requested} | Fechas: ${req.start_date} - ${req.end_date}`)
      })
    }

    // 4. Conclusión
    console.log('\n🎯 Conclusión:')
    const totalCount = allRequests?.length || 0
    const filteredCount = filteredRequests?.length || 0
    const cancelledCount = cancelledRequests?.length || 0
    
    console.log(`   Total en DB: ${totalCount}`)
    console.log(`   Sin cancelled: ${filteredCount}`)
    console.log(`   Canceladas: ${cancelledCount}`)
    console.log(`   ¿Suma correcta? ${(filteredCount + cancelledCount) === totalCount ? '✅ SÍ' : '❌ NO'}`)
    
    if (cancelledCount > 0 && filteredCount === totalCount) {
      console.log('❌ PROBLEMA: El filtro NO está funcionando correctamente')
    } else if (cancelledCount > 0 && filteredCount < totalCount) {
      console.log('✅ BIEN: El filtro SÍ está funcionando correctamente')
    } else {
      console.log('ℹ️  No hay solicitudes canceladas para probar')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testCancelFilter().catch(console.error)