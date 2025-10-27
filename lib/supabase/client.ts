import { createClient } from "@supabase/supabase-js"

// Crear una instancia singleton del cliente Supabase para el lado del cliente
// Esto garantiza que solo se cree una instancia del cliente en toda la aplicación
let clientInstance: ReturnType<typeof createClient> | null = null

export function createClientSupabaseClient() {
  if (clientInstance) return clientInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  clientInstance = createClient(supabaseUrl, supabaseAnonKey)
  return clientInstance
}
