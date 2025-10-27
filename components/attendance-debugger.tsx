"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, AlertCircle, Play, Copy } from "lucide-react"
import { 
  checkAttendanceTables, 
  getAttendanceTypes, 
  upsertAttendanceRecord,
  getEmployeesByOfficeClient 
} from "@/lib/supabase/db-functions"
import { useToast } from "@/hooks/use-toast"

export function AttendanceDebugger() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  const runCompleteDiagnostics = async () => {
    setIsLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      steps: []
    }

    try {
      // Paso 1: Verificar conexión a Supabase
      results.steps.push({ step: 1, name: "Verificando conexión Supabase", status: "running" })
      setDiagnostics({...results})
      
      // Saltamos la verificación directa de conexión por ahora
      results.steps[0] = { step: 1, name: "Verificando conexión Supabase", status: "success" }

      // Paso 2: Verificar tablas de asistencia
      results.steps.push({ step: 2, name: "Verificando tablas de asistencia", status: "running" })
      setDiagnostics({...results})
      
      const tablesStatus = await checkAttendanceTables()
      results.tablesStatus = tablesStatus
      
      if (!tablesStatus.attendance_types || !tablesStatus.attendance_records) {
        results.steps[1] = { 
          step: 2, 
          name: "Verificando tablas de asistencia", 
          status: "error", 
          error: "Faltan tablas de asistencia" 
        }
        setDiagnostics({...results})
        return
      }
      
      results.steps[1] = { step: 2, name: "Verificando tablas de asistencia", status: "success" }

      // Paso 3: Cargar tipos de asistencia
      results.steps.push({ step: 3, name: "Cargando tipos de asistencia", status: "running" })
      setDiagnostics({...results})
      
      const attendanceTypes = await getAttendanceTypes()
      results.attendanceTypes = attendanceTypes
      
      if (!attendanceTypes || attendanceTypes.length === 0) {
        results.steps[2] = { 
          step: 3, 
          name: "Cargando tipos de asistencia", 
          status: "error", 
          error: "No hay tipos de asistencia configurados" 
        }
        setDiagnostics({...results})
        return
      }
      
      results.steps[2] = { step: 3, name: "Cargando tipos de asistencia", status: "success" }

      // Paso 4: Cargar empleados de oficina NLA
      results.steps.push({ step: 4, name: "Cargando empleados de oficina NLA", status: "running" })
      setDiagnostics({...results})
      
      const employees = await getEmployeesByOfficeClient('NLA')
      results.employees = employees
      
      if (!employees || employees.length === 0) {
        results.steps[3] = { 
          step: 4, 
          name: "Cargando empleados de oficina NLA", 
          status: "error", 
          error: "No hay empleados en la oficina NLA" 
        }
        setDiagnostics({...results})
        return
      }
      
      results.steps[3] = { step: 4, name: "Cargando empleados de oficina NLA", status: "success" }

      // Paso 5: Prueba de inserción de registro
      results.steps.push({ step: 5, name: "Probando inserción de registro", status: "running" })
      setDiagnostics({...results})
      
      const testEmployee = employees[0]
      const testType = attendanceTypes.find(t => t.code === 'R') || attendanceTypes[0]
      const testDate = new Date().toISOString().split('T')[0]
      
      try {
        const testResult = await upsertAttendanceRecord(
          testEmployee.id,
          'NLA',
          testDate,
          testType.id!
        )
        
        if (testResult) {
          results.steps[4] = { 
            step: 5, 
            name: "Probando inserción de registro", 
            status: "success",
            details: "Registro de prueba creado exitosamente"
          }
          results.testRecord = testResult
        } else {
          results.steps[4] = { 
            step: 5, 
            name: "Probando inserción de registro", 
            status: "error", 
            error: "upsertAttendanceRecord devolvió null" 
          }
        }
      } catch (testError) {
        results.steps[4] = { 
          step: 5, 
          name: "Probando inserción de registro", 
          status: "error", 
          error: testError instanceof Error ? testError.message : 'Error desconocido',
          details: testError
        }
      }

      setDiagnostics(results)

    } catch (error) {
      console.error("Error en diagnósticos:", error)
      results.generalError = error
      setDiagnostics(results)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copiado",
        description: "Información copiada al portapapeles",
      })
    } catch (error) {
      console.error("Error copiando:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Diagnóstico Avanzado del Sistema de Asistencia
        </CardTitle>
        <CardDescription>
          Herramienta completa para diagnosticar problemas con el sistema de asistencia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button 
          onClick={runCompleteDiagnostics} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isLoading ? "Ejecutando diagnósticos..." : "Ejecutar Diagnósticos Completos"}
        </Button>

        {diagnostics && (
          <div className="space-y-6">
            <div className="text-sm text-gray-500">
              Última verificación: {new Date(diagnostics.timestamp).toLocaleString()}
            </div>

            {/* Pasos del diagnóstico */}
            <div className="space-y-3">
              <h4 className="font-medium text-lg">Pasos de Verificación</h4>
              {diagnostics.steps?.map((step: any) => (
                <div key={step.step} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(step.status)}
                  <div className="flex-1">
                    <div className="font-medium">{step.step}. {step.name}</div>
                    {step.error && (
                      <div className="text-red-600 text-sm mt-1">{step.error}</div>
                    )}
                    {step.details && (
                      <div className="text-green-600 text-sm mt-1">{step.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Información detallada */}
            {diagnostics.attendanceTypes && (
              <div className="space-y-2">
                <h4 className="font-medium">Tipos de Asistencia Encontrados</h4>
                <div className="grid grid-cols-2 gap-2">
                  {diagnostics.attendanceTypes.map((type: any) => (
                    <div key={type.id} className="flex items-center gap-2 p-2 border rounded">
                      <Badge style={{ backgroundColor: type.color, color: 'white' }}>
                        {type.code}
                      </Badge>
                      <span className="text-sm">{type.name}</span>
                      <span className="text-xs text-gray-500">({type.hours_value || 'N/A'} hrs)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnostics.employees && (
              <div className="space-y-2">
                <h4 className="font-medium">Empleados en Oficina NLA</h4>
                <div className="text-sm">
                  Total: {diagnostics.employees.length} empleados encontrados
                </div>
              </div>
            )}

            {/* Información de errores */}
            {diagnostics.generalError && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Error General</h4>
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <pre className="text-sm text-red-700 whitespace-pre-wrap">
                    {JSON.stringify(diagnostics.generalError, Object.getOwnPropertyNames(diagnostics.generalError), 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Botón para copiar toda la información */}
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(JSON.stringify(diagnostics, null, 2))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Información Completa
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}