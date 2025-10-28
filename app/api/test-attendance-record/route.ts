import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const recordData = await request.json()
    
    console.log("API recibió datos:", recordData)
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Variables de entorno de Supabase no configuradas'
        }
      }, { status: 500 })
    }
    
    // Importar dinámicamente para evitar errores de build
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log("Cliente Supabase creado en API")
    
    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(recordData, {
        onConflict: 'employee_id,attendance_date'
      })
      .select(`
        *,
        attendance_type:attendance_types(*)
      `)
      .single()
    
    console.log("Respuesta de Supabase en API:", {
      data: data,
      error: error,
      hasData: !!data,
      hasError: !!error
    })
    
    return NextResponse.json({
      success: !!data && !error,
      data: data,
      error: error,
      hasData: !!data,
      hasError: !!error
    })
    
  } catch (apiError) {
    console.error("Error en API:", apiError)
    return NextResponse.json({
      success: false,
      error: {
        message: apiError instanceof Error ? apiError.message : 'Error desconocido en API',
        stack: apiError instanceof Error ? apiError.stack : undefined
      }
    }, { status: 500 })
  }
}