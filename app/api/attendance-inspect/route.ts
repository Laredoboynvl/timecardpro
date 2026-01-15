import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const office = (searchParams.get('office') || 'NLA').toUpperCase()
    const year = parseInt(searchParams.get('year') || '2025', 10)
    const month = parseInt(searchParams.get('month') || '10', 10)
    const code = (searchParams.get('code') || 'HE').toUpperCase()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ ok: false, error: 'Supabase env not configured' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        attendance_type:attendance_types(id, code, name, color),
        employee:employees(id, name, first_name, last_name, employee_code)
      `)
      .eq('office_id', office)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 })
    }

    const rows = (data || [])
    const filtered = rows.filter(r => (r as any).attendance_type?.code?.toUpperCase() === code)

    const summary = {
      office,
      year,
      month,
      code,
      totalRecordsMonth: rows.length,
      totalWithCode: filtered.length,
    }

    return NextResponse.json({ ok: true, summary, sample: filtered.slice(0, 50) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error)?.message || 'unknown' }, { status: 500 })
  }
}
