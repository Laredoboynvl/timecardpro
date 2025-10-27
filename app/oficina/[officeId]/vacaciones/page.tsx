"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, Plus, Filter, Download, Search, Info, Users, ChevronLeft, ChevronRight, Settings, Minus, History, Clock, TrendingUp, Trash2, AlertTriangle } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import {
  getEmployeesByOfficeClient,
  getVacationRequests,
  createVacationRequest,
  calculateVacationDays,
  calculateYearsOfService,
  getVacationCycles,
  createVacationCyclesForEmployee,
  deductVacationDaysFromCycles,
  addVacationDaysToCycles,
  deductVacationDaysFromCyclesWithReason,
  cancelVacationRequest,
  restoreVacationDaysToOldestCycles,
  clearAllVacationData,
  getHolidays,
  isHoliday,
  type Employee,
  type VacationRequest,
  type VacationCycle,
  type Holiday,
} from "@/lib/supabase/db-functions"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { HolidayManager } from "@/components/holiday-manager"

// Datos de días por ley según años laborados
const VACATION_DAYS_BY_LAW = [
  { years: 1, days: 12 },
  { years: 2, days: 14 },
  { years: 3, days: 16 },
  { years: 4, days: 18 },
  { years: 5, days: 20 },
  { yearsRange: "6-10", days: 22 },
  { yearsRange: "11-15", days: 24 },
  { yearsRange: "16-20", days: 26 },
  { yearsRange: "21-25", days: 28 },
  { yearsRange: "26-30", days: 30 },
  { yearsRange: "31-35", days: 32 },
]

export default function VacacionesPage() {
  const params = useParams()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())
  const { toast } = useToast()

  // Función helper para convertir fecha a formato YYYY-MM-DD sin problemas de UTC
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<VacationRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [paginatedRequests, setPaginatedRequests] = useState<VacationRequest[]>([])
  
  // Modales
  const [showDiasPorLey, setShowDiasPorLey] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [showHolidayManager, setShowHolidayManager] = useState(false)
  const [showControlModal, setShowControlModal] = useState(false)
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false)
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false)
  const [pendingCancelRequest, setPendingCancelRequest] = useState<{request: any, warningMessage: string} | null>(null)
  const [pendingSuccessCancel, setPendingSuccessCancel] = useState<{request: any, distributionDetails: string} | null>(null)
  
  // Control de días
  const [controlAction, setControlAction] = useState<'add' | 'remove'>('add')
  const [controlMode, setControlMode] = useState<'days' | 'remaining'>('days') // Nuevo: modo de control
  const [controlDays, setControlDays] = useState(1)
  const [controlRemainingDays, setControlRemainingDays] = useState(0) // Nuevo: días restantes objetivo
  const [controlReason, setControlReason] = useState("")
  
  // Modal del motivo
  const [showReasonModal, setShowReasonModal] = useState(false)
  
  // Historial detallado
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState("")
  const [employeeHistoryData, setEmployeeHistoryData] = useState<{
    employee: Employee | null
    allCycles: VacationCycle[]
    vacationRequests: VacationRequest[]
  }>({
    employee: null,
    allCycles: [],
    vacationRequests: []
  })
  
  // Estados de paginación para historial de solicitudes
  const [historialCurrentPage, setHistorialCurrentPage] = useState(1)
  const [historialItemsPerPage, setHistorialItemsPerPage] = useState(5)
  
  // Formulario de nueva solicitud
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [reason, setReason] = useState("")
  const [vacationCycles, setVacationCycles] = useState<VacationCycle[]>([])
  
  // Para el calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'calendar' | 'cycles'>('calendar')
  
  // Modal de detalle de solicitud
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null)

  useEffect(() => {
    if (office) {
      loadData()
    }
  }, [office])

  useEffect(() => {
    filterRequests()
  }, [searchTerm, vacationRequests])

  useEffect(() => {
    paginateRequests()
  }, [filteredRequests, currentPage, itemsPerPage])

  const paginateRequests = () => {
    // Ordenar por fecha de creación de la solicitud (más recientes primero)
    const sortedRequests = [...filteredRequests].sort((a, b) => {
      const dateA = new Date(a.created_at || a.start_date).getTime()
      const dateB = new Date(b.created_at || b.start_date).getTime()
      return dateB - dateA // Más reciente primero (arriba), más antigua abajo
    })

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedRequests(sortedRequests.slice(startIndex, endIndex))
  }

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1) // Reset a la primera página
  }

  const loadData = async () => {
    if (!office) return
    
    setIsLoading(true)
    try {
      const [employeesData, requestsData, holidaysData] = await Promise.all([
        getEmployeesByOfficeClient(office.id),
        getVacationRequests(office.id),
        getHolidays(office.id)
      ])
      
      setEmployees(employeesData)
      setVacationRequests(requestsData)
      setFilteredRequests(requestsData)
      setHolidays(holidaysData)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterRequests = () => {
    if (!searchTerm.trim()) {
      setFilteredRequests(vacationRequests)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = vacationRequests.filter(request => {
      const employee = employees.find(emp => emp.id === request.employee_id)
      const employeeName = employee?.name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || ''
      return employeeName.toLowerCase().includes(term) ||
             request.status.toLowerCase().includes(term)
    })
    setFilteredRequests(filtered)
  }

  // Funciones del calendario
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Lunes = 0, Domingo = 6
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    )
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 // Solo domingo = 0 está prohibido, sábado = 6 está permitido
  }

  const isDateHoliday = (date: Date) => {
    const dateStr = formatDateToLocalString(date)
    return holidays.some(holiday => holiday.holiday_date === dateStr && holiday.is_active !== false)
  }

  const isDateTaken = (date: Date) => {
    // 🔧 LÓGICA MEJORADA: Verificar si la fecha ya está tomada en solicitudes existentes del mismo empleado
    const dateStr = formatDateToLocalString(date)
    return vacationRequests.some(request => {
      if (request.employee_id !== selectedEmployeeId) return false
      if (request.status === 'rejected') return false
      
      const startDate = new Date(request.start_date + 'T00:00:00')
      const endDate = new Date(request.end_date + 'T00:00:00')
      const checkDate = new Date(dateStr + 'T00:00:00')
      
      // ✅ SOLUCIÓN: Solo verificar el rango real de fechas aprobadas
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  const toggleDateSelection = (date: Date) => {
    if (isWeekend(date) || isDateTaken(date) || isDateHoliday(date)) return // No permitir selección en domingos, días ya tomados o días festivos
    
    const isSelected = isDateSelected(date)
    if (isSelected) {
      setSelectedDates(selectedDates.filter(selectedDate => 
        selectedDate.toDateString() !== date.toDateString()
      ))
    } else {
      // Verificar si la fecha es pasada
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
      
      // Para fechas pasadas, permitir siempre (solo como referencia)
      if (isPast) {
        setSelectedDates([...selectedDates, date])
        return
      }
      
      // Para fechas futuras, verificar disponibilidad solo en ciclos iniciados
      const activeCycles = vacationCycles.filter(cycle => 
        cycle.days_available > 0 && 
        !cycle.is_expired && 
        new Date(cycle.cycle_start_date) <= new Date() // Solo ciclos que ya iniciaron
      )
      const totalAvailable = activeCycles.reduce((total, cycle) => total + cycle.days_available, 0)
      
      if (selectedDates.length >= totalAvailable) {
        const cyclesInfo = activeCycles
          .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
          .map(cycle => `Ciclo ${new Date(cycle.cycle_start_date).getFullYear()}: ${cycle.days_available} disponibles (${cycle.days_earned} por ley)`)
          .join(', ')
        
        const futureNotAvailable = vacationCycles.filter(cycle => 
          cycle.days_available > 0 && 
          !cycle.is_expired && 
          new Date(cycle.cycle_start_date) > new Date()
        )
        
        const futureInfo = futureNotAvailable.length > 0 
          ? ` Ciclos futuros no disponibles aún: ${futureNotAvailable.map(c => new Date(c.cycle_start_date).getFullYear()).join(', ')}`
          : ''
        
        toast({
          title: "Sin días disponibles", 
          description: `No puedes seleccionar más días. ${cyclesInfo}${futureInfo}`,
          variant: "destructive"
        })
        return
      }
      
      setSelectedDates([...selectedDates, date])
    }
  }

  // Función para determinar de qué ciclo viene cada día y su color
  const getDateCycleColor = (dateIndex: number) => {
    if (vacationCycles.length === 0) return 'bg-primary'
    
    // Simular distribución de días desde ciclos más antiguos
    let remainingDays = dateIndex + 1
    let currentCycleIndex = 0
    
    const availableCycles = vacationCycles
      .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
      .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
    
    for (let i = 0; i < availableCycles.length; i++) {
      const cycle = availableCycles[i]
      if (remainingDays <= cycle.days_available) {
        currentCycleIndex = i
        break
      }
      remainingDays -= cycle.days_available
    }
    
    // Colores para diferentes ciclos
    const colors = [
      'bg-blue-500',    // Ciclo más antiguo - azul
      'bg-green-500',   // Segundo ciclo - verde
      'bg-purple-500',  // Tercer ciclo - morado
      'bg-orange-500',  // Cuarto ciclo - naranja
      'bg-pink-500',    // Quinto ciclo - rosa
    ]
    
    return colors[currentCycleIndex % colors.length] || 'bg-primary'
  }

  // Función para obtener información del ciclo de un día específico
  const getDateCycleInfo = (dateIndex: number) => {
    if (vacationCycles.length === 0) return 'Día seleccionado'
    
    let remainingDays = dateIndex + 1
    
    const availableCycles = vacationCycles
      .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
      .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
    
    for (let i = 0; i < availableCycles.length; i++) {
      const cycle = availableCycles[i]
      if (remainingDays <= cycle.days_available) {
        return `Ciclo ${new Date(cycle.cycle_start_date).getFullYear()}`
      }
      remainingDays -= cycle.days_available
    }
    
    return 'Día seleccionado'
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  // Función de diagnóstico para identificar problemas
  const diagnoseCycleCreation = async (employeeId: string) => {
    console.log(`🔍 DIAGNÓSTICO: Iniciando para empleado: ${employeeId}`)
    
    const supabase = createClientSupabaseClient()
    
    // 1. Verificar empleado
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, first_name, last_name, hire_date")
      .eq("id", employeeId)
      .single()

    if (employeeError) {
      console.error("❌ DIAGNÓSTICO: Error al obtener empleado:", employeeError)
      return
    }
    
    console.log("✅ DIAGNÓSTICO: Empleado encontrado:", employee)
    
    // 2. Intentar crear ciclo simple
    const testCycle = {
      employee_id: employeeId,
      cycle_start_date: '2024-01-01',
      cycle_end_date: '2025-06-30',
      days_earned: 15,
      days_used: 0,
      days_available: 15,
      years_of_service: 1,
      is_expired: false
    }
    
    console.log("📋 DIAGNÓSTICO: Intentando crear ciclo:", testCycle)
    
    const { data: newCycle, error: insertError } = await supabase
      .from("vacation_cycles")
      .insert(testCycle)
      .select()
      .single()
    
    if (insertError) {
      console.error("❌ DIAGNÓSTICO: Error detallado:", {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      })
    } else {
      console.log("✅ DIAGNÓSTICO: Ciclo creado exitosamente:", newCycle)
      
      // Limpiar ciclo de prueba
      await supabase.from("vacation_cycles").delete().eq("id", (newCycle as any).id)
      console.log("🧹 DIAGNÓSTICO: Ciclo de prueba eliminado")
    }
  }

  // Cargar ciclos de vacaciones cuando se selecciona un empleado
  const loadVacationCycles = async (employeeId: string) => {
    if (!employeeId) {
      setVacationCycles([])
      return
    }
    
    try {
      // DIAGNÓSTICO: Ejecutar función de diagnóstico
      await diagnoseCycleCreation(employeeId)
      
      // Intentar obtener ciclos existentes
      console.log(`🔄 Cargando ciclos para empleado: ${employeeId}`)
      let cycles = await getVacationCycles(employeeId)
      
      // Si no hay ciclos, crear automáticamente
      if (cycles.length === 0) {
        console.log("🚀 Creando nuevos ciclos automáticamente...")
        cycles = await createVacationCyclesForEmployee(employeeId)
        console.log(`✅ Resultado de creación: ${cycles.length} ciclos creados`, cycles)
      }
      
      // Filtrar solo ciclos no expirados
      const activeCycles = cycles.filter(cycle => !cycle.is_expired)
      console.log(`📊 Ciclos activos: ${activeCycles.length}`)
      setVacationCycles(activeCycles)
    } catch (error) {
      console.error("❌ Error completo al cargar ciclos:", error)
      // Fallback a datos simulados si hay error de base de datos
      const cycles: VacationCycle[] = [
        {
          id: '1',
          employee_id: employeeId,
          cycle_start_date: '2024-01-01',
          cycle_end_date: '2024-12-31',
          days_earned: 20,
          days_used: 5,
          days_available: 15,
          years_of_service: 3,
          is_expired: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      setVacationCycles(cycles)
    }
  }

  // Actualizar cuando se selecciona un empleado
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    loadVacationCycles(employeeId)
  }

  // Función para cargar historial detallado de empleado
  const loadEmployeeHistory = async (employeeId: string) => {
    if (!employeeId) {
      setEmployeeHistoryData({
        employee: null,
        allCycles: [],
        vacationRequests: []
      })
      return
    }

    setIsLoading(true)
    try {
      const employee = employees.find(emp => emp.id === employeeId)
      
      // Cargar TODOS los ciclos (incluidos expirados)
      const allCycles = await getVacationCycles(employeeId)
      
      // Cargar todas las solicitudes de vacaciones del empleado
      const allRequests = vacationRequests.filter(req => req.employee_id === employeeId)

      setEmployeeHistoryData({
        employee: employee || null,
        allCycles: allCycles,
        vacationRequests: allRequests
      })
    } catch (error) {
      console.error("Error loading employee history:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial del empleado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para manejar control de días
  const handleControlDays = async () => {
    if (!selectedEmployeeId || !controlReason.trim()) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    // Validaciones específicas según el modo
    if (controlAction === 'add' && controlDays < 1) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad de días debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    if (controlAction === 'remove' && controlMode === 'days' && controlDays < 1) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad de días debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    if (controlAction === 'remove' && controlMode === 'remaining' && controlRemainingDays < 0) {
      toast({
        title: "Cantidad inválida",
        description: "Los días restantes no pueden ser negativos",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      if (controlAction === 'add') {
        // Agregar días al ciclo más antiguo
        const success = await addVacationDaysToCycles(selectedEmployeeId, controlDays, controlReason)
        if (success) {
          toast({
            title: "Días agregados",
            description: `Se agregaron ${controlDays} día${controlDays !== 1 ? 's' : ''} al ciclo más antiguo`
          })
        } else {
          throw new Error("No se pudieron agregar los días")
        }
      } else {
        // Determinar cuántos días descontar según el modo
        let daysToDeduct: number
        
        if (controlMode === 'days') {
          // Modo tradicional: descontar días específicos
          daysToDeduct = controlDays
        } else {
          // Modo nuevo: establecer días restantes
          const currentTotal = vacationCycles
            .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
            .reduce((total, cycle) => total + cycle.days_available, 0)
          
          daysToDeduct = currentTotal - controlRemainingDays
          
          if (daysToDeduct <= 0) {
            if (daysToDeduct === 0) {
              toast({
                title: "Sin cambios",
                description: "Los días actuales ya coinciden con el objetivo",
                variant: "default"
              })
            } else {
              toast({
                title: "No se puede aumentar días",
                description: "Use la opción 'Agregar días' para aumentar días disponibles",
                variant: "destructive"
              })
            }
            setIsLoading(false)
            return
          }
        }
        
        // Verificar que hay suficientes días disponibles
        const currentTotal = vacationCycles
          .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
          .reduce((total, cycle) => total + cycle.days_available, 0)
        
        if (daysToDeduct > currentTotal) {
          toast({
            title: "Días insuficientes",
            description: `No hay suficientes días disponibles. Disponibles: ${currentTotal}, solicitados: ${daysToDeduct}`,
            variant: "destructive"
          })
          setIsLoading(false)
          return
        }

        // Crear el motivo detallado
        const detailedReason = controlMode === 'remaining' 
          ? `${controlReason} [Ajuste a ${controlRemainingDays} días restantes - Se descontaron ${daysToDeduct} días]`
          : controlReason

        // Descontar días de los ciclos (más antiguo primero)
        const success = await deductVacationDaysFromCyclesWithReason(selectedEmployeeId, daysToDeduct, detailedReason)
        if (success) {
          const message = controlMode === 'remaining'
            ? `Se ajustaron los días a ${controlRemainingDays} disponibles (descontados: ${daysToDeduct})`
            : `Se descontaron ${daysToDeduct} día${daysToDeduct !== 1 ? 's' : ''} de los ciclos`
            
          toast({
            title: "Días descontados",
            description: message
          })
        } else {
          throw new Error("No se pudieron descontar los días")
        }
      }

      // Recargar datos
      await loadVacationCycles(selectedEmployeeId)
      await loadEmployeeCycles()
      
      // Limpiar y cerrar modal
      setControlMode('days')
      setControlDays(1)
      setControlRemainingDays(0)
      setControlReason("")
      setShowControlModal(false)
      
    } catch (error) {
      console.error("Error en control de días:", error)
      toast({
        title: "Error",
        description: "No se pudo completar la operación",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }



  // Función para ver detalles de una solicitud
  const handleViewRequest = async (request: VacationRequest) => {
    setSelectedRequest(request)
    setShowDetailModal(true)
  }

  // Función para cancelar solicitud de vacaciones
  const handleCancelRequest = async (requestId: string) => {
    const request = vacationRequests.find(r => r.id === requestId)
    if (!request) {
      toast({
        title: "Error",
        description: "No se encontró la solicitud",
        variant: "destructive"
      })
      return
    }

    console.log(`🗑️ Intentando cancelar solicitud:`, {
      id: request.id,
      employee: request.employee_id,
      days: request.days_requested,
      status: request.status
    })

    // Obtener ciclos del empleado ordenados por fecha (más nuevo primero para restauración)
    const employeeCyclesData = employeeCycles[request.employee_id] || []
    const allCycles = [...employeeCyclesData].sort((a, b) => 
      new Date(b.cycle_start_date).getTime() - new Date(a.cycle_start_date).getTime()
    )
    
    const activeCycles = allCycles.filter(cycle => !cycle.is_expired)
    const expiredCycles = allCycles.filter(cycle => cycle.is_expired)
    
    console.log(`📊 Análisis de ciclos:`, {
      total: allCycles.length,
      activos: activeCycles.length,
      expirados: expiredCycles.length,
      diasARestaurar: request.days_requested
    })

    // Simular distribución de días a restaurar (más nuevo primero)
    let remainingDays = request.days_requested
    let distributionPlan = []
    let totalRestorable = 0
    let lostDays = 0

    // Procesar ciclos activos (más nuevo primero)
    for (const cycle of activeCycles) {
      if (remainingDays <= 0) break
      
      // Al cancelar, los días se pueden restaurar hasta el límite legal del ciclo
      // No importa cuántos días están actualmente "usados" porque se están restaurando
      const maxCanRestore = cycle.days_earned // Máximo permitido por ley total del ciclo
      const daysToRestore = Math.min(remainingDays, maxCanRestore)
      
      if (daysToRestore > 0) {
        distributionPlan.push({
          cycle: cycle,
          daysToRestore: daysToRestore,
          isExpired: false
        })
        totalRestorable += daysToRestore
        remainingDays -= daysToRestore
      }
    }

    // Si quedan días sin restaurar, verificar ciclos expirados
    if (remainingDays > 0) {
      for (const cycle of expiredCycles) {
        if (remainingDays <= 0) break
        
        const maxCanRestore = cycle.days_earned // Máximo permitido por ley total del ciclo
        const daysToRestore = Math.min(remainingDays, maxCanRestore)
        
        if (daysToRestore > 0) {
          distributionPlan.push({
            cycle: cycle,
            daysToRestore: daysToRestore,
            isExpired: true
          })
          lostDays += daysToRestore
          remainingDays -= daysToRestore
        }
      }
    }

    // Días que no se pueden restaurar en ningún ciclo
    if (remainingDays > 0) {
      lostDays += remainingDays
    }

    console.log(`💡 Plan de distribución:`, {
      totalRestorable,
      lostDays,
      distributionPlan: distributionPlan.map(p => ({
        año: new Date(p.cycle.cycle_start_date).getFullYear(),
        dias: p.daysToRestore,
        expirado: p.isExpired,
        porLey: p.cycle.days_earned,
        usados: p.cycle.days_used
      }))
    })

    // Crear mensaje de advertencia si hay días perdidos
    let warningMessage = ''
    if (lostDays > 0) {
      const expiredDetails = distributionPlan
        .filter(p => p.isExpired)
        .map(p => `• Ciclo ${new Date(p.cycle.cycle_start_date).getFullYear()}: ${p.daysToRestore} días`)
        .join('\n')
      
      warningMessage = `⚠️ ADVERTENCIA DE PÉRDIDA DE DÍAS:\n\n` +
        `De los ${request.days_requested} días a cancelar:\n` +
        `✅ Se restaurarán: ${totalRestorable} días (en ciclos activos)\n` +
        `❌ Se perderán: ${lostDays} días\n\n` +
        `Detalles de días perdidos:\n${expiredDetails || '• Exceden el límite legal de los ciclos'}\n\n` +
        `¿Continuar con la cancelación?`
    }

    // Si hay advertencia, mostrar diálogo de confirmación
    if (warningMessage) {
      console.warn(`⚠️ Días perdidos: ${lostDays}`)
      setPendingCancelRequest({ request, warningMessage })
      setShowCancelConfirmModal(true)
      return
    }

    // Si no hay problemas, mostrar modal de confirmación exitosa
    console.log(`✅ Todos los ${request.days_requested} días se pueden restaurar correctamente`)
    
    const distributionDetails = distributionPlan
      .filter(p => !p.isExpired)
      .map(p => `• Ciclo ${new Date(p.cycle.cycle_start_date).getFullYear()}: ${p.daysToRestore} días`)
      .join('\n')
    
    setPendingSuccessCancel({ request, distributionDetails })
    setShowCancelSuccessModal(true)
  }

  // Función para proceder con la cancelación
  const proceedWithCancellation = async (request: any) => {
    setIsLoading(true)
    try {
      const success = await cancelVacationRequest(request.id)
      if (success) {
        console.log(`✅ Cancelación exitosa de solicitud ${request.id}`)
        
        toast({
          title: "✅ Solicitud Cancelada",
          description: `La solicitud ha sido cancelada y ${request.days_requested} días han sido restaurados a los ciclos activos`
        })
        
        // Actualizar estado local inmediatamente
        const updatedRequests = vacationRequests.filter(r => r.id !== request.id)
        setVacationRequests(updatedRequests)
        setFilteredRequests(updatedRequests)
        
        // Actualizar paginación inmediatamente
        const sortedRequests = [...updatedRequests].sort((a, b) => {
          const dateA = new Date(a.start_date).getTime()
          const dateB = new Date(b.start_date).getTime()
          return dateB - dateA // Más reciente arriba, más antigua abajo
        })
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        setPaginatedRequests(sortedRequests.slice(startIndex, endIndex))
        
        // Recargar datos desde la base de datos para sincronizar
        console.log("🔄 Recargando datos después de cancelación...")
        
        // Recargar y forzar actualización inmediata
        const reloadPromise = loadData()
        const cyclesPromise = loadEmployeeCycles()
        
        await Promise.all([reloadPromise, cyclesPromise])
        
        // Forzar re-paginación después de cargar
        setTimeout(() => {
          paginateRequests()
          console.log(`📊 Solicitudes después de recargar: ${vacationRequests.length}`)
          
          // Si después de todo sigue apareciendo la solicitud, recargar la página
          const stillExists = vacationRequests.some(r => r.id === request.id)
          if (stillExists) {
            console.log("⚠️ La solicitud aún aparece, recargando página...")
            window.location.reload()
          }
        }, 500)
      } else {
        throw new Error("No se pudo cancelar la solicitud")
      }
    } catch (error) {
      console.error("Error al cancelar solicitud:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la solicitud",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Confirmar cancelación con advertencia
  const confirmCancellation = async () => {
    if (!pendingCancelRequest) return
    
    console.log(`🚀 Confirmando cancelación de solicitud ${pendingCancelRequest.request.id}`)
    setShowCancelConfirmModal(false)
    await proceedWithCancellation(pendingCancelRequest.request)
    setPendingCancelRequest(null)
  }

  // Cancelar el diálogo de confirmación
  const cancelCancellation = () => {
    setShowCancelConfirmModal(false)
    setPendingCancelRequest(null)
  }

  // Confirmar cancelación exitosa
  const confirmSuccessCancellation = async () => {
    if (!pendingSuccessCancel) return
    
    setShowCancelSuccessModal(false)
    await proceedWithCancellation(pendingSuccessCancel.request)
    setPendingSuccessCancel(null)
  }

  // Cancelar el diálogo de confirmación exitosa
  const cancelSuccessCancellation = () => {
    setShowCancelSuccessModal(false)
    setPendingSuccessCancel(null)
  }



  const handleCreateRequest = async () => {
    if (!selectedEmployeeId || selectedDates.length === 0) {
      toast({
        title: "Campos incompletos",
        description: "Por favor selecciona un empleado y al menos un día de vacaciones",
        variant: "destructive"
      })
      return
    }

    // Separar fechas pasadas y futuras
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const pastDates = selectedDates.filter(date => date < today)
    const futureDates = selectedDates.filter(date => date >= today)
    
    // Para fechas futuras, verificar disponibilidad
    const activeCycles = vacationCycles.filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
    const totalAvailable = activeCycles.reduce((total, cycle) => total + cycle.days_available, 0)
    
    if (futureDates.length > totalAvailable) {
      const cyclesDetails = activeCycles
        .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
        .map(cycle => `Ciclo ${new Date(cycle.cycle_start_date).getFullYear()}: ${cycle.days_available} disponibles (${cycle.days_earned} por ley)`)
        .join(', ')
      
      toast({
        title: "Días insuficientes para fechas futuras",
        description: `Seleccionaste ${futureDates.length} días futuros. Días disponibles por ciclo: ${cyclesDetails}. Las fechas pasadas (${pastDates.length}) se registrarán solo como referencia.`,
        variant: "destructive"
      })
      return
    }

    // 🔧 NUEVA LÓGICA: Determinar si crear una o múltiples solicitudes
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
    const daysRequested = selectedDates.length

    // Verificar si las fechas son consecutivas
    const areConsecutive = sortedDates.every((date, index) => {
      if (index === 0) return true
      const prevDate = sortedDates[index - 1]
      const dayDifference = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      return dayDifference === 1
    })

    setIsLoading(true)
    try {
      if (areConsecutive) {
        // Días consecutivos: Crear UNA solicitud con rango
        const startDate = formatDateToLocalString(sortedDates[0])
        const endDate = formatDateToLocalString(sortedDates[sortedDates.length - 1])
        
        const newRequest: Omit<VacationRequest, "id" | "created_at" | "updated_at"> = {
          employee_id: selectedEmployeeId,
          office_id: office!.id,
          start_date: startDate,
          end_date: endDate,
          days_requested: daysRequested,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'Sistema',
          reason: reason || (pastDates.length > 0 ? `${reason || ''} (Incluye ${pastDates.length} días de referencia)`.trim() : undefined)
        }

        await createVacationRequest(newRequest)
        
      } else {
        // Días NO consecutivos: Crear MÚLTIPLES solicitudes de 1 día cada una
        for (const date of sortedDates) {
          const dateStr = formatDateToLocalString(date)
          
          const newRequest: Omit<VacationRequest, "id" | "created_at" | "updated_at"> = {
            employee_id: selectedEmployeeId,
            office_id: office!.id,
            start_date: dateStr,
            end_date: dateStr, // Mismo día para start y end
            days_requested: 1, // 1 día por solicitud
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: 'Sistema',
            reason: reason || (pastDates.length > 0 ? `${reason || ''} (Incluye días de referencia)`.trim() : undefined)
          }

          await createVacationRequest(newRequest)
        }
      }
      
      // 🔧 NUEVA LÓGICA: Solo descontar días que estén DENTRO del rango de ciclos
      const daysToDeductFromCycles = await calculateDaysToDeductFromCycles(selectedEmployeeId, selectedDates)
      
      if (daysToDeductFromCycles > 0) {
        await deductDaysFromCycles(selectedEmployeeId, daysToDeductFromCycles)
      }
      
      const message = pastDates.length > 0 
        ? `${daysRequested} día${daysRequested !== 1 ? 's' : ''} registrado${daysRequested !== 1 ? 's' : ''}. ${futureDates.length} día${futureDates.length !== 1 ? 's' : ''} descontado${futureDates.length !== 1 ? 's' : ''} de ciclos, ${pastDates.length} día${pastDates.length !== 1 ? 's' : ''} como referencia.`
        : `${daysRequested} día${daysRequested !== 1 ? 's' : ''} de vacaciones aprobado${daysRequested !== 1 ? 's' : ''} y descontado${daysRequested !== 1 ? 's' : ''} de tus ciclos`
      
      toast({
        title: "Vacaciones registradas",
        description: message
      })

      // Recargar datos
      await loadData()
      await loadVacationCycles(selectedEmployeeId) // Recargar ciclos para mostrar la actualización
      
      // Limpiar formulario pero MANTENER empleado seleccionado para continuar registrando
      // setSelectedEmployeeId("") // ⭐ COMENTADO: Mantener empleado seleccionado
      setSelectedDates([])
      setReason("")
      // setVacationCycles([]) // ⭐ COMENTADO: Mantener ciclos cargados para el mismo empleado
      // setShowNewRequest(false) // ⭐ COMENTADO: Mantener modal abierto para continuar registrando
    } catch (error) {
      console.error("Error creating request:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de vacaciones",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 🔧 Función para calcular cuántos días deben descontarse de los ciclos
  // Solo cuenta fechas que estén DENTRO del rango de ciclos ACTIVOS (después del ciclo ACTIVO más antiguo)
  const calculateDaysToDeductFromCycles = async (employeeId: string, selectedDates: Date[]): Promise<number> => {
    try {
      // Obtener SOLO ciclos ACTIVOS del empleado (no expirados)
      const supabase = createClientSupabaseClient()
      const { data: allCycles, error } = await supabase
        .from("vacation_cycles")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("is_expired", false) // 🔥 CLAVE: Solo ciclos activos
        .order("cycle_start_date", { ascending: true })

      if (error || !allCycles || allCycles.length === 0) {
        console.warn("No se pudieron obtener ciclos ACTIVOS para calcular descuentos")
        return 0 // Sin ciclos activos, no descontar nada
      }

      // Obtener fecha de inicio del ciclo ACTIVO más antiguo
      const oldestActiveCycle = allCycles[0] as VacationCycle
      const oldestActiveCycleStartDate = new Date(oldestActiveCycle.cycle_start_date)
      
      // Contar solo fechas que estén DENTRO del rango de ciclos ACTIVOS
      const datesWithinActiveCycles = selectedDates.filter(date => {
        return date >= oldestActiveCycleStartDate
      })

      const datesBeforeActiveCycles = selectedDates.filter(date => {
        return date < oldestActiveCycleStartDate
      })

      console.log(`📊 Análisis de fechas para empleado ${employeeId}:`)
      console.log(`   - Ciclo ACTIVO más antiguo inicia: ${oldestActiveCycle.cycle_start_date}`)
      console.log(`   - Fechas DENTRO de ciclos activos (se descontarán): ${datesWithinActiveCycles.length}`)
      console.log(`   - Fechas ANTES de ciclos activos (solo registro): ${datesBeforeActiveCycles.length}`)

      return datesWithinActiveCycles.length

    } catch (error) {
      console.error("Error calculando días a descontar:", error)
      return selectedDates.length // En caso de error, usar lógica anterior
    }
  }

  // Función para descontar días de los ciclos más antiguos primero
  const deductDaysFromCycles = async (employeeId: string, daysToDeduct: number) => {
    try {
      const success = await deductVacationDaysFromCycles(employeeId, daysToDeduct)
      if (!success) {
        console.warn("No se pudieron deducir todos los días de los ciclos")
      }
      return success
    } catch (error) {
      console.error("Error al deducir días de los ciclos:", error)
      return false
    }
  }

  // Función auxiliar para mostrar fechas de contratación sin problemas de UTC
  const formatHireDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'Sin fecha'
    
    let date: Date
    if (typeof dateString === 'string') {
      // Si es string, agregar T00:00:00 para evitar interpretación UTC
      date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T00:00:00')
    } else {
      date = dateString
    }
    
    return date.toLocaleDateString('es-ES')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, className?: string }> = {
      pending: { variant: "default", label: "Pendiente" },
      approved: { variant: "outline", label: "Aprobada", className: "bg-green-100 text-green-700 border-green-300" },
      rejected: { variant: "destructive", label: "Rechazada" },
      in_progress: { variant: "default", label: "En Curso" },
      completed: { variant: "secondary", label: "Completada" }
    }
    
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant as any} className={config.className}>{config.label}</Badge>
  }

  // Estados adicionales para ciclos de empleados en el dashboard
  const [employeeCycles, setEmployeeCycles] = useState<Record<string, VacationCycle[]>>({})

  // Cargar ciclos para todos los empleados
  const loadEmployeeCycles = async () => {
    if (!office) return
    
    const cycles: Record<string, VacationCycle[]> = {}
    
    for (const employee of employees) {
      try {
        const employeeCyclesData = await getVacationCycles(employee.id!)
        cycles[employee.id!] = employeeCyclesData.filter(cycle => !cycle.is_expired)
      } catch (error) {
        console.error(`Error loading cycles for employee ${employee.id}:`, error)
        cycles[employee.id!] = []
      }
    }
    
    setEmployeeCycles(cycles)
  }

  useEffect(() => {
    if (employees.length > 0) {
      loadEmployeeCycles()
    }
  }, [employees])

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return "Empleado desconocido"
    
    // Priorizar el campo name (para compatibilidad) o construir desde first_name + last_name
    return employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || "Empleado desconocido"
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

  // Estadísticas
  const stats = {
    pending: vacationRequests.filter(r => r.status === 'pending').length,
    approved: vacationRequests.filter(r => r.status === 'approved').length,
    inProgress: vacationRequests.filter(r => r.status === 'in_progress').length,
    completed: vacationRequests.filter(r => r.status === 'completed').length
  }

  if (!office) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Oficina no encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Gestión de Vacaciones</h2>
          <p className="text-muted-foreground">
            Administra las solicitudes y períodos de vacaciones de {office.name}
          </p>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado o solicitud..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowDiasPorLey(true)}
            >
              <Info className="mr-2 h-4 w-4" />
              Días por Ley
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowHolidayManager(true)}
            >
              <Calendar className="mr-2 h-4 w-4 text-red-500" />
              Días Festivos
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowHistorialModal(true)}
            >
              <History className="mr-2 h-4 w-4" />
              Detalle de Empleados
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              onClick={() => setShowNewRequest(true)}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar Vacaciones
            </Button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-muted-foreground">Aprobadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">En Curso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de solicitudes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Solicitudes de Vacaciones</CardTitle>
                <CardDescription>
                  Gestiona y revisa todas las solicitudes de vacaciones
                </CardDescription>
              </div>
              
              {/* Controles de paginación en el header */}
              {filteredRequests.length > 0 && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Mostrar:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            size="sm"
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage <= 2) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 1) {
                            pageNum = totalPages - 2 + i;
                          } else {
                            pageNum = currentPage - 1 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                                size="sm"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            size="sm"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRequests.length)} de {filteredRequests.length}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
                <p className="text-lg font-medium">Cargando solicitudes...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? "No se encontraron solicitudes" : "No hay solicitudes registradas"}
                </p>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Intenta con otro término de búsqueda" : "Comienza creando la primera solicitud de vacaciones"}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowNewRequest(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Solicitud
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/6">Empleado</TableHead>
                      <TableHead className="w-1/6">Periodo</TableHead>
                      <TableHead className="text-center w-20">Días</TableHead>
                      <TableHead className="text-center w-80">Ciclos Activos</TableHead>
                      <TableHead className="text-center w-24">Estado</TableHead>
                      <TableHead className="text-right w-32">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request) => {
                      const employee = employees.find(emp => emp.id === request.employee_id)
                      const years = getEmployeeYearsOfService(request.employee_id)
                      const daysPerYear = getEmployeeVacationDays(request.employee_id)
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{getEmployeeName(request.employee_id)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {years} año{years !== 1 ? 's' : ''} • {daysPerYear} días/año
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {(() => {
                                // Crear fechas usando los strings de fecha directamente para evitar problemas de UTC
                                const startDate = new Date(request.start_date + 'T00:00:00');
                                const endDate = new Date(request.end_date + 'T00:00:00');
                                const dates = [];
                                
                                // Generar todas las fechas del rango (excluyendo domingos y días festivos)
                                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                                  // Solo incluir días laborables (no domingos y no festivos)
                                  const isHoliday = isDateHoliday(date)
                                  if (date.getDay() !== 0 && !isHoliday) { // 0 = domingo, excluir festivos
                                    dates.push(new Date(date));
                                  }
                                }
                                
                                // Mostrar máximo 3 fechas, luego "..."
                                const displayDates = dates.slice(0, 3);
                                const hasMore = dates.length > 3;
                                
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {displayDates.map((date, index) => (
                                      <span key={index} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                        {date.toLocaleDateString('es-MX', { 
                                          day: '2-digit', 
                                          month: '2-digit',
                                          year: '2-digit'
                                        })}
                                      </span>
                                    ))}
                                    {hasMore && (
                                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                        +{dates.length - 3} más
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              {request.reason && (
                                <p className="text-sm text-muted-foreground mt-2">{request.reason}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{request.days_requested} días</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              {employeeCycles[request.employee_id]?.filter(cycle => !cycle.is_expired).length > 0 ? (
                                employeeCycles[request.employee_id]
                                  .filter(cycle => !cycle.is_expired)
                                  .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                                  .map((cycle, index) => {
                                    const daysUntilExpiry = Math.ceil((new Date(cycle.cycle_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    const isExpiringSoon = daysUntilExpiry <= 60
                                    const hasAvailableDays = cycle.days_available > 0
                                    const isExpired = new Date(cycle.cycle_end_date) < new Date()
                                    
                                    // Determinar el estilo según el estado del ciclo
                                    let cycleStyle = 'border-gray-200 bg-gray-50'
                                    if (isExpired) {
                                      cycleStyle = 'border-red-300 bg-red-100' // Expirado
                                    } else if (!hasAvailableDays) {
                                      cycleStyle = 'border-gray-300 bg-gray-100' // Agotado pero no expirado
                                    } else if (isExpiringSoon) {
                                      cycleStyle = 'border-red-300 bg-red-50' // Próximo a expirar
                                    } else {
                                      cycleStyle = 'border-blue-200 bg-blue-50' // Activo
                                    }
                                    
                                    return (
                                      <div key={cycle.id} className={`p-4 border rounded-lg text-xs ${cycleStyle} min-w-[220px] flex-shrink-0`}>
                                        {/* Header del ciclo */}
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-medium ${(hasAvailableDays && !isExpired) ? 'text-blue-700' : 'text-gray-600'}`}>
                                            Ciclo {new Date(cycle.cycle_start_date).getFullYear()}
                                          </span>
                                          <div className="flex gap-1">
                                            {isExpired && (
                                              <Badge variant="destructive" className="text-xs">
                                                Expirado
                                              </Badge>
                                            )}
                                            {!isExpired && !hasAvailableDays && (
                                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                                                Agotado
                                              </Badge>
                                            )}
                                            {!isExpired && hasAvailableDays && (
                                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                                Activo
                                              </Badge>
                                            )}

                                          </div>
                                        </div>
                                        
                                        {/* Fechas del ciclo */}
                                        <div className="text-xs text-gray-600 mb-2">
                                          <div>
                                            {new Date(cycle.cycle_start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                          </div>
                                        </div>
                                        
                                        {/* Estadísticas de días - Una fila horizontal: Por ley, Disponibles, Ya tomados */}
                                        <div className="flex justify-between gap-1 text-xs">
                                          <div className="text-center flex-1">
                                            <div className="font-medium text-green-600">{cycle.days_earned}</div>
                                            <div className="text-gray-500">Por ley</div>
                                          </div>
                                          <div className="text-center flex-1">
                                            <div className="font-medium text-blue-600">{cycle.days_available}</div>
                                            <div className="text-gray-500">Disponibles</div>
                                          </div>
                                          <div className="text-center flex-1">
                                            <div className="font-medium text-red-600">{cycle.days_used}</div>
                                            <div className="text-gray-500">Ya tomados</div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })
                              ) : (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center min-w-[220px] flex-shrink-0">
                                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                    Sin días disponibles
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">Todos los ciclos están agotados o expirados</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewRequest(request)}
                              >
                                Ver
                              </Button>
                              {(request.status === 'approved' || request.status === 'in_progress') && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => request.id && handleCancelRequest(request.id)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Cancelar
                                </Button>
                              )}
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    Aprobar
                                  </Button>
                                  <Button size="sm" variant="destructive">
                                    Rechazar
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal: Detalle de Solicitud */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud de Vacaciones</DialogTitle>
            <DialogDescription>
              Información completa de la solicitud seleccionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Información del Empleado */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Información del Empleado
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Nombre:</span>
                    <p className="mt-1">{getEmployeeName(selectedRequest.employee_id)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Años de Servicio:</span>
                    <p className="mt-1">{getEmployeeYearsOfService(selectedRequest.employee_id)} años</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Días por Año:</span>
                    <p className="mt-1">{getEmployeeVacationDays(selectedRequest.employee_id)} días</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Oficina:</span>
                    <p className="mt-1">{office?.name}</p>
                  </div>
                </div>
              </div>

              {/* Detalles de la Solicitud */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Detalles de la Solicitud
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Días de Vacaciones Solicitados:</span>
                    <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded border">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Días de vacaciones seleccionados:</div>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          // Crear fechas usando los strings de fecha directamente para evitar problemas de UTC
                          const startDate = new Date(selectedRequest.start_date + 'T00:00:00');
                          const endDate = new Date(selectedRequest.end_date + 'T00:00:00');
                          const selectedDates = [];
                          
                          // Generar todas las fechas del rango (excluyendo domingos y días festivos)
                          for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                            // Solo incluir días laborables (no domingos y no festivos)
                            const isHoliday = isDateHoliday(date)
                            if (date.getDay() !== 0 && !isHoliday) { // 0 = domingo, excluir festivos
                              selectedDates.push(new Date(date));
                            }
                          }
                          
                          // ⭐ IMPORTANTE: Limitar a la cantidad exacta de días solicitados
                          // Esto evita mostrar días extra que no fueron seleccionados por el usuario
                          const actualSelectedDates = selectedDates.slice(0, selectedRequest.days_requested);
                          
                          return actualSelectedDates.map((date, index) => (
                            <span key={index} className="text-xs px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg font-medium">
                              {date.toLocaleDateString('es-ES', { 
                                weekday: 'short',
                                day: '2-digit', 
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Días Solicitados:</span>
                      <p className="mt-1 text-2xl font-bold text-blue-600">{selectedRequest.days_requested} días</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Estado:</span>
                      <div className="mt-1">
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Motivo:</span>
                    <p className="mt-1 p-3 bg-white dark:bg-gray-800 rounded border">
                      {selectedRequest.reason || 'Sin motivo especificado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fechas de Gestión */}
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Fechas de Gestión
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-800 dark:text-green-200">Fecha de Solicitud:</span>
                    <p className="mt-1">
                      {selectedRequest.created_at 
                        ? new Date(selectedRequest.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No registrada'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-green-800 dark:text-green-200">Última Actualización:</span>
                    <p className="mt-1">
                      {selectedRequest.updated_at 
                        ? new Date(selectedRequest.updated_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No actualizada'
                      }
                    </p>
                  </div>
                  {selectedRequest.approved_at && (
                    <div>
                      <span className="font-medium text-green-800 dark:text-green-200">Fecha de Aprobación:</span>
                      <p className="mt-1">
                        {new Date(selectedRequest.approved_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.approved_by && (
                    <div>
                      <span className="font-medium text-green-800 dark:text-green-200">Aprobado por:</span>
                      <p className="mt-1">{selectedRequest.approved_by}</p>
                    </div>
                  )}
                  {selectedRequest.rejected_reason && (
                    <div className="col-span-2">
                      <span className="font-medium text-red-800 dark:text-red-200">Motivo de Rechazo:</span>
                      <p className="mt-1 p-3 bg-red-100 dark:bg-red-900 rounded border text-red-900 dark:text-red-100">
                        {selectedRequest.rejected_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ciclos de Vacaciones Activos */}
              {employeeCycles[selectedRequest.employee_id] && (
                <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Ciclos de Vacaciones del Empleado
                  </h3>
                  <div className="space-y-3">
                    {employeeCycles[selectedRequest.employee_id]
                      .filter(cycle => !cycle.is_expired)
                      .map((cycle, index) => (
                        <div key={cycle.id} className="bg-white dark:bg-purple-900 rounded p-3 border border-purple-200 dark:border-purple-800">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-purple-800 dark:text-purple-200">
                              Ciclo {cycle.years_of_service} años
                            </span>
                            <div className="text-sm text-purple-600 dark:text-purple-300">
                              {cycle.days_available} días disponibles
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-purple-700 dark:text-purple-300">
                            <div className="space-y-1">
                              <div>Ganados: {cycle.days_earned}</div>
                              <div>Usados: {cycle.days_used}</div>
                            </div>
                            <div>
                              <div>Vida del ciclo:</div>
                              <div>{new Date(cycle.cycle_start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Días por Ley */}
      <Dialog open={showDiasPorLey} onOpenChange={setShowDiasPorLey}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Días de Vacaciones por Ley</DialogTitle>
            <DialogDescription>
              Tabla de días de vacaciones según años laborados (Ley Federal del Trabajo)
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Table>
              <TableCaption>
                Los días de vacaciones están vigentes por 1 año y 6 meses desde la fecha de aniversario
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Años Laborados</TableHead>
                  <TableHead className="text-center">Días de Vacaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {VACATION_DAYS_BY_LAW.map((item, index) => {
                  const displayYears = 'years' in item 
                    ? `${item.years} año${item.years! > 1 ? 's' : ''}` 
                    : item.yearsRange
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium">
                        {displayYears}
                      </TableCell>
                      <TableCell className="text-center">{item.days} días</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowDiasPorLey(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nueva Solicitud */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Vacaciones</DialogTitle>
            <DialogDescription>
              Selecciona un empleado y marca los días de vacaciones. Las vacaciones se aprobarán automáticamente y se descontarán de los ciclos disponibles.
            </DialogDescription>
          </DialogHeader>
          
          {/* Layout Horizontal: Formulario a la izquierda, Calendario a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
            {/* Columna Izquierda: Formulario */}
            <div className="space-y-6">
              {/* Empleado */}
              <div className="grid gap-2">
                <Label htmlFor="employee">
                  Empleado <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No hay empleados disponibles
                      </div>
                    ) : (
                      employees.map((employee) => {
                        const years = employee.hire_date ? calculateYearsOfService(employee.hire_date) : 0
                        const days = calculateVacationDays(years)
                        const hireDate = formatHireDate(employee.hire_date)
                        return (
                          <SelectItem key={employee.id} value={employee.id!}>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Ingreso: {hireDate} • {years} año{years !== 1 ? 's' : ''} de servicio • {days} días por año
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Ciclos de Vacaciones - Mostrar TODOS los ciclos con días disponibles */}
              {selectedEmployeeId && vacationCycles.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <Label>Ciclos de Vacaciones Disponibles</Label>
                  </div>
                  <div className="space-y-2">
                    {vacationCycles
                      .filter(cycle => !cycle.is_expired)
                      .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                      .map((cycle) => {
                        const daysUntilExpiry = Math.ceil((new Date(cycle.cycle_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        const isExpiringSoon = daysUntilExpiry <= 60
                        const hasAvailableDays = cycle.days_available > 0
                        const cycleStarted = new Date(cycle.cycle_start_date) <= new Date()
                        
                        // Determinar estilo y estado del ciclo
                        let bgClass = 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50'
                        let badgeVariant: 'default' | 'outline' = 'default'
                        let badgeClassName = 'text-xs bg-green-600'
                        let badgeText = 'Activo'
                        
                        if (!cycleStarted) {
                          bgClass = 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50'
                          badgeVariant = 'outline'
                          badgeClassName = 'text-xs bg-gray-100 text-gray-600 border-gray-300'
                          badgeText = 'No iniciado'
                        } else if (!hasAvailableDays) {
                          bgClass = 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50'
                          badgeVariant = 'outline'
                          badgeClassName = 'text-xs bg-red-100 text-red-700 border-red-300'
                          badgeText = 'Agotado'
                        }
                        
                        return (
                          <div key={cycle.id} className={`flex items-center justify-between p-4 border rounded-lg ${bgClass}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">Ciclo {new Date(cycle.cycle_start_date).getFullYear()}</p>
                                <Badge variant={badgeVariant} className={badgeClassName}>{badgeText}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(cycle.cycle_start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-green-600">{cycle.days_earned}</p>
                                  <p className="text-xs text-muted-foreground">días por ley (año {cycle.years_of_service})</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-blue-600">{cycle.days_available}</p>
                                  <p className="text-xs text-muted-foreground">días disponibles</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-red-600">{cycle.days_used}</p>
                                  <p className="text-xs text-muted-foreground">días ya tomados</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Mensaje cuando no hay días disponibles */}
              {selectedEmployeeId && vacationCycles.length > 0 && vacationCycles.filter(cycle => cycle.days_available > 0 && !cycle.is_expired && new Date(cycle.cycle_start_date) <= new Date()).length === 0 && (
                <div className="text-center p-4 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                  <p className="text-orange-800 dark:text-orange-200 font-medium">
                    ⚠️ No hay días de vacaciones disponibles
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    Todos los ciclos están agotados o han expirado. Use el botón "Control de Días" para agregar días si es necesario.
                  </p>
                </div>
              )}

              {/* Botón Control para gestión manual de días */}
              {selectedEmployeeId && vacationCycles.length > 0 && (
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Control de Días
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      <DropdownMenuLabel>Gestión Manual</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          setControlAction('add')
                          setShowControlModal(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4 text-green-600" />
                        Agregar días
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setControlAction('remove')
                          setShowControlModal(true)
                        }}
                      >
                        <Minus className="mr-2 h-4 w-4 text-red-600" />
                        Descontar días
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Botón para agregar motivo */}
              <div className="grid gap-2">
                <Label>Motivo o Comentarios (opcional)</Label>
                <Button 
                  variant="outline" 
                  onClick={() => setShowReasonModal(true)}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    {reason ? (
                      <div>
                        <p className="font-medium text-sm">Motivo agregado</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {reason.length > 60 ? `${reason.substring(0, 60)}...` : reason}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Hacer clic para agregar motivo o comentarios</p>
                    )}
                  </div>
                </Button>
              </div>

              {/* Resumen de días seleccionados */}
              {selectedDates.length > 0 && (
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Días seleccionados: <span className="text-primary font-bold">{selectedDates.length}</span>
                    </p>

                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {selectedDates
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((date, i) => {
                        const cycleColor = getDateCycleColor(i)
                        const colorClass = cycleColor.replace('bg-', 'border-').replace('-500', '-400')
                        return (
                          <div key={i} className={`text-xs px-2 py-1 rounded border-2 ${colorClass} bg-white dark:bg-gray-800 font-medium flex items-center gap-1`}>
                            <div className={`w-2 h-2 rounded ${cycleColor}`}></div>
                            {date.toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit' 
                            })}
                          </div>
                        )
                      })}
                  </div>



                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const futureDates = selectedDates.filter(date => date >= today);
                    const pastDates = selectedDates.filter(date => date < today);
                    const totalAvailableDays = vacationCycles.filter(c => c.days_available > 0 && !c.is_expired).reduce((total, cycle) => total + cycle.days_available, 0);
                    
                    return futureDates.length > totalAvailableDays && (
                      <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200">
                        <div className="font-medium mb-1">⚠️ No hay suficientes días disponibles para fechas futuras</div>
                        <div className="text-xs space-y-1">
                          <div>Días futuros seleccionados: <strong>{futureDates.length}</strong></div>
                          {pastDates.length > 0 && <div>Días pasados (solo referencia): <strong>{pastDates.length}</strong></div>}
                          <div>Días por ciclo:</div>
                          {vacationCycles
                            .filter(c => c.days_available > 0 && !c.is_expired)
                            .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                            .map((cycle) => (
                              <div key={cycle.id} className="ml-2">
                                • Ciclo {new Date(cycle.cycle_start_date).getFullYear()}: {cycle.days_available} disponibles ({cycle.days_earned} por ley)
                              </div>
                            ))
                          }
                          <div className="font-medium text-red-700 border-t pt-1 mt-1">
                            Días faltantes para fechas futuras: <strong>{futureDates.length - totalAvailableDays}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Columna Derecha: Calendario */}
            <div className="space-y-4">
              {/* Navegación del calendario */}
              <div className="flex items-center justify-between">
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

              {/* Grilla del calendario */}
              <div className="border rounded-lg p-4">
                {/* Encabezados de días */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                    <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
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
                    const isSundayDay = isWeekend(date) // Solo domingo
                    const isSaturdayDay = date.getDay() === 6 // Sábado
                    const isHolidayDay = isDateHoliday(date) // Día festivo
                    const isTaken = isDateTaken(date)
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                    const isDisabled = isSundayDay || isTaken || isHolidayDay // Quitar restricción para fechas pasadas
                    
                    // Determinar el índice de este día en la selección para el color
                    const dateIndex = selectedDates
                      .sort((a, b) => a.getTime() - b.getTime())
                      .findIndex(selectedDate => selectedDate.toDateString() === date.toDateString())
                    
                    let buttonClass = 'h-8 w-full p-0 text-sm '
                    let buttonVariant: 'default' | 'ghost' | 'destructive' = 'ghost'
                    
                    if (isSelected && !isHolidayDay) {
                      const cycleColor = getDateCycleColor(dateIndex)
                      buttonClass += `${cycleColor} text-white border-2 border-white shadow-md`
                      buttonVariant = 'default'
                    } else if (isSelected && isHolidayDay) {
                      // Mantener color de festivo pero agregar indicador de selección
                      buttonClass += 'bg-red-200 text-red-900 border-2 border-red-500 font-bold shadow-md'
                      buttonVariant = 'default'
                    } else if (isTaken) {
                      // Cambiar a color morado para días ya tomados
                      buttonClass += 'bg-purple-100 text-purple-700 cursor-not-allowed'
                      buttonVariant = 'destructive'
                    } else if (isHolidayDay) {
                      buttonClass += 'bg-red-100 text-red-800 cursor-not-allowed border-2 border-red-300 font-medium'
                    } else if (isSundayDay) {
                      buttonClass += 'text-muted-foreground cursor-not-allowed'
                    } else if (isSaturdayDay) {
                      // Hacer que los sábados tengan el mismo fondo que otros días
                      buttonClass += 'hover:bg-muted'
                    } else if (isPast) {
                      buttonClass += 'text-muted-foreground hover:bg-muted' // Permitir hover para fechas pasadas
                    } else {
                      buttonClass += 'hover:bg-muted'
                    }
                    
                    return (
                      <Button
                        key={day}
                        variant={buttonVariant}
                        size="sm"
                        className={buttonClass}
                        onClick={() => !isDisabled && toggleDateSelection(date)}
                        disabled={isDisabled}
                        title={
                          isSelected ? `Día seleccionado - ${getDateCycleInfo(dateIndex)}` :
                          isTaken ? 'Día ya tomado en otra solicitud' :
                          isHolidayDay ? 'Día festivo - No disponible para vacaciones' :
                          isSundayDay ? 'Domingos no disponibles' :
                          isSaturdayDay ? 'Hacer clic para seleccionar' : // Quitar "(disponible)"
                          isPast ? 'Fecha pasada - Solo referencia' : 
                          'Hacer clic para seleccionar'
                        }
                      >
                        {day}
                      </Button>
                    )
                  })}
                </div>

                {/* Leyenda actualizada */}
                <div className="space-y-2 mt-3 text-xs">
                  {/* Leyenda de colores por ciclo */}
                  {vacationCycles.filter(c => c.days_available > 0 && !c.is_expired).length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-muted-foreground font-medium">Colores por ciclo:</span>
                      {vacationCycles
                        .filter(c => c.days_available > 0 && !c.is_expired)
                        .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                        .map((cycle, index) => {
                          const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
                          const color = colors[index % colors.length]
                          return (
                            <div key={cycle.id} className="flex items-center gap-1">
                              <div className={`w-3 h-3 rounded ${color}`}></div>
                              <span>Ciclo {new Date(cycle.cycle_start_date).getFullYear()} ({cycle.days_available}d)</span>
                            </div>
                          )
                        })
                      }
                    </div>
                  )}
                  
                  {/* Leyenda general */}
                  <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 border-2 border-red-300"></div>
                      <span>Día festivo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-purple-100"></div>
                      <span>Ya tomado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-muted"></div>
                      <span>Domingo (no disponible)</span>
                    </div>
                  </div>
                </div>
                
                {/* Botones de acción pegados al calendario */}
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowNewRequest(false)
                      setSelectedEmployeeId("")
                      setSelectedDates([])
                      setReason("")
                      setVacationCycles([])
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateRequest} 
                    disabled={(() => {
                      if (isLoading || selectedDates.length === 0 || !selectedEmployeeId) {
                        return true;
                      }
                      
                      // Separar fechas pasadas y futuras
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const futureDates = selectedDates.filter(date => date >= today);
                      
                      // Si solo hay fechas pasadas, permitir siempre
                      if (futureDates.length === 0) {
                        return false;
                      }
                      
                      // Si hay fechas futuras, verificar disponibilidad
                      const activeCycles = vacationCycles.filter(c => c.days_available > 0 && !c.is_expired);
                      const totalAvailable = activeCycles.reduce((total, cycle) => total + cycle.days_available, 0);
                      return futureDates.length > totalAvailable;
                    })()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? "Procesando..." : "Aprobar y Descontar Vacaciones"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Motivo de Vacaciones */}
      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Motivo o Comentarios</DialogTitle>
            <DialogDescription>
              Agrega un motivo o comentarios sobre esta solicitud de vacaciones (opcional)
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reasonText">Motivo o Comentarios</Label>
              <Textarea
                id="reasonText"
                placeholder="Ejemplo: Vacaciones familiares, viaje programado, descanso personal, etc..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/500 caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReasonModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setShowReasonModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Control de Días */}
      <Dialog open={showControlModal} onOpenChange={setShowControlModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {controlAction === 'add' ? 'Agregar Días de Vacaciones' : 'Descontar Días de Vacaciones'}
            </DialogTitle>
            <DialogDescription>
              {controlAction === 'add' 
                ? 'Los días se agregarán al ciclo más antiguo disponible'
                : 'Puedes descontar días específicos o establecer los días restantes totales'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Modo de control (solo para descontar) */}
            {controlAction === 'remove' && (
              <div className="grid gap-2">
                <Label>Tipo de descuento</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={controlMode === 'days' ? 'default' : 'outline'}
                    onClick={() => setControlMode('days')}
                    className="flex-1"
                  >
                    📉 Descontar días específicos
                  </Button>
                  <Button
                    type="button"
                    variant={controlMode === 'remaining' ? 'default' : 'outline'}
                    onClick={() => setControlMode('remaining')}
                    className="flex-1"
                  >
                    🎯 Establecer días restantes
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {controlMode === 'days' 
                    ? 'Especifica cuántos días quitar del total disponible'
                    : 'Especifica cuántos días deben quedar disponibles en total'
                  }
                </p>
              </div>
            )}

            {/* Campo de días (condicional según el modo) */}
            {(controlAction === 'add' || controlMode === 'days') && (
              <div className="grid gap-2">
                <Label htmlFor="controlDays">
                  Cantidad de días {controlAction === 'add' ? 'a agregar' : 'a descontar'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="controlDays"
                  type="number"
                  min="1"
                  max="365"
                  value={controlDays}
                  onChange={(e) => setControlDays(parseInt(e.target.value) || 1)}
                  placeholder="Ingresa la cantidad de días"
                />
              </div>
            )}

            {/* Campo de días restantes (solo para modo remaining) */}
            {controlMode === 'remaining' && controlAction === 'remove' && (
              <div className="grid gap-2">
                <Label htmlFor="controlRemainingDays">
                  Días que deben quedar disponibles <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="controlRemainingDays"
                  type="number"
                  min="0"
                  max="365"
                  value={controlRemainingDays}
                  onChange={(e) => setControlRemainingDays(parseInt(e.target.value) || 0)}
                  placeholder="Días totales que quedarán disponibles"
                />
                {(() => {
                  const currentTotal = vacationCycles
                    .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
                    .reduce((total, cycle) => total + cycle.days_available, 0);
                  const daysToDeduct = currentTotal - controlRemainingDays;
                  
                  return (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                      <div>Días disponibles actualmente: <strong>{currentTotal}</strong></div>
                      <div>Días objetivo: <strong>{controlRemainingDays}</strong></div>
                      {daysToDeduct > 0 ? (
                        <div className="text-red-600 font-medium">Se descontarán: <strong>{daysToDeduct}</strong> días</div>
                      ) : daysToDeduct < 0 ? (
                        <div className="text-orange-600 font-medium">⚠️ No se puede aumentar días con esta opción (usar "Agregar días")</div>
                      ) : (
                        <div className="text-green-600 font-medium">✅ Los días ya coinciden</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="controlReason">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="controlReason"
                placeholder={`Explica el motivo para ${controlAction === 'add' ? 'agregar' : 'descontar'} estos días...`}
                value={controlReason}
                onChange={(e) => setControlReason(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Preview de la operación */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">
                {controlAction === 'add' ? '📈 Previsualización - Agregar' : '📉 Previsualización - Descontar'}
              </p>
              {controlAction === 'add' ? (
                <div className="text-sm text-green-700 dark:text-green-300">
                  Se agregarán <strong>{controlDays}</strong> día{controlDays !== 1 ? 's' : ''} al ciclo más antiguo disponible.
                </div>
              ) : (
                <div className="space-y-1">
                  {(() => {
                    // Calcular días a descontar según el modo
                    let daysToDeduct: number;
                    if (controlMode === 'days') {
                      daysToDeduct = controlDays;
                    } else {
                      const currentTotal = vacationCycles
                        .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
                        .reduce((total, cycle) => total + cycle.days_available, 0);
                      daysToDeduct = currentTotal - controlRemainingDays;
                    }

                    if (daysToDeduct <= 0) {
                      return (
                        <div className="text-sm text-muted-foreground">
                          {daysToDeduct === 0 
                            ? "No hay días para descontar" 
                            : "No se puede aumentar días con esta opción"
                          }
                        </div>
                      );
                    }

                    let remainingDaysToProcess = daysToDeduct;
                    return vacationCycles
                      .filter(cycle => cycle.days_available > 0 && !cycle.is_expired)
                      .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                      .map((cycle) => {
                        if (remainingDaysToProcess <= 0) return null;
                        const daysToUse = Math.min(remainingDaysToProcess, cycle.days_available);
                        remainingDaysToProcess -= daysToUse;
                        
                        return (
                          <div key={cycle.id} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                            <span>Ciclo {new Date(cycle.cycle_start_date).getFullYear()}</span>
                            <span className="text-red-600 font-medium">-{daysToUse} día{daysToUse !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      }).filter(Boolean);
                  })()}
                  {(() => {
                    const activeCycles = vacationCycles.filter(cycle => cycle.days_available > 0 && !cycle.is_expired);
                    const totalAvailable = activeCycles.reduce((total, cycle) => total + cycle.days_available, 0);
                    
                    // Calcular días requeridos según el modo
                    const requiredDays = controlMode === 'days' ? controlDays : (totalAvailable - controlRemainingDays);
                    
                    return requiredDays > totalAvailable && (
                      <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200 space-y-1">
                        <div className="font-medium">⚠️ No hay suficientes días disponibles</div>
                        <div>Días solicitados: <strong>{requiredDays}</strong></div>
                        <div>Días por ciclo:</div>
                        {activeCycles
                          .sort((a, b) => new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime())
                          .map(cycle => (
                            <div key={cycle.id} className="ml-2">
                              • Ciclo {new Date(cycle.cycle_start_date).getFullYear()}: {cycle.days_available} disponibles ({cycle.days_earned} por ley)
                            </div>
                          ))
                        }
                        <div className="font-medium border-t pt-1">
                          Días faltantes: <strong>{requiredDays - totalAvailable}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowControlModal(false)
                setControlMode('days')
                setControlDays(1)
                setControlRemainingDays(0)
                setControlReason("")
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleControlDays}
              disabled={
                !controlReason.trim() || 
                (controlMode === 'days' && controlDays < 1) ||
                (controlMode === 'remaining' && controlRemainingDays < 0) ||
                isLoading
              }
              variant={controlAction === 'add' ? 'default' : 'destructive'}
            >
              {isLoading ? "Procesando..." : controlAction === 'add' ? 'Agregar Días' : 'Descontar Días'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial Detallado de Empleado */}
      <Dialog open={showHistorialModal} onOpenChange={setShowHistorialModal}>
        <DialogContent className="sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Empleados</DialogTitle>
            <DialogDescription>
              Vista completa de todos los ciclos, días tomados, expirados y el historial completo de vacaciones por empleado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Selector de empleado */}
            <div className="grid gap-2">
              <Label htmlFor="historyEmployee">Seleccionar Empleado</Label>
              <Select 
                value={selectedEmployeeForHistory} 
                onValueChange={(value) => {
                  setSelectedEmployeeForHistory(value)
                  loadEmployeeHistory(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado para ver su historial" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id!}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {employee.name || `${employee.first_name} ${employee.last_name}`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información del empleado seleccionado */}
            {employeeHistoryData.employee && (
              <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                <h3 className="text-lg font-semibold mb-2">
                  {employeeHistoryData.employee.name || `${employeeHistoryData.employee.first_name} ${employeeHistoryData.employee.last_name}`}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha de ingreso:</span>
                    <p className="font-medium">
                      {formatHireDate(employeeHistoryData.employee.hire_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Años de servicio:</span>
                    <p className="font-medium">
                      {employeeHistoryData.employee.hire_date 
                        ? calculateYearsOfService(employeeHistoryData.employee.hire_date) 
                        : 0
                      } años
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total de ciclos:</span>
                    <p className="font-medium">{employeeHistoryData.allCycles.length} ciclos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen de ciclos */}
            {employeeHistoryData.allCycles.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Todos los Ciclos de Vacaciones
                </h4>
                <div className="grid gap-3">
                  {employeeHistoryData.allCycles
                    .sort((a, b) => new Date(b.cycle_start_date).getTime() - new Date(a.cycle_start_date).getTime())
                    .map((cycle) => {
                      const today = new Date()
                      const startDate = new Date(cycle.cycle_start_date)
                      const endDate = new Date(cycle.cycle_end_date)
                      const isExpired = endDate < today
                      const isNotStarted = startDate > today
                      const isActive = !isExpired && !isNotStarted
                      const hasAvailableDays = cycle.days_available > 0
                      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      const daysExpired = cycle.days_earned - cycle.days_used - cycle.days_available
                      
                      // Determinar el estilo según el estado del ciclo
                      let cycleStyle = 'border-gray-200 bg-gray-50'
                      let statusBadge = null
                      
                      if (isExpired) {
                        cycleStyle = 'border-red-300 bg-red-100'
                        statusBadge = <Badge variant="destructive" className="text-xs">Expirado</Badge>
                      } else if (isNotStarted) {
                        cycleStyle = 'border-gray-300 bg-gray-100'
                        statusBadge = <Badge variant="secondary" className="text-xs">No iniciado</Badge>
                      } else if (!hasAvailableDays) {
                        cycleStyle = 'border-gray-300 bg-gray-100'
                        statusBadge = <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">Agotado</Badge>
                      } else if (daysUntilExpiry <= 60) {
                        cycleStyle = 'border-orange-300 bg-orange-50'
                        statusBadge = <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">Próximo a expirar</Badge>
                      } else {
                        cycleStyle = 'border-green-200 bg-green-50'
                        statusBadge = <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">Activo</Badge>
                      }
                      
                      return (
                        <div key={cycle.id} className={`p-4 border rounded-lg ${cycleStyle}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold">Ciclo {new Date(cycle.cycle_start_date).getFullYear()}</h5>
                              {statusBadge}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(cycle.cycle_start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(cycle.cycle_end_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-4 text-center">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-lg font-bold text-blue-600">{cycle.days_earned}</div>
                              <div className="text-xs text-muted-foreground">Días por Ley</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-lg font-bold text-green-600">{cycle.days_used}</div>
                              <div className="text-xs text-muted-foreground">Días Tomados</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-lg font-bold text-orange-600">{cycle.days_available}</div>
                              <div className="text-xs text-muted-foreground">Días Disponibles</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-lg font-bold text-red-600">{daysExpired}</div>
                              <div className="text-xs text-muted-foreground">Días Expirados</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-lg font-bold text-gray-600">
                                {Math.round((cycle.days_used / cycle.days_earned) * 100)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Utilización</div>
                            </div>
                          </div>
                          
                          {/* Barra de progreso */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="flex h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-green-500" 
                                  style={{ width: `${(cycle.days_used / cycle.days_earned) * 100}%` }}
                                ></div>
                                <div 
                                  className="bg-orange-300" 
                                  style={{ width: `${(cycle.days_available / cycle.days_earned) * 100}%` }}
                                ></div>
                                <div 
                                  className="bg-red-300" 
                                  style={{ width: `${(daysExpired / cycle.days_earned) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Tomados: {cycle.days_used}</span>
                              <span>Disponibles: {cycle.days_available}</span>
                              <span>Expirados: {daysExpired}</span>
                            </div>
                          </div>
                          
                          {isActive && daysUntilExpiry <= 60 && (
                            <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                              ⚠️ Este ciclo expira en {daysUntilExpiry} días ({endDate.toLocaleDateString('es-ES')})
                            </div>
                          )}
                          
                          {isNotStarted && (
                            <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                              ℹ️ Este ciclo iniciará el {startDate.toLocaleDateString('es-ES')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Historial de solicitudes */}
            {employeeHistoryData.vacationRequests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Historial de Solicitudes ({employeeHistoryData.vacationRequests.length})
                  </h4>
                  
                  {/* Control de paginación del historial */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mostrar:</span>
                    <select 
                      value={historialItemsPerPage} 
                      onChange={(e) => {
                        setHistorialItemsPerPage(Number(e.target.value))
                        setHistorialCurrentPage(1)
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={5}>5 por página</option>
                      <option value={10}>10 por página</option>
                      <option value={20}>20 por página</option>
                      <option value={50}>50 por página</option>
                    </select>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-center">Días</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const sortedRequests = employeeHistoryData.vacationRequests
                          .sort((a, b) => new Date(b.start_date || '').getTime() - new Date(a.start_date || '').getTime())
                        
                        const totalHistorialPages = Math.ceil(sortedRequests.length / historialItemsPerPage)
                        const startIndex = (historialCurrentPage - 1) * historialItemsPerPage
                        const endIndex = startIndex + historialItemsPerPage
                        const paginatedHistorialRequests = sortedRequests.slice(startIndex, endIndex)
                        
                        return paginatedHistorialRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              {request.created_at 
                                ? new Date(request.created_at).toLocaleDateString('es-ES')
                                : 'No registrada'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  // Crear fechas usando los strings de fecha directamente para evitar problemas de UTC
                                  const startDate = new Date(request.start_date + 'T00:00:00');
                                  const endDate = new Date(request.end_date + 'T00:00:00');
                                  const dates = [];
                                  
                                  // Generar todas las fechas del rango (excluyendo domingos y días festivos)
                                  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                                    // Solo incluir días laborables (no domingos y no festivos)
                                    const isHoliday = isDateHoliday(date)
                                    if (date.getDay() !== 0 && !isHoliday) { // 0 = domingo, excluir festivos
                                      dates.push(new Date(date));
                                    }
                                  }
                                  
                                  return dates.map((date, index) => (
                                    <div key={index} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded inline-block mr-1 mb-1">
                                      {date.toLocaleDateString('es-ES', { 
                                        weekday: 'short',
                                        day: '2-digit', 
                                        month: '2-digit',
                                        year: '2-digit'
                                      })}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{request.days_requested} días</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {request.reason || 'Sin motivo especificado'}
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Paginación del historial */}
                {(() => {
                  const sortedRequests = employeeHistoryData.vacationRequests
                    .sort((a, b) => new Date(b.start_date || '').getTime() - new Date(a.start_date || '').getTime())
                  const totalHistorialPages = Math.ceil(sortedRequests.length / historialItemsPerPage)
                  
                  if (totalHistorialPages > 1) {
                    return (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Mostrando {((historialCurrentPage - 1) * historialItemsPerPage) + 1} - {Math.min(historialCurrentPage * historialItemsPerPage, sortedRequests.length)} de {sortedRequests.length} solicitudes
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistorialCurrentPage(historialCurrentPage - 1)}
                            disabled={historialCurrentPage === 1}
                          >
                            Anterior
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalHistorialPages) }, (_, i) => {
                              const pageNum = i + 1
                              return (
                                <Button
                                  key={pageNum}
                                  variant={historialCurrentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setHistorialCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistorialCurrentPage(historialCurrentPage + 1)}
                            disabled={historialCurrentPage === totalHistorialPages}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            {selectedEmployeeForHistory && employeeHistoryData.allCycles.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No hay historial disponible</p>
                <p className="text-muted-foreground">
                  Este empleado no tiene ciclos de vacaciones registrados aún.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowHistorialModal(false)
                setSelectedEmployeeForHistory("")
                setEmployeeHistoryData({
                  employee: null,
                  allCycles: [],
                  vacationRequests: []
                })
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Gestión de Días Festivos */}
      <HolidayManager
        officeId={office!.id}
        officeName={office!.name}
        isOpen={showHolidayManager}
        onClose={() => setShowHolidayManager(false)}
        onHolidayChange={() => {
          // Recargar holidays cuando se agregue, edite o elimine uno
          loadData()
        }}
      />

      {/* Diálogo de confirmación para cancelación con advertencias */}
      <Dialog open={showCancelConfirmModal} onOpenChange={setShowCancelConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-orange-500" />
              Confirmar Cancelación
            </DialogTitle>
            <DialogDescription className="text-left space-y-2">
              <div>Se detectaron los siguientes problemas al cancelar esta solicitud:</div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-orange-800 text-sm">
                {pendingCancelRequest?.warningMessage}
              </div>
              <div className="text-sm text-muted-foreground">
                ¿Estás seguro de que quieres proceder con la cancelación?
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelCancellation}
              disabled={isLoading}
            >
              No, mantener
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmCancellation}
              disabled={isLoading}
            >
              {isLoading ? "Cancelando..." : "Sí, cancelar de todos modos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para cancelación exitosa */}
      <Dialog open={showCancelSuccessModal} onOpenChange={setShowCancelSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Cancelar Vacaciones
            </DialogTitle>
            <DialogDescription>
              Gestión de cancelación de vacaciones
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-800 mb-2">
                ✅ Cancelación sin pérdidas
              </div>
              <div className="text-sm text-green-700 space-y-2">
                <div>
                  Se cancelarán <strong>{pendingSuccessCancel?.request?.days_requested} días</strong> de vacaciones y se restaurarán correctamente:
                </div>
                <div className="bg-white rounded p-2 text-xs font-mono whitespace-pre-line">
                  {pendingSuccessCancel?.distributionDetails}
                </div>
                <div className="text-green-600 font-medium">
                  Todos los días se restaurarán a ciclos activos.
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              ¿Continuar con la cancelación?
            </div>
          </div>
          
          <DialogHeader>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelSuccessCancellation}
              disabled={isLoading}
            >
              No, mantener
            </Button>
            <Button 
              onClick={confirmSuccessCancellation}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Cancelando..." : "Sí, cancelar vacaciones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
