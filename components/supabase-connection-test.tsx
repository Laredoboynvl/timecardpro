"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

// Función para crear cliente de Supabase de forma segura
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found during build time')
    return null
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

export default function SupabaseConnectionTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versionInfo, setVersionInfo] = useState<string | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setIsConnected(null)
    setErrorMessage(null)
    setVersionInfo(null)

    try {
      // Crear cliente de Supabase de forma segura
      const supabase = createSupabaseClient()
      
      if (!supabase) {
        throw new Error("No se pudo crear el cliente de Supabase. Verifica las variables de entorno.")
      }

      // Realizamos una consulta simple para verificar la conexión
      const { data, error } = await supabase.rpc("pg_version")

      if (error) {
        throw error
      }

      setIsConnected(true)
      setVersionInfo(data)
    } catch (error) {
      setIsConnected(false)
      setErrorMessage(error instanceof Error ? error.message : "Error desconocido al conectar con Supabase")
      console.error("Error al conectar con Supabase:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseAnonKey) {
      testConnection()
    } else {
      setIsConnected(false)
      setErrorMessage("Faltan las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)")
    }
  }, [])

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Prueba de Conexión a Supabase</CardTitle>
        <CardDescription>Verificando la conexión con la base de datos de Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Verificando conexión...</span>
          </div>
        ) : isConnected === null ? (
          <div className="text-center text-muted-foreground">Esperando verificación...</div>
        ) : isConnected ? (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-600 dark:text-green-400">Conexión exitosa</AlertTitle>
            <AlertDescription className="text-green-600/90 dark:text-green-400/90">
              {versionInfo && (
                <div className="mt-2">
                  <p className="font-mono text-sm">Versión PostgreSQL: {versionInfo}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de conexión</AlertTitle>
            <AlertDescription>{errorMessage || "No se pudo establecer conexión con Supabase"}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Probando...
            </>
          ) : (
            "Probar conexión nuevamente"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
