'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, CalendarDays, ArrowLeft } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import {
  getEmployeesByOfficeClient,
  getVacationRequests,
  getVacationCycles,
  calculateYearsOfService,
  calculateVacationDays,
  updateVacationRequestStatus,
  deductVacationDaysFromCycles,
  type VacationRequest,
  type VacationCycle,
  type Employee
} from "@/lib/supabase/db-functions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function AutorizacionesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())

  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [employeeCycles, setEmployeeCycles] = useState<Record<string, VacationCycle[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [showCyclesModal, setShowCyclesModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (office) {
      loadData()
    }
  }, [office])

  const loadData = async () => {
    if (!office) return
    
    setIsLoading(true)
    try {
      const [employeesData, requestsData] = await Promise.all([
        getEmployeesByOfficeClient(office.code),
        getVacationRequests(office.id)
      ])
      
      setEmployees(employeesData)
      setVacationRequests(requestsData)
      
      // Cargar ciclos para todos los empleados
      const cycles: Record<string, VacationCycle[]> = {}
      for (const employee of employeesData) {
        try {
          const employeeCyclesData = await getVacationCycles(employee.id!)
          cycles[employee.id!] = employeeCyclesData.filter(cycle => !cycle.is_expired)
        } catch (error) {
          console.error(`Error loading cycles for employee ${employee.id}:`, error)
          cycles[employee.id!] = []
        }
      }
      setEmployeeCycles(cycles)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return "Empleado desconocido"
    const fullName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || "Empleado desconocido"
    return fullName
  }

  const getEmployeeYearsOfService = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee?.hire_date) return 0
    return calculateYearsOfService(employee.hire_date)
  }

  const getEmployeeVacationDays = (employeeId: string) => {
    const years = getEmployeeYearsOfService(employeeId)
    return calculateVacationDays(years)
  }

  const handleViewDetails = (request: VacationRequest) => {
    setSelectedRequest(request)
    setShowCyclesModal(true)
  }

  const handleApprove = async (request: VacationRequest) => {
    if (isProcessing) return
    
    const cycles = employeeCycles[request.employee_id] || []
    const totalAvailable = cycles.reduce((sum, c) => sum + c.days_available, 0)
    
    if (request.days_requested > totalAvailable) {
      toast({
        title: "Error",
        description: `El empleado solo tiene ${totalAvailable} días disponibles, pero solicitó ${request.days_requested} días.`,
        variant: "destructive"
      })
      return
    }
    
    setIsProcessing(true)
    try {
      // 1. Actualizar estado a aprobado
      await updateVacationRequestStatus(request.id!, 'approved')
      
      // 2. Deducir días de los ciclos
      await deductVacationDaysFromCycles(request.employee_id, request.days_requested)
      
      toast({
        title: "Solicitud aprobada",
        description: `Se aprobaron ${request.days_requested} días de vacaciones para ${getEmployeeName(request.employee_id)}`,
      })
      
      // Recargar datos
      await loadData()
      
    } catch (error) {
      console.error('Error al aprobar solicitud:', error)
      toast({
        title: "Error",
        description: "No se pudo aprobar la solicitud",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (request: VacationRequest) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    try {
      await updateVacationRequestStatus(request.id!, 'rejected', undefined, 'Rechazada por el SPOC')
      
      toast({
        title: "Solicitud rechazada",
        description: `Se rechazó la solicitud de ${getEmployeeName(request.employee_id)}`,
      })
      
      // Recargar datos
      await loadData()
      
    } catch (error) {
      console.error('Error al rechazar solicitud:', error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingRequests = vacationRequests.filter(r => r.status === 'pending')
    .sort((a, b) => parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime())

  if (!office) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Oficina no encontrada</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <OfficeHeader office={office} />
      
      <main className="flex-1 container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-orange-800">Autorizaciones Pendientes</h1>
              <p className="text-muted-foreground">
                Solicitudes de vacaciones que requieren tu autorización
              </p>
            </div>
          </div>
        </div>

        {/* Contador */}
        <div className="mb-6">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-orange-600">
                    {pendingRequests.length}
                  </div>
                  <div>
                    <div className="font-medium text-orange-800">Solicitudes Pendientes</div>
                    <div className="text-sm text-orange-600">Requieren tu atención</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de solicitudes */}
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No hay solicitudes pendientes</h3>
              <p className="text-muted-foreground">
                Todas las solicitudes de vacaciones han sido revisadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const employeeName = getEmployeeName(request.employee_id)
              const years = getEmployeeYearsOfService(request.employee_id)
              const daysPerYear = getEmployeeVacationDays(request.employee_id)
              const cycles = employeeCycles[request.employee_id] || []
              const totalAvailable = cycles.reduce((sum, c) => sum + c.days_available, 0)
              
              return (
                <Card key={request.id} className="border-l-4 border-l-orange-400 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Información del empleado */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                            <Users className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-bold text-xl">{employeeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {years} año{years !== 1 ? 's' : ''} de servicio • {daysPerYear} días/año • {totalAvailable} días disponibles
                            </p>
                          </div>
                        </div>
                        
                        {/* Fechas solicitadas */}
                        <div className="ml-15 space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-gray-500" />
                            <span className="font-semibold text-lg">
                              {parseLocalDate(request.start_date).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                              {request.start_date !== request.end_date && (
                                <> - {parseLocalDate(request.end_date).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}</>
                              )}
                            </span>
                            <Badge variant="secondary" className="text-base">
                              {request.days_requested} días
                            </Badge>
                          </div>
                          
                          {request.reason && (
                            <div className="text-sm text-gray-600 ml-7">
                              <span className="font-medium">Motivo:</span> {request.reason}
                            </div>
                          )}
                          
                          {request.created_at && (
                            <div className="text-xs text-gray-500 ml-7">
                              Solicitado el: {new Date(request.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <Button
                          size="lg"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(request)}
                          disabled={isProcessing}
                        >
                          ✓ Aprobar
                        </Button>
                        <Button
                          size="lg"
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleReject(request)}
                          disabled={isProcessing}
                        >
                          ✗ Rechazar
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleViewDetails(request)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalles de Ciclos */}
      <Dialog open={showCyclesModal} onOpenChange={setShowCyclesModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Vacaciones</DialogTitle>
            <DialogDescription>
              Información de ciclos y días disponibles para {selectedRequest && getEmployeeName(selectedRequest.employee_id)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Información de la solicitud */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Solicitud</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Fechas:</span> {parseLocalDate(selectedRequest.start_date).toLocaleDateString('es-ES')} - {parseLocalDate(selectedRequest.end_date).toLocaleDateString('es-ES')}</p>
                  <p><span className="font-medium">Días solicitados:</span> {selectedRequest.days_requested}</p>
                  {selectedRequest.reason && <p><span className="font-medium">Motivo:</span> {selectedRequest.reason}</p>}
                </div>
              </div>

              {/* Ciclos del empleado */}
              <div>
                <h4 className="font-semibold mb-3">Ciclos de Vacaciones</h4>
                {employeeCycles[selectedRequest.employee_id]?.length > 0 ? (
                  <div className="space-y-3">
                    {employeeCycles[selectedRequest.employee_id]
                      .filter(cycle => !cycle.is_expired)
                      .map((cycle, index) => {
                        const cycleStart = parseLocalDate(cycle.cycle_start_date)
                        const cycleEnd = parseLocalDate(cycle.cycle_end_date)
                        const daysAfterApproval = cycle.days_available - (index === 0 ? selectedRequest.days_requested : 0)
                        
                        return (
                          <div key={cycle.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">Ciclo {cycle.years_of_service} - Año {cycle.years_of_service}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cycleStart.toLocaleDateString('es-ES')} - {cycleEnd.toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <Badge variant={cycle.days_available > 0 ? "default" : "secondary"}>
                                {cycle.days_available} días disponibles
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Ganados</p>
                                <p className="font-semibold">{cycle.days_earned}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Usados</p>
                                <p className="font-semibold">{cycle.days_used}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Disponibles</p>
                                <p className="font-semibold text-green-600">{cycle.days_available}</p>
                              </div>
                            </div>
                            
                            {index === 0 && selectedRequest.days_requested > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium text-orange-700">
                                  Después de aprobar: <span className="text-lg">{Math.max(0, daysAfterApproval)}</span> días disponibles
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    
                    {/* Resumen total */}
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-green-800">Total disponible actual</p>
                          <p className="text-2xl font-bold text-green-600">
                            {employeeCycles[selectedRequest.employee_id]
                              .filter(c => !c.is_expired)
                              .reduce((sum, c) => sum + c.days_available, 0)} días
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-orange-800">Después de aprobar</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {Math.max(0, employeeCycles[selectedRequest.employee_id]
                              .filter(c => !c.is_expired)
                              .reduce((sum, c) => sum + c.days_available, 0) - selectedRequest.days_requested)} días
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay ciclos activos</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCyclesModal(false)}>
              Cerrar
            </Button>
            {selectedRequest && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowCyclesModal(false)
                    handleReject(selectedRequest)
                  }}
                  disabled={isProcessing}
                >
                  Rechazar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowCyclesModal(false)
                    handleApprove(selectedRequest)
                  }}
                  disabled={isProcessing}
                >
                  Aprobar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
