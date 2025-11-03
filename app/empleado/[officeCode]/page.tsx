'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, LogOut, User, Building, CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, X } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useAuth } from "@/lib/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { 
  getEmployeesByOfficeClient,
  getVacationCycles,
  getVacationRequests,
  getHolidays,
  createVacationRequest,
  cancelVacationRequest,
  calculateYearsOfService
} from "@/lib/supabase/db-functions"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Tipos de datos
interface Employee {
  id: string
  employee_number: string
  name: string
  first_name?: string
  last_name?: string
  hire_date: string
  office_id: string
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

interface Holiday {
  id?: string
  office_id: string
  name: string
  holiday_date: string
  description?: string
  is_active: boolean
}

interface VacationRequest {
  id?: string
  employee_id: string
  office_id: string
  start_date: string
  end_date: string
  days_requested: number
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  reason?: string
  created_at?: string
}

export default function EmpleadoDashboard() {
  const params = useParams()
  const router = useRouter()
  const { user, office, logout, isEmployee, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const officeCode = Array.isArray(params.officeCode) ? params.officeCode[0] : params.officeCode

  // Estados del empleado
  const [employeeNumber, setEmployeeNumber] = useState("")
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [showEmployeeForm, setShowEmployeeForm] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados de datos
  const [vacationCycles, setVacationCycles] = useState<VacationCycle[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [allVacationRequests, setAllVacationRequests] = useState<VacationRequest[]>([])
  const [myVacationRequests, setMyVacationRequests] = useState<VacationRequest[]>([])
  
  // Estados del calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [showVacationModal, setShowVacationModal] = useState(false)
  const [reason, setReason] = useState("")
  
  // Estados para cancelación de solicitudes
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedRequestToCancel, setSelectedRequestToCancel] = useState<VacationRequest | null>(null)
  const [cancelWarning, setCancelWarning] = useState<string>("")
  
  // Estados para paginación del historial
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  // Estado de montaje para evitar hydration mismatch
  const [hasRedirected, setHasRedirected] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Función para buscar empleado por número
  const handleEmployeeLogin = async () => {
    if (!employeeNumber.trim()) {
      toast({
        title: "Número requerido",
        description: "Por favor ingresa tu número de empleado",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Buscar empleados de esta oficina
      const allEmployees = await getEmployeesByOfficeClient(officeInfo?.id || "1")
      
      // Buscar empleado por número
      const foundEmployee = allEmployees.find(emp => 
        emp.employee_number?.toLowerCase() === employeeNumber.toLowerCase() ||
        emp.id === employeeNumber
      )

      if (!foundEmployee) {
        toast({
          title: "Empleado no encontrado",
          description: "No se encontró un empleado con ese número en esta oficina. Verifica tu número.",
          variant: "destructive"
        })
        return
      }

      // Formatear nombre completo
      const fullName = foundEmployee.name || 
        `${foundEmployee.first_name || ''} ${foundEmployee.last_name || ''}`.trim() ||
        `Empleado ${employeeNumber}`
      
      const employeeData: Employee = {
        id: foundEmployee.id!,
        employee_number: foundEmployee.employee_number || employeeNumber,
        name: fullName,
        first_name: foundEmployee.first_name,
        last_name: foundEmployee.last_name,
        hire_date: foundEmployee.hire_date?.toString() || new Date().toISOString(),
        office_id: foundEmployee.office_id
      }
      
      setCurrentEmployee(employeeData)
      setShowEmployeeForm(false)
      await loadEmployeeData(employeeData.id!)
      
      toast({
        title: "¡Bienvenido!",
        description: `Hola ${fullName}, cargando tu información...`
      })
    } catch (error) {
      console.error("Error finding employee:", error)
      toast({
        title: "Error",
        description: "Error al buscar el empleado. Por favor intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cargar datos del empleado
  const loadEmployeeData = async (employeeId: string) => {
    try {
      // Cargar datos reales de la base de datos
      const [cyclesData, holidaysData, allRequestsData] = await Promise.all([
        getVacationCycles(employeeId),
        getHolidays(officeInfo?.id || "1"),
        getVacationRequests(officeInfo?.id || "1")
      ])

      // Mapear ciclos de vacaciones del empleado
      const mappedCycles: VacationCycle[] = (cyclesData || []).map(cycle => ({
        id: cycle.id || "",
        employee_id: cycle.employee_id || employeeId,
        cycle_start_date: cycle.cycle_start_date || "",
        cycle_end_date: cycle.cycle_end_date || "",
        days_earned: cycle.days_earned || 0,
        days_used: cycle.days_used || 0,
        days_available: cycle.days_available || 0,
        years_of_service: cycle.years_of_service || 0,
        is_expired: cycle.is_expired || false
      }))
      setVacationCycles(mappedCycles)

      // Mapear días festivos de la oficina
      const mappedHolidays: Holiday[] = (holidaysData || []).map(holiday => ({
        id: holiday.id || "",
        office_id: holiday.office_id || "",
        name: holiday.name || "",
        holiday_date: holiday.holiday_date || "",
        is_active: holiday.is_active || false
      }))
      setHolidays(mappedHolidays)

      // Mapear todas las solicitudes de vacaciones (incluir todos los estados)
      const mappedRequests: VacationRequest[] = (allRequestsData || []).filter(req => 
        req.status === "pending" || req.status === "approved" || req.status === "rejected" ||
        req.status === "in_progress" || req.status === "completed" || req.status === "cancelled"
      ).map(req => ({
        id: req.id || "",
        employee_id: req.employee_id || "",
        office_id: req.office_id || "",
        start_date: req.start_date || "",
        end_date: req.end_date || "",
        days_requested: req.days_requested || 0,
        status: req.status as "pending" | "approved" | "rejected",
        reason: req.reason,
        created_at: req.created_at
      }))
      setAllVacationRequests(mappedRequests)

      // Filtrar mis solicitudes de vacaciones
      const myRequests = mappedRequests.filter(req => req.employee_id === employeeId)
      setMyVacationRequests(myRequests)

    } catch (error) {
      console.error("Error loading employee data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar tus datos de vacaciones",
        variant: "destructive"
      })
      
      // En caso de error, mostrar datos vacíos pero funcionales
      setVacationCycles([])
      setHolidays([])
      setAllVacationRequests([])
      setMyVacationRequests([])
    }
  }

  // Verificar autenticación y tipo de usuario - solo redirigir una vez
  useEffect(() => {
    if (!isMounted || hasRedirected) return // Esperar a que el componente esté montado
    
    if (!isAuthenticated) {
      setHasRedirected(true)
      router.push('/')
      return
    }
    
    if (!isEmployee) {
      setHasRedirected(true)
      // Si no es empleado, redirigir al dashboard normal
      router.push(`/dashboard/${officeCode}`)
      return
    }
  }, [isAuthenticated, isEmployee, router, officeCode, isMounted, hasRedirected])

  // Obtener información de la oficina
  const officeInfo = OFFICES.find(o => o.code.toLowerCase() === officeCode?.toLowerCase())

  const handleLogout = () => {
    logout()
    router.push('/')
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

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    )
  }

  const isDateHoliday = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return holidays.some(holiday => holiday.holiday_date === dateStr && holiday.is_active)
  }

  const isDateTaken = (date: Date) => {
    const dateStr = formatDateToLocalString(date)
    return allVacationRequests.some(request => {
      // Crear fechas locales sin problemas de UTC
      const startParts = request.start_date.split('-').map(Number)
      const endParts = request.end_date.split('-').map(Number)
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2])
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2])
      return date >= startDate && date <= endDate && request.status === 'approved'
    })
  }

  const isMyVacationDate = (date: Date) => {
    const dateStr = formatDateToLocalString(date)
    return myVacationRequests.some(request => {
      // Crear fechas locales sin problemas de UTC
      const startParts = request.start_date.split('-').map(Number)
      const endParts = request.end_date.split('-').map(Number)
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2])
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2])
      return date >= startDate && date <= endDate && (request.status === 'approved' || request.status === 'pending')
    })
  }

  const getMyVacationStatus = (date: Date) => {
    const dateStr = formatDateToLocalString(date)
    const request = myVacationRequests.find(request => {
      // Crear fechas locales sin problemas de UTC
      const startParts = request.start_date.split('-').map(Number)
      const endParts = request.end_date.split('-').map(Number)
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2])
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2])
      return date >= startDate && date <= endDate
    })
    return request?.status || null
  }

  const isDatePendingAuthorization = (date: Date) => {
    const dateStr = formatDateToLocalString(date)
    return myVacationRequests.some(request => {
      // Crear fechas locales sin problemas de UTC
      const startParts = request.start_date.split('-').map(Number)
      const endParts = request.end_date.split('-').map(Number)
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2])
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2])
      return date >= startDate && date <= endDate && request.status === 'pending'
    })
  }

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 // Solo domingo está prohibido
  }

  const toggleDateSelection = (date: Date) => {
    // Normalizar la fecha a medianoche para evitar problemas de comparación
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (isDateSelected(normalizedDate)) {
      setSelectedDates(prev => prev.filter(d => d.toDateString() !== normalizedDate.toDateString()))
    } else {
      setSelectedDates(prev => [...prev, normalizedDate])
    }
  }

  const canSelectDate = (date: Date) => {
    // Solo no permitir seleccionar: domingos, festivos, y días que YO ya solicité (pendientes o aprobados)
    // Sí puede seleccionar días que otros empleados tomaron
    return !isWeekend(date) && !isDateHoliday(date) && !isDatePendingAuthorization(date) && !isMyVacationDate(date)
  }

  // Función para solicitar vacaciones
  const handleRequestVacation = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "Selecciona días",
        description: "Por favor selecciona al menos un día de vacaciones",
        variant: "destructive"
      })
      return
    }

    // Verificar que no haya días con solicitud pendiente
    const daysWithPendingRequest = selectedDates.filter(date => isDatePendingAuthorization(date))
    if (daysWithPendingRequest.length > 0) {
      toast({
        title: "Días con solicitud pendiente",
        description: `No puedes solicitar días que ya tienen una autorización pendiente. Revisa tu selección.`,
        variant: "destructive"
      })
      return
    }

    // Verificar disponibilidad
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDates = selectedDates.filter(date => date >= today)
    const totalAvailable = vacationCycles
      .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
      .reduce((total, cycle) => total + cycle.days_available, 0)

    if (futureDates.length > totalAvailable) {
      toast({
        title: "Días insuficientes",
        description: `Solo tienes ${totalAvailable} días disponibles para fechas futuras`,
        variant: "destructive"
      })
      return
    }

    setShowVacationModal(true)
  }

  // Función helper para convertir fecha a formato YYYY-MM-DD sin problemas de UTC
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Función helper para parsear fechas sin problemas de UTC
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const confirmVacationRequest = async () => {
    setIsLoading(true)
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      
      const newRequest: Omit<VacationRequest, 'id' | 'created_at' | 'updated_at'> = {
        employee_id: currentEmployee!.id,
        office_id: officeInfo?.id || "1",
        start_date: formatDateToLocalString(sortedDates[0]),
        end_date: formatDateToLocalString(sortedDates[sortedDates.length - 1]),
        days_requested: selectedDates.length, // El número exacto de días seleccionados
        status: 'pending',
        reason: reason || undefined
      }

      // Guardar en la base de datos
      const createdRequest = await createVacationRequest(newRequest)
      
      // Recargar datos del empleado para mostrar la solicitud actualizada
      await loadEmployeeData(currentEmployee!.id)
      
      toast({
        title: "Solicitud enviada a autorización",
        description: `Tu solicitud de ${selectedDates.length} días ha sido enviada a tu supervisor para aprobación`
      })

      // Limpiar formulario
      setSelectedDates([])
      setReason("")
      setShowVacationModal(false)

    } catch (error) {
      console.error("Error al crear solicitud:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Por favor intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para iniciar cancelación de solicitud
  const handleCancelRequest = async (request: VacationRequest) => {
    // Solo permitir cancelar solicitudes PENDIENTES
    if (request.status !== 'pending') {
      toast({
        title: "No se puede cancelar",
        description: "Solo puedes cancelar solicitudes que aún estén pendientes de autorización. Para cancelar vacaciones aprobadas, contacta a tu supervisor.",
        variant: "destructive"
      })
      return
    }
    
    setSelectedRequestToCancel(request)
    
    // Para solicitudes pendientes, no hay días que devolver (no se habían descontado)
    const warningMessage = "Esta solicitud será cancelada. Como aún no ha sido aprobada, no afecta tus días de vacaciones disponibles."
    
    setCancelWarning(warningMessage)
    setShowCancelModal(true)
  }

  // Función para confirmar cancelación
  const confirmCancelRequest = async () => {
    if (!selectedRequestToCancel) return
    
    setIsLoading(true)
    try {
      // Para solicitudes pendientes, simplemente cambiar el estado a 'rejected'
      // NO llamar a cancelVacationRequest porque esa función intenta devolver días a ciclos
      // Las solicitudes pendientes NUNCA descontaron días, así que no hay nada que devolver
      
      const supabase = createClientSupabaseClient()
      const { error: updateError } = await supabase
        .from("vacation_requests")
        .update({
          status: 'rejected' as const,
          rejected_reason: 'CANCELADA: Solicitud cancelada por el empleado antes de ser aprobada',
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedRequestToCancel.id!)

      if (updateError) {
        throw new Error("No se pudo actualizar la solicitud")
      }
      
      // Recargar datos del empleado
      if (currentEmployee) {
        await loadEmployeeData(currentEmployee.id)
      }
      
      toast({
        title: "Solicitud cancelada",
        description: "Tu solicitud ha sido cancelada exitosamente. Como aún no estaba aprobada, no afecta tus días disponibles.",
      })
      
      setShowCancelModal(false)
      setSelectedRequestToCancel(null)
      setCancelWarning("")
      
    } catch (error) {
      console.error("Error al cancelar:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la solicitud. Por favor intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !isEmployee) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Portal Empleado</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{officeInfo?.name || 'Oficina'}</span>
                  {currentEmployee && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{currentEmployee.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        
        {/* Formulario de número de empleado */}
        {showEmployeeForm && (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Identificación de Empleado</CardTitle>
                <CardDescription className="text-center">
                  Ingresa tu número de empleado para acceder a tu información
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="employee-number">Número de Empleado</Label>
                  <Input
                    id="employee-number"
                    type="text"
                    placeholder="Ej: EMP001"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                  />
                </div>
                <Button 
                  onClick={handleEmployeeLogin}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Verificando..." : "Ingresar"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard del empleado */}
        {!showEmployeeForm && currentEmployee && (
          <div className="space-y-6">
            
            {/* Información del empleado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Empleado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <div className="space-y-1">
                      <div className="text-sm"><span className="font-medium">Nombre:</span></div>
                      <div className="text-lg font-semibold">{currentEmployee.name}</div>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="space-y-1">
                      <div className="text-sm"><span className="font-medium">Número:</span></div>
                      <div className="text-lg font-semibold text-blue-600">{currentEmployee.employee_number}</div>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="space-y-1">
                      <div className="text-sm"><span className="font-medium">Fecha de ingreso:</span></div>
                      <div className="text-lg font-semibold">{parseLocalDate(currentEmployee.hire_date).toLocaleDateString('es-ES')}</div>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="space-y-1">
                      <div className="text-sm"><span className="font-medium">Años de servicio:</span></div>
                      <div className="text-lg font-semibold text-green-600">
                        {Math.floor((new Date().getTime() - parseLocalDate(currentEmployee.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendario y Resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Calendario - ocupa 2/3 del ancho en pantallas grandes */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Seleccionar Días de Vacaciones</CardTitle>
                        <CardDescription>
                          Haz clic en los días que deseas solicitar como vacaciones
                        </CardDescription>
                      </div>
                      {selectedDates.length > 0 && (
                        <Button onClick={handleRequestVacation}>
                          <Plus className="h-4 w-4 mr-2" />
                          Solicitar {selectedDates.length} días
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                  
                  {/* Navegación del calendario */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-lg">
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

                  {/* Leyenda */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span>Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-200 border border-green-400"></div>
                      <span>Mis vacaciones aprobadas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-200 border border-orange-400"></div>
                      <span>⏳ Pendiente autorización</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-200 border border-red-400"></div>
                      <span>Día festivo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-purple-200 border border-purple-400"></div>
                      <span>Vacaciones de otros</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-200 border border-gray-400"></div>
                      <span>No disponible</span>
                    </div>
                  </div>

                  {/* Grilla del calendario */}
                  <div className="border rounded-lg p-3">
                    {/* Encabezados de días */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
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
                        const isSelected = isDateSelected(date)
                        const isHoliday = isDateHoliday(date)
                        const isTaken = isDateTaken(date)
                        const isMyVacation = isMyVacationDate(date)
                        const myVacationStatus = getMyVacationStatus(date)
                        const isWeekendDay = isWeekend(date)
                        const canSelect = canSelectDate(date) && !isMyVacation
                        
                        let cellClass = 'h-8 w-8 flex items-center justify-center text-xs cursor-pointer border rounded transition-colors relative '
                        let title = ''
                        
                        if (isSelected) {
                          cellClass += 'bg-blue-500 text-white border-blue-600 font-medium'
                          title = 'Seleccionado - clic para deseleccionar'
                        } else if (isMyVacation) {
                          if (myVacationStatus === 'approved') {
                            cellClass += 'bg-green-200 text-green-800 border-green-400 cursor-not-allowed font-medium'
                            title = 'Tus vacaciones aprobadas'
                          } else if (myVacationStatus === 'pending') {
                            cellClass += 'bg-orange-200 text-orange-800 border-orange-400 cursor-not-allowed font-medium animate-pulse'
                            title = '⏳ Pendiente de autorización'
                          } else if (myVacationStatus === 'rejected') {
                            cellClass += 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed line-through'
                            title = 'Vacaciones rechazadas'
                          }
                        } else if (isHoliday) {
                          cellClass += 'bg-red-200 text-red-800 border-red-400 cursor-not-allowed'
                          title = 'Día festivo'
                        } else if (isTaken) {
                          cellClass += 'bg-purple-200 text-purple-800 border-purple-400 cursor-not-allowed'
                          title = 'Vacaciones de otro empleado'
                        } else if (isWeekendDay) {
                          cellClass += 'bg-gray-200 text-gray-500 border-gray-400 cursor-not-allowed'
                          title = 'Domingo (no disponible)'
                        } else if (canSelect) {
                          cellClass += 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                          title = 'Clic para seleccionar'
                        } else {
                          cellClass += 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          title = 'No disponible'
                        }
                        
                        return (
                          <button
                            key={day}
                            className={cellClass}
                            onClick={() => canSelect && toggleDateSelection(date)}
                            disabled={!canSelect}
                            title={title}
                          >
                            {day}
                            {isMyVacation && (
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-current opacity-75"></div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Días seleccionados */}
                  {selectedDates.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Días seleccionados ({selectedDates.length}):</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, i) => (
                            <Badge key={i} variant="secondary">
                              {date.toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Panel lateral - información rápida */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {vacationCycles.reduce((total, cycle) => total + cycle.days_available, 0)}
                      </div>
                      <div className="text-sm text-green-700">Días disponibles</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {vacationCycles.reduce((total, cycle) => total + cycle.days_used, 0)}
                      </div>
                      <div className="text-sm text-blue-700">Días utilizados</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {myVacationRequests.filter(req => req.status === 'pending').length}
                      </div>
                      <div className="text-sm text-orange-700">Pendientes</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Vacaciones Pendientes por Autorizar */}
            {myVacationRequests.filter(req => req.status === 'pending').length > 0 && (
              <Card className="border-orange-200 shadow-md">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-5 w-5" />
                    Vacaciones Pendientes por Autorizar
                  </CardTitle>
                  <CardDescription>
                    Estas solicitudes están esperando la aprobación de tu supervisor
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {myVacationRequests
                      .filter(req => req.status === 'pending')
                      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                      .map((request, index) => {
                        const startDate = new Date(request.start_date)
                        const endDate = new Date(request.end_date)
                        const now = new Date()
                        now.setHours(0, 0, 0, 0)
                        const isUpcoming = startDate >= now
                        const isPast = endDate < now
                        
                        return (
                          <div 
                            key={request.id || index} 
                            className="border-l-4 border-l-orange-400 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CalendarDays className="h-5 w-5 text-orange-600" />
                                  <span className="font-semibold text-lg">
                                    {startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {startDate.toDateString() !== endDate.toDateString() && (
                                      <> - {endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                    )}
                                  </span>
                                  {isPast && (
                                    <Badge variant="outline" className="bg-gray-100">
                                      Fecha pasada
                                    </Badge>
                                  )}
                                  {isUpcoming && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                      Próxima
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="ml-8 space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-medium">Días solicitados:</span>
                                    <Badge variant="secondary" className="font-semibold">
                                      {request.days_requested} días
                                    </Badge>
                                  </div>
                                  
                                  {request.reason && (
                                    <div className="text-sm text-gray-600">
                                      <span className="font-medium">Motivo:</span> {request.reason}
                                    </div>
                                  )}
                                  
                                  {request.created_at && (
                                    <div className="text-xs text-gray-500 mt-2">
                                      📅 Solicitado el: {new Date(request.created_at).toLocaleDateString('es-ES', {
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
                              
                              <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-orange-100 text-orange-700 border-orange-300 whitespace-nowrap animate-pulse">
                                  ⏳ Pendiente
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelRequest(request)}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs"
                                >
                                  Cancelar Solicitud
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historial de Vacaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Vacaciones</CardTitle>
                <CardDescription>
                  Registro completo de tus vacaciones aprobadas, completadas y canceladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myVacationRequests.filter(req => req.status !== 'pending').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No tienes solicitudes de vacaciones en tu historial</p>
                      <p className="text-sm mt-2">Las solicitudes pendientes aparecen en la sección anterior</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {myVacationRequests
                          .filter(req => req.status !== 'pending')
                          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((request, index) => {
                            const startDate = new Date(request.start_date)
                            const endDate = new Date(request.end_date)
                            let statusColor = 'bg-gray-100 text-gray-700'
                            let statusText = 'Desconocido'
                            
                            if (request.status === 'approved') {
                              statusColor = 'bg-green-100 text-green-700'
                              statusText = 'Aprobada'
                            } else if (request.status === 'pending') {
                              statusColor = 'bg-yellow-100 text-yellow-700'
                              statusText = 'Pendiente'
                            } else if (request.status === 'rejected') {
                              statusColor = 'bg-red-100 text-red-700'
                              statusText = 'Rechazada'
                            } else if (request.status === 'in_progress') {
                              statusColor = 'bg-blue-100 text-blue-700'
                              statusText = 'En Proceso'
                            } else if (request.status === 'completed') {
                              statusColor = 'bg-green-100 text-green-700'
                              statusText = 'Completada'
                            } else if (request.status === 'cancelled') {
                              statusColor = 'bg-gray-100 text-gray-700'
                              statusText = 'Cancelada'
                            }
                            
                            return (
                              <div key={request.id || index} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">
                                    {startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {startDate.toDateString() !== endDate.toDateString() && (
                                      <> - {endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {request.days_requested} días
                                    </Badge>
                                    <Badge className={`text-xs ${statusColor}`}>
                                      {statusText}
                                    </Badge>
                                  </div>
                                </div>
                                {request.reason && (
                                  <p className="text-sm text-gray-600">{request.reason}</p>
                                )}
                                {request.created_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Solicitado: {new Date(request.created_at).toLocaleDateString('es-ES')}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                      </div>

                      {/* Paginación */}
                      {(() => {
                        const historyRequests = myVacationRequests.filter(req => req.status !== 'pending')
                        const totalPages = Math.ceil(historyRequests.length / itemsPerPage)
                        return totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-gray-500">
                              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, historyRequests.length)} de {historyRequests.length} solicitudes
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                              </Button>
                              <span className="text-sm font-medium">
                                {currentPage} / {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mis ciclos de vacaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Mis Ciclos de Vacaciones</CardTitle>
                <CardDescription>
                  Estado actual de tus días de vacaciones por ciclo (ordenados del más reciente al más antiguo)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {vacationCycles
                    .sort((a, b) => new Date(b.cycle_start_date).getTime() - new Date(a.cycle_start_date).getTime())
                    .map((cycle) => {
                    const today = new Date()
                    const startDate = new Date(cycle.cycle_start_date)
                    const endDate = new Date(cycle.cycle_end_date)
                    const isExpired = endDate < today
                    const isNotStarted = startDate > today
                    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    
                    let status = 'Activo'
                    let statusColor = 'bg-green-100 text-green-700'
                    let showExpiryWarning = false
                    
                    if (isExpired) {
                      status = 'Expirado'
                      statusColor = 'bg-red-100 text-red-700'
                    } else if (isNotStarted) {
                      status = 'No iniciado' 
                      statusColor = 'bg-blue-100 text-blue-700'
                    } else if (daysUntilExpiry <= 60 && daysUntilExpiry > 30) {
                      status = 'Próximo a expirar'
                      statusColor = 'bg-orange-100 text-orange-700'
                      showExpiryWarning = true
                    } else if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                      status = 'Expira pronto'
                      statusColor = 'bg-red-100 text-red-700'
                      showExpiryWarning = true
                    }
                    
                    return (
                      <div key={cycle.id} className="border rounded-lg p-4 relative">
                        {/* Badge de advertencia para próximo a expirar */}
                        {showExpiryWarning && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <Badge className="bg-red-500 text-white animate-pulse">
                              ⚠️ {daysUntilExpiry} días
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-lg">
                            Ciclo {new Date(cycle.cycle_start_date).getFullYear()}
                          </h5>
                          <Badge className={statusColor}>
                            {status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-4">
                          {new Date(cycle.cycle_start_date).toLocaleDateString('es-ES')} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES')}
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Días utilizados</span>
                            <span>{cycle.days_used} / {cycle.days_earned}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, (cycle.days_used / cycle.days_earned) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="font-bold text-2xl text-green-600">{cycle.days_earned}</div>
                            <div className="text-green-700 font-medium">Por Ley</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="font-bold text-2xl text-blue-600">{cycle.days_available}</div>
                            <div className="text-blue-700 font-medium">Disponibles</div>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="font-bold text-2xl text-red-600">{cycle.days_used}</div>
                            <div className="text-red-700 font-medium">Utilizados</div>
                          </div>
                        </div>
                        
                        {/* Información adicional para próximo a expirar */}
                        {showExpiryWarning && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            💡 Este ciclo expira en {daysUntilExpiry} días. ¡No olvides usar tus días restantes!
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Modal de confirmación de solicitud */}
      <Dialog open={showVacationModal} onOpenChange={setShowVacationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Solicitud a Autorización</DialogTitle>
            <DialogDescription>
              Tu solicitud de {selectedDates.length} días será enviada a tu supervisor para aprobación
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm font-medium mb-2">Días seleccionados:</div>
              <div className="text-xs space-y-1">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date, i) => (
                    <div key={i}>
                      {date.toLocaleDateString('es-ES', { 
                        weekday: 'long',
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="vacation-reason">Motivo (opcional)</Label>
              <Input
                id="vacation-reason"
                placeholder="Ej: Vacaciones familiares, viaje..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowVacationModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmVacationRequest}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? "Enviando..." : "Enviar a Autorización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Cancelación */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Solicitud de Vacaciones</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar esta solicitud?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequestToCancel && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Período:</span>
                    <span className="font-medium">
                      {new Date(selectedRequestToCancel.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      {' - '}
                      {new Date(selectedRequestToCancel.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Días solicitados:</span>
                    <Badge variant="secondary" className="font-semibold">
                      {selectedRequestToCancel.days_requested} días
                    </Badge>
                  </div>
                  {selectedRequestToCancel.reason && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-600">Motivo:</span>
                      <p className="text-sm mt-1">{selectedRequestToCancel.reason}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {cancelWarning && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 text-2xl">ℹ️</div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-700">{cancelWarning}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {!cancelWarning && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800">
                        Los {selectedRequestToCancel.days_requested} días serán devueltos a tus ciclos de vacaciones activos.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelModal(false)
                setSelectedRequestToCancel(null)
                setCancelWarning("")
              }}
              disabled={isLoading}
            >
              No, mantener solicitud
            </Button>
            <Button 
              onClick={confirmCancelRequest}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Cancelando..." : "Sí, cancelar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}