import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabaseClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const recordData = await request.json()
    
    console.log("API recibió datos:", recordData)
    
    const supabase = createClientSupabaseClient()
    
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