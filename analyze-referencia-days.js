// Script para analizar el comportamiento de "días de referencia"
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function analyzeReferenciaDays() {
  console.log('🔍 ANALIZANDO: ¿Qué significan los "días de referencia"?\n')

  try {
    // Obtener Maria De Jesus
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', '20022065')
      .single()

    console.log('👤 Analizando solicitudes de: Maria De Jesus Medina Escalera\n')

    // Obtener todas sus solicitudes ordenadas por fecha
    const { data: requests } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('start_date', { ascending: true })

    console.log('📋 ANÁLISIS DE SOLICITUDES POR FECHA:\n')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let pastRequests = []
    let futureRequests = []

    requests?.forEach((req, i) => {
      const startDate = new Date(req.start_date)
      const endDate = new Date(req.end_date)
      const isPast = startDate < today
      const statusIcon = req.status === 'approved' ? '🟢' : 
                        req.status === 'cancelled' ? '🔴' : 
                        req.status === 'rejected' ? '🟡' : '⚪'

      console.log(`${i + 1}. ${statusIcon} ${req.start_date} → ${req.end_date} (${req.days_requested} días)`)
      console.log(`   Estado: ${req.status.toUpperCase()}`)
      console.log(`   Tipo: ${isPast ? '🔙 FECHA PASADA' : '➡️ FECHA FUTURA'}`)
      if (req.reason) {
        console.log(`   Motivo: "${req.reason}"`)
      }
      console.log(`   Creada: ${new Date(req.created_at).toLocaleString('es-ES')}`)
      console.log('')

      if (isPast) {
        pastRequests.push(req)
      } else {
        futureRequests.push(req)
      }
    })

    console.log('📊 RESUMEN DETALLADO:\n')
    console.log(`Solicitudes para fechas pasadas: ${pastRequests.length}`)
    console.log(`Solicitudes para fechas futuras: ${futureRequests.length}`)

    // Analizar las solicitudes pasadas aprobadas
    const approvedPastRequests = pastRequests.filter(req => req.status === 'approved')
    const approvedFutureRequests = futureRequests.filter(req => req.status === 'approved')

    console.log(`\n🔙 FECHAS PASADAS APROBADAS: ${approvedPastRequests.length}`)
    let totalPastDays = 0
    approvedPastRequests.forEach(req => {
      totalPastDays += req.days_requested
      console.log(`   • ${req.start_date}: ${req.days_requested} días`)
    })

    console.log(`➡️ FECHAS FUTURAS APROBADAS: ${approvedFutureRequests.length}`)
    let totalFutureDays = 0
    approvedFutureRequests.forEach(req => {
      totalFutureDays += req.days_requested
      console.log(`   • ${req.start_date}: ${req.days_requested} días`)
    })

    console.log(`\n📊 TOTALES:`)
    console.log(`   Días aprobados (fechas pasadas): ${totalPastDays}`)
    console.log(`   Días aprobados (fechas futuras): ${totalFutureDays}`)
    console.log(`   Total días aprobados: ${totalPastDays + totalFutureDays}`)

    // Comparar con los ciclos
    const { data: cycles } = await supabase
      .from('vacation_cycles')
      .select('*')
      .eq('employee_id', employee.id)
      .order('cycle_start_date', { ascending: true })

    console.log(`\n🔄 COMPARACIÓN CON CICLOS:`)
    let totalUsedInCycles = 0
    cycles?.forEach(cycle => {
      totalUsedInCycles += cycle.days_used
      const year = new Date(cycle.cycle_start_date).getFullYear()
      console.log(`   Ciclo ${year}: ${cycle.days_used} días usados de ${cycle.days_earned} ganados`)
    })

    console.log(`\n📊 ANÁLISIS FINAL:`)
    console.log(`   Total días descontados de ciclos: ${totalUsedInCycles}`)
    console.log(`   Total días en solicitudes aprobadas: ${totalPastDays + totalFutureDays}`)
    console.log(`   Diferencia: ${Math.abs(totalUsedInCycles - (totalPastDays + totalFutureDays))}`)

    if (totalUsedInCycles === totalPastDays + totalFutureDays) {
      console.log(`   ✅ Los números coinciden - todas las solicitudes descontaron días`)
    } else {
      console.log(`   ⚠️  Los números NO coinciden - hay inconsistencias`)
    }

    console.log(`\n💡 EXPLICACIÓN DE "DÍAS DE REFERENCIA":`)
    console.log(`   El mensaje "(Incluye X días de referencia)" aparece cuando:`)
    console.log(`   • Se aprueban solicitudes para fechas que ya pasaron`)
    console.log(`   • El sistema las trata como registros históricos`)
    console.log(`   • PERO SIGUEN DESCONTANDO días de los ciclos de vacaciones`)
    console.log(`   • Esto puede causar inconsistencias en el balance de días`)

    if (approvedPastRequests.length > 0) {
      console.log(`\n⚠️  PROBLEMA IDENTIFICADO:`)
      console.log(`   ${approvedPastRequests.length} solicitudes aprobadas para fechas pasadas`)
      console.log(`   Esto descontó ${totalPastDays} días que probablemente NO deberían haberse descontado`)
      console.log(`   Estas son "referencias históricas" pero afectan el balance actual`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

analyzeReferenciaDays()