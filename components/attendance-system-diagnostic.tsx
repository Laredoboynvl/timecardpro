"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { checkAttendanceTables, getAttendanceTypes } from "@/lib/supabase/db-functions"

export function AttendanceSystemDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDiagnostics = async () => {
    setIsLoading(true)
    try {
      // Verificar tablas
      const tablesStatus = await checkAttendanceTables()
      
      // Intentar cargar tipos de asistencia
      let typesData = null
      let typesError = null
      try {
        typesData = await getAttendanceTypes()
      } catch (error) {
        typesError = error
      }

      setDiagnostics({
        tablesStatus,
        typesData,
        typesError,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error en diagnósticos:", error)
      setDiagnostics({
        error: error,
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Diagnóstico del Sistema de Asistencia
        </CardTitle>
        <CardDescription>
          Verifica el estado de las tablas y configuración del sistema de asistencia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Ejecutando diagnósticos..." : "Ejecutar Diagnósticos"}
        </Button>

        {diagnostics && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Última verificación: {new Date(diagnostics.timestamp).toLocaleString()}
            </div>

            {diagnostics.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900">Error General</h4>
                <p className="text-red-700">{diagnostics.error.message}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium">Estado de las Tablas</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.tablesStatus?.attendance_types)}
                    <span>attendance_types</span>
                    {!diagnostics.tablesStatus?.attendance_types && (
                      <Badge variant="destructive">Faltante</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.tablesStatus?.attendance_records)}
                    <span>attendance_records</span>
                    {!diagnostics.tablesStatus?.attendance_records && (
                      <Badge variant="destructive">Faltante</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Tipos de Asistencia</h4>
                  {diagnostics.typesError ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-700">Error: {diagnostics.typesError.message}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p>Total de tipos encontrados: {diagnostics.typesData?.length || 0}</p>
                      {diagnostics.typesData?.map((type: any) => (
                        <div key={type.id} className="flex items-center gap-2 text-sm">
                          <Badge style={{ backgroundColor: type.color, color: 'white' }}>
                            {type.code}
                          </Badge>
                          <span>{type.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {diagnostics.tablesStatus?.errors && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Errores Detectados</h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <pre className="text-sm text-yellow-800">
                        {JSON.stringify(diagnostics.tablesStatus.errors, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {(!diagnostics.tablesStatus?.attendance_types || !diagnostics.tablesStatus?.attendance_records) && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900">Solución</h4>
                    <p className="text-blue-700 mb-2">
                      Para resolver este problema, ejecuta el archivo SQL en Supabase:
                    </p>
                    <code className="block p-2 bg-gray-100 text-sm rounded">
                      05-create-attendance-tables.sql
                    </code>
                    <p className="text-blue-700 mt-2 text-sm">
                      Ve a tu dashboard de Supabase → SQL Editor → Ejecuta el contenido del archivo
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}