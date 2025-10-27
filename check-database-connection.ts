// Script para verificar tablas desde la aplicación Next.js
// Ejecutar en: npm run dev y luego ir a /admin/database-check

import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function checkDatabaseTables() {
  console.log('🔍 Verificando conexión a Supabase...')
  console.log('URL:', supabaseUrl)
  
  try {
    // 1. Verificar conexión básica
    const { data: connectionTest, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1)

    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError)
      return { success: false, error: connectionError }
    }

    console.log('✅ Conexión exitosa a Supabase')

    // 2. Verificar tablas específicas del proyecto
    console.log('📋 Verificando tablas específicas...')
    return await checkSpecificTables()

  } catch (error) {
    console.error('❌ Error general:', error)
    return { success: false, error }
  }
}

async function checkSpecificTables() {
  console.log('🔍 Verificando tablas específicas del proyecto...')
  
  const tablesToCheck = [
    'employees',
    'offices', 
    'vacations',
    'holidays',
    'vacation_cycles',
    'ex_employees'
  ]

  const results = []

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1)

      if (error) {
        console.log(`❌ Tabla '${tableName}' no existe o no es accesible:`, error.message)
        results.push({ table: tableName, exists: false, error: error.message })
      } else {
        console.log(`✅ Tabla '${tableName}' existe`)
        results.push({ table: tableName, exists: true, count: data?.length || 0 })
      }
    } catch (err) {
      console.log(`❌ Error verificando tabla '${tableName}':`, err)
      results.push({ table: tableName, exists: false, error: String(err) })
    }
  }

  return { success: true, specificTables: results }
}

// Función para ejecutar el check
export async function runDatabaseCheck() {
  console.log('🚀 Iniciando verificación de base de datos...')
  const result = await checkDatabaseTables()
  
  console.log('📊 Resultado final:', result)
  return result
}

// Exportar para uso en componentes
export default runDatabaseCheck