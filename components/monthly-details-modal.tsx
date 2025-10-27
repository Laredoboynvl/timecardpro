"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart, MessageSquare, Calendar, Users, Clock, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getMonthlyComments,
  upsertMonthlyComment,
  getMonthlyAttendanceSummary,
  type MonthlyComment,
  type Employee,
  type AttendanceType,
} from "@/lib/supabase/db-functions"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

interface MonthlyDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  officeId: string
  officeName: string
  year: number
  month: number
  employees: Employee[]
  attendanceTypes: AttendanceType[]
  selectedEmployeeId?: string | null
}

interface AttendanceSummary {
  employeeId: string
  employeeName: string
  totalDays: number
  totalHours: number
  attendanceByType: Record<string, { count: number; hours: number }>
  weeklyBreakdown: {
    week: number
    startDate: string
    endDate: string
    totalHours: number
    typeBreakdown: Record<string, { count: number; hours: number }>
  }[]
}

export function MonthlyDetailsModal({
  open,
  onOpenChange,
  officeId,
  officeName,
  year,
  month,
  employees,
  attendanceTypes,
  selectedEmployeeId
}: MonthlyDetailsModalProps) {
  const { toast } = useToast()
  
  // Estados
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([])
  const [monthlyComments, setMonthlyComments] = useState<MonthlyComment[]>([])
  const [generalComment, setGeneralComment] = useState("")
  const [employeeComments, setEmployeeComments] = useState<Record<string, string>>({})

  // Obtener nombre del empleado
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return `Empleado ${employeeId}`
    return employee.name || `${employee.first_name} ${employee.last_name}` || `Empleado ${employee.employee_number || employeeId}`
  }

  // Función para buscar tipo de asistencia de forma robusta
  const findAttendanceType = (typeName: string) => {
    if (!attendanceTypes || attendanceTypes.length === 0) {
      return null
    }
    
    // Intentar múltiples formas de búsqueda
    const type = attendanceTypes.find(t => 
      t.name === typeName || 
      t.code === typeName ||
      t.name.toLowerCase() === typeName.toLowerCase() ||
      t.code.toLowerCase() === typeName.toLowerCase() ||
      typeName.includes(t.code) ||
      typeName.includes(t.name)
    )
    
    return type
  }

  // Filtrar empleados para mostrar
  const filteredAttendanceSummary = selectedEmployeeId 
    ? attendanceSummary.filter(emp => emp.employeeId === selectedEmployeeId)
    : attendanceSummary

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadMonthlyData()
    }
  }, [open, officeId, year, month])

  const loadMonthlyData = async () => {
    setLoading(true)
    try {
      // Cargar resumen de asistencia
      const summary = await getMonthlyAttendanceSummary(officeId, year, month)
      
      // Enriquecer con nombres de empleados
      const enrichedSummary = summary.map(item => ({
        ...item,
        employeeName: getEmployeeName(item.employeeId)
      }))
      
      setAttendanceSummary(enrichedSummary)

      // Cargar comentarios existentes
      const comments = await getMonthlyComments(officeId, year, month)
      setMonthlyComments(comments)
      
      // Separar comentario general de comentarios por empleado
      const general = comments.find(c => !c.employee_id)
      if (general) {
        setGeneralComment(general.general_comments || "")
      }
      
      const empComments: Record<string, string> = {}
      comments.forEach(comment => {
        if (comment.employee_id) {
          empComments[comment.employee_id] = comment.employee_comments || ""
        }
      })
      setEmployeeComments(empComments)
      
    } catch (error) {
      console.error('Error cargando datos mensuales:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del mes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveComments = async () => {
    setSaving(true)
    try {
      // Guardar comentario general
      if (generalComment.trim()) {
        await upsertMonthlyComment(
          officeId,
          year,
          month,
          null, // employee_id = null para comentario general
          generalComment,
          undefined
        )
      }

      // Guardar comentarios por empleado
      for (const [employeeId, comment] of Object.entries(employeeComments)) {
        if (comment.trim()) {
          await upsertMonthlyComment(
            officeId,
            year,
            month,
            employeeId,
            undefined,
            comment
          )
        }
      }

      toast({
        title: "Comentarios guardados",
        description: "Los comentarios del mes se han guardado correctamente",
      })
      
      // Recargar datos
      await loadMonthlyData()
      
    } catch (error) {
      console.error('Error guardando comentarios:', error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los comentarios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const monthName = MONTHS[month - 1]
  const totalWorkingDays = new Date(year, month, 0).getDate() // Días del mes
  const selectedEmployee = selectedEmployeeId ? employees.find(emp => emp.id === selectedEmployeeId) : null
  const isEmployeeSpecific = !!selectedEmployeeId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isEmployeeSpecific 
              ? `Detalles de ${selectedEmployee?.name} - ${monthName} ${year}`
              : `Detalles de ${monthName} ${year}`
            }
          </DialogTitle>
          <DialogDescription>
            {isEmployeeSpecific 
              ? `Resumen de asistencia y comentarios para ${selectedEmployee?.name} en ${officeName}`
              : `Resumen de asistencia y comentarios para ${officeName}`
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-muted-foreground">Cargando resumen...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {isEmployeeSpecific ? "Empleado" : "Total Empleados"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isEmployeeSpecific ? 1 : filteredAttendanceSummary.length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Días del Mes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalWorkingDays}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {filteredAttendanceSummary.reduce((sum, emp) => sum + emp.totalHours, 0)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {filteredAttendanceSummary.map((employee) => (
                    <Card key={employee.employeeId}>
                      <CardHeader>
                        <CardTitle className="text-base">{employee.employeeName}</CardTitle>
                        <CardDescription>
                          Total: {employee.totalDays} días • {employee.totalHours} horas
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Resumen por tipo */}
                        <div>
                          <p className="text-sm font-medium mb-2">Resumen por tipo:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(employee.attendanceByType).map(([typeName, typeData]) => {
                              // Buscar el tipo usando la función robusta
                              const type = findAttendanceType(typeName)
                              return (
                                <div
                                  key={typeName}
                                  className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow-sm border"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type?.color || '#6B7280' }}
                                  />
                                  <span className="text-sm font-medium">
                                    {typeName}: {typeData.count} días ({typeData.hours}h)
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Desglose semanal */}
                        <div>
                          <p className="text-sm font-medium mb-2">Desglose semanal:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {employee.weeklyBreakdown.map((week) => {
                              // Calcular horas totales de la semana (cada día = 8 horas)
                              const weekTotalDays = Object.values(week.typeBreakdown).reduce((sum, typeData) => sum + typeData.count, 0)
                              const weekTotalHours = weekTotalDays * 8
                              
                              return (
                                <div
                                  key={week.week}
                                  className="p-3 bg-gray-50 rounded-md text-sm"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">
                                      Semana {week.week} ({week.startDate} - {week.endDate})
                                    </span>
                                    <span className="text-blue-600 font-medium">
                                      {weekTotalDays} días • {weekTotalHours} horas
                                    </span>
                                  </div>
                                  {Object.keys(week.typeBreakdown).length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(week.typeBreakdown).map(([typeName, typeData]) => {
                                          // Buscar el tipo usando la función robusta
                                          const type = findAttendanceType(typeName)
                                          
                                          const typeHours = typeData.count * 8 // Cada día = 8 horas
                                          return (
                                            <div
                                              key={typeName}
                                              className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow-sm border"
                                            >
                                              <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: type?.color || '#6B7280' }}
                                              />
                                              <span className="text-xs font-medium">
                                                {type?.code || typeName}
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                {typeData.count} días
                                              </span>
                                              <span className="text-xs font-bold text-blue-600">
                                                {typeHours}h
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Sumatoria Total */}
                  {filteredAttendanceSummary.length > 0 && (
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          Resumen Total de Horas
                        </CardTitle>
                        <CardDescription>
                          Sumatoria total de horas trabajadas en {monthName} {year}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Calcular totales generales
                          const totalDays = filteredAttendanceSummary.reduce((sum, emp) => sum + emp.totalDays, 0)
                          const totalHours = totalDays * 8 // Cada día = 8 horas
                          
                          // Calcular totales por tipo de asistencia
                          const totalsByType: Record<string, { count: number; hours: number }> = {}
                          
                          filteredAttendanceSummary.forEach(employee => {
                            Object.entries(employee.attendanceByType).forEach(([typeName, typeData]) => {
                              if (!totalsByType[typeName]) {
                                totalsByType[typeName] = { count: 0, hours: 0 }
                              }
                              totalsByType[typeName].count += typeData.count
                              totalsByType[typeName].hours += typeData.count * 8 // Cada día = 8 horas
                            })
                          })
                          
                          return (
                            <div className="space-y-4">
                              {/* Totales principales */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-white rounded-lg border">
                                  <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
                                  <div className="text-sm text-gray-600">Total Días Trabajados</div>
                                </div>
                                <div className="text-center p-4 bg-white rounded-lg border">
                                  <div className="text-2xl font-bold text-green-600">{totalHours}</div>
                                  <div className="text-sm text-gray-600">Total Horas Trabajadas</div>
                                </div>
                              </div>
                              
                              {/* Desglose por tipo */}
                              <div>
                                <p className="text-sm font-medium mb-3">Desglose por tipo de asistencia:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {Object.entries(totalsByType).map(([typeName, typeData]) => {
                                    // Buscar el tipo usando la función robusta
                                    const type = findAttendanceType(typeName)
                                    return (
                                      <div
                                        key={typeName}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: type?.color || '#6B7280' }}
                                          />
                                          <span className="text-sm font-medium">{typeName}</span>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-bold">{typeData.count} días</div>
                                          <div className="text-xs text-blue-600">{typeData.hours} horas</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-6">
                {/* Comentario general */}
                {!isEmployeeSpecific && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Comentarios Generales del Mes</CardTitle>
                      <CardDescription>
                        Observaciones generales sobre la asistencia de {monthName} {year}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Escribe comentarios generales sobre este mes..."
                        value={generalComment}
                        onChange={(e) => setGeneralComment(e.target.value)}
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                )}

                {!isEmployeeSpecific && <Separator />}

                {/* Comentarios por empleado */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {isEmployeeSpecific ? "Comentarios del Empleado" : "Comentarios por Empleado"}
                  </h3>
                  <div className="space-y-4">
                    {(isEmployeeSpecific ? [selectedEmployee].filter(Boolean) : employees).map((employee) => (
                      <Card key={employee!.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {employee!.name || `${employee!.first_name} ${employee!.last_name}`} ({employee!.employee_number || employee!.id})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder={`Comentarios específicos para ${employee!.name || employee!.first_name}...`}
                            value={employeeComments[employee!.id] || ""}
                            onChange={(e) => 
                              setEmployeeComments({
                                ...employeeComments,
                                [employee!.id]: e.target.value
                              })
                            }
                            rows={3}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <Button
            onClick={handleSaveComments}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Comentarios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}