import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default async function EnvTestPage() {
  // Resultados de las pruebas
  let supabaseConnected = false
  let officesLoaded = false
  let dayTypesLoaded = false
  let errorMessage = ""
  let officesCount = 0
  let dayTypesCount = 0

  try {
    // Intentar crear el cliente de Supabase
    const supabase = createServerSupabaseClient()
    supabaseConnected = true

    // Probar la conexión consultando las oficinas
    const { data: offices, error: officesError } = await supabase.from("offices").select("*")

    if (officesError) throw new Error(`Error al cargar oficinas: ${officesError.message}`)
    officesLoaded = true
    officesCount = offices.length

    // Probar la conexión consultando los tipos de día
    const { data: dayTypes, error: dayTypesError } = await supabase.from("day_types").select("*")

    if (dayTypesError) throw new Error(`Error al cargar tipos de día: ${dayTypesError.message}`)
    dayTypesLoaded = true
    dayTypesCount = dayTypes.length
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Error desconocido"
  }

  // Verificar si todas las pruebas pasaron
  const allTestsPassed = supabaseConnected && officesLoaded && dayTypesLoaded

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Validación de Variables de Entorno</h1>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resultado de la Validación</CardTitle>
          <CardDescription>Verificación de la configuración de Supabase y variables de entorno</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {supabaseConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Conexión a Supabase</span>
            </div>

            <div className="flex items-center gap-2">
              {officesLoaded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Carga de oficinas ({officesCount} encontradas)</span>
            </div>

            <div className="flex items-center gap-2">
              {dayTypesLoaded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Carga de tipos de día ({dayTypesCount} encontrados)</span>
            </div>
          </div>

          {allTestsPassed ? (
            <Alert className="mt-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>¡Configuración correcta!</AlertTitle>
              <AlertDescription>
                Las variables de entorno están configuradas correctamente y la conexión a Supabase funciona.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuración incompleta</AlertTitle>
              <AlertDescription>
                Hay problemas con la configuración de las variables de entorno o la conexión a Supabase.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variables de Entorno Requeridas</CardTitle>
          <CardDescription>
            Estas son las variables que deben estar configuradas en tu archivo .env.local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>SUPABASE_URL</li>
            <li>SUPABASE_ANON_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
