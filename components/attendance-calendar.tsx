"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Info, Ban } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getEmployeeNote, getEmployeeAttendance } from "@/lib/supabase/queries"

interface Employee {
  id: string
  name: string
  position: string
}

interface VacationRequest {
  id?: string
  employee_id: string
  start_date: string
  end_date: string
  days_requested: number
  status: string
}

interface AttendanceCalendarProps {
  month: number
  year: number
  employees: Employee[]
  officeId: string // Añadir el ID de la oficina
  enableDragSelection?: boolean
  showDetailsColumn?: boolean
  nonWorkingDays?: number[] // Nuevo prop para días inhábiles
  isLocked?: boolean // Nueva propiedad para controlar si el mes está bloqueado
  selectedDayType?: string // Nueva prop para el tipo de día seleccionado
  onAttendanceUpdate?: (newAttendance: AttendanceData) => void // Prop para actualizar la asistencia
  visibleRows?: string // Nueva propiedad para controlar las filas visibles
  approvedVacations?: VacationRequest[] // Nueva prop para vacaciones aprobadas
}

// Definir los tipos de día
type DayType = {
  id: string
  name: string
  abbreviation: string
  color: string
}

// Definir la estructura de datos de asistencia
interface AttendanceData {
  [employeeId: string]: {
    [date: string]: {
      dayTypeId: string
      extraHours?: number // Horas extras cuando dayTypeId es "overtime"
    }
  }
}

// Definir la estructura para el conteo de tipos de día
interface DayTypeCounts {
  [dayTypeId: string]: {
    days: number
    hours: number
    extraHours?: number
  }
}

export function AttendanceCalendar(props: AttendanceCalendarProps) {
  const {
    month,
    year,
    employees,
    enableDragSelection,
    showDetailsColumn = false,
    nonWorkingDays = [],
    isLocked = false,
    onAttendanceUpdate,
    officeId,
    visibleRows,
    approvedVacations = [],
  } = props
  const [attendance, setAttendance] = useState<AttendanceData>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartCell, setDragStartCell] = useState<{ employeeId: string; day: number } | null>(null)
  const [dragCurrentCell, setDragCurrentCell] = useState<{ employeeId: string; day: number } | null>(null)
  const { toast } = useToast() // Añadir el hook useToast
  const [employeeNotes, setEmployeeNotes] = useState<{
    [key: string]: {
      // key format: employeeId-month-year
      note: string
      timestamp: number
    }
  }>({})

  // Referencia para cerrar el popover cuando se selecciona un tipo de día
  const popoverRef = useRef<HTMLButtonElement>(null)

  // Definir los tipos de día disponibles
  const dayTypes: DayType[] = [
    { id: "regular", name: "Hora Regular", abbreviation: "REG", color: "bg-green-500" },
    { id: "admin", name: "Ausencia Admin", abbreviation: "ADM", color: "bg-blue-500" },
    { id: "vacation", name: "Vac. Anuales", abbreviation: "VAC", color: "bg-yellow-500" },
    { id: "maternity", name: "L. Maternidad", abbreviation: "MAT", color: "bg-pink-500" },
    { id: "marriage", name: "L. Matrimonio", abbreviation: "MAR", color: "bg-purple-500" },
    { id: "medical", name: "L. Médica", abbreviation: "MED", color: "bg-red-500" },
    { id: "unpaid", name: "A. No Rem.", abbreviation: "ANR", color: "bg-gray-500" },
    { id: "other", name: "Otro", abbreviation: "OTR", color: "bg-orange-500" },
    { id: "overtime", name: "Horas Extras", abbreviation: "HE", color: "bg-violet-500" },
    { id: "none", name: "Sin Marcar", abbreviation: "", color: "bg-transparent" },
  ]

  // Función para obtener un tipo de día por su ID
  const getDayType = (attendanceInfo: string | { dayTypeId: string; extraHours?: number }): DayType => {
    const dayTypeId = typeof attendanceInfo === "string" ? attendanceInfo : attendanceInfo.dayTypeId
    return dayTypes.find((type) => type.id === dayTypeId) || dayTypes[dayTypes.length - 1]
  }

  // Función para validar que un tipo de día sea válido
  const validateDayType = (dayTypeId: string): string => {
    return dayTypes.some((type) => type.id === dayTypeId) ? dayTypeId : "regular"
  }

  // Verificar si un día es inhábil
  const isNonWorkingDay = (day: number): boolean => {
    return nonWorkingDays.includes(day)
  }

  // Verificar si un día es domingo
  const isSunday = (day: number) => {
    const date = new Date(year, month, day)
    return date.getDay() === 0 // 0 es domingo
  }

  // Verificar si un día específico de un empleado está en vacaciones aprobadas
  const isVacationDay = (employeeId: string, day: number): boolean => {
    if (!approvedVacations || approvedVacations.length === 0) return false
    
    const currentDate = new Date(year, month, day)
    
    return approvedVacations.some(vacation => {
      if (vacation.employee_id !== employeeId) return false
      
      // Parsear fechas de inicio y fin
      const [startYear, startMonth, startDay] = vacation.start_date.split('-').map(Number)
      const [endYear, endMonth, endDay] = vacation.end_date.split('-').map(Number)
      
      const startDate = new Date(startYear, startMonth - 1, startDay)
      const endDate = new Date(endYear, endMonth - 1, endDay)
      
      // Verificar si el día actual está dentro del rango de vacaciones
      return currentDate >= startDate && currentDate <= endDate
    })
  }

  // Cargar datos de asistencia desde localStorage
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        // Obtener la asistencia para todos los empleados
        const formattedAttendance: AttendanceData = {}

        // Para cada empleado, obtener su asistencia
        for (const employee of employees) {
          // Inicializar el objeto de asistencia para este empleado
          formattedAttendance[employee.id] = {}

          try {
            // Obtener la asistencia de este empleado para el mes actual
            const attendanceData = await getEmployeeAttendance(employee.id, month, year)

            // Formatear los datos para el componente
            attendanceData.forEach((record) => {
              const { day, month, year, day_type_id, extra_hours } = record
              // Formato de dateKey: "YYYY-MM-DD"
              const dateKey = `${year}-${month + 1}-${day}`

              formattedAttendance[employee.id][dateKey] = {
                dayTypeId: day_type_id,
                ...(day_type_id === "overtime" && extra_hours !== undefined ? { extraHours: extra_hours } : {}),
              }
            })
          } catch (error) {
            console.error(`Error al cargar asistencia para el empleado ${employee.id}:`, error)
          }
        }

        // Actualizar el estado con los datos cargados
        setAttendance(formattedAttendance)
      } catch (error) {
        console.error("Error al cargar datos de asistencia:", error)
      }
    }

    if (employees.length > 0) {
      loadAttendance()
    }
  }, [month, year, employees])

  // Marcar automáticamente los días de vacaciones aprobadas
  useEffect(() => {
    if (!approvedVacations || approvedVacations.length === 0 || employees.length === 0) return

    setAttendance(prevAttendance => {
      const updatedAttendance = { ...prevAttendance }
      
      // Para cada empleado
      employees.forEach(employee => {
        if (!updatedAttendance[employee.id]) {
          updatedAttendance[employee.id] = {}
        }
        
        // Verificar cada día del mes
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${year}-${month + 1}-${day}`
          
          // Si el día está en vacaciones y no está marcado, marcarlo como "vacation"
          if (isVacationDay(employee.id, day)) {
            // Solo marcar si no está ya marcado o si está marcado como algo diferente
            if (!updatedAttendance[employee.id][dateKey] || 
                (typeof updatedAttendance[employee.id][dateKey] === 'object' && 
                 updatedAttendance[employee.id][dateKey].dayTypeId !== 'vacation')) {
              updatedAttendance[employee.id][dateKey] = {
                dayTypeId: 'vacation',
              }
            }
          }
        }
      })
      
      return updatedAttendance
    })
  }, [approvedVacations, employees, month, year])

  // Guardar datos de asistencia en localStorage cuando cambien
  useEffect(() => {
    const saveAttendance = () => {
      try {
        const storageKey = `timecard-attendance-${officeId}-${month}-${year}`
        localStorage.setItem(storageKey, JSON.stringify(attendance))
      } catch (error) {
        console.error("Error al guardar datos de asistencia:", error)
      }
    }

    if (Object.keys(attendance).length > 0) {
      saveAttendance()
    }

    // Notificar al componente padre sobre la actualización de la asistencia
    // Solo notificar si hay cambios reales y no durante el renderizado inicial
    if (onAttendanceUpdate && Object.keys(attendance).length > 0) {
      // Usar un timeout para asegurar que esto ocurra después del renderizado
      const timeoutId = setTimeout(() => {
        onAttendanceUpdate(attendance)
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [attendance, month, year, officeId, onAttendanceUpdate])

  // Cargar notas de empleados desde localStorage
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const loadedNotes: {
          [key: string]: {
            note: string
            timestamp: number
          }
        } = {}

        // Para cada empleado, cargar sus notas
        for (const employee of employees) {
          const noteKey = `${employee.id}-${month}-${year}`

          try {
            const note = await getEmployeeNote(employee.id, month, year)

            if (note) {
              loadedNotes[noteKey] = {
                note: note.note,
                timestamp: new Date(note.updated_at || note.created_at).getTime(),
              }
            }
          } catch (error) {
            console.error(`Error al cargar nota para el empleado ${employee.id}:`, error)
          }
        }

        // Actualizar el estado con las notas cargadas
        setEmployeeNotes(loadedNotes)
      } catch (error) {
        console.error("Error al cargar notas de empleados:", error)
      }
    }

    if (employees.length > 0) {
      loadNotes()
    }
  }, [month, year, employees])

  // Guardar notas de empleados en localStorage cuando cambien
  useEffect(() => {
    const saveNotes = () => {
      try {
        const storageKey = `timecard-notes-${officeId}-${month}-${year}`
        localStorage.setItem(storageKey, JSON.stringify(employeeNotes))
      } catch (error) {
        console.error("Error al guardar notas de empleados:", error)
      }
    }

    if (Object.keys(employeeNotes).length > 0) {
      saveNotes()
    }
  }, [employeeNotes, month, year, officeId])

  // Función para manejar el estado de edición de la nota

  // Función para manejar el inicio del arrastre
  const handleDragStart = (employeeId: string, day: number) => {
    // No permitir iniciar arrastre si el mes está bloqueado
    if (isLocked) {
      toast({
        title: "Mes bloqueado",
        description: "Este mes está bloqueado para edición. Desbloquéelo primero para realizar cambios.",
        variant: "destructive",
      })
      return
    }

    // No permitir iniciar arrastre en días inhábiles o domingos
    if (!enableDragSelection || isNonWorkingDay(day) || isSunday(day)) return

    setIsDragging(true)
    setDragStartCell({ employeeId, day })
    setDragCurrentCell({ employeeId, day })

    // Marcar el día inicial con el tipo seleccionado
    handleAttendanceChange(employeeId, day, props.selectedDayType || "regular")
  }

  // Función para manejar el movimiento durante el arrastre
  const handleDragOver = (employeeId: string, day: number) => {
    if (!isDragging || !enableDragSelection) return
    if (!dragStartCell) return

    // Solo procesar si estamos en la misma fila (mismo empleado)
    if (employeeId === dragStartCell.employeeId) {
      setDragCurrentCell({ employeeId, day })

      // Determinar el rango de días a marcar
      const startDay = Math.min(dragStartCell.day, day)
      const endDay = Math.max(dragStartCell.day, day)

      // Crear una copia del estado actual de asistencia para este empleado
      const newAttendance = { ...attendance }
      if (!newAttendance[employeeId]) {
        newAttendance[employeeId] = {}
      }

      // Marcar todos los días en el rango con el tipo seleccionado, excepto los inhábiles y domingos
      for (let d = startDay; d <= endDay; d++) {
        if (!isNonWorkingDay(d) && !isSunday(d)) {
          const dateKey = `${year}-${month + 1}-${d}`
          const selectedDayType = props.selectedDayType || "regular"

          // Si es horas extras, no lo aplicamos en arrastre (requiere input de horas)
          if (selectedDayType !== "overtime") {
            newAttendance[employeeId][dateKey] = { dayTypeId: selectedDayType }
          }
        }
      }

      // Actualizar el estado de asistencia
      setAttendance(newAttendance)
    }
  }

  // Función para finalizar el arrastre
  const handleDragEnd = () => {
    if (!enableDragSelection) return

    setIsDragging(false)
    setDragStartCell(null)
    setDragCurrentCell(null)
  }

  // Efecto para manejar el evento mouseup global
  useEffect(() => {
    if (enableDragSelection) {
      const handleGlobalMouseUp = () => {
        if (isDragging) {
          handleDragEnd()
        }
      }

      window.addEventListener("mouseup", handleGlobalMouseUp)
      return () => {
        window.removeEventListener("mouseup", handleGlobalMouseUp)
      }
    }
  }, [isDragging, enableDragSelection])

  // Inicializar datos de asistencia
  useEffect(() => {
    const initialAttendance: AttendanceData = {}

    employees.forEach((employee) => {
      initialAttendance[employee.id] = {}
    })

    // Solo inicializar si no hay datos existentes
    setAttendance((prev) => {
      if (Object.keys(prev).length === 0) {
        return initialAttendance
      }
      return prev
    })
  }, [employees])

  // Obtener días del mes
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const daysInMonth = getDaysInMonth(month, year)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const [showHoursDialog, setShowHoursDialog] = useState(false)
  const [extraHours, setExtraHours] = useState<number>(0)
  const [currentEditingCell, setCurrentEditingCell] = useState<{
    employeeId: string
    day: number
    dateKey: string
  } | null>(null)

  // Manejar cambio en la asistencia
  const handleAttendanceChange = (employeeId: string, day: number, dayTypeId: string) => {
    // No permitir cambios si el mes está bloqueado
    if (isLocked) {
      toast({
        title: "Mes bloqueado",
        description: "Este mes está bloqueado para edición. Desbloquéelo primero para realizar cambios.",
        variant: "destructive",
      })
      return
    }

    // No permitir cambios en días inhábiles o domingos
    if (isNonWorkingDay(day) || isSunday(day)) return

    const dateKey = `${year}-${month + 1}-${day}`

    // Si el tipo de día es "overtime", mostrar diálogo para ingresar horas extras
    if (dayTypeId === "overtime") {
      setCurrentEditingCell({ employeeId, day, dateKey })
      setShowHoursDialog(true)
      return
    }

    setAttendance((prev) => {
      // Crear una copia profunda del estado actual
      const newAttendance = { ...prev }

      // Asegurarse de que exista un objeto para este empleado
      if (!newAttendance[employeeId]) {
        newAttendance[employeeId] = {}
      }

      // Obtener el tipo de día actual
      const currentAttendanceInfo = newAttendance[employeeId][dateKey]
      const currentDayTypeId =
        typeof currentAttendanceInfo === "string" ? currentAttendanceInfo : currentAttendanceInfo?.dayTypeId || "none"

      // Validar el tipo de día antes de asignarlo
      const validDayTypeId = validateDayType(dayTypeId)

      // Si el tipo de día es el mismo que ya está seleccionado, lo quitamos (toggle)
      if (currentDayTypeId === validDayTypeId && validDayTypeId !== "none") {
        newAttendance[employeeId][dateKey] = { dayTypeId: "none" }
      } else {
        // Si no, establecemos el nuevo tipo de día
        newAttendance[employeeId][dateKey] = { dayTypeId: validDayTypeId }
      }

      // Notificar al componente padre sobre la actualización
      if (onAttendanceUpdate) {
        // Usar un timeout para asegurar que esto ocurra después del renderizado
        setTimeout(() => {
          onAttendanceUpdate(newAttendance)
        }, 0)
      }

      return newAttendance
    })
  }

  const saveExtraHours = () => {
    if (!currentEditingCell) return

    setAttendance((prev) => {
      const newAttendance = { ...prev }

      if (!newAttendance[currentEditingCell.employeeId]) {
        newAttendance[currentEditingCell.employeeId] = {}
      }

      newAttendance[currentEditingCell.employeeId][currentEditingCell.dateKey] = {
        dayTypeId: "overtime",
        extraHours: extraHours,
      }

      // Notificar al componente padre sobre la actualización
      if (onAttendanceUpdate) {
        // Usar un timeout para asegurar que esto ocurra después del renderizado
        setTimeout(() => {
          onAttendanceUpdate(newAttendance)
        }, 0)
      }

      return newAttendance
    })

    setShowHoursDialog(false)
    setExtraHours(0)
    setCurrentEditingCell(null)
  }

  // Verificar si un día es fin de semana
  const isWeekend = (day: number) => {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // 0 es domingo, 6 es sábado
  }

  // Calcular el conteo de tipos de día para cada empleado, excluyendo los días inhábiles
  const calculateDayCounts = (employeeId: string): DayTypeCounts => {
    const counts: DayTypeCounts = {}

    // Inicializar contadores para cada tipo de día
    dayTypes.forEach((type) => {
      counts[type.id] = {
        days: 0,
        hours: 0,
        ...(type.id === "overtime" ? { extraHours: 0 } : {}),
      }
    })

    // Contar los días marcados para este empleado
    if (attendance[employeeId]) {
      Object.entries(attendance[employeeId]).forEach(([dateKey, attendanceInfo]) => {
        // Extraer el día del dateKey (formato: "año-mes-día")
        const day = Number.parseInt(dateKey.split("-")[2], 10)

        // Obtener el tipo de día y las horas extras (si existen)
        const dayTypeId = typeof attendanceInfo === "string" ? attendanceInfo : attendanceInfo.dayTypeId
        const extraHours = typeof attendanceInfo === "object" ? attendanceInfo.extraHours : undefined

        // Contar solo si no es un día inhábil y el tipo de día no es "none"
        if (!isNonWorkingDay(day) && dayTypeId !== "none") {
          counts[dayTypeId].days += 1

          // Cada día equivale a 8 horas regulares
          counts[dayTypeId].hours += 8

          // Si es horas extras, agregar las horas extras al contador
          if (dayTypeId === "overtime" && extraHours !== undefined) {
            counts[dayTypeId].extraHours = (counts[dayTypeId].extraHours || 0) + extraHours
          }
        }
      })
    }

    return counts
  }

  // Calcular el total de horas (regulares + extras)
  const calculateTotalHours = (
    counts: DayTypeCounts,
  ): { regularHours: number; extraHours: number; totalHours: number } => {
    let regularHours = 0
    let extraHours = 0

    Object.entries(counts).forEach(([dayTypeId, count]) => {
      if (dayTypeId !== "none") {
        regularHours += count.hours

        if (dayTypeId === "overtime" && count.extraHours !== undefined) {
          extraHours += count.extraHours
        }
      }
    })

    return {
      regularHours,
      extraHours,
      totalHours: regularHours + extraHours,
    }
  }

  const dayTypeId = props.selectedDayType || "regular"

  return (
    <div className="space-y-4">
      <div className="flex items-center"></div>

      <div
        className="overflow-x-auto relative"
        style={{
          height:
            props.visibleRows && props.visibleRows !== "auto"
              ? `${Number.parseInt(props.visibleRows) * 40 + 40}px` // 40px por fila + 40px para el encabezado
              : "auto",
          overflowY: props.visibleRows && props.visibleRows !== "auto" ? "auto" : "visible",
          display: "block", // Asegura que el contenedor sea un bloque para controlar mejor el scroll
        }}
      >
        <Table className={props.visibleRows && props.visibleRows !== "auto" ? "block" : ""}>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10">Empleado</TableHead>
              {days.map((day) => (
                <TableHead
                  key={day}
                  className={cn(
                    isWeekend(day) ? "bg-muted" : "",
                    isNonWorkingDay(day) ? "bg-blue-100 dark:bg-blue-950" : "",
                    isSunday(day) ? "bg-red-100 dark:bg-red-950" : "", // Añadir estilo para domingos en el encabezado
                  )}
                >
                  {day}
                  {isNonWorkingDay(day) && (
                    <span className="block text-xs text-blue-500" title="Día Inhábil">
                      <Ban className="h-3 w-3 mx-auto" />
                    </span>
                  )}
                  {isSunday(day) && !isNonWorkingDay(day) && (
                    <span className="block text-xs text-red-500" title="Domingo">
                      <Ban className="h-3 w-3 mx-auto" />
                    </span>
                  )}
                </TableHead>
              ))}
              {showDetailsColumn && <TableHead className="bg-muted font-medium text-center">Detalles</TableHead>}
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
                  const dateKey = `${year}-${month + 1}-${day}`
                  const attendanceInfo = attendance[employee.id]?.[dateKey] || { dayTypeId: "none" }
                  const dayTypeId = typeof attendanceInfo === "string" ? attendanceInfo : attendanceInfo.dayTypeId
                  const extraHours = typeof attendanceInfo === "object" ? attendanceInfo.extraHours : undefined
                  const dayType = getDayType(attendanceInfo)
                  const nonWorkingDay = isNonWorkingDay(day)

                  return (
                    <TableCell
                      key={day}
                      className={cn(
                        "p-0 h-10 min-w-10 text-center",
                        isWeekend(day) ? "bg-muted" : "",
                        nonWorkingDay ? "bg-blue-100 dark:bg-blue-950" : "",
                        isSunday(day) ? "bg-red-100 dark:bg-red-950" : "",
                        isDragging &&
                          dragStartCell?.employeeId === employee.id &&
                          day >= Math.min(dragStartCell.day, dragCurrentCell?.day || 0) &&
                          day <= Math.max(dragStartCell.day, dragCurrentCell?.day || 0) &&
                          !nonWorkingDay &&
                          !isSunday(day)
                          ? "bg-primary/10"
                          : "",
                        isLocked ? "bg-gray-50 dark:bg-gray-900" : "",
                      )}
                      onMouseDown={(e) => {
                        if (enableDragSelection && !nonWorkingDay && !isSunday(day) && !isLocked && !isVacationDay(employee.id, day)) {
                          e.preventDefault()
                          handleDragStart(employee.id, day)
                        }
                      }}
                      onMouseEnter={() => {
                        if (isDragging && enableDragSelection && !nonWorkingDay && !isSunday(day) && !isLocked && !isVacationDay(employee.id, day)) {
                          handleDragOver(employee.id, day)
                        }
                      }}
                      style={{
                        cursor:
                          isLocked || isSunday(day) || isVacationDay(employee.id, day)
                            ? "not-allowed"
                            : enableDragSelection && !nonWorkingDay
                              ? "pointer"
                              : "default",
                      }}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-full h-full",
                          dayTypeId !== "none" && "text-white font-medium text-xs",
                          dayType.color,
                          nonWorkingDay ? "opacity-50 cursor-not-allowed" : "",
                          isSunday(day) ? "opacity-50 cursor-not-allowed" : "",
                          isLocked ? "opacity-80" : "",
                          isVacationDay(employee.id, day) ? "opacity-90 cursor-not-allowed" : "",
                        )}
                        onClick={() =>
                          !nonWorkingDay &&
                          !isSunday(day) &&
                          !isLocked &&
                          !isVacationDay(employee.id, day) &&
                          handleAttendanceChange(employee.id, day, props.selectedDayType || "regular")
                        }
                        onMouseEnter={() => {
                          if (isDragging && enableDragSelection && !nonWorkingDay && !isSunday(day) && !isLocked && !isVacationDay(employee.id, day)) {
                            handleDragOver(employee.id, day)
                          }
                        }}
                      >
                        {nonWorkingDay ? (
                          <Ban className="h-3 w-3 text-blue-500" />
                        ) : isSunday(day) ? (
                          <Ban className="h-3 w-3 text-red-500" />
                        ) : dayTypeId === "overtime" && extraHours !== undefined ? (
                          <div className="flex flex-col items-center justify-center">
                            <span>{dayType.abbreviation}</span>
                            <span className="text-[9px] leading-tight">{extraHours}h</span>
                          </div>
                        ) : (
                          dayType.abbreviation
                        )}
                      </div>
                    </TableCell>
                  )
                })}

                {showDetailsColumn && (
                  <TableCell className="bg-muted/30 p-2">
                    <div className="flex justify-center items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                            <Info className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Detalle de Asistencia</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <h3 className="font-medium text-base mb-2">{employee.name}</h3>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                                {dayTypes
                                  .filter((type) => type.id !== "none")
                                  .filter((type) => (calculateDayCounts(employee.id)[type.id]?.days || 0) > 0)
                                  .map((type) => {
                                    const count = calculateDayCounts(employee.id)[type.id]
                                    const days = count?.days || 0
                                    const hours = count?.hours || 0
                                    const extraHours = type.id === "overtime" ? count?.extraHours || 0 : 0

                                    return (
                                      <div
                                        key={type.id}
                                        className="flex justify-between items-center border-b pb-1 col-span-3 md:col-span-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={cn("w-3 h-3 rounded-full", type.color)} />
                                          <span>{type.name}:</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-lg">{days}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {type.id === "overtime" ? (
                                              <>
                                                ({hours} hrs + {extraHours} hrs extra)
                                              </>
                                            ) : (
                                              <>({hours} hrs)</>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                {!dayTypes.some(
                                  (type) =>
                                    type.id !== "none" && (calculateDayCounts(employee.id)[type.id]?.days || 0) > 0,
                                ) && (
                                  <div className="col-span-3 text-center py-2 text-muted-foreground">
                                    No hay días marcados para este empleado
                                  </div>
                                )}
                              </div>

                              <div className="bg-muted p-3 rounded-md">
                                {(() => {
                                  const totals = calculateTotalHours(calculateDayCounts(employee.id))
                                  return (
                                    <>
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Total días marcados:</span>
                                        <span className="font-bold">
                                          {Object.values(calculateDayCounts(employee.id)).reduce(
                                            (a, b) => a + b.days,
                                            0,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="font-medium">Horas regulares:</span>
                                        <span className="font-bold">{totals.regularHours} hrs</span>
                                      </div>
                                      {totals.extraHours > 0 && (
                                        <div className="flex justify-between items-center mt-1">
                                          <span className="font-medium">Horas extras:</span>
                                          <span className="font-bold text-violet-500">{totals.extraHours} hrs</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center mt-1 border-t pt-1">
                                        <span className="font-medium">Total horas:</span>
                                        <span className="font-bold">{totals.totalHours} hrs</span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="font-medium">Días laborables:</span>
                                        <span className="font-bold">{daysInMonth - nonWorkingDays.length}</span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="font-medium">Días inhabilitados:</span>
                                        <span className="font-bold">{nonWorkingDays.length}</span>
                                      </div>
                                    </>
                                  )
                                })()}
                              </div>

                              <div className="border rounded-md p-3">
                                <h4 className="text-sm font-medium mb-2">Notas / Comentarios</h4>
                                <EmployeeNoteEditor
                                  employeeId={employee.id}
                                  month={month}
                                  year={year}
                                  officeId={officeId}
                                  employeeNotes={employeeNotes}
                                  setEmployeeNotes={setEmployeeNotes}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {employees.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={daysInMonth + (showDetailsColumn ? 2 : 1)}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay empleados registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Diálogo para ingresar horas extras */}
      <Dialog open={showHoursDialog} onOpenChange={setShowHoursDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Horas Extras</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Ingrese la cantidad de horas extras trabajadas:</p>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={extraHours}
                onChange={(e) => setExtraHours(Number.parseFloat(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span>horas</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoursDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveExtraHours}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para manejar las notas de los empleados
function EmployeeNoteEditor({
  employeeId,
  month,
  year,
  officeId,
  employeeNotes,
  setEmployeeNotes,
}: {
  employeeId: string
  month: number
  year: number
  officeId: string
  employeeNotes: {
    [key: string]: {
      note: string
      timestamp: number
    }
  }
  setEmployeeNotes: React.Dispatch<
    React.SetStateAction<{
      [key: string]: {
        note: string
        timestamp: number
      }
    }>
  >
}) {
  const noteKey = `${employeeId}-${month}-${year}-${officeId}`
  const existingNote = employeeNotes[noteKey]
  const [noteText, setNoteText] = useState(existingNote?.note || "")
  const [isEditing, setIsEditing] = useState(!existingNote)
  const { toast } = useToast()

  useEffect(() => {
    const currentNoteKey = `${employeeId}-${month}-${year}-${officeId}`
    const currentNote = employeeNotes[currentNoteKey]
    setNoteText(currentNote?.note || "")
    setIsEditing(!currentNote)
  }, [employeeId, month, year, officeId, employeeNotes])

  const handleSaveNote = async () => {
    try {
      const newNote = {
        note: noteText,
        timestamp: Date.now(),
      }

      // Actualizar el estado local
      setEmployeeNotes((prevNotes) => ({
        ...prevNotes,
        [noteKey]: newNote,
      }))

      // Guardar en localStorage para asegurar que esté disponible para exportación
      const storageKey = `timecard-notes-${officeId}-${month}-${year}`
      const existingNotes = localStorage.getItem(storageKey)
      const parsedNotes = existingNotes ? JSON.parse(existingNotes) : {}

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...parsedNotes,
          [noteKey]: newNote,
        }),
      )

      setIsEditing(false)
      toast({
        title: "Nota guardada",
        description: "La nota ha sido guardada correctamente y aparecerá en el archivo exportado.",
      })
    } catch (error) {
      console.error("Error al guardar la nota:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la nota. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleEditNote = () => {
    setIsEditing(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Nota:</div>
      {isEditing ? (
        <div>
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={noteText}
            onChange={handleChange}
            placeholder="Ingrese comentarios o notas sobre este empleado. Esta información aparecerá en el archivo exportado en la columna de comentarios."
          />
          <button
            onClick={handleSaveNote}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
          >
            Guardar
          </button>
        </div>
      ) : (
        <div>
          {noteText ? (
            <>
              <p
                className="text-sm whitespace-pre-wrap border-l-2 border-primary/50 pl-2 py-1 bg-muted/30 rounded-sm"
                data-export="true"
                title="Este comentario se incluirá en el reporte exportado"
              >
                {noteText}
              </p>
              <button
                onClick={handleEditNote}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
              >
                Editar
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
            >
              Añadir Nota
            </button>
          )}
        </div>
      )}
    </div>
  )
}
