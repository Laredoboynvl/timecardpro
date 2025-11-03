'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight, Users, CalendarDays } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useToast } from "@/hooks/use-toast"
import {
  getEmployeesByOfficeClient,
  getVacationRequests,
  getHolidays,
  type VacationRequest,
  type Holiday,
  type Employee
} from "@/lib/supabase/db-functions"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Función para formatear fecha a YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CalendarioVacacionesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())

  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (office) {
      loadData()
    }
  }, [office])

  const loadData = async () => {
    if (!office) return
    
    setIsLoading(true)
    try {
      const [employeesData, requestsData, holidaysData] = await Promise.all([
        getEmployeesByOfficeClient(office.code),
        getVacationRequests(office.id),
        getHolidays(office.id)
      ])
      
      setEmployees(employeesData)
      // Solo mostrar aprobadas y en progreso
      setVacationRequests(requestsData.filter(r => 
        r.status === 'approved' || r.status === 'in_progress'
      ))
      setHolidays(holidaysData.filter(h => h.is_active))
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del calendario",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return "Desconocido"
    return employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || "Desconocido"
  }

  // Generar los días del mes actual
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  // Verificar si un día tiene vacaciones
  const getDayInfo = (date: Date) => {
    const dateStr = formatDate(date)
    
    // Verificar si es día festivo
    const holiday = holidays.find(h => h.holiday_date === dateStr)
    
    // Buscar solicitudes de vacaciones para este día
    const vacationsOnThisDay = vacationRequests.filter(request => {
      const start = parseLocalDate(request.start_date)
      const end = parseLocalDate(request.end_date)
      return date >= start && date <= end
    })

    // Buscar solicitudes pendientes
    const pendingVacations = vacationRequests.filter(request => {
      if (request.status !== 'pending') return false
      const start = parseLocalDate(request.start_date)
      const end = parseLocalDate(request.end_date)
      return date >= start && date <= end
    })

    return {
      isHoliday: !!holiday,
      holiday,
      vacations: vacationsOnThisDay,
      pendingVacations,
      employeesOnVacation: vacationsOnThisDay.length
    }
  }

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1))
  }

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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const days = getDaysInMonth()
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

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
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-800">Calendario de Vacaciones</h1>
              <p className="text-muted-foreground">
                Vista consolidada de vacaciones y días festivos
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded"></div>
              <div>
                <p className="font-medium">Vacaciones Aprobadas</p>
                <p className="text-sm text-muted-foreground">Días con vacaciones confirmadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 border-2 border-red-500 rounded"></div>
              <div>
                <p className="font-medium">Días Festivos</p>
                <p className="text-sm text-muted-foreground">Días no laborables</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 border-2 border-orange-500 rounded"></div>
              <div>
                <p className="font-medium">Pendientes</p>
                <p className="text-sm text-muted-foreground">Solicitudes por aprobar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendario */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize text-2xl">{monthName}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square"></div>
                }

                const dayInfo = getDayInfo(date)
                const isToday = formatDate(date) === formatDate(new Date())

                let bgClass = 'bg-white hover:bg-gray-50'
                let borderClass = 'border-gray-200'
                
                if (dayInfo.isHoliday) {
                  bgClass = 'bg-red-50 hover:bg-red-100'
                  borderClass = 'border-red-300 border-2'
                } else if (dayInfo.vacations.length > 0) {
                  bgClass = 'bg-green-50 hover:bg-green-100'
                  borderClass = 'border-green-300 border-2'
                } else if (dayInfo.pendingVacations.length > 0) {
                  bgClass = 'bg-orange-50 hover:bg-orange-100'
                  borderClass = 'border-orange-300'
                }

                if (isToday) {
                  borderClass += ' ring-2 ring-blue-500'
                }

                return (
                  <div
                    key={index}
                    className={`aspect-square border rounded-lg p-2 cursor-pointer transition-all ${bgClass} ${borderClass}`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-medium ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                          {date.getDate()}
                        </span>
                        {(dayInfo.employeesOnVacation > 0 || dayInfo.pendingVacations.length > 0) && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {dayInfo.employeesOnVacation + dayInfo.pendingVacations.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        {dayInfo.isHoliday && (
                          <div className="text-xs font-medium text-red-700 truncate" title={dayInfo.holiday?.name}>
                            🎉 {dayInfo.holiday?.name}
                          </div>
                        )}
                        {dayInfo.vacations.slice(0, 2).map((vacation, idx) => (
                          <div key={idx} className="text-xs text-green-700 truncate" title={getEmployeeName(vacation.employee_id)}>
                            <Users className="inline h-3 w-3 mr-1" />
                            {getEmployeeName(vacation.employee_id).split(' ')[0]}
                          </div>
                        ))}
                        {dayInfo.vacations.length > 2 && (
                          <div className="text-xs text-green-600 font-medium">
                            +{dayInfo.vacations.length - 2} más
                          </div>
                        )}
                        {dayInfo.pendingVacations.length > 0 && (
                          <div className="text-xs text-orange-600 truncate">
                            ⏳ {dayInfo.pendingVacations.length} pendiente{dayInfo.pendingVacations.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Resumen del mes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-red-600" />
                Días Festivos este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {holidays.filter(h => {
                  const hDate = parseLocalDate(h.holiday_date)
                  return hDate.getMonth() === currentDate.getMonth() && 
                         hDate.getFullYear() === currentDate.getFullYear()
                }).length}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Empleados con Vacaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {new Set(vacationRequests.filter(r => {
                  const start = parseLocalDate(r.start_date)
                  const end = parseLocalDate(r.end_date)
                  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                  return (start <= monthEnd && end >= monthStart)
                }).map(r => r.employee_id)).size}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
                Solicitudes Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {vacationRequests.filter(r => r.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
