'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestDBPage() {
  const [connectionStatus, setConnectionStatus] = useState('Conectando...')
  const [vacationsData, setVacationsData] = useState<any[]>([])
  const [employeesData, setEmployeesData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        console.log('Supabase URL:', supabaseUrl)
        console.log('Supabase Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...')

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Variables de entorno de Supabase no encontradas')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Probar conexión básica
        const { data: testData, error: testError } = await supabase
          .from('employees')
          .select('count')
          .limit(1)

        if (testError) {
          throw new Error(`Error de conexión: ${testError.message}`)
        }

        setConnectionStatus('✅ Conexión exitosa')

        // Obtener datos de empleados
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .limit(10)

        if (empError) {
          console.error('Error obteniendo empleados:', empError)
        } else {
          setEmployeesData(employees || [])
        }

        // Obtener datos de vacaciones
        const { data: vacations, error: vacError } = await supabase
          .from('vacation_requests')
          .select('*')
          .limit(10)

        if (vacError) {
          console.error('Error obteniendo vacaciones:', vacError)
        } else {
          setVacationsData(vacations || [])
        }

        // Intentar también con la tabla vacation_cycles si existe
        const { data: cycles, error: cyclesError } = await supabase
          .from('vacation_cycles')
          .select('*')
          .limit(5)

        if (!cyclesError && cycles) {
          console.log('Ciclos de vacaciones encontrados:', cycles)
        }

      } catch (err) {
        console.error('Error completo:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setConnectionStatus('❌ Error de conexión')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Prueba de Conexión a Base de Datos
        </h1>

        {/* Estado de conexión */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Estado de Conexión</h2>
          <p className="text-lg">{connectionStatus}</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Variables de entorno */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Variables de Entorno</h2>
          <div className="space-y-2">
            <p><strong>SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'No encontrada'}</p>
            <p><strong>SUPABASE_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No encontrada'}</p>
          </div>
        </div>

        {/* Datos de empleados */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Empleados Encontrados ({employeesData.length})
          </h2>
          {employeesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Oficina</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesData.map((emp, index) => (
                    <tr key={emp.id || index} className="border-b">
                      <td className="px-4 py-2">{emp.id}</td>
                      <td className="px-4 py-2">{emp.name || emp.full_name}</td>
                      <td className="px-4 py-2">{emp.email}</td>
                      <td className="px-4 py-2">{emp.office_code || emp.office}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No se encontraron empleados</p>
          )}
        </div>

        {/* Datos de vacaciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Solicitudes de Vacaciones Encontradas ({vacationsData.length})
          </h2>
          {vacationsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Empleado ID</th>
                    <th className="px-4 py-2 text-left">Fecha Inicio</th>
                    <th className="px-4 py-2 text-left">Fecha Fin</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vacationsData.map((vac, index) => (
                    <tr key={vac.id || index} className="border-b">
                      <td className="px-4 py-2">{vac.id}</td>
                      <td className="px-4 py-2">{vac.employee_id}</td>
                      <td className="px-4 py-2">{vac.start_date}</td>
                      <td className="px-4 py-2">{vac.end_date}</td>
                      <td className="px-4 py-2">{vac.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No se encontraron solicitudes de vacaciones</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Volver al Login
          </a>
        </div>
      </div>
    </div>
  )
}