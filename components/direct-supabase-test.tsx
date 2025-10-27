"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function DirectSupabaseTest() {
  const [employeeId, setEmployeeId] = useState("5a57b123-f483-41d5-91c0-3a0e2405ce25")
  const [officeId, setOfficeId] = useState("NLA")
  const [testDate, setTestDate] = useState("2025-10-01")
  const [attendanceTypeId, setAttendanceTypeId] = useState("b91a2e12-9159-4966-a04b-73dcc940bb62")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const testDirectSupabaseCall = async () => {
    setIsLoading(true)
    
    try {
      // Crear el mismo objeto que usa la aplicación
      const recordData = {
        employee_id: employeeId,
        office_id: officeId,
        attendance_date: testDate,
        attendance_type_id: attendanceTypeId,
        notes: null,
        created_by: null,
        updated_at: new Date().toISOString()
      }

      console.log("Enviando datos exactos a Supabase:", recordData)

      // Simular la misma llamada que hace la aplicación
      const response = await fetch('/api/test-attendance-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData)
      })

      const result = await response.json()

      console.log("Respuesta de la API:", result)

      const testResult = {
        timestamp: new Date().toISOString(),
        recordData,
        response: result,
        success: result.success || false
      }

      setResults(testResult)

      if (result.error) {
        console.error("Error de la API:", result.error)
        toast({
          title: "Error en la llamada",
          description: result.error.message || "Error desconocido",
          variant: "destructive"
        })
      } else if (result.data) {
        console.log("Éxito:", result.data)
        toast({
          title: "Éxito",
          description: "Registro creado/actualizado correctamente"
        })
      } else {
        console.warn("Sin error pero sin datos")
        toast({
          title: "Advertencia",
          description: "Sin error pero sin datos retornados",
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error("Error en la prueba:", error)
      setResults({
        timestamp: new Date().toISOString(),
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Error desconocido'
      })
      
      toast({
        title: "Error en la prueba",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Prueba Directa de Supabase</CardTitle>
        <CardDescription>
          Prueba la llamada exacta que hace la aplicación a Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label htmlFor="officeId">Código de Oficina</Label>
            <Input
              id="officeId"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              placeholder="Ej: NLA"
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
            <Label htmlFor="attendanceTypeId">ID del Tipo de Asistencia</Label>
            <Input
              id="attendanceTypeId"
              value={attendanceTypeId}
              onChange={(e) => setAttendanceTypeId(e.target.value)}
              placeholder="UUID del tipo"
            />
          </div>
        </div>

        <Button 
          onClick={testDirectSupabaseCall} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Probando llamada directa..." : "Probar Llamada Directa a Supabase"}
        </Button>

        {results && (
          <div className="space-y-6">
            <div className="text-sm text-gray-500">
              Prueba ejecutada: {new Date(results.timestamp).toLocaleString()}
            </div>

            {/* Estado de la prueba */}
            <div className={`p-4 border rounded-lg ${results.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h4 className={`font-medium ${results.success ? 'text-green-800' : 'text-red-800'}`}>
                {results.success ? '✅ Prueba Exitosa' : '❌ Prueba Fallida'}
              </h4>
            </div>

            {/* Datos enviados */}
            <div className="space-y-2">
              <h4 className="font-medium">Datos Enviados a Supabase</h4>
              <pre className="p-3 bg-gray-50 border rounded text-sm overflow-auto">
                {JSON.stringify(results.recordData, null, 2)}
              </pre>
            </div>

            {/* Respuesta de Supabase */}
            {results.response && (
              <div className="space-y-2">
                <h4 className="font-medium">Respuesta de Supabase</h4>
                
                {results.response.hasData && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-green-700">Data Retornada:</h5>
                    <pre className="p-3 bg-green-50 border border-green-200 rounded text-sm overflow-auto">
                      {JSON.stringify(results.response.data, null, 2)}
                    </pre>
                  </div>
                )}

                {results.response.hasError && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-red-700">Error Retornado:</h5>
                    <pre className="p-3 bg-red-50 border border-red-200 rounded text-sm overflow-auto">
                      {JSON.stringify(results.response.error, null, 2)}
                    </pre>
                  </div>
                )}

                {!results.response.hasData && !results.response.hasError && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800">⚠️ Supabase no retornó ni datos ni error</p>
                  </div>
                )}
              </div>
            )}

            {/* Error general */}
            {results.error && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Error de la Prueba</h4>
                <pre className="p-3 bg-red-50 border border-red-200 rounded text-sm overflow-auto">
                  {JSON.stringify(results.error, Object.getOwnPropertyNames(results.error), 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-800">💡 Información</h4>
          <p className="text-blue-700 text-sm mt-1">
            Esta prueba hace la misma llamada exacta que hace la aplicación. 
            Los valores por defecto son del empleado y tipo que están fallando.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}