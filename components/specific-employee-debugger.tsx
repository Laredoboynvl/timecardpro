"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  getAttendanceTypes, 
  upsertAttendanceRecord,
  getEmployeesByOfficeClient 
} from "@/lib/supabase/db-functions"
import { useToast } from "@/hooks/use-toast"

export function SpecificEmployeeDebugger() {
  const [employeeId, setEmployeeId] = useState("5a57b123-f483-41d5-91c0-3a0e2405ce25")
  const [testDate, setTestDate] = useState("2025-10-01")
  const [officeId, setOfficeId] = useState("NLA")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const runSpecificTest = async () => {
    setIsLoading(true)
    const testResults: any = {
      timestamp: new Date().toISOString(),
      employeeId,
      testDate,
      officeId,
      steps: []
    }

    try {
      // Paso 1: Verificar que el empleado existe
      testResults.steps.push({ step: 1, name: "Verificando empleado", status: "running" })
      setResults({...testResults})
      
      const employees = await getEmployeesByOfficeClient(officeId)
      const employee = employees.find(emp => emp.id === employeeId)
      
      if (!employee) {
        testResults.steps[0] = { 
          step: 1, 
          name: "Verificando empleado", 
          status: "error", 
          error: `Empleado ${employeeId} no encontrado en oficina ${officeId}` 
        }
        testResults.employee = null
        setResults(testResults)
        return
      }
      
      testResults.steps[0] = { step: 1, name: "Verificando empleado", status: "success" }
      testResults.employee = employee

      // Paso 2: Cargar tipos de asistencia
      testResults.steps.push({ step: 2, name: "Cargando tipos de asistencia", status: "running" })
      setResults({...testResults})
      
      const attendanceTypes = await getAttendanceTypes()
      
      if (!attendanceTypes || attendanceTypes.length === 0) {
        testResults.steps[1] = { 
          step: 2, 
          name: "Cargando tipos de asistencia", 
          status: "error", 
          error: "No se encontraron tipos de asistencia" 
        }
        setResults(testResults)
        return
      }
      
      testResults.steps[1] = { step: 2, name: "Cargando tipos de asistencia", status: "success" }
      testResults.attendanceTypes = attendanceTypes

      // Paso 3: Probar inserción con tipo "Día Regular"
      testResults.steps.push({ step: 3, name: "Probando inserción de registro", status: "running" })
      setResults({...testResults})
      
      const regularType = attendanceTypes.find(t => t.code === 'R')
      if (!regularType) {
        testResults.steps[2] = { 
          step: 3, 
          name: "Probando inserción de registro", 
          status: "error", 
          error: "Tipo 'Día Regular' no encontrado" 
        }
        setResults(testResults)
        return
      }

      console.log("Intentando insertar registro con:", {
        employeeId,
        officeId,
        testDate,
        attendanceTypeId: regularType.id,
        attendanceTypeName: regularType.name
      })

      try {
        const insertResult = await upsertAttendanceRecord(
          employeeId,
          officeId,
          testDate,
          regularType.id!
        )

        if (insertResult) {
          testResults.steps[2] = { 
            step: 3, 
            name: "Probando inserción de registro", 
            status: "success",
            details: "Registro creado exitosamente"
          }
          testResults.insertResult = insertResult
        } else {
          testResults.steps[2] = { 
            step: 3, 
            name: "Probando inserción de registro", 
            status: "error", 
            error: "upsertAttendanceRecord devolvió null (sin error específico)" 
          }
        }
      } catch (insertError) {
        console.error("Error detallado en inserción:", insertError)
        
        // Capturar toda la información posible del error
        const errorInfo: any = {
          message: insertError instanceof Error ? insertError.message : 'Error desconocido',
          name: insertError instanceof Error ? insertError.name : 'Unknown',
          stack: insertError instanceof Error ? insertError.stack : undefined
        }

        // Si es un error de Supabase
        if (insertError && typeof insertError === 'object') {
          Object.keys(insertError).forEach(key => {
            errorInfo[key] = (insertError as any)[key]
          })
        }

        testResults.steps[2] = { 
          step: 3, 
          name: "Probando inserción de registro", 
          status: "error", 
          error: errorInfo.message,
          errorDetails: errorInfo
        }
        testResults.insertError = errorInfo
      }

      setResults(testResults)

    } catch (error) {
      console.error("Error general en prueba específica:", error)
      testResults.generalError = error
      setResults(testResults)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return "✅"
      case 'error':
        return "❌"
      case 'running':
        return "🔄"
      default:
        return "⚪"
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Diagnóstico de Empleado Específico</CardTitle>
        <CardDescription>
          Prueba la inserción de registros de asistencia para un empleado específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="employeeId">ID del Empleado</Label>
            <Input
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="UUID del empleado"
            />
          </div>
          <div>
            <Label htmlFor="testDate">Fecha de Prueba</Label>
            <Input
              id="testDate"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="officeId">Código de Oficina</Label>
            <Input
              id="officeId"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              placeholder="Ej: NLA"
            />
          </div>
        </div>

        <Button 
          onClick={runSpecificTest} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Ejecutando prueba..." : "Probar Inserción Específica"}
        </Button>

        {results && (
          <div className="space-y-6">
            <div className="text-sm text-gray-500">
              Prueba ejecutada: {new Date(results.timestamp).toLocaleString()}
            </div>

            {/* Información del empleado */}
            {results.employee && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">Empleado Encontrado</h4>
                <div className="text-sm text-green-700 mt-2">
                  <p><strong>Nombre:</strong> {results.employee.name || `${results.employee.first_name} ${results.employee.last_name}`}</p>
                  <p><strong>Código:</strong> {results.employee.employee_code}</p>
                  <p><strong>Oficina:</strong> {results.employee.office_code}</p>
                  <p><strong>Activo:</strong> {results.employee.is_active ? 'Sí' : 'No'}</p>
                </div>
              </div>
            )}

            {/* Pasos de verificación */}
            <div className="space-y-3">
              <h4 className="font-medium text-lg">Pasos de Verificación</h4>
              {results.steps?.map((step: any) => (
                <div key={step.step} className="flex items-start gap-3 p-3 border rounded-lg">
                  <span className="text-lg">{getStatusIcon(step.status)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{step.step}. {step.name}</div>
                    {step.error && (
                      <div className="text-red-600 text-sm mt-1">{step.error}</div>
                    )}
                    {step.details && (
                      <div className="text-green-600 text-sm mt-1">{step.details}</div>
                    )}
                    {step.errorDetails && (
                      <div className="mt-2">
                        <details className="cursor-pointer">
                          <summary className="text-sm font-medium text-red-700">Ver detalles del error</summary>
                          <pre className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs overflow-auto">
                            {JSON.stringify(step.errorDetails, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resultado de inserción */}
            {results.insertResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">Registro Creado Exitosamente</h4>
                <pre className="text-sm text-green-700 mt-2 overflow-auto">
                  {JSON.stringify(results.insertResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Tipos de asistencia */}
            {results.attendanceTypes && (
              <div className="space-y-2">
                <h4 className="font-medium">Tipos de Asistencia Disponibles</h4>
                <div className="grid grid-cols-2 gap-2">
                  {results.attendanceTypes.map((type: any) => (
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

            {/* Error general */}
            {results.generalError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800">Error General</h4>
                <pre className="text-sm text-red-700 mt-2 overflow-auto">
                  {JSON.stringify(results.generalError, Object.getOwnPropertyNames(results.generalError), 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}