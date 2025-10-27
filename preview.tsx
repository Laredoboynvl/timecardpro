"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileUp,
  Lock,
  Plus,
  Search,
  Unlock,
  User,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Preview() {
  const [currentMonth, setCurrentMonth] = useState(4) // Mayo (0-indexado)
  const [currentYear, setCurrentYear] = useState(2025)
  const [isMonthLocked, setIsMonthLocked] = useState(false)
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedDayType, setSelectedDayType] = useState("regular")

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const dayTypes = [
    { id: "regular", name: "Hora Regular", abbreviation: "REG", color: "bg-green-500" },
    { id: "admin", name: "Ausencia Admin", abbreviation: "ADM", color: "bg-blue-500" },
    { id: "vacation", name: "Vac. Anuales", abbreviation: "VAC", color: "bg-yellow-500" },
    { id: "maternity", name: "L. Maternidad", abbreviation: "MAT", color: "bg-pink-500" },
    { id: "marriage", name: "L. Matrimonio", abbreviation: "MAR", color: "bg-purple-500" },
    { id: "medical", name: "L. Médica", abbreviation: "MED", color: "bg-red-500" },
    { id: "unpaid", name: "A. No Rem.", abbreviation: "ANR", color: "bg-gray-500" },
    { id: "other", name: "Otro", abbreviation: "OTR", color: "bg-orange-500" },
  ]

  const employees = [
    { id: "1", name: "Juan Pérez", position: "Gerente" },
    { id: "2", name: "María González", position: "Asistente" },
    { id: "3", name: "Carlos Rodríguez", position: "Técnico" },
    { id: "4", name: "Ana Martínez", position: "Analista" },
    { id: "5", name: "Roberto Sánchez", position: "Coordinador" },
  ]

  // Datos de ejemplo para el calendario
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Días no laborables de ejemplo
  const nonWorkingDays = [1, 5, 15]

  // Datos de asistencia de ejemplo
  const attendance = {
    "1": {
      "2025-5-2": "regular",
      "2025-5-3": "regular",
      "2025-5-4": "regular",
      "2025-5-6": "regular",
      "2025-5-7": "regular",
    },
    "2": {
      "2025-5-2": "regular",
      "2025-5-3": "vacation",
      "2025-5-4": "vacation",
      "2025-5-6": "regular",
      "2025-5-7": "regular",
    },
    "3": {
      "2025-5-2": "regular",
      "2025-5-3": "regular",
      "2025-5-4": "medical",
      "2025-5-6": "medical",
      "2025-5-7": "regular",
    },
    "4": {
      "2025-5-2": "admin",
      "2025-5-3": "admin",
      "2025-5-4": "regular",
      "2025-5-6": "regular",
      "2025-5-7": "regular",
    },
    "5": {
      "2025-5-2": "regular",
      "2025-5-3": "regular",
      "2025-5-4": "regular",
      "2025-5-6": "regular",
      "2025-5-7": "unpaid",
    },
  }

  // Función para verificar si un día es domingo
  const isSunday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return date.getDay() === 0
  }

  // Función para verificar si un día es fin de semana
  const isWeekend = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const toggleMonthLock = () => {
    setIsMonthLocked(!isMonthLocked)
  }

  const toggleEmployeeList = () => {
    setIsEmployeeListOpen(!isEmployeeListOpen)
  }

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0] || "")
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Nuevo Laredo</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost">Empleados</Button>
            <Button variant="ghost">Horarios</Button>
            <Button variant="ghost">Reportes</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Dashboard de Nuevo Laredo</h2>
                <p className="text-sm text-muted-foreground">País: México</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setExportModalOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  Detalles
                </Button>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" />
                  Correcciones
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Empleado
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Asistencia Mensual</CardTitle>
                  <Button variant="outline" className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-green-500" />
                    Hora Regular
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                    Anterior
                  </Button>
                  <span className="font-medium">
                    {months[currentMonth]} {currentYear}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    Siguiente
                  </Button>
                  <Button
                    variant={isMonthLocked ? "default" : "outline"}
                    size="sm"
                    onClick={toggleMonthLock}
                    className={isMonthLocked ? "bg-amber-600 hover:bg-amber-700" : ""}
                  >
                    {isMonthLocked ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Bloqueado
                      </>
                    ) : (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Desbloquear
                      </>
                    )}
                  </Button>
                  <Select defaultValue="auto">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filas visibles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Todas las filas</SelectItem>
                      <SelectItem value="5">5 filas</SelectItem>
                      <SelectItem value="10">10 filas</SelectItem>
                      <SelectItem value="15">15 filas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription className="flex items-center justify-between">
                <span>Marca los días trabajados para cada empleado</span>
                {isMonthLocked && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center">
                    <Lock className="mr-1 h-3 w-3" />
                    Este mes está bloqueado para edición
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Empleado</TableHead>
                      {days.map((day) => (
                        <TableHead
                          key={day}
                          className={`
                            ${isWeekend(day) ? "bg-muted" : ""}
                            ${nonWorkingDays.includes(day) ? "bg-blue-100 dark:bg-blue-950" : ""}
                            ${isSunday(day) ? "bg-red-100 dark:bg-red-950" : ""}
                          `}
                        >
                          {day}
                        </TableHead>
                      ))}
                      <TableHead className="bg-muted font-medium text-center">Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          <span className="truncate block max-w-[200px]" title={employee.name}>
                            {employee.name}
                          </span>
                        </TableCell>
                        {days.map((day) => {
                          const dateKey = `${currentYear}-${currentMonth + 1}-${day}`
                          const dayTypeId = attendance[employee.id]?.[dateKey] || "none"
                          const dayType = dayTypes.find((t) => t.id === dayTypeId)
                          const nonWorkingDay = nonWorkingDays.includes(day)
                          const sunday = isSunday(day)

                          return (
                            <TableCell
                              key={day}
                              className={`
                                p-0 h-10 min-w-10 text-center
                                ${isWeekend(day) ? "bg-muted" : ""}
                                ${nonWorkingDay ? "bg-blue-100 dark:bg-blue-950" : ""}
                                ${sunday ? "bg-red-100 dark:bg-red-950" : ""}
                                ${isMonthLocked ? "bg-gray-50 dark:bg-gray-900" : ""}
                              `}
                            >
                              <div
                                className={`
                                  flex items-center justify-center w-full h-full
                                  ${dayTypeId !== "none" && "text-white font-medium text-xs"}
                                  ${dayType?.color || ""}
                                  ${nonWorkingDay ? "opacity-50 cursor-not-allowed" : ""}
                                  ${sunday ? "opacity-50 cursor-not-allowed" : ""}
                                  ${isMonthLocked ? "opacity-80" : ""}
                                `}
                              >
                                {dayType?.abbreviation || ""}
                              </div>
                            </TableCell>
                          )
                        })}
                        <TableCell className="bg-muted/30 p-2">
                          <div className="flex justify-center items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Collapsible open={isEmployeeListOpen} onOpenChange={setIsEmployeeListOpen} className="border rounded-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <div>
                  <h3 className="text-lg font-medium">Empleados</h3>
                  <p className="text-sm text-muted-foreground">
                    {employees.length} empleados registrados en esta oficina
                  </p>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-all duration-200 hover:bg-primary/10"
                  onClick={toggleEmployeeList}
                >
                  {isEmployeeListOpen ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Ocultar empleados
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Mostrar empleados
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="p-4 space-y-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{employee.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button variant="ghost" size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </main>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Exportar Calendario</DialogTitle>
            <DialogDescription>
              Descarga el calendario de asistencia en formato PDF para {months[currentMonth]} {currentYear}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Información del Calendario</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Oficina:</div>
                  <div className="font-medium">Nuevo Laredo</div>
                  <div>Mes:</div>
                  <div className="font-medium">
                    {months[currentMonth]} {currentYear}
                  </div>
                  <div>Empleados:</div>
                  <div className="font-medium">{employees.length}</div>
                  <div>Días laborables:</div>
                  <div className="font-medium">{daysInMonth - nonWorkingDays.length}</div>
                </div>
              </div>

              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Opciones de Exportación</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-legend" defaultChecked />
                    <label htmlFor="include-legend" className="text-sm">
                      Incluir leyenda de tipos de día
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-summary" defaultChecked />
                    <label htmlFor="include-summary" className="text-sm">
                      Incluir resumen de asistencia
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Exportar Calendario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
