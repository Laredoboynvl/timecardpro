'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Calendar,
  User,
  FileText,
  Building,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OFFICES } from "@/lib/types/auth"
import { useAuth } from "@/lib/hooks/useAuth"
import { 
  getVacationRequests, 
  getEmployeesByOfficeClient, 
  updateVacationRequestStatus,
  getHolidays,
  getVacationCycles
} from "@/lib/supabase/db-functions"
import { useToast } from "@/hooks/use-toast"

interface PendingVacationRequest {
  id: string
  employee_id: string
  employee_name: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  created_at: string
  office_id: string
  status: string
}

interface Holiday {
  id?: string
  office_id: string
  name: string
  holiday_date: string
  is_active: boolean
}

interface VacationCycle {
  id: string
  employee_id: string
  cycle_start_date: string
  cycle_end_date: string
  days_earned: number
  days_used: number
  days_available: number
  years_of_service: number
  is_expired: boolean
}

interface ApprovedVacation {
  id: string
  employee_id: string
  employee_name: string
  start_date: string
  end_date: string
  days_requested: number
  status: string
}

export default function AutorizacionesPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isSPOC, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const officeCode = Array.isArray(params.officeCode) ? params.officeCode[0] : params.officeCode

  // Estados
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<PendingVacationRequest | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Estados del calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendarView, setShowCalendarView] = useState(false)

  // Estados para cargar datos reales de la base de datos
  const [pendingRequests, setPendingRequests] = useState<PendingVacationRequest[]>([])
  const [approvedVacations, setApprovedVacations] = useState<ApprovedVacation[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [employeeCycles, setEmployeeCycles] = useState<VacationCycle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filteredRequests, setFilteredRequests] = useState<PendingVacationRequest[]>([])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Función para cargar todos los datos de la oficina específica
  const loadPendingRequests = async () => {
    if (!officeCode) return

    setIsLoading(true)
    try {
      // Encontrar la oficina
      const office = OFFICES.find(o => o.code.toLowerCase() === officeCode.toLowerCase())
      if (!office) {
        toast({
          title: "Error",
          description: "Oficina no encontrada",
          variant: "destructive"
        })
        return
      }

      // Cargar datos en paralelo
      const [vacationRequests, employees, holidaysData] = await Promise.all([
        getVacationRequests(office.id),
        getEmployeesByOfficeClient(office.id),
        getHolidays(office.id)
      ])

      // Crear mapa de empleados para obtener nombres
      const employeeMap = new Map(employees.map(emp => [emp.id, emp.name || `${emp.first_name} ${emp.last_name}`.trim()]))

      // Filtrar solicitudes pendientes
      const pendingOnly = vacationRequests?.filter(req => req.status === 'pending') || []
      
      // Mapear solicitudes pendientes
      const mappedPendingRequests: PendingVacationRequest[] = pendingOnly.map(req => ({
        id: req.id || '',
        employee_id: req.employee_id || '',
        employee_name: employeeMap.get(req.employee_id || '') || 'Empleado desconocido',
        start_date: req.start_date || '',
        end_date: req.end_date || '',
        days_requested: req.days_requested || 0,
        reason: req.reason,
        created_at: req.created_at || '',
        office_id: req.office_id || '',
        status: req.status || 'pending'
      }))

      // Filtrar vacaciones aprobadas para mostrar en calendario
      const approvedOnly = vacationRequests?.filter(req => req.status === 'approved') || []
      
      // Mapear vacaciones aprobadas
      const mappedApprovedVacations: ApprovedVacation[] = approvedOnly.map(req => ({
        id: req.id || '',
        employee_id: req.employee_id || '',
        employee_name: employeeMap.get(req.employee_id || '') || 'Empleado desconocido',
        start_date: req.start_date || '',
        end_date: req.end_date || '',
        days_requested: req.days_requested || 0,
        status: req.status || 'approved'
      }))

      // Mapear días festivos
      const mappedHolidays: Holiday[] = (holidaysData || []).map(holiday => ({
        id: holiday.id || '',
        office_id: holiday.office_id || '',
        name: holiday.name || '',
        holiday_date: holiday.holiday_date || '',
        is_active: holiday.is_active ?? true
      }))

      // Actualizar estados
      setPendingRequests(mappedPendingRequests)
      setApprovedVacations(mappedApprovedVacations)
      setHolidays(mappedHolidays)
      
      console.log(`✅ Cargados datos para oficina ${office.code}:`, {
        pending: mappedPendingRequests.length,
        approved: mappedApprovedVacations.length,
        holidays: mappedHolidays.length
      })
      
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de vacaciones",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    if (isMounted && isAuthenticated && isSPOC && officeCode) {
      loadPendingRequests()
    }
  }, [isMounted, isAuthenticated, isSPOC, officeCode])

  useEffect(() => {
    if (!isMounted) return
    if (!isAuthenticated || !isSPOC) {
      router.push('/')
    }
  }, [isAuthenticated, isSPOC, router, isMounted])

  useEffect(() => {
    filterRequests()
  }, [searchTerm, pendingRequests])

  const filterRequests = () => {
    if (!searchTerm.trim()) {
      setFilteredRequests(pendingRequests)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = pendingRequests.filter(request => 
      request.employee_name.toLowerCase().includes(term) ||
      (request.reason && request.reason.toLowerCase().includes(term))
    )
    setFilteredRequests(filtered)
  }

  const officeInfo = OFFICES.find(o => o.code.toLowerCase() === officeCode?.toLowerCase())

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Funciones del calendario
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convertir domingo de 0 a 6
  }

  // Verificar si una fecha tiene vacaciones (pendientes o aprobadas) o es día festivo
  const getDateInfo = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    
    // Verificar si es día festivo
    const holiday = holidays.find(h => h.holiday_date === dateStr && h.is_active)
    if (holiday) {
      return { type: 'holiday', data: holiday }
    }

    // Buscar en solicitudes pendientes
    const pendingVacation = pendingRequests.find(request => {
      const startDate = new Date(request.start_date)
      const endDate = new Date(request.end_date)
      return date >= startDate && date <= endDate
    })

    if (pendingVacation) {
      return { type: 'pending', data: { ...pendingVacation, status: 'pending' } }
    }

    // Buscar en vacaciones aprobadas
    const approvedVacation = approvedVacations.find(vacation => {
      const startDate = new Date(vacation.start_date)
      const endDate = new Date(vacation.end_date)
      return date >= startDate && date <= endDate
    })

    if (approvedVacation) {
      return { type: 'approved', data: { ...approvedVacation, status: 'approved' } }
    }

    return null
  }

  const handleApprove = async (request: PendingVacationRequest) => {
    setSelectedRequest(request)
    
    // Cargar los ciclos de vacaciones del empleado
    try {
      const cycles = await getVacationCycles(request.employee_id)
      
      // Mapear los ciclos para que coincidan con nuestra interfaz
      const mappedCycles: VacationCycle[] = (cycles || []).map(cycle => ({
        id: cycle.id || '',
        employee_id: cycle.employee_id || request.employee_id,
        cycle_start_date: cycle.cycle_start_date || '',
        cycle_end_date: cycle.cycle_end_date || '',
        days_earned: cycle.days_earned || 0,
        days_used: cycle.days_used || 0,
        days_available: cycle.days_available || 0,
        years_of_service: cycle.years_of_service || 0,
        is_expired: cycle.is_expired || false
      }))
      
      setEmployeeCycles(mappedCycles)
      console.log(`📊 Cargados ${mappedCycles.length} ciclos para empleado ${request.employee_name}`)
    } catch (error) {
      console.error('Error cargando ciclos del empleado:', error)
      setEmployeeCycles([])
    }
    
    setShowApprovalModal(true)
  }

  const handleReject = (request: PendingVacationRequest) => {
    setSelectedRequest(request)
    setShowRejectionModal(true)
  }

  const confirmApproval = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      // Actualizar el estado de la solicitud en la base de datos
      await updateVacationRequestStatus(selectedRequest.id, 'approved')

      // Remover de solicitudes pendientes localmente
      setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
      
      toast({
        title: "✅ Solicitud Aprobada",
        description: `La solicitud de ${selectedRequest.employee_name} ha sido aprobada exitosamente.`,
      })

      console.log(`✅ Solicitud ${selectedRequest.id} aprobada para empleado ${selectedRequest.employee_name}`)
      
    } catch (error) {
      console.error('Error al aprobar solicitud:', error)
      toast({
        title: "❌ Error",
        description: "No se pudo aprobar la solicitud. Por favor intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setShowApprovalModal(false)
      setSelectedRequest(null)
    }
  }

  const confirmRejection = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un motivo de rechazo",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      // Actualizar el estado de la solicitud a rechazada en la base de datos
      await updateVacationRequestStatus(selectedRequest.id, 'rejected', rejectionReason)

      // Remover de solicitudes pendientes localmente
      setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
      
      toast({
        title: "Solicitud Rechazada",
        description: `La solicitud de ${selectedRequest.employee_name} ha sido rechazada.`,
      })

      console.log(`❌ Solicitud ${selectedRequest.id} rechazada para empleado ${selectedRequest.employee_name}`)
      
    } catch (error) {
      console.error('Error al rechazar solicitud:', error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud. Por favor intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setShowRejectionModal(false)
      setSelectedRequest(null)
      setRejectionReason('')
    }
  }

  if (!isAuthenticated || !isSPOC) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <h1 className="text-xl font-semibold">Autorizaciones Pendientes</h1>
              {officeInfo && (
                <Badge variant="outline" className="ml-2">
                  {officeInfo.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          
          {/* Nota informativa sobre restricciones de oficina */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-medium text-blue-900">Autorización por Oficina</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Como SPOC de <strong>{officeInfo?.name}</strong>, solo puedes autorizar solicitudes de empleados de tu oficina. 
                    Las solicitudes de otras oficinas deben ser autorizadas por sus respectivos SPOCs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Pendientes en {officeInfo?.name}</CardTitle>
                <div className="text-2xl font-bold text-orange-600">{filteredRequests.length}</div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Días Solicitados</CardTitle>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredRequests.reduce((total, request) => total + request.days_requested, 0)}
                </div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Empleados Únicos</CardTitle>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(filteredRequests.map(r => r.employee_id)).size}
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Layout de dos columnas: Gestión de Vacaciones y Calendario */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Columna izquierda: Gestión de Vacaciones (2/3 del ancho) */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Vacaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por empleado o motivo..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Lista de Solicitudes */}
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">Cargando solicitudes de {officeInfo?.name}...</p>
                      </div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-3">
                          <FileText className="h-12 w-12 mx-auto mb-2" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
                        <p className="text-gray-500">
                          {searchTerm ? 'No se encontraron solicitudes con ese criterio de búsqueda' : `Todas las solicitudes de ${officeInfo?.name} han sido procesadas`}
                        </p>
                      </div>
                    ) : (
                      filteredRequests.map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="font-semibold text-gray-900">{request.employee_name}</span>
                                  </div>
                                  <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                    Pendiente
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Período: </span>
                                    <span className="font-medium">
                                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Días: </span>
                                    <span className="font-bold text-lg text-orange-600">{request.days_requested}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Solicitado: </span>
                                    <span>{formatDate(request.created_at)}</span>
                                  </div>
                                </div>
                                
                                {request.reason && (
                                  <div className="bg-gray-50 p-3 rounded border">
                                    <span className="text-xs text-gray-600 font-medium">MOTIVO:</span>
                                    <p className="text-sm text-gray-800 mt-1">{request.reason}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(request)}
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={isProcessing}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rechazar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={isProcessing}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprobar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha: Calendario siempre visible */}
            <div className="xl:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Calendario de Vacaciones</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium text-sm min-w-[120px] text-center">
                        {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Vista general de vacaciones aprobadas y pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Leyenda */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                      <span>Festivos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                      <span>Pendientes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                      <span>Aprobadas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                      <span>Disponibles</span>
                    </div>
                  </div>

                  {/* Calendario compacto */}
                  <div className="border rounded p-2">
                    {/* Encabezados de días */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                        <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Espacios vacíos para los días antes del primer día del mes */}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                        <div key={`empty-${i}`} className="h-8"></div>
                      ))}
                      
                      {/* Días del mes */}
                      {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                        const day = i + 1
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                        const dateInfo = getDateInfo(date)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        
                        let cellClass = 'h-8 w-full text-xs border rounded flex items-center justify-center cursor-pointer transition-all '
                        let title = ''
                        
                        if (dateInfo?.type === 'holiday') {
                          const holiday = dateInfo.data as Holiday
                          cellClass += 'bg-red-100 border-red-300 text-red-800 cursor-default'
                          title = `Día festivo: ${holiday.name}`
                        } else if (dateInfo?.type === 'pending') {
                          const vacation = dateInfo.data as PendingVacationRequest
                          cellClass += 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200'
                          title = `${vacation.employee_name} - Solicitud pendiente`
                        } else if (dateInfo?.type === 'approved') {
                          const vacation = dateInfo.data as ApprovedVacation
                          cellClass += 'bg-green-100 border-green-300 text-green-800 cursor-default'
                          title = `${vacation.employee_name} - Vacaciones aprobadas`
                        } else if (isWeekend) {
                          cellClass += 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                          title = 'Fin de semana'
                        } else {
                          cellClass += 'bg-white border-gray-200 hover:bg-gray-50 cursor-default'
                        }
                        
                        return (
                          <div
                            key={day}
                            className={cellClass}
                            title={title}
                            onClick={() => {
                              if (dateInfo?.type === 'pending' && dateInfo.data) {
                                const request = pendingRequests.find(r => r.id === dateInfo.data.id)
                                if (request) handleApprove(request)
                              }
                            }}
                          >
                            <span className="font-medium">{day}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resto del contenido va aquí si hay más secciones */}
        </div>
      </main>
            <Card>
            <CardHeader>
              <CardTitle>Solicitudes por Autorizar - {officeInfo?.name || 'Oficina'}</CardTitle>
              <CardDescription>
                Revisa y autoriza las solicitudes de vacaciones de empleados de tu oficina únicamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-500">Cargando solicitudes de {officeInfo?.name}...</p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {searchTerm ? 'No se encontraron solicitudes' : 'No hay solicitudes pendientes'}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm ? 'Intenta con otro término de búsqueda' : `Todas las solicitudes de ${officeInfo?.name} han sido procesadas`}
                    </p>
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-6 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{request.employee_name}</h3>
                              <p className="text-sm text-gray-500">
                                Solicitado el {formatDate(request.created_at)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Período de Vacaciones</Label>
                              <p className="text-sm">
                                {formatDate(request.start_date)} - {formatDate(request.end_date)}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {request.days_requested} días
                              </Badge>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Motivo</Label>
                              <p className="text-sm mt-1">{request.reason}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleApprove(request)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isProcessing}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(request)}
                            disabled={isProcessing}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Aprobación */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aprobar Solicitud
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar esta solicitud de vacaciones?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              {/* Layout horizontal: Información de solicitud + Ciclos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna izquierda: Información de la solicitud */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 text-lg mb-2">{selectedRequest.employee_name}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Período:</span>
                        <span className="font-medium text-green-700">
                          {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Días:</span>
                        <span className="font-bold text-green-800 text-lg">{selectedRequest.days_requested} días</span>
                      </div>
                      {selectedRequest.reason && (
                        <div className="mt-3 p-2 bg-white rounded border">
                          <span className="text-xs text-gray-600 font-medium">MOTIVO:</span>
                          <p className="text-sm text-gray-800 mt-1">{selectedRequest.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <h5 className="font-medium text-amber-800 mb-2">Al Aprobar:</h5>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Se descontarán {selectedRequest.days_requested} días de los ciclos activos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>La solicitud aparecerá como aprobada</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>El empleado será notificado</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Columna derecha: Ciclos de vacaciones */}
                <div className="lg:col-span-2">

              {/* Ciclos de vacaciones del empleado - Solo activos */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-3">Ciclos de Vacaciones Activos</h5>
                {employeeCycles.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-blue-600">Cargando información de ciclos...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employeeCycles
                      .filter(cycle => {
                        // Solo mostrar ciclos activos (no expirados)
                        const today = new Date()
                        const endDate = new Date(cycle.cycle_end_date)
                        return endDate >= today
                      })
                      .map((cycle, index) => {
                        const today = new Date()
                        const endDate = new Date(cycle.cycle_end_date)
                        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        
                        // Verificar si hay días suficientes
                        const hasEnoughDays = cycle.days_available >= selectedRequest.days_requested
                        
                        return (
                          <div key={cycle.id} className={`p-3 rounded-lg border-2 ${hasEnoughDays ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-semibold text-sm">
                                Ciclo {new Date(cycle.cycle_start_date).getFullYear()}
                              </div>
                              <div className="flex gap-1">
                                {daysUntilExpiry <= 60 ? (
                                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                                    Expira en {daysUntilExpiry} días
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Activo</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-3">
                              {new Date(cycle.cycle_start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                              <div className="bg-white p-2 rounded">
                                <div className="font-bold text-blue-600 text-lg">{cycle.days_earned}</div>
                                <div className="text-gray-500">Ganados</div>
                              </div>
                              <div className="bg-white p-2 rounded">
                                <div className="font-bold text-red-600 text-lg">{cycle.days_used}</div>
                                <div className="text-gray-500">Usados</div>
                              </div>
                              <div className="bg-white p-2 rounded">
                                <div className={`font-bold text-lg ${hasEnoughDays ? 'text-green-600' : 'text-red-600'}`}>
                                  {cycle.days_available}
                                </div>
                                <div className="text-gray-500">Disponibles</div>
                              </div>
                            </div>
                            
                            {!hasEnoughDays && (
                              <div className="text-xs text-red-700 bg-red-200 p-2 rounded text-center font-medium">
                                ⚠️ Insuficientes ({cycle.days_available} disponibles)
                              </div>
                            )}
                            
                            {hasEnoughDays && (
                              <div className="text-xs text-green-700 bg-green-200 p-2 rounded text-center font-medium">
                                ✅ Días suficientes
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Mensaje si no hay ciclos activos */}
                      {employeeCycles.filter(cycle => {
                        const today = new Date()
                        const endDate = new Date(cycle.cycle_end_date)
                        return endDate >= today
                      }).length === 0 && (
                        <div className="col-span-full text-center py-6 text-gray-500">
                          <p>No hay ciclos de vacaciones activos para este empleado</p>
                          <p className="text-xs mt-1">Todos los ciclos han expirado</p>
                        </div>
                      )}
                    </div>
                )}
              
                {/* Resumen total - Solo para ciclos activos */}
                {employeeCycles.filter(cycle => {
                  const today = new Date()
                  const endDate = new Date(cycle.cycle_end_date)
                  return endDate >= today
                }).length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
                    <div className="text-sm font-semibold mb-3 text-gray-700">Resumen de Disponibilidad</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-gray-600 mb-1">Total Disponible</div>
                        <div className="text-2xl font-bold text-green-600">
                          {employeeCycles
                            .filter(cycle => {
                              const today = new Date()
                              const endDate = new Date(cycle.cycle_end_date)
                              return endDate >= today
                            })
                            .reduce((total, cycle) => total + cycle.days_available, 0)} días
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-gray-600 mb-1">Días Solicitados</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedRequest.days_requested} días
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-gray-600 mb-1">Después de Aprobar</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.max(0, employeeCycles
                            .filter(cycle => {
                              const today = new Date()
                              const endDate = new Date(cycle.cycle_end_date)
                              return endDate >= today
                            })
                            .reduce((total, cycle) => total + cycle.days_available, 0) - selectedRequest.days_requested)} días
                        </div>
                      </div>
                    </div>
                    
                    {/* Estado de aprobación */}
                    <div className="mt-4">
                      {employeeCycles
                        .filter(cycle => {
                          const today = new Date()
                          const endDate = new Date(cycle.cycle_end_date)
                          return endDate >= today
                        })
                        .reduce((total, cycle) => total + cycle.days_available, 0) >= selectedRequest.days_requested ? (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">✅ Aprobación recomendada - El empleado tiene días suficientes</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="font-medium">❌ Revisar solicitud - Días insuficientes en ciclos activos</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  
                  {/* Nota final */}
                  <div className="text-sm text-gray-600 bg-amber-50 p-3 rounded mt-4">
                    <strong>Al aprobar:</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>Se descontarán {selectedRequest.days_requested} días de los ciclos del empleado</li>
                      <li>La solicitud aparecerá como aprobada en el historial</li>
                      <li>El empleado será notificado de la aprobación</li>
                    </ul>
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowApprovalModal(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rechazo */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Solicitud
            </DialogTitle>
            <DialogDescription>
              Proporciona un motivo para el rechazo de esta solicitud
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800">{selectedRequest.employee_name}</h4>
                <p className="text-sm text-red-600 mt-1">
                  {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                </p>
                <p className="text-sm text-red-600">
                  {selectedRequest.days_requested} días • {selectedRequest.reason || 'Sin motivo especificado'}
                </p>
              </div>
              
              <div>
                <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explica por qué se rechaza esta solicitud..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectionModal(false)
                setRejectionReason('')
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmRejection}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}