'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, ArrowLeft, Users, Calendar, TrendingUp, Download, CalendarDays } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useToast } from "@/hooks/use-toast"
import {
  getEmployeesByOfficeClient,
  getVacationRequests,
  getVacationCycles,
  getHolidays,
  calculateYearsOfService,
  calculateVacationDays,
  type VacationRequest,
  type VacationCycle,
  type Holiday,
  type Employee
} from "@/lib/supabase/db-functions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function ReportesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())

  const [employees, setEmployees] = useState<Employee[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [allCycles, setAllCycles] = useState<Record<string, VacationCycle[]>>({})
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
      setVacationRequests(requestsData)
      setHolidays(holidaysData)

      // Cargar ciclos para todos los empleados
      const cycles: Record<string, VacationCycle[]> = {}
      for (const employee of employeesData) {
        try {
          const employeeCyclesData = await getVacationCycles(employee.id!)
          cycles[employee.id!] = employeeCyclesData
        } catch (error) {
          console.error(`Error loading cycles for employee ${employee.id}:`, error)
          cycles[employee.id!] = []
        }
      }
      setAllCycles(cycles)
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  // Estadísticas
  const totalEmployees = employees.length
  const totalVacationRequests = vacationRequests.length
  const approvedRequests = vacationRequests.filter(r => r.status === 'approved').length
  const pendingRequests = vacationRequests.filter(r => r.status === 'pending').length
  const rejectedRequests = vacationRequests.filter(r => r.status === 'rejected').length

  const totalDaysRequested = vacationRequests.reduce((sum, r) => sum + r.days_requested, 0)
  const totalDaysApproved = vacationRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.days_requested, 0)

  const totalHolidays = holidays.filter(h => h.is_active).length
  const holidaysThisYear = holidays.filter(h => {
    const date = parseLocalDate(h.holiday_date)
    return date.getFullYear() === new Date().getFullYear() && h.is_active
  }).length

  // Reporte por empleado
  const employeeReport = employees.map(emp => {
    const empRequests = vacationRequests.filter(r => r.employee_id === emp.id)
    const empCycles = allCycles[emp.id!] || []
    const activeCycles = empCycles.filter(c => !c.is_expired)
    const totalAvailable = activeCycles.reduce((sum, c) => sum + c.days_available, 0)
    const totalUsed = empCycles.reduce((sum, c) => sum + c.days_used, 0)
    const years = emp.hire_date ? calculateYearsOfService(emp.hire_date) : 0
    const daysPerYear = calculateVacationDays(years)

    return {
      id: emp.id,
      name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      yearsOfService: years,
      daysPerYear,
      totalRequests: empRequests.length,
      approved: empRequests.filter(r => r.status === 'approved').length,
      pending: empRequests.filter(r => r.status === 'pending').length,
      rejected: empRequests.filter(r => r.status === 'rejected').length,
      daysUsed: totalUsed,
      daysAvailable: totalAvailable,
      cycles: activeCycles.length
    }
  }).sort((a, b) => b.totalRequests - a.totalRequests)

  const exportToCSV = (reportType: string) => {
    let csvContent = ""
    
    if (reportType === 'employees') {
      csvContent = "Nombre,Años de Servicio,Días/Año,Total Solicitudes,Aprobadas,Pendientes,Rechazadas,Días Usados,Días Disponibles,Ciclos Activos\n"
      employeeReport.forEach(emp => {
        csvContent += `"${emp.name}",${emp.yearsOfService},${emp.daysPerYear},${emp.totalRequests},${emp.approved},${emp.pending},${emp.rejected},${emp.daysUsed},${emp.daysAvailable},${emp.cycles}\n`
      })
    } else if (reportType === 'vacations') {
      csvContent = "Empleado,Fecha Inicio,Fecha Fin,Días,Estado,Motivo,Fecha Solicitud\n"
      vacationRequests.forEach(req => {
        const emp = employees.find(e => e.id === req.employee_id)
        const empName = emp ? (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : 'Desconocido'
        csvContent += `"${empName}","${req.start_date}","${req.end_date}",${req.days_requested},"${req.status}","${req.reason || ''}","${req.created_at || ''}"\n`
      })
    } else if (reportType === 'holidays') {
      csvContent = "Nombre,Fecha,Descripción,Activo\n"
      holidays.forEach(h => {
        csvContent += `"${h.name}","${h.holiday_date}","${h.description || ''}","${h.is_active ? 'Sí' : 'No'}"\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_${reportType}_${office.code}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Reporte exportado",
      description: `El reporte de ${reportType} se ha descargado correctamente`
    })
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
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-800">Reportes y Estadísticas</h1>
              <p className="text-muted-foreground">
                Información consolidada de {office.name}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Empleados</CardDescription>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-3xl text-blue-600">{totalEmployees}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Solicitudes de Vacaciones</CardDescription>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-600">{totalVacationRequests}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-xs">
                <Badge variant="default">{approvedRequests} Aprobadas</Badge>
                <Badge variant="secondary">{pendingRequests} Pendientes</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Días de Vacaciones</CardDescription>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-3xl text-orange-600">{totalDaysApproved}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                de {totalDaysRequested} días solicitados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Días Festivos</CardDescription>
                <CalendarDays className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-3xl text-red-600">{totalHolidays}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {holidaysThisYear} este año
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Reportes */}
        <Tabs defaultValue="empleados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="empleados">
              <Users className="mr-2 h-4 w-4" />
              Empleados
            </TabsTrigger>
            <TabsTrigger value="vacaciones">
              <Calendar className="mr-2 h-4 w-4" />
              Vacaciones
            </TabsTrigger>
            <TabsTrigger value="festivos">
              <CalendarDays className="mr-2 h-4 w-4" />
              Días Festivos
            </TabsTrigger>
          </TabsList>

          {/* Reporte de Empleados */}
          <TabsContent value="empleados" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reporte por Empleado</CardTitle>
                    <CardDescription>
                      Estadísticas de vacaciones por empleado
                    </CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV('employees')}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-center">Años</TableHead>
                      <TableHead className="text-center">Días/Año</TableHead>
                      <TableHead className="text-center">Solicitudes</TableHead>
                      <TableHead className="text-center">Aprobadas</TableHead>
                      <TableHead className="text-center">Pendientes</TableHead>
                      <TableHead className="text-center">Días Usados</TableHead>
                      <TableHead className="text-center">Disponibles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReport.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-center">{emp.yearsOfService}</TableCell>
                        <TableCell className="text-center">{emp.daysPerYear}</TableCell>
                        <TableCell className="text-center">{emp.totalRequests}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-green-600">
                            {emp.approved}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{emp.pending}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-orange-600 font-semibold">
                          {emp.daysUsed}
                        </TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">
                          {emp.daysAvailable}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reporte de Vacaciones */}
          <TabsContent value="vacaciones" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Historial de Solicitudes</CardTitle>
                    <CardDescription>
                      Todas las solicitudes de vacaciones
                    </CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV('vacations')}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacationRequests.map((request) => {
                      const emp = employees.find(e => e.id === request.employee_id)
                      const empName = emp ? (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : 'Desconocido'
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{empName}</TableCell>
                          <TableCell>
                            {parseLocalDate(request.start_date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            {parseLocalDate(request.end_date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge>{request.days_requested}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {request.status === 'approved' && (
                              <Badge className="bg-green-600">Aprobada</Badge>
                            )}
                            {request.status === 'pending' && (
                              <Badge variant="secondary">Pendiente</Badge>
                            )}
                            {request.status === 'rejected' && (
                              <Badge variant="destructive">Rechazada</Badge>
                            )}
                            {request.status === 'in_progress' && (
                              <Badge className="bg-blue-600">En Curso</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {request.reason || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reporte de Días Festivos */}
          <TabsContent value="festivos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Días Festivos Registrados</CardTitle>
                    <CardDescription>
                      Calendario de días no laborables
                    </CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV('holidays')}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Día de la Semana</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays
                      .sort((a, b) => parseLocalDate(a.holiday_date).getTime() - parseLocalDate(b.holiday_date).getTime())
                      .map((holiday) => {
                        const date = parseLocalDate(holiday.holiday_date)
                        const dayOfWeek = date.toLocaleDateString('es-ES', { weekday: 'long' })
                        
                        return (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">{holiday.name}</TableCell>
                            <TableCell>
                              {date.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="capitalize">{dayOfWeek}</TableCell>
                            <TableCell>{holiday.description || '-'}</TableCell>
                            <TableCell className="text-center">
                              {holiday.is_active ? (
                                <Badge className="bg-green-600">Activo</Badge>
                              ) : (
                                <Badge variant="secondary">Inactivo</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
