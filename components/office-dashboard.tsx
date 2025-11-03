"use client"

import type React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Download,
  Plus,
  Upload,
  FileUp,
  UserPlus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Lock,
  Unlock,
  User,
  Eye,
  Edit,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceCalendar } from "@/components/attendance-calendar"
import { EmployeeList } from "@/components/employee-list"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { useAuth, usePermissions } from "@/lib/hooks/useAuth"

// Importar las funciones de Supabase necesarias
import {
  getAttendanceByOffice,
  deleteAttendance,
  getNonWorkingDays,
  addNonWorkingDay,
  getMonthLockStatus,
  setMonthLockStatus,
  getEmployeesByOfficeClient as getEmployeesByOffice,
  addMultipleEmployees,
  addEmployee,
} from "@/lib/supabase/db-functions"
import { createClientSupabaseClient } from "@/lib/supabase/client"

// Actualizar la interfaz OfficeDashboardProps para incluir los empleados iniciales
interface OfficeDashboardProps {
  officeId: string
  officeName: string
  initialEmployees?: Employee[]
}

interface Employee {
  id: string
  name: string
  position: string
}

// Definir la estructura de datos de asistencia
interface AttendanceData {
  [employeeId: string]: {
    [date: string]: string // ID del tipo de día
  }
}

// Definir la estructura para los días inhábiles
interface NonWorkingDaysData {
  [yearMonth: string]: number[] // Array de días para cada combinación año-mes
}

// Definir la estructura para los datos persistentes
interface PersistentData {
  attendance: AttendanceData
  nonWorkingDays: NonWorkingDaysData
  daysToVerify: Array<{ day: number; month: number; year: number; motivo?: string }>
  lockedMonths: { [yearMonth: string]: boolean }
  visibleRows?: string // Nueva propiedad para almacenar el número de filas visibles
}

// Reemplazar completamente la función normalizeText con esta versión que no usa expresiones regulares problemáticas:

/**
 * Función avanzada para normalizar texto con caracteres especiales
 * Maneja múltiples codificaciones y formatos problemáticos
 */
const normalizeText = (text: string): string => {
  if (!text) return ""

  // Paso 1: Decodificar entidades HTML comunes
  let normalized = text
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Ntilde;/g, "Ñ")
    // Añadir más entidades HTML si es necesario
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Paso 2: Reemplazar secuencias de bytes UTF-8 mal interpretadas
  // Esto ocurre cuando un texto UTF-8 se lee como Latin1 o Windows-1252
  normalized = normalized
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã"/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã'/g, "Ñ")

  // Paso 3: Eliminar caracteres de control y no imprimibles
  // Enfoque seguro: convertir a array, filtrar caracteres válidos, y volver a unir
  normalized = normalized
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0)
      // Mantener solo caracteres imprimibles (código > 31) y no en el rango 127-159
      return code > 31 && (code < 127 || code > 159)
    })
    .join("")

  // Paso 4: Reemplazar signos de interrogación que puedan estar sustituyendo caracteres no reconocidos
  normalized = normalized.replace(/\?+/g, "")

  // Paso 5: Normalizar espacios
  normalized = normalized.replace(/\s+/g, " ").trim()

  return normalized
}

/**
 * Función para detectar y manejar diferentes codificaciones en archivos CSV
 */
const detectEncoding = (buffer: ArrayBuffer): string => {
  const dataView = new DataView(buffer)

  // Detectar BOM (Byte Order Mark)
  if (
    buffer.byteLength >= 3 &&
    dataView.getUint8(0) === 0xef &&
    dataView.getUint8(1) === 0xbb &&
    dataView.getUint8(2) === 0xbf
  ) {
    return "UTF-8"
  }

  if (buffer.byteLength >= 2 && dataView.getUint8(0) === 0xfe && dataView.getUint8(1) === 0xff) {
    return "UTF-16BE"
  }

  if (buffer.byteLength >= 2 && dataView.getUint8(0) === 0xff && dataView.getUint8(1) === 0xfe) {
    return "UTF-16LE"
  }

  // Si no hay BOM, intentamos con UTF-8
  return "UTF-8"
}

// Modificar la función OfficeDashboard para usar los empleados iniciales
export function OfficeDashboard({ officeId, officeName, initialEmployees = [] }: OfficeDashboardProps) {
  // Hooks de autenticación y permisos
  const { user, roleLabel, canModify, canView, isSPOC, isRH } = useAuth()
  const permissions = usePermissions()

  // Actualizar el estado inicial de empleados
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [employeesToVerify, setEmployeesToVerify] = useState<Array<{ name: string; position: string }>>([])
  const [verificationMode, setVerificationMode] = useState(false)
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false)
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([]) // Estado para días inhábiles del mes actual
  // Agregar después de la línea donde se define el estado nonWorkingDays
  const [yearNonWorkingDays, setYearNonWorkingDays] = useState<Array<{ month: number; days: number[] }>>([])
  const [selectedNonWorkingYear, setSelectedNonWorkingYear] = useState<number>(currentYear)
  const [nonWorkingDaysData, setNonWorkingDaysData] = useState<NonWorkingDaysData>({}) // Estado para todos los días inhábiles
  const [nonWorkingDaysDialogOpen, setNonWorkingDaysDialogOpen] = useState(false) // Estado para el diálogo
  const [daysToVerify, setDaysToVerify] = useState<
    Array<{ day: number; month: number; year: number; motivo?: string }>
  >([]) // Estado para verificar días inhábiles con información completa
  const [isMonthLocked, setIsMonthLocked] = useState(false)
  const [lockedMonths, setLockedMonths] = useState<{ [yearMonth: string]: boolean }>({})
  const [attendance, setAttendance] = useState<AttendanceData>({})
  const [visibleRows, setVisibleRows] = useState<string>("auto") // Estado para el número de filas visibles
  const [selectedDayType, setSelectedDayType] = useState<string>("regular")
  const { toast } = useToast()
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [hasComments, setHasComments] = useState(false)
  const [employeeCorrections, setEmployeeCorrections] = useState<{
    [employeeId: string]: string
  }>({})

  // Referencias para los inputs de archivos
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nonWorkingDaysFileInputRef = useRef<HTMLInputElement>(null)
  const dayTypePopoverRef = useRef<HTMLButtonElement>(null)

  // Clave para localStorage
  const storageKey = `timecard-${officeId}`

  // Función para obtener la clave del mes actual
  const getCurrentMonthKey = () => `${currentYear}-${currentMonth}`

  // Cargar datos desde localStorage al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Cargar empleados
        const employeesData = await getEmployeesByOffice(officeId)
        setEmployees(employeesData)

        // 2. Cargar asistencia para el mes actual
        const attendanceData = await getAttendanceByOffice(officeId, currentMonth, currentYear)

        // Convertir el formato de la base de datos al formato que usa el componente
        const formattedAttendance: AttendanceData = {}

        attendanceData.forEach((record) => {
          const { employee_id, day, month, year, day_type_id } = record

          if (!formattedAttendance[employee_id]) {
            formattedAttendance[employee_id] = {}
          }

          // Formato de dateKey: "YYYY-MM-DD"
          const dateKey = `${year}-${month + 1}-${day}`
          formattedAttendance[employee_id][dateKey] = day_type_id
        })

        setAttendance(formattedAttendance)

        // 3. Cargar días inhábiles
        const nonWorkingDaysData = await getNonWorkingDays(officeId, currentMonth, currentYear)
        const daysArray = nonWorkingDaysData.map((item) => item.day)
        setNonWorkingDays(daysArray)

        // 4. Cargar estado de bloqueo del mes
        const isLocked = await getMonthLockStatus(officeId, currentMonth, currentYear)
        setIsMonthLocked(isLocked)

        // Actualizar el estado de lockedMonths
        const monthKey = getCurrentMonthKey()
        setLockedMonths((prev) => ({
          ...prev,
          [monthKey]: isLocked,
        }))
      } catch (error) {
        console.error("Error al cargar datos desde Supabase:", error)
        toast({
          title: "Error al cargar datos",
          description: "No se pudieron cargar los datos desde la base de datos.",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [officeId, currentMonth, currentYear])

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    const saveData = () => {
      try {
        const dataToSave: PersistentData = {
          attendance,
          nonWorkingDays: nonWorkingDaysData,
          daysToVerify,
          lockedMonths,
          visibleRows,
        }
        localStorage.setItem(storageKey, JSON.stringify(dataToSave))
      } catch (error) {
        console.error("Error al guardar datos:", error)
      }
    }

    saveData()
  }, [attendance, nonWorkingDaysData, daysToVerify, lockedMonths, visibleRows, officeId])

  // Actualizar los días inhábiles cuando cambie el mes
  useEffect(() => {
    const loadMonthData = async () => {
      try {
        // 1. Cargar asistencia para el nuevo mes
        const attendanceData = await getAttendanceByOffice(officeId, currentMonth, currentYear)

        // Convertir el formato de la base de datos al formato que usa el componente
        const formattedAttendance: AttendanceData = {}

        attendanceData.forEach((record) => {
          const { employee_id, day, month, year, day_type_id } = record

          if (!formattedAttendance[employee_id]) {
            formattedAttendance[employee_id] = {}
          }

          // Formato de dateKey: "YYYY-MM-DD"
          const dateKey = `${year}-${month + 1}-${day}`
          formattedAttendance[employee_id][dateKey] = day_type_id
        })

        setAttendance(formattedAttendance)

        // 2. Cargar días inhábiles para el nuevo mes
        const nonWorkingDaysData = await getNonWorkingDays(officeId, currentMonth, currentYear)
        const daysArray = nonWorkingDaysData.map((item) => item.day)
        setNonWorkingDays(daysArray)

        // 3. Cargar estado de bloqueo del mes
        const isLocked = await getMonthLockStatus(officeId, currentMonth, currentYear)
        setIsMonthLocked(isLocked)

        // Actualizar el estado de lockedMonths
        const monthKey = getCurrentMonthKey()
        setLockedMonths((prev) => ({
          ...prev,
          [monthKey]: isLocked,
        }))
      } catch (error) {
        console.error("Error al cargar datos del mes desde Supabase:", error)
      }
    }

    loadMonthData()
  }, [currentMonth, currentYear, officeId])

  // Vamos a corregir la función handleAttendanceUpdate para asegurar que los datos se guarden correctamente en Supabase

  // Buscar la función handleAttendanceUpdate y reemplazarla con esta versión mejorada:
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

  // Definir los tipos de día disponibles - Esta es la misma definición que se usa en attendance-calendar.tsx
  const dayTypes = [
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
  const handleAttendanceUpdate = useCallback(
    async (newAttendance: AttendanceData) => {
      // Evitar actualizaciones si el estado es el mismo
      if (JSON.stringify(attendance) === JSON.stringify(newAttendance)) {
        return
      }

      setAttendance(newAttendance)

      // Guardar los cambios en Supabase
      try {
        // Mostrar mensaje de carga
        toast({
          title: "Guardando asistencia",
          description: "Guardando cambios en la base de datos...",
        })

        let successCount = 0
        let errorCount = 0

        // Recorrer los empleados y sus días marcados
        for (const [employeeId, employeeDays] of Object.entries(newAttendance)) {
          for (const [dateKey, attendanceInfo] of Object.entries(employeeDays)) {
            // Formato de dateKey: "YYYY-MM-DD"
            const [year, month, day] = dateKey.split("-").map(Number)

            // Extraer el tipo de día y las horas extras (si existen)
            let dayTypeId = typeof attendanceInfo === "string" ? attendanceInfo : attendanceInfo.dayTypeId
            const extraHours = typeof attendanceInfo === "object" ? attendanceInfo.extraHours : undefined

            // Validar que el tipo de día sea válido (debe existir en la lista de dayTypes)
            const validDayTypes = dayTypes.map((type) => type.id)
            if (!validDayTypes.includes(dayTypeId)) {
              console.warn(`Tipo de día inválido: ${dayTypeId}. Usando 'regular' como valor predeterminado.`)
              dayTypeId = "regular" // Usar un valor predeterminado seguro
            }

            if (dayTypeId !== "none") {
              try {
                // Verificar primero si existe un registro para esta combinación
                const { data: existingRecord } = await createClientSupabaseClient()
                  .from("attendance")
                  .select("id")
                  .eq("employee_id", employeeId)
                  .eq("day", day)
                  .eq("month", month - 1) // Ajustar el mes (en JS es 0-indexado)
                  .eq("year", year)
                  .maybeSingle()

                // Preparar los datos a guardar
                const dataToSave = {
                  day_type_id: dayTypeId, // Usar el valor validado
                  updated_at: new Date().toISOString(),
                  ...(dayTypeId === "overtime" && extraHours !== undefined ? { extra_hours: extraHours } : {}),
                }

                if (existingRecord) {
                  // Si existe, actualizar el registro
                  const { error } = await createClientSupabaseClient()
                    .from("attendance")
                    .update(dataToSave)
                    .eq("id", existingRecord.id)

                  if (error) {
                    console.error(
                      `Error al actualizar asistencia para empleado ${employeeId} en fecha ${dateKey}:`,
                      error,
                    )
                    errorCount++
                  } else {
                    successCount++
                  }
                } else {
                  // Si no existe, insertar nuevo registro
                  const { error } = await createClientSupabaseClient()
                    .from("attendance")
                    .insert({
                      employee_id: employeeId,
                      day,
                      month: month - 1, // Ajustar el mes (en JS es 0-indexado)
                      year,
                      day_type_id: dayTypeId, // Usar el valor validado
                      ...(dayTypeId === "overtime" && extraHours !== undefined ? { extra_hours: extraHours } : {}),
                    })

                  if (error) {
                    console.error(
                      `Error al insertar asistencia para empleado ${employeeId} en fecha ${dateKey}:`,
                      error,
                    )
                    errorCount++
                  } else {
                    successCount++
                  }
                }
              } catch (error) {
                console.error(`Error al guardar asistencia para empleado ${employeeId} en fecha ${dateKey}:`, error)
                errorCount++
              }
            } else {
              // Si el tipo de día es "none", eliminar el registro si existe
              try {
                await deleteAttendance(employeeId, day, month - 1, year)
                successCount++
              } catch (error) {
                console.error(`Error al eliminar asistencia para empleado ${employeeId} en fecha ${dateKey}:`, error)
                errorCount++
              }
            }
          }
        }

        if (errorCount > 0) {
          toast({
            title: "Guardado parcial",
            description: `Se guardaron ${successCount} registros, pero hubo ${errorCount} errores. Revise la consola para más detalles.`,
            variant: "warning",
          })
        } else {
          toast({
            title: "Asistencia guardada",
            description: `Se han guardado ${successCount} registros correctamente en la base de datos.`,
          })
        }
      } catch (error) {
        console.error("Error al guardar asistencia:", error)
        toast({
          title: "Error al guardar asistencia",
          description: "No se pudieron guardar los cambios en la base de datos.",
          variant: "destructive",
        })
      }
    },
    [attendance, toast, dayTypes],
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Primero leemos el archivo como ArrayBuffer para detectar la codificación
    const bufferReader = new FileReader()
    bufferReader.onload = (bufferEvent) => {
      try {
        const buffer = bufferEvent.target?.result as ArrayBuffer
        if (!buffer) return

        // Detectar la codificación
        const encoding = detectEncoding(buffer)
        console.log(`Detected encoding: ${encoding}`)

        // Ahora leemos el archivo como texto con la codificación detectada
        const textReader = new FileReader()
        textReader.onload = (textEvent) => {
          try {
            const content = textEvent.target?.result as string
            if (!content) return

            // Procesar el contenido CSV
            processCSVContent(content)
          } catch (error) {
            console.error("Error al procesar el texto del archivo:", error)
            toast({
              title: "Error al procesar el archivo",
              description: "El formato del archivo no es compatible. Intenta con otro archivo.",
              variant: "destructive",
            })
          }
        }

        textReader.onerror = () => {
          toast({
            title: "Error al leer el archivo",
            description: "No se pudo leer el contenido del archivo.",
            variant: "destructive",
          })
        }

        // Leer el archivo como texto con la codificación detectada
        textReader.readAsText(file, encoding)
      } catch (error) {
        console.error("Error al detectar la codificación:", error)
        // Si falla la detección, intentamos con UTF-8 directamente
        const fallbackReader = new FileReader()
        fallbackReader.onload = (e) => {
          const content = e.target?.result as string
          if (content) processCSVContent(content)
        }
        fallbackReader.readAsText(file, "UTF-8")
      }
    }

    bufferReader.readAsArrayBuffer(file)

    // Limpiar el input para permitir cargar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Función para cargar archivo de días inhábiles
  const handleNonWorkingDaysFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Leer el archivo como texto
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        if (!content) return

        // Procesar el contenido CSV para días inhábiles
        processNonWorkingDaysCSV(content)
      } catch (error) {
        console.error("Error al procesar el archivo de días inhábiles:", error)
        toast({
          title: "Error al procesar el archivo",
          description: "El formato del archivo no es compatible. Intenta con otro archivo.",
          variant: "destructive",
        })
      }
    }

    reader.onerror = () => {
      toast({
        title: "Error al leer el archivo",
        description: "No se pudo leer el contenido del archivo.",
        variant: "destructive",
      })
    }

    reader.readAsText(file)

    // Limpiar el input para permitir cargar el mismo archivo nuevamente
    if (nonWorkingDaysFileInputRef.current) {
      nonWorkingDaysFileInputRef.current.value = ""
    }
  }

  // Función para procesar CSV de días inhábiles
  const processNonWorkingDaysCSV = (content: string) => {
    // Eliminar BOM si existe
    const contentWithoutBOM = content.replace(/^\uFEFF/, "")

    // Dividir por saltos de línea
    const lines = contentWithoutBOM.split(/\r?\n/).filter((line) => line.trim() !== "")

    if (lines.length < 2) {
      toast({
        title: "Archivo vacío",
        description: "El archivo está vacío o no contiene datos suficientes.",
        variant: "destructive",
      })
      return
    }

    // Obtener y limpiar los encabezados
    const headers = lines[0].split(",").map((header) => normalizeText(header))

    // Verificar que el archivo tenga las columnas necesarias
    const fechaIndex = headers.findIndex((h) => h.toLowerCase() === "fecha")
    const motivoIndex = headers.findIndex((h) => h.toLowerCase() === "motivo")

    if (fechaIndex === -1 || motivoIndex === -1) {
      toast({
        title: "Formato inválido",
        description: "El formato del archivo no es válido. Debe contener las columnas 'Fecha' y 'Motivo'.",
        variant: "destructive",
      })
      return
    }

    // Procesar las fechas en formato DD/MM/YYYY
    const days = lines
      .slice(1)
      .map((line) => {
        const values = line.split(",")
        const fechaStr = values[fechaIndex].trim()
        const motivo = values[motivoIndex].trim()

        // Parsear la fecha en formato DD/MM/YYYY
        const dateParts = fechaStr.split("/")
        if (dateParts.length !== 3) return null

        const day = Number.parseInt(dateParts[0], 10)
        const month = Number.parseInt(dateParts[1], 10) - 1 // Restar 1 porque los meses en JS son 0-indexados
        const year = Number.parseInt(dateParts[2], 10)

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null

        return {
          day,
          month,
          year,
          motivo,
        }
      })
      .filter(
        (item): item is { day: number; month: number; year: number; motivo: string } =>
          item !== null && item.day > 0 && item.day <= new Date(item.year, item.month + 1, 0).getDate(), // Validar que el día sea válido para su mes y año
      )

    // Añadir los nuevos días a los existentes
    const newDaysToVerify = [...daysToVerify]

    // Crear una copia del estado actual de asistencia
    const newAttendance = { ...attendance }

    days.forEach((day) => {
      // Verificar si el día ya existe
      const exists = newDaysToVerify.some(
        (existingDay) =>
          existingDay.day === day.day && existingDay.month === day.month && existingDay.year === day.year,
      )

      if (!exists) {
        newDaysToVerify.push(day)

        // Si el día es del mes actual, limpiar cualquier marca existente
        if (day.month === currentMonth && day.year === currentYear) {
          const dateKey = `${day.year}-${day.month + 1}-${day.day}`

          // Recorrer todos los empleados y eliminar las marcas para este día
          employees.forEach((employee) => {
            if (newAttendance[employee.id] && newAttendance[employee.id][dateKey]) {
              delete newAttendance[employee.id][dateKey]
            }
          })
        }
      }
    })

    // Actualizar el estado
    setDaysToVerify(newDaysToVerify)
    setAttendance(newAttendance)
    setNonWorkingDaysDialogOpen(true)

    toast({
      title: "Archivo procesado correctamente",
      description: `Se encontraron ${days.length} días inhábiles. Se mostrarán todos los días cargados, pero solo se aplicarán al calendario los del mes actual.`,
    })
  }

  // Función separada para procesar el contenido CSV
  const processCSVContent = (content: string) => {
    // Eliminar BOM si existe
    const contentWithoutBOM = content.replace(/^\uFEFF/, "")

    // Dividir por saltos de línea (compatible con diferentes sistemas operativos)
    const lines = contentWithoutBOM.split(/\r?\n/).filter((line) => line.trim() !== "")

    if (lines.length < 2) {
      toast({
        title: "Archivo vacío",
        description: "El archivo está vacío o no contiene datos suficientes.",
        variant: "destructive",
      })
      return
    }

    // Obtener y limpiar los encabezados
    const headers = lines[0].split(",").map((header) => normalizeText(header))

    // Verificar que el archivo tenga las columnas necesarias
    const nombreIndex = headers.findIndex((h) => h.toLowerCase() === "nombre")
    const puestoIndex = headers.findIndex((h) => h.toLowerCase() === "puesto")

    if (nombreIndex === -1 || puestoIndex === -1) {
      toast({
        title: "Formato inválido",
        description: "El formato del archivo no es válido. Debe contener las columnas 'Nombre' y 'Puesto'.",
        variant: "destructive",
      })
      return
    }

    // Convertir las líneas en objetos de empleado
    const newEmployees = lines
      .slice(1)
      .map((line) => {
        // Manejar correctamente las comas dentro de campos entre comillas
        const values: string[] = []
        let currentValue = ""
        let insideQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            insideQuotes = !insideQuotes
          } else if (char === "," && !insideQuotes) {
            values.push(currentValue)
            currentValue = ""
          } else {
            currentValue += char
          }
        }

        // Añadir el último valor
        values.push(currentValue)

        // Normalizar y limpiar los valores
        const normalizedValues = values.map((value) => {
          // Eliminar comillas al principio y final si existen
          let cleaned = value.trim()
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1)
          }
          return normalizeText(cleaned)
        })

        return {
          name: normalizedValues[nombreIndex] || "",
          position: normalizedValues[puestoIndex] || "",
        }
      })
      .filter((emp) => emp.name !== "")

    if (newEmployees.length === 0) {
      toast({
        title: "Sin empleados",
        description: "No se encontraron empleados en el archivo.",
        variant: "destructive",
      })
      return
    }

    console.log("Empleados encontrados:", newEmployees)

    // Mostrar los empleados para verificación
    setEmployeesToVerify(newEmployees)
    setVerificationMode(true)

    toast({
      title: "Archivo procesado correctamente",
      description: `Se encontraron ${newEmployees.length} empleados en el archivo.`,
    })
  }

  const handleAddEmployees = async () => {
    try {
      // Mostrar mensaje de carga
      toast({
        title: "Guardando empleados",
        description: "Guardando empleados en la base de datos...",
      })

      // Preparar los datos de los empleados para guardar en Supabase
      const employeesToAdd = employeesToVerify.map((emp) => ({
        office_id: officeId,
        name: emp.name,
        position: emp.position,
        active: true, // Asegurarse de que estén activos por defecto
      }))

      // Guardar los empleados en Supabase usando la función importada
      const newEmployeesWithIds = await addMultipleEmployees(employeesToAdd)

      // Verificar que se hayan guardado correctamente
      if (!newEmployeesWithIds || newEmployeesWithIds.length === 0) {
        throw new Error("No se recibieron datos de los empleados guardados")
      }

      console.log("Empleados guardados:", newEmployeesWithIds)

      // Agregar los nuevos empleados a la lista existente
      setEmployees((prevEmployees) => [...prevEmployees, ...newEmployeesWithIds])

      // Mostrar mensaje de confirmación
      toast({
        title: "Empleados agregados",
        description: `Se han agregado ${newEmployeesWithIds.length} empleados a ${officeName}.`,
      })

      // Abrir automáticamente la lista de empleados para mostrar los nuevos
      setIsEmployeeListOpen(true)

      // Cerrar el modal de verificación
      setVerificationMode(false)

      // Limpiar la lista de empleados a verificar
      setEmployeesToVerify([])
    } catch (error) {
      console.error("Error al guardar empleados:", error)
      toast({
        title: "Error al guardar empleados",
        description:
          "No se pudieron guardar los empleados en la base de datos. Detalles: " +
          (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      })
    }
  }

  const handleAddSingleEmployee = async () => {
    try {
      const nameInput = document.getElementById("name") as HTMLInputElement
      const positionInput = document.getElementById("position") as HTMLInputElement

      if (!nameInput || !positionInput) {
        throw new Error("No se encontraron los campos del formulario")
      }

      const name = nameInput.value.trim()
      const position = positionInput.value.trim()

      if (!name) {
        toast({
          title: "Nombre requerido",
          description: "Por favor ingresa el nombre del empleado",
          variant: "destructive",
        })
        return
      }

      // Mostrar mensaje de carga
      toast({
        title: "Guardando empleado",
        description: "Guardando empleado en la base de datos...",
      })

      // Preparar todos los campos necesarios para el empleado
      const employeeData = {
        office_id: officeId,
        name,
        position: position || "Sin asignar",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Guardar el empleado en Supabase con todos los campos
      const newEmployee = await addEmployee(employeeData)

      // Verificar que se haya guardado correctamente
      if (!newEmployee) {
        throw new Error("No se recibieron datos del empleado guardado")
      }

      console.log("Empleado guardado:", newEmployee)

      // Agregar el nuevo empleado a la lista existente
      setEmployees((prevEmployees) => [...prevEmployees, newEmployee])

      // Limpiar los campos del formulario
      nameInput.value = ""
      positionInput.value = ""

      // Mostrar mensaje de confirmación
      toast({
        title: "Empleado agregado",
        description: `Se ha agregado ${newEmployee.name} a ${officeName} correctamente.`,
      })

      // Abrir automáticamente la lista de empleados para mostrar el nuevo
      setIsEmployeeListOpen(true)
    } catch (error) {
      console.error("Error al guardar empleado:", error)
      toast({
        title: "Error al guardar empleado",
        description:
          "No se pudo guardar el empleado en la base de datos. Detalles: " +
          (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      })
    }
  }

  // Modificar la función handleConfirmNonWorkingDays para actualizar también yearNonWorkingDays
  const handleConfirmNonWorkingDays = async () => {
    try {
      // Crear una copia del estado actual de días inhábiles
      const newNonWorkingDaysData = { ...nonWorkingDaysData }

      // Crear una copia del estado actual de asistencia

      const newAttendance = { ...attendance }

      let addedCount = 0
      let skippedCount = 0
      let duplicateCount = 0

      // Agrupar los días por mes y año
      for (const item of daysToVerify) {
        const monthKey = `${item.year}-${item.month}`

        if (!newNonWorkingDaysData[monthKey]) {
          newNonWorkingDaysData[monthKey] = []
        }

        // Verificar si ya existe en el estado local
        if (newNonWorkingDaysData[monthKey].includes(item.day)) {
          duplicateCount++
          continue // Saltar este día
        }

        // Añadir el día si no existe ya en el estado local
        newNonWorkingDaysData[monthKey].push(item.day)

        try {
          // Verificar primero si ya existe en la base de datos
          const { data: existingDay } = await createClientSupabaseClient()
            .from("non_working_days")
            .select("id")
            .eq("office_id", officeId)
            .eq("day", item.day)
            .eq("month", item.month)
            .eq("year", item.year)
            .maybeSingle()

          if (existingDay) {
            // Si ya existe, lo saltamos
            console.log(`Día inhábil ${item.day}/${item.month + 1}/${item.year} ya existe, omitiendo...`)
            skippedCount++
            continue
          }

          // Guardar en Supabase solo si no existe
          await addNonWorkingDay({
            office_id: officeId,
            day: item.day,
            month: item.month,
            year: item.year,
            reason: item.motivo,
          })

          addedCount++

          // Si el día es del mes actual, limpiar cualquier marca existente para todos los empleados
          if (item.month === currentMonth && item.year === currentYear) {
            const dateKey = `${item.year}-${item.month + 1}-${item.day}`

            // Recorrer todos los empleados y eliminar las marcas para este día
            for (const employee of employees) {
              if (newAttendance[employee.id] && newAttendance[employee.id][dateKey]) {
                delete newAttendance[employee.id][dateKey]

                // Eliminar el registro de asistencia en Supabase
                await deleteAttendance(employee.id, item.day, item.month, item.year)
              }
            }
          }

          // Actualizar la lista completa de días inhábiles del año si es del año actual
          if (item.year === currentYear) {
            const monthExists = yearNonWorkingDays.some((m) => m.month === item.month)

            if (monthExists) {
              setYearNonWorkingDays((prev) =>
                prev.map((m) =>
                  m.month === item.month ? { ...m, days: [...m.days, item.day].sort((a, b) => a - b) } : m,
                ),
              )
            } else {
              setYearNonWorkingDays((prev) =>
                [...prev, { month: item.month, days: [item.day] }].sort((a, b) => a.month - b.month),
              )
            }
          }
        } catch (error) {
          console.error(`Error al procesar día inhábil ${item.day}/${item.month + 1}/${item.year}:`, error)
          // Continuamos con el siguiente día en lugar de detener todo el proceso
          skippedCount++
        }
      }

      // Actualizar el estado global de días inhábiles
      setNonWorkingDaysData(newNonWorkingDaysData)

      // Actualizar el estado de asistencia
      setAttendance(newAttendance)

      // Actualizar los días inhábiles para el mes actual
      const currentMonthKey = getCurrentMonthKey()
      if (newNonWorkingDaysData[currentMonthKey]) {
        setNonWorkingDays(newNonWorkingDaysData[currentMonthKey])
      }

      setNonWorkingDaysDialogOpen(false)

      let message = `Se han configurado ${addedCount} días inhábiles nuevos`
      if (skippedCount > 0) message += `, ${skippedCount} omitidos por ya existir`
      if (duplicateCount > 0) message += `, ${duplicateCount} duplicados en el archivo`
      message += `.`

      toast({
        title: "Días inhábiles actualizados",
        description: message,
      })
    } catch (error) {
      console.error("Error al guardar días inhábiles en Supabase:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar todos los días inhábiles en la base de datos.",
        variant: "destructive",
      })
    }
  }

  // Reemplazar el onClick del botón "Agregar Día Inhábil" en la pestaña "add"
  const addNonWorkingDayManually = async () => {
    const dayInput = document.getElementById("non-working-day") as HTMLInputElement
    const reasonInput = document.getElementById("reason") as HTMLInputElement

    if (!dayInput || !reasonInput) return

    const day = Number.parseInt(dayInput.value)
    const reason = reasonInput.value.trim()

    // Validar el día
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    if (isNaN(day) || day < 1 || day > daysInMonth) {
      toast({
        title: "Día inválido",
        description: `Por favor ingresa un día válido entre 1 y ${daysInMonth}.`,
        variant: "destructive",
      })
      return
    }

    // Verificar si ya existe en el estado local
    if (nonWorkingDays.includes(day)) {
      toast({
        title: "Día ya registrado",
        description: `El día ${day} de ${months[currentMonth]} ya está registrado como inhábil.`,
        variant: "warning",
      })
      // Limpiar los campos
      dayInput.value = ""
      reasonInput.value = ""
      return
    }

    try {
      // Verificar si ya existe en la base de datos
      const { data: existingDay } = await createClientSupabaseClient()
        .from("non_working_days")
        .select("id")
        .eq("office_id", officeId)
        .eq("day", day)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle()

      if (existingDay) {
        toast({
          title: "Día ya registrado",
          description: `El día ${day} de ${months[currentMonth]} ya está registrado como inhábil en la base de datos.`,
          variant: "warning",
        })
        // Limpiar los campos
        dayInput.value = ""
        reasonInput.value = ""
        return
      }

      // Guardar en Supabase solo si no existe
      await addNonWorkingDay({
        office_id: officeId,
        day,
        month: currentMonth,
        year: currentYear,
        reason,
      })

      // Actualizar el estado local
      setNonWorkingDays([...nonWorkingDays, day])

      // Actualizar la lista completa de días inhábiles del año
      const monthExists = yearNonWorkingDays.some((m) => m.month === currentMonth)

      if (monthExists) {
        setYearNonWorkingDays((prev) =>
          prev.map((m) => (m.month === currentMonth ? { ...m, days: [...m.days, day].sort((a, b) => a - b) } : m)),
        )
      } else {
        setYearNonWorkingDays((prev) =>
          [...prev, { month: currentMonth, days: [day] }].sort((a, b) => a.month - b.month),
        )
      }

      // Limpiar los campos
      dayInput.value = ""
      reasonInput.value = ""

      toast({
        title: "Día inhábil agregado",
        description: `Se ha agregado el día ${day} de ${months[currentMonth]} de ${currentYear} como inhábil.`,
      })
    } catch (error) {
      console.error("Error al agregar día inhábil:", error)
      toast({
        title: "Error al agregar",
        description: "No se pudo agregar el día inhábil.",
        variant: "destructive",
      })
    }
  }

  const toggleEmployeeList = () => {
    setIsEmployeeListOpen(!isEmployeeListOpen)

    // Mostrar un mensaje de toast para confirmar la acción
    toast({
      title: isEmployeeListOpen ? "Lista de empleados ocultada" : "Lista de empleados mostrada",
      description: isEmployeeListOpen
        ? "Has ocultado la lista de empleados."
        : `Mostrando ${employees.length} empleados de ${officeName}.`,
      duration: 2000,
    })
  }

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeDetailsOpen, setEmployeeDetailsOpen] = useState(false)
  const [correctionsModalOpen, setCorrectionsModalOpen] = useState(false)
  const [selectedCorrectionEmployee, setSelectedCorrectionEmployee] = useState<string>("")

  const handleDownloadTemplate = () => {
    // Crear contenido CSV con encabezados y ejemplos con acentos
    const headers = ["Nombre", "Puesto"]
    const csvContent = [
      headers.join(","), // Encabezados
      "Juan Pérez,Gerente", // Ejemplo de datos con acentos
      "María González,Asistente",
      "José Rodríguez,Técnico",
      "Ramón Jiménez,Analista",
      "Sofía Núñez,Coordinadora",
    ].join("\n")

    // Crear un blob con el contenido CSV y especificar UTF-8 con BOM
    const BOM = new Uint8Array([0xef, 0xbb, 0xbf])
    const blob = new Blob([BOM, csvContent], {
      type: "text/csv;charset=utf-8;",
    })

    // Crear URL para el blob
    const url = URL.createObjectURL(blob)

    // Crear elemento de enlace para la descarga
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `plantilla_empleados_${officeName}.csv`)

    // Simular clic en el enlace para iniciar la descarga
    document.body.appendChild(link)
    link.click()

    // Limpiar
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Plantilla descargada",
      description: "La plantilla CSV ha sido descargada. Ábrela con Excel o un editor de texto.",
    })
  }

  // Función para descargar la plantilla de días inhábiles
  const handleDownloadNonWorkingDaysTemplate = () => {
    // Obtener los días del mes actual
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Crear contenido CSV con encabezados y ejemplos
    const headers = ["Fecha", "Motivo"]
    const csvRows = [headers.join(",")]

    // Agregar algunos ejemplos de días festivos para el mes actual
    csvRows.push(`01/${String(currentMonth + 1).padStart(2, "0")}/${currentYear},Día festivo`)
    csvRows.push(`15/${String(currentMonth + 1).padStart(2, "0")}/${currentYear},Día festivo local`)
    csvRows.push(`${daysInMonth}/${String(currentMonth + 1).padStart(2, "0")}/${currentYear},Cierre de mes`)

    const csvContent = csvRows.join("\n")

    // Crear un blob con el contenido CSV y especificar UTF-8 con BOM
    const BOM = new Uint8Array([0xef, 0xbb, 0xbf])
    const blob = new Blob([BOM, csvContent], {
      type: "text/csv;charset=utf-8;",
    })

    // Crear URL para el blob
    const url = URL.createObjectURL(blob)

    // Crear elemento de enlace para la descarga
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `plantilla_dias_inhabiles_${months[currentMonth]}_${currentYear}.csv`)

    // Simular clic en el enlace para la descarga
    document.body.appendChild(link)
    link.click()

    // Limpiar
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Plantilla de días inhábiles descargada",
      description: `La plantilla para ${months[currentMonth]} ${currentYear} ha sido descargada.`,
    })
  }

  // Función para descargar las correcciones en formato PDF
  const handleDownloadCorrections = () => {
    // Mostrar mensaje de generación
    toast({
      title: "Generando PDF",
      description: "Preparando el documento PDF con las correcciones...",
    })

    // Simulamos un pequeño retraso para la generación
    setTimeout(() => {
      try {
        // Crear contenido HTML para el PDF
        let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Correcciones ${officeName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
          h1 { font-size: 18px; margin-bottom: 10px; text-align: center; }
          .header { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .header-info { display: flex; justify-content: space-between; max-width: 400px; margin: 0 auto; }
          .header-item { margin: 5px 0; }
          .employee { margin-bottom: 30px; }
          .employee-name { font-weight: bold; margin-bottom: 5px; }
          .employee-content { display: flex; justify-content: space-between; gap: 20px; }
          .corrections { white-space: pre-wrap; margin-bottom: 15px; flex: 1; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #ccc; padding-top: 5px; margin-top: 20px; }
          .divider { border-bottom: 1px dashed #ccc; margin: 20px 0; }
          .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CORRECCIONES MES ANTERIOR - ${officeName}</h1>
          <div class="header-info">
            <div class="header-item"><strong>País:</strong> México</div>
            <div class="header-item"><strong>Mes:</strong> ${months[currentMonth === 0 ? 11 : currentMonth - 1]} ${currentMonth === 0 ? currentYear - 1 : currentYear}</div>
            <div class="header-item"><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      `

        // Modificar la sección donde se añaden las correcciones de cada empleado:
        Object.entries(employeeCorrections).forEach(([employeeId, correction]) => {
          const employee = employees.find((emp) => emp.id === employeeId)
          if (employee && correction.trim()) {
            htmlContent += `
          <div class="employee">
            <div class="employee-name">EMPLEADO: ${employee.name} (${employee.position})</div>
            <div class="employee-name">CORRECCIONES:</div>
            <div class="employee-content">
              <div class="corrections">${correction}</div>
              <div class="signature">
                <div class="signature-line">Firma del empleado</div>
              </div>
            </div>
          </div>
          <div class="divider"></div>
        `
          }
        })

        // Añadir espacio para firma del manager al final
        htmlContent += `
        <div class="footer">
          <div class="text-center">
            <p>Firma del Manager: _______________________________</p>
            <p>Nombre: _______________________ Fecha: _____________</p>
          </div>
        </div>
      </body>
      </html>
    `

        // Convertir el HTML a un Blob
        const blob = new Blob([htmlContent], { type: "text/html" })
        const url = URL.createObjectURL(blob)

        // Crear elemento de enlace para la descarga
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `correcciones_${officeName}_${months[currentMonth]}_${currentYear}.html`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
          title: "Documento descargado",
          description:
            "El archivo HTML con las correcciones ha sido descargado. Ábrelo con tu navegador y usa la función de impresión para convertirlo a PDF.",
        })
      } catch (error) {
        console.error("Error al generar el documento:", error)
        toast({
          title: "Error al generar el documento",
          description: "No se pudo generar el archivo. Intente nuevamente.",
          variant: "destructive",
        })
      }
    }, 1000)
  }

  // Función para exportar el calendario a PDF
  const handleExportCalendar = () => {
    // Mostrar mensaje de generación
    toast({
      title: "Generando PDF",
      description: "Preparando el documento PDF con el calendario...",
    })

    // Simulamos un pequeño retraso para la generación
    setTimeout(() => {
      try {
        // Recuperar las notas de los empleados del localStorage
        const employeeNotesKey = `timecard-notes-${officeId}-${currentMonth}-${currentYear}`
        let employeeNotes = {}
        try {
          const savedNotes = localStorage.getItem(employeeNotesKey)
          if (savedNotes) {
            employeeNotes = JSON.parse(savedNotes)
          }
        } catch (error) {
          console.error("Error al cargar notas de empleados:", error)
        }

        // Asegurarse de cargar las notas más recientes de localStorage
        try {
          const notesStorageKey = `timecard-notes-${officeId}-${currentMonth}-${currentYear}`
          const savedNotes = localStorage.getItem(notesStorageKey)
          if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes)
            // Combinar con las notas existentes, dando prioridad a las nuevas
            employeeNotes = { ...employeeNotes, ...parsedNotes }
            console.log("Notas cargadas para exportación:", employeeNotes)
          }
        } catch (error) {
          console.error("Error al cargar notas para exportación:", error)
        }

        // Crear contenido HTML para el PDF
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Calendario de Asistencia - ${officeName}</title>
  <style>
    @page { size: landscape; }
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
    h1 { font-size: 18px; margin-bottom: 10px; text-align: center; }
    .header { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
    .header-info { display: flex; justify-content: space-between; max-width: 600px; margin: 0 auto; }
    .header-item { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
    th { background-color: #f0f0f0; }
    .employee-name { text-align: left; font-weight: bold; }
    .weekend { background-color: #f5f5f5; }
    .non-working { background-color: #e6f0ff; }
    .sunday { background-color: #ffe6e6; }
    .marked { font-weight: bold; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; }
    .legend { margin-top: 20px; }
    .legend-items { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .color-box { width: 15px; height: 15px; border: 1px solid #ccc; }
    .comments-column { width: 200px; text-align: left; vertical-align: top; }
    .comments-content { 
      font-size: 11px; 
      white-space: pre-wrap; 
      padding: 8px; 
      border-left: 3px solid #3b82f6; 
      background-color: #f8fafc; 
      border-radius: 4px;
    }
    .has-comments { min-height: 80px; }
    .signature-column { width: 150px; vertical-align: bottom; }
    .signature-line { border-top: 1px solid #000; margin-top: 50px; }
    
    /* Estilos para los tipos de día - TODA LA CELDA */
    .day-regular { background-color: #22c55e; color: white; font-weight: normal; }
    .day-admin { background-color: #3b82f6; color: white; font-weight: normal; }
    .day-vacation { background-color: #eab308; color: white; font-weight: normal; }
    .day-maternity { background-color: #ec4899; color: white; font-weight: normal; }
    .day-marriage { background-color: #a855f7; color: white; font-weight: normal; }
    .day-medical { background-color: #ef4444; color: white; font-weight: normal; }
    .day-unpaid { background-color: #6b7280; color: white; font-weight: normal; }
    .day-other { background-color: #f97316; color: white; font-weight: normal; }
    .day-overtime { background-color: #8b5cf6; color: white; font-weight: normal; }
    
    /* Estilo para horas extras */
    .extra-hours { font-size: 9px; display: block; margin-top: 2px; }
    .employee-signature-name { font-size: 9px; font-weight: normal; color: #666; text-align: center; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CALENDARIO DE ASISTENCIA - ${officeName}</h1>
    <div class="header-info">
      <div class="header-item"><strong>País:</strong> México</div>
      <div class="header-item"><strong>Mes:</strong> ${months[currentMonth]} ${currentYear}</div>
      <div class="header-item"><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Empleado</th>
`

        // Añadir encabezados para cada día
        // Declare daysInMonth here
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, currentMonth, day)
          const isSunday = date.getDay() === 0
          const isNonWorking = nonWorkingDays.includes(day)

          let className = ""
          if (isSunday) className = "sunday"
          else if (isNonWorking) className = "non-working"
          else if (date.getDay() === 6) className = "weekend" // Sábado

          htmlContent += `<th class="${className}">${day}</th>`
        }

        // Añadir encabezado para la columna de comentarios y firma
        htmlContent += `<th class="comments-column">Comentarios</th><th class="signature-column">Firma</th></tr></thead><tbody>`

        // Añadir filas para cada empleado
        employees.forEach((employee) => {
          htmlContent += `<tr><td class="employee-name">${employee.name}</td>`

          // Añadir celdas para cada día
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day)
            const isSunday = date.getDay() === 0
            const isNonWorking = nonWorkingDays.includes(day)

            let className = ""
            if (isSunday) className = "sunday"
            else if (isNonWorking) className = "non-working"
            else if (date.getDay() === 6) className = "weekend" // Sábado

            const dateKey = `${currentYear}-${currentMonth + 1}-${day}`
            const attendanceInfo = attendance[employee.id]?.[dateKey] || { dayTypeId: "none" }
            const dayTypeId = typeof attendanceInfo === "string" ? attendanceInfo : attendanceInfo.dayTypeId
            const extraHours = typeof attendanceInfo === "object" ? attendanceInfo.extraHours : undefined

            let content = ""
            let dayClass = ""

            if (isSunday || isNonWorking) {
              content = "X"
            } else if (dayTypeId !== "none") {
              const dayType = dayTypes.find((t) => t.id === dayTypeId)
              content = dayType ? dayType.abbreviation : ""
              dayClass = `day-${dayTypeId}`
              className += " marked"

              // Agregar horas extras si es necesario
              if (dayTypeId === "overtime" && extraHours !== undefined) {
                content = `${dayType.abbreviation}<span class="extra-hours">${extraHours}h</span>`
              }
            }

            // Aplicar la clase directamente a la celda TD para colorear toda la celda
            htmlContent += `<td class="${className} ${dayClass}">${content}</td>`
          }

          // Añadir celda de comentarios al final de la fila
          const noteKey = `${employee.id}-${currentMonth}-${currentYear}`
          const fullNoteKey = `${employee.id}-${currentMonth}-${currentYear}-${officeId}`
          const hasNote =
            (employeeNotes[noteKey] && employeeNotes[noteKey].note) ||
            (employeeNotes[fullNoteKey] && employeeNotes[fullNoteKey].note)
          const noteText = employeeNotes[fullNoteKey]?.note || employeeNotes[noteKey]?.note || ""

          if (hasNote) {
            htmlContent += `<td class="comments-column has-comments">
              <div class="comments-content" data-employee-id="${employee.id}" data-export="true">${noteText.replace(/\n/g, "<br>")}</div>
            </td>`
          } else {
            htmlContent += `<td class="comments-column"></td>`
          }

          // Añadir celda para la firma del empleado
          htmlContent += `<td class="signature-column">
  <div class="signature-line"></div>
  <div class="employee-signature-name">${employee.name}</div>
</td>`

          htmlContent += `</tr>`
        })

        // Cerrar la tabla
        htmlContent += `</tbody></table>`

        // Añadir leyenda y pie de página
        htmlContent += `<div class="legend"><h3>Leyenda:</h3><div class="legend-items">`

        // Añadir leyenda para cada tipo de día
        dayTypes
          .filter((type) => type.id !== "none")
          .forEach((type) => {
            htmlContent += `
        <div class="legend-item">
          <div class="color-box day-${type.id}"></div>
          <span>${type.name} (${type.abbreviation})</span>
        </div>
    `
          })

        htmlContent += `
      </div>
    </div>
    
    <div class="footer">
      <p>Firma del Manager: _______________________________</p>
      <p>Nombre: _______________________ Fecha: _____________</p>
    </div>
  </body>
</html>
`

        // Convertir el HTML a un Blob
        const blob = new Blob([htmlContent], { type: "text/html" })
        const url = URL.createObjectURL(blob)

        // Crear elemento de enlace para la descarga
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `calendario_${officeName}_${months[currentMonth]}_${currentYear}.html`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
          title: "Documento descargado",
          description:
            "El archivo HTML con el calendario ha sido descargado. Ábrelo con tu navegador y usa la función de impresión (Ctrl+P) seleccionando 'Guardar como PDF'.",
        })

        // Cerrar el modal
        setExportModalOpen(false)
      } catch (error) {
        console.error("Error al generar el documento:", error)
        toast({
          title: "Error al generar el documento",
          description: "No se pudo generar el archivo. Intente nuevamente.",
          variant: "destructive",
        })
      }
    }, 1000)
  }

  // Función para alternar el estado de bloqueo del mes de bloqueo del mes
  const toggleMonthLock = async () => {
    const newIsMonthLocked = !isMonthLocked
    setIsMonthLocked(newIsMonthLocked)

    try {
      // Guardar el estado de bloqueo en Supabase
      await setMonthLockStatus(officeId, currentMonth, currentYear, newIsMonthLocked, "Usuario actual")

      // Actualizar el estado de bloqueo para el mes actual
      const monthKey = getCurrentMonthKey()
      const newLockedMonths = { ...lockedMonths }

      if (newIsMonthLocked) {
        newLockedMonths[monthKey] = true
      } else {
        delete newLockedMonths[monthKey]
      }

      setLockedMonths(newLockedMonths)

      toast({
        title: newIsMonthLocked ? "Mes bloqueado" : "Mes desbloqueado",
        description: newIsMonthLocked
          ? `El mes de ${months[currentMonth]} ${currentYear} ha sido bloqueado para prevenir cambios accidentales.`
          : `El mes de ${months[currentMonth]} ${currentYear} ha sido desbloqueado para edición.`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error al cambiar el estado de bloqueo en Supabase:", error)
      toast({
        title: "Error al cambiar el estado de bloqueo",
        description: "No se pudo actualizar el estado de bloqueo en la base de datos.",
        variant: "destructive",
      })

      // Revertir el cambio en la interfaz
      setIsMonthLocked(!newIsMonthLocked)
    }
  }

  // Función para manejar el cambio de mes
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

  // Función para manejar el cambio en el número de filas visibles
  const handleVisibleRowsChange = (value: string) => {
    setVisibleRows(value)
    toast({
      title: "Visualización actualizada",
      description: value === "auto" ? "Mostrando todas las filas" : `Mostrando ${value} filas a la vez`,
    })
  }

  // Función para verificar si todo el calendario está marcado
  const isCalendarFullyMarked = () => {
    // Si no hay empleados, retornar falso
    if (employees.length === 0) return false

    // Obtener los días del mes actual
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Verificar cada empleado y cada día
    for (const employee of employees) {
      for (let day = 1; day <= daysInMonth; day++) {
        // Verificar si el día es domingo o inhábil
        const isSunday = new Date(currentYear, currentMonth, day).getDay() === 0
        const isNonWorking = nonWorkingDays.includes(day)

        // Si no es domingo ni día inhábil, verificar si está marcado
        if (!isSunday && !isNonWorking) {
          const dateKey = `${currentYear}-${currentMonth + 1}-${day}`
          const dayType = attendance[employee.id]?.[dateKey] || "none"

          // Si el día no está marcado, retornar falso
          if (dayType === "none") {
            return false
          }
        }
      }
    }

    // Si todos los días están marcados para todos los empleados, retornar verdadero
    return true
  }

  // Calcular la altura máxima del contenedor basada en la selección del usuario
  const getMaxHeight = () => {
    if (visibleRows === "auto") return "auto"

    // Altura aproximada de cada fila (incluyendo encabezados)
    const rowHeight = 40 // px
    const headerHeight = 40 // px
    const padding = 16 // px

    return `${Number.parseInt(visibleRows) * rowHeight + headerHeight + padding}px`
  }

  // Función para eliminar un empleado
  const handleDeleteEmployee = (employeeId: string) => {
    // Filtrar el empleado de la lista
    setEmployees((prevEmployees) => prevEmployees.filter((emp) => emp.id !== employeeId))

    // No eliminamos los datos históricos del empleado, solo lo quitamos de la lista activa
    toast({
      title: "Empleado eliminado",
      description: "El empleado ha sido eliminado para operaciones futuras. Los datos históricos se mantienen.",
    })
  }

  // Cargar todos los días inhábiles del año actual
  const [allNonWorkingDays, setAllNonWorkingDays] = useState<
    Array<{
      id: string
      day: number
      month: number
      year: number
      reason?: string
    }>
  >([])

  // Buscar en la base de datos todos los días inhábiles
  useEffect(() => {
    const fetchAllNonWorkingDays = async () => {
      try {
        const { data, error } = await createClientSupabaseClient()
          .from("non_working_days")
          .select("id, day, month, year, reason")
          .eq("office_id", officeId)
          .order("year")
          .order("month")
          .order("day")

        if (error) {
          console.error("Error al cargar días inhábiles:", error)
          return
        }

        setAllNonWorkingDays(data || [])

        // También actualizar yearNonWorkingDays para mantener compatibilidad
        const currentYearData = data?.filter((item) => item.year === currentYear) || []

        // Agrupar por mes
        const groupedByMonth: { [month: number]: number[] } = {}
        currentYearData.forEach((item) => {
          if (!groupedByMonth[item.month]) {
            groupedByMonth[item.month] = []
          }
          groupedByMonth[item.month].push(item.day)
        })

        // Convertir a array para renderizar
        const monthsArray = Object.entries(groupedByMonth).map(([month, days]) => ({
          month: Number.parseInt(month),
          days,
        }))

        setYearNonWorkingDays(monthsArray)
      } catch (error) {
        console.error("Error al cargar días inhábiles:", error)
      }
    }

    fetchAllNonWorkingDays()
  }, [officeId, currentYear])

  return (
    <div className="space-y-6">
      {isRH && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800">
              <strong>Usuario Recursos Humanos:</strong> Conectado como {roleLabel}. 
              Puedes visualizar, consultar y descargar datos, pero no crear, modificar o eliminar información.
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dashboard de {officeName}</h2>
            <p className="text-sm text-muted-foreground">País: México</p>
            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <User className="h-4 w-4" />
                <span>{user.full_name}</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportModalOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Días Inhábiles
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Gestión de Días Inhábiles</DialogTitle>
                  <DialogDescription>
                    Visualiza, agrega o elimina días inhábiles para {months[currentMonth]} {currentYear}.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="view" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="view">
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </TabsTrigger>
                    <TabsTrigger value="add">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                      <FileUp className="mr-2 h-4 w-4" />
                      Cargar CSV
                    </TabsTrigger>
                  </TabsList>

                  {/* Pestaña para visualizar días inhábiles */}
                  <TabsContent value="view" className="space-y-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>Días inhábiles</span>
                          <select
                            className="text-sm bg-transparent border rounded px-2 py-0.5"
                            value={selectedNonWorkingYear}
                            onChange={(e) => setSelectedNonWorkingYear(Number(e.target.value))}
                          >
                            {Array.from(
                              new Set(
                                [
                                  currentYear - 1,
                                  currentYear,
                                  currentYear + 1,
                                  ...allNonWorkingDays.map((day) => day.year),
                                ].sort(),
                              ),
                            ).map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          Todos los meses
                        </span>
                      </h3>
                      <div className="max-h-[400px] overflow-y-auto pr-2">
                        {(() => {
                          // Si no hay días inhábiles cargados
                          if (allNonWorkingDays.length === 0 && daysToVerify.length === 0) {
                            return (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No hay días inhábiles configurados.
                              </p>
                            )
                          }

                          // Filtrar por el año seleccionado en el selector
                          const filteredNonWorkingDays = allNonWorkingDays.filter(
                            (day) => day.year === selectedNonWorkingYear,
                          )

                          // Y modificar la lógica de agrupación para usar los días filtrados
                          const groupedDays: Record<
                            string,
                            Array<{
                              id?: string
                              day: number
                              month: number
                              year: number
                              reason?: string
                              motivo?: string
                              pending?: boolean
                            }>
                          > = {}

                          // Agrupar días confirmados (solo del año seleccionado)
                          filteredNonWorkingDays.forEach((day) => {
                            const key = `${day.year}-${day.month}`
                            if (!groupedDays[key]) {
                              groupedDays[key] = []
                            }
                            groupedDays[key].push({
                              ...day,
                              reason: day.reason || undefined,
                            })
                          })

                          // Agrupar días pendientes (solo del año seleccionado)
                          daysToVerify
                            .filter((day) => day.year === selectedNonWorkingYear)
                            .forEach((day) => {
                              const key = `${day.year}-${day.month}`
                              if (!groupedDays[key]) {
                                groupedDays[key] = []
                              }
                              // Verificar si ya existe este día en los confirmados
                              const exists = groupedDays[key].some(
                                (existingDay) =>
                                  existingDay.day === day.day &&
                                  existingDay.month === day.month &&
                                  existingDay.year === day.year,
                              )

                              if (!exists) {
                                groupedDays[key].push({
                                  ...day,
                                  reason: day.motivo,
                                  pending: true,
                                })
                              }
                            })

                          // Ordenar las claves por año y mes
                          const sortedKeys = Object.keys(groupedDays).sort((a, b) => {
                            const [yearA, monthA] = a.split("-").map(Number)
                            const [yearB, monthB] = b.split("-").map(Number)

                            if (yearA !== yearB) {
                              return yearA - yearB
                            }
                            return monthA - monthB
                          })

                          return (
                            <div className="space-y-4">
                              {sortedKeys.map((key) => {
                                const [year, month] = key.split("-").map(Number)
                                const daysInMonth = groupedDays[key].sort((a, b) => a.day - b.day)

                                return (
                                  <div key={key} className="mb-4 last:mb-0">
                                    <h4 className="text-sm font-medium mb-2 border-b pb-1 flex items-center justify-between">
                                      <span>
                                        {months[month]} {year}
                                      </span>
                                      <div className="flex gap-1">
                                        {month === currentMonth && year === currentYear && (
                                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                                            Mes actual
                                          </span>
                                        )}
                                        {year !== currentYear && (
                                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
                                            {year}
                                          </span>
                                        )}
                                      </div>
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {daysInMonth.map((item) => (
                                        <div
                                          key={item.id || `pending-${item.day}-${item.month}-${item.year}`}
                                          className={`px-3 py-2 rounded-md ${
                                            item.pending
                                              ? "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                                              : month === currentMonth && year === currentYear
                                                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                          } flex flex-col`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              {String(item.day).padStart(2, "0")}/
                                              {String(item.month + 1).padStart(2, "0")}/{item.year}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 p-0"
                                              onClick={async () => {
                                                try {
                                                  if (item.pending) {
                                                    // Eliminar de daysToVerify
                                                    setDaysToVerify(
                                                      daysToVerify.filter(
                                                        (d) =>
                                                          !(
                                                            d.day === item.day &&
                                                            d.month === item.month &&
                                                            d.year === item.year
                                                          ),
                                                      ),
                                                    )
                                                  } else if (item.id) {
                                                    // Eliminar de la base de datos
                                                    await createClientSupabaseClient()
                                                      .from("non_working_days")
                                                      .delete()
                                                      .eq("id", item.id)

                                                    // Actualizar la lista local
                                                    setAllNonWorkingDays((prev) => prev.filter((d) => d.id !== item.id))

                                                    // Actualizar también yearNonWorkingDays si es del año actual
                                                    if (item.year === currentYear) {
                                                      setYearNonWorkingDays((prev) =>
                                                        prev
                                                          .map((m) =>
                                                            m.month === item.month
                                                              ? { ...m, days: m.days.filter((d) => d !== item.day) }
                                                              : m,
                                                          )
                                                          .filter((m) => m.days.length > 0),
                                                      )
                                                    }

                                                    // Actualizar nonWorkingDays si es del mes actual
                                                    if (item.month === currentMonth && item.year === currentYear) {
                                                      setNonWorkingDays(nonWorkingDays.filter((d) => d !== item.day))
                                                    }
                                                  }

                                                  toast({
                                                    title: "Día inhábil eliminado",
                                                    description: `Se ha eliminado el día ${item.day} de ${months[item.month]} de ${item.year}.`,
                                                  })
                                                } catch (error) {
                                                  console.error("Error al eliminar día inhábil:", error)
                                                  toast({
                                                    title: "Error al eliminar",
                                                    description: "No se pudo eliminar el día inhábil.",
                                                    variant: "destructive",
                                                  })
                                                }
                                              }}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          {(item.reason || item.motivo) && (
                                            <span className="text-xs mt-1 opacity-80">
                                              {item.reason || item.motivo}
                                            </span>
                                          )}
                                          {item.pending && (
                                            <span className="text-xs mt-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1 py-0.5 rounded text-center">
                                              Pendiente
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}

                              {daysToVerify.length > 0 && (
                                <Button onClick={handleConfirmNonWorkingDays} className="w-full mt-4" variant="outline">
                                  <Check className="mr-2 h-4 w-4" />
                                  Confirmar todos los días pendientes ({daysToVerify.length})
                                </Button>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Pestaña para agregar manualmente un día inhábil */}
                  <TabsContent value="add" className="space-y-4 py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="non-working-day">Día</Label>
                        <div className="flex gap-2">
                          <Input
                            id="non-working-day"
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Día"
                            className="w-24"
                          />
                          <Input value={months[currentMonth]} disabled className="flex-1 bg-muted" />
                          <Input value={currentYear} disabled className="w-24 bg-muted" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Motivo</Label>
                        <Input id="reason" placeholder="Motivo del día inhábil" />
                      </div>
                      <Button className="w-full" onClick={addNonWorkingDayManually}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Día Inhábil
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Pestaña para cargar CSV (mantener funcionalidad existente) */}
                  <TabsContent value="upload" className="space-y-4 py-4">
                    <div className="space-y-4">
                      <div className="space-y-2 text-center p-4 border-2 border-dashed rounded-md">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Arrastra y suelta el archivo CSV con la lista de días inhábiles
                        </p>
                        <p className="text-xs text-muted-foreground">
                          El archivo debe contener las columnas: Fecha (DD/MM/YYYY), Motivo
                        </p>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => nonWorkingDaysFileInputRef.current?.click()}
                        >
                          <FileUp className="mr-2 h-4 w-4" />
                          Seleccionar Archivo
                        </Button>
                      </div>
                      <Button variant="outline" onClick={handleDownloadNonWorkingDaysTemplate} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Plantilla
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Mantener la referencia al input de archivo oculto
                      if (nonWorkingDaysFileInputRef.current) {
                        nonWorkingDaysFileInputRef.current.value = ""
                      }
                    }}
                  >
                    Cerrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <input
              type="file"
              ref={nonWorkingDaysFileInputRef}
              onChange={handleNonWorkingDaysFileUpload}
              accept=".csv"
              className="hidden"
              id="non-working-days-file-upload"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  Detalles
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Detalles de Empleados</DialogTitle>
                  <DialogDescription>Selecciona un empleado para ver su información detallada.</DialogDescription>
                </DialogHeader>
                <div className="py-4 px-2">
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employee-select">Seleccionar Empleado</Label>
                      <select
                        id="employee-select"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        onChange={(e) => {
                          const employeeId = e.target.value
                          const employee = employees.find((emp) => emp.id === employeeId)
                          if (employee) {
                            setSelectedEmployee(employee)
                          }
                        }}
                      >
                        <option value="">Selecciona un empleado</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} - {employee.position}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedEmployee(null)}
                        disabled={!selectedEmployee}
                      >
                        Limpiar selección
                      </Button>
                    </div>
                  </div>

                  {selectedEmployee ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted p-3 rounded-md">
                          <span className="font-medium block mb-1">Nombre:</span>
                          <span className="text-lg">{selectedEmployee.name}</span>
                        </div>
                        <div className="bg-muted p-3 rounded-md">
                          <span className="font-medium block mb-1">Puesto:</span>
                          <span className="text-lg">{selectedEmployee.position}</span>
                        </div>
                      </div>

                      <div className="border rounded-md p-3 mt-4">
                        <h4 className="text-sm font-medium mb-2">Resumen de Asistencia</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dayTypes.slice(0, -1).map((type) => {
                            // Filtrar los días que son domingos
                            const count = Object.entries(attendance[selectedEmployee.id] || {}).filter(
                              ([dateKey, dayTypeId]) => {
                                // Verificar si el día es domingo
                                const [year, month, day] = dateKey.split("-").map(Number)
                                const date = new Date(year, month - 1, day)
                                const isSunday = date.getDay() === 0 // 0 es domingo

                                // Solo contar si no es domingo y coincide con el tipo de día
                                return !isSunday && dayTypeId === type.id
                              },
                            ).length

                            if (count === 0) return null
                            return (
                              <div key={type.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${type.color}`}></span>
                                  <span>{type.name}:</span>
                                </div>
                                <span className="font-medium">
                                  {
                                    Object.entries(attendance[selectedEmployee.id] || {}).filter(([dateKey, id]) => {
                                      // Verificar si el día es domingo
                                      const [year, month, day] = dateKey.split("-").map(Number)
                                      const date = new Date(year, month - 1, day)
                                      const isSunday = date.getDay() === 0 // 0 es domingo

                                      // Solo contar si no es domingo y tiene un tipo de día asignado
                                      return !isSunday && id !== "none"
                                    }).length
                                  }
                                  días
                                </span>
                              </div>
                            )
                          })}
                          <div className="text-xs text-muted-foreground mt-2">
                            Nota: Los domingos están bloqueados y no se incluyen en los conteos.
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-3">
                        <h4 className="text-sm font-medium mb-2">Notas / Comentarios</h4>
                        <textarea
                          className="w-full min-h-[80px] p-2 border rounded-md"
                          placeholder="Agregar notas o comentarios sobre este empleado..."
                        />
                        <Button size="sm" className="w-full mt-2">
                          Guardar notas
                        </Button>
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={() => {
                            if (!selectedEmployee) return

                            // Crear contenido HTML para el empleado seleccionado
                            const htmlContent = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <meta charset="UTF-8">
                              <title>Información de Empleado - ${selectedEmployee.name}</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
                                h1 { font-size: 24px; margin-bottom: 20px; }
                                .header { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                                .info-section { margin-bottom: 20px; }
                                .info-item { display: flex; margin-bottom: 10px; }
                                .info-label { font-weight: bold; width: 150px; }
                                .info-value { flex: 1; }
                                .attendance-section { margin-top: 30px; }
                                .attendance-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                .attendance-table th, .attendance-table td { border: 1px solid #ccc; padding: 8px; text-align: center; }
                                .attendance-table th { background-color: #f0f0f0; }
                                .summary-section {
                                  margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
                                .summary-item { display: flex; margin-bottom: 10px; }
                                .summary-label { font-weight: bold; width: 200px; }
                                .summary-value { flex: 1; }
                                .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; font-size: 12px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>Información de Empleado</h1>
                                <div class="info-item">
                                  <div class="info-label">Oficina:</div>
                                  <div class="info-value">${officeName}</div>
                                </div>
                                <div class="info-item">
                                  <div class="info-label">Fecha de generación:</div>
                                  <div class="info-value">${new Date().toLocaleDateString()}</div>
                                </div>
                              </div>
                              
                              <div class="info-section">
                                <h2>Datos Personales</h2>
                                <div class="info-item">
                                  <div class="info-label">Nombre:</div>
                                  <div class="info-value">${selectedEmployee.name}</div>
                                </div>
                                <div class="info-item">
                                  <div class="info-label">Puesto:</div>
                                  <div class="info-value">${selectedEmployee.position}</div>
                                </div>
                                <div class="info-item">
                                  <div class="info-label">ID de Empleado:</div>
                                  <div class="info-value">${selectedEmployee.id}</div>
                                </div>
                              </div>
                              
                              <div class="attendance-section">
                                <h2>Resumen de Asistencia (${months[currentMonth]} ${currentYear})</h2>
                                
                                <div class="summary-section">
                                  <h3>Tipos de Días</h3>
                                  ${dayTypes
                                    .slice(0, -1)
                                    .map((type) => {
                                      // Filtrar los días que son domingos
                                      const count = Object.entries(attendance[selectedEmployee.id] || {}).filter(
                                        ([dateKey, dayTypeId]) => {
                                          // Verificar si el día es domingo
                                          const [year, month, day] = dateKey.split("-").map(Number)
                                          const date = new Date(year, month - 1, day)
                                          const isSunday = date.getDay() === 0 // 0 es domingo

                                          // Solo contar si no es domingo y coincide con el tipo de día
                                          return !isSunday && dayTypeId === type.id
                                        },
                                      ).length

                                      if (count === 0) return ""
                                      return `
                                      <div class="summary-item">
                                        <div class="summary-label">${type.name}:</div>
                                        <div class="summary-value">${count} días (${count * 8} hrs)</div>
                                      </div>
                                    `
                                    })
                                    .join("")}
                                  
                                  <div class="summary-item">
                                    <div class="summary-label">Total días marcados:</div>
                                    <div class="summary-value">
                                      ${
                                        Object.entries(attendance[selectedEmployee.id] || {}).filter(
                                          ([dateKey, id]) => {
                                            // Verificar si el día es domingo
                                            const [year, month, day] = dateKey.split("-").map(Number)
                                            const date = new Date(year, month - 1, day)
                                            const isSunday = date.getDay() === 0 // 0 es domingo

                                            // Solo contar si no es domingo y tiene un tipo de día asignado
                                            return !isSunday && id !== "none"
                                          },
                                        ).length
                                      } días
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="footer">
                                <p>Documento generado automáticamente desde el sistema de control de asistencia.</p>
                                <p>© ${new Date().getFullYear()} ${officeName}</p>
                              </div>
                            </body>
                            </html>
                          `

                            // Convertir el HTML a un Blob
                            const blob = new Blob([htmlContent], { type: "text/html" })
                            const url = URL.createObjectURL(blob)

                            // Crear elemento de enlace para la descarga
                            const link = document.createElement("a")
                            link.setAttribute("href", url)
                            link.setAttribute(
                              "download",
                              `empleado_${selectedEmployee.name.replace(/\s+/g, "_")}_${months[currentMonth]}_${currentYear}.html`,
                            )
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(url)

                            toast({
                              title: "Información descargada",
                              description: `Se ha descargado la información de ${selectedEmployee.name} en formato HTML.`,
                            })
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar información
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Selecciona un empleado para ver sus detalles
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {permissions.canCreateEmployee && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Empleado
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Agregar Empleados</DialogTitle>
                  <DialogDescription>
                    Agrega empleados de forma individual o masiva para la oficina de {officeName}.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="individual" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Individual
                    </TabsTrigger>
                    <TabsTrigger value="masiva">
                      <FileUp className="mr-2 h-4 w-4" />
                      Carga Masiva
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="individual" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input id="name" placeholder="Nombre del empleado" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Puesto</Label>
                      <Input id="position" placeholder="Puesto del empleado" />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleAddSingleEmployee}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Registrar Empleado
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="masiva" className="space-y-4 py-4">
                    <div className="space-y-2 text-center p-4 border-2 border-dashed rounded-md">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arrastra y suelta el archivo CSV con la lista de empleados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        El archivo debe contener las columnas: Nombre, Puesto
                      </p>
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".csv"
                          className="hidden"
                          id="employee-file-upload"
                        />
                        <Button variant="outline" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                          <FileUp className="mr-2 h-4 w-4" />
                          Seleccionar Archivo
                        </Button>
                      </>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Plantilla
                      </Button>
                      <Button type="submit">
                        <Upload className="mr-2 h-4 w-4" />
                        Cargar Empleados
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            )}
            <Dialog open={verificationMode} onOpenChange={setVerificationMode}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Verificar Empleados</DialogTitle>
                  <DialogDescription>
                    Confirma que la información de los empleados es correcta antes de agregarlos a {officeName}.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[300px] overflow-y-auto">
                  {employeesToVerify.map((emp, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border-b">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{emp.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{emp.position}</p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button variant="ghost" size="icon">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setVerificationMode(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddEmployees}>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={correctionsModalOpen} onOpenChange={setCorrectionsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" />
                  Correcciones
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    Correcciones de {months[currentMonth === 0 ? 11 : currentMonth - 1]}{" "}
                    {currentMonth === 0 ? currentYear - 1 : currentYear}
                  </DialogTitle>
                  <DialogDescription>Registra correcciones para los empleados del mes anterior.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <Label htmlFor="country">País</Label>
                    <Input id="country" value="México" disabled className="bg-muted" />
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="correction-employee">Seleccionar Empleado</Label>
                    <select
                      id="correction-employee"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      value={selectedCorrectionEmployee}
                      onChange={(e) => setSelectedCorrectionEmployee(e.target.value)}
                    >
                      <option value="">Selecciona un empleado</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.position}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCorrectionEmployee && (
                    <div className="space-y-4">
                      <div className="border rounded-md p-3">
                        <h4 className="text-sm font-medium mb-2 flex justify-between items-center">
                          <span>Correcciones / Comentarios</span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            Abril 2025
                          </span>
                        </h4>
                        <Textarea
                          className="w-full min-h-[150px] p-2 border rounded-md"
                          placeholder="Escribe las correcciones o comentarios para este empleado..."
                          value={employeeCorrections[selectedCorrectionEmployee] || ""}
                          onChange={(e) =>
                            setEmployeeCorrections({
                              ...employeeCorrections,
                              [selectedCorrectionEmployee]: e.target.value,
                            })
                          }
                        />
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => {
                              toast({
                                title: "Comentario guardado",
                                description: "El comentario ha sido guardado correctamente.",
                              })
                            }}
                            className="flex-1"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEmployeeCorrections({
                                ...employeeCorrections,
                                [selectedCorrectionEmployee]: "",
                              })
                              toast({
                                title: "Comentario limpiado",
                                description: "Puedes editar un nuevo comentario.",
                              })
                            }}
                            className="flex-1"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar nuevo
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-md p-3">
                        <h4 className="text-sm font-medium mb-2">Vista previa</h4>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              Previsualizar hoja final
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[700px]">
                            <DialogHeader>
                              <DialogTitle>Vista previa de la hoja de correcciones</DialogTitle>
                              <DialogDescription>
                                Así se verá la hoja de correcciones cuando la descargues.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="bg-white text-black p-6 border rounded-md font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                                <div className="mb-4 border-b pb-2">
                                  <p className="font-bold text-center">CORRECCIONES MES ANTERIOR - {officeName}</p>
                                  <div className="flex justify-between max-w-[400px] mx-auto mt-2">
                                    <p>
                                      <strong>País:</strong> México
                                    </p>
                                    <p>
                                      <strong>Mes:</strong> {months[currentMonth === 0 ? 11 : currentMonth - 1]}{" "}
                                      {currentMonth === 0 ? currentYear - 1 : currentYear}
                                    </p>
                                    <p>
                                      <strong>Fecha:</strong> {new Date().toLocaleDateString()}
                                    </p>
                                  </div>
                                  {selectedCorrectionEmployee && (
                                    <div className="mb-4">
                                      <p className="font-bold">
                                        EMPLEADO: {employees.find((e) => e.id === selectedCorrectionEmployee)?.name} (
                                        {employees.find((e) => e.id === selectedCorrectionEmployee)?.position})
                                      </p>
                                      <p className="font-bold">CORRECCIONES:</p>
                                      <div className="flex justify-between gap-4">
                                        <p className="whitespace-pre-wrap flex-1">
                                          {employeeCorrections[selectedCorrectionEmployee] ||
                                            "No hay correcciones registradas"}
                                        </p>
                                        <div className="w-[200px] text-center">
                                          <p className="mt-3 border-t pt-2">Firma del empleado</p>
                                        </div>
                                      </div>
                                      <p>---------------------------------------------</p>
                                    </div>
                                  )}
                                  {Object.entries(employeeCorrections)
                                    .filter(([empId]) => empId !== selectedCorrectionEmployee && empId)
                                    .map(([empId, correction]) => {
                                      const emp = employees.find((e) => e.id === empId)
                                      if (emp && correction.trim()) {
                                        return (
                                          <div key={empId} className="mb-4">
                                            <p className="font-bold">
                                              EMPLEADO: {emp.name} ({emp.position})
                                            </p>
                                            <p className="font-bold">CORRECCIONES:</p>
                                            <div className="flex justify-between gap-4">
                                              <p className="whitespace-pre-wrap flex-1">{correction}</p>
                                              <div className="w-[200px] text-center">
                                                <p className="mt-3 border-t pt-2">Firma del empleado</p>
                                              </div>
                                            </div>
                                            <p>---------------------------------------------</p>
                                          </div>
                                        )
                                      }
                                      return null
                                    })}
                                  <div className="mt-6 pt-4 border-t text-center">
                                    <p className="font-bold">Firma del Manager: _______________________________</p>
                                    <p>Nombre: _______________________ Fecha: _____________</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleDownloadCorrections}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar HTML
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCorrectionsModalOpen(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={handleDownloadCorrections} disabled={Object.keys(employeeCorrections).length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar HTML
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                        <div className="font-medium">{officeName}</div>
                        <div>Mes:</div>
                        <div className="font-medium">
                          {months[currentMonth]} {currentYear}
                        </div>
                        <div>Empleados:</div>
                        <div className="font-medium">{employees.length}</div>
                        <div>Días laborables:</div>
                        <div className="font-medium">
                          {new Date(currentYear, currentMonth + 1, 0).getDate() - nonWorkingDays.length}
                        </div>
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

                    <div className="text-sm text-muted-foreground">
                      <p>
                        El archivo se descargará en formato HTML. Para convertirlo a PDF, ábrelo en tu navegador y
                        utiliza la función de impresión (Ctrl+P) seleccionando "Guardar como PDF".
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleExportCalendar}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Calendario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="w-full">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>Asistencia Mensual</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button ref={dayTypePopoverRef} variant="outline" className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full ${
                          dayTypes.find((t) => t.id === selectedDayType)?.color || "bg-green-500"
                        }`}
                      />
                      {dayTypes.find((t) => t.id === selectedDayType)?.name || "Hora Regular"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 z-50" align="start" sideOffset={5}>
                    <div className="max-h-80 overflow-auto p-1">
                      {dayTypes
                        .filter((type) => type.id !== "none")
                        .map((type) => (
                          <Button
                            key={type.id}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              selectedDayType === type.id && "bg-accent",
                            )}
                            onClick={() => {
                              setSelectedDayType(type.id)
                              // Cerrar el popover
                              if (dayTypePopoverRef.current) {
                                dayTypePopoverRef.current.click()
                              }
                            }}
                          >
                            <span className={cn("mr-2 h-4 w-4 rounded-full", type.color)} />
                            <span className="flex-1">{type.name}</span>
                            <span className="text-xs font-semibold opacity-70">{type.abbreviation}</span>
                          </Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                {isCalendarFullyMarked() && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md text-green-700 dark:text-green-300 transition-all duration-300"
                    title="¡Calendario completamente marcado!"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-xs font-medium">Completo</span>
                  </div>
                )}
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
                <Select value={visibleRows} onValueChange={handleVisibleRowsChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filas visibles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Todas las filas</SelectItem>
                    <SelectItem value="5">5 filas</SelectItem>
                    <SelectItem value="10">10 filas</SelectItem>
                    <SelectItem value="15">15 filas</SelectItem>
                    <SelectItem value="20">20 filas</SelectItem>
                    <SelectItem value="30">30 filas</SelectItem>
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
          <CardContent className="relative" style={{ maxHeight: getMaxHeight(), overflow: "auto" }}>
            <AttendanceCalendar
              month={currentMonth}
              year={currentYear}
              employees={employees}
              officeId={officeId}
              enableDragSelection={true}
              showDetailsColumn={true}
              nonWorkingDays={nonWorkingDays}
              isLocked={isMonthLocked}
              selectedDayType={selectedDayType}
              onAttendanceUpdate={handleAttendanceUpdate}
              visibleRows={visibleRows}
            />
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para verificar los días inhábiles */}
      <Dialog open={nonWorkingDaysDialogOpen} onOpenChange={setNonWorkingDaysDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Verificar Días Inhábiles</DialogTitle>
            <DialogDescription>
              Confirma los días inhábiles para {months[currentMonth]} {currentYear}.
            </DialogDescription>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Estos días serán marcados como inhábiles y no podrán ser seleccionados como días laborables en el
              calendario.
            </p>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-[300px] overflow-y-auto">
              {daysToVerify.length > 0 ? (
                <div className="space-y-4 pr-2">
                  {/* Agrupar por año y mes */}
                  {Array.from(
                    // Crear un conjunto único de combinaciones año-mes
                    new Set(daysToVerify.map((item) => `${item.year}-${item.month}`)),
                  )
                    .sort((a, b) => {
                      // Ordenar primero por año y luego por mes
                      const [yearA, monthA] = a.split("-").map(Number)
                      const [yearB, monthB] = b.split("-").map(Number)

                      if (yearA !== yearB) {
                        return yearA - yearB // Ordenar por año ascendente
                      }
                      return monthA - monthB // Si el año es el mismo, ordenar por mes ascendente
                    })
                    .map((yearMonth) => {
                      const [year, month] = yearMonth.split("-").map(Number)
                      const daysInThisMonth = daysToVerify.filter((item) => item.year === year && item.month === month)

                      return (
                        <div key={yearMonth} className="border-t pt-3 first:border-t-0 first:pt-0">
                          <h4 className="text-sm font-medium mb-2">
                            {months[month]} {year}
                            {month === currentMonth && year === currentYear ? (
                              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                                Mes actual
                              </span>
                            ) : (
                              ""
                            )}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {daysInThisMonth
                              .sort((a, b) => a.day - b.day)
                              .map((item, index) => (
                                <div
                                  key={`${yearMonth}-${item.day}-${index}`}
                                  className={`px-3 py-2 rounded-md flex flex-col ${
                                    month === currentMonth && year === currentYear
                                      ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{`${String(item.day).padStart(2, "0")}/${String(
                                      item.month + 1,
                                    ).padStart(2, "0")}/${item.year}`}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 ml-1 p-0"
                                      onClick={() =>
                                        setDaysToVerify(
                                          daysToVerify.filter(
                                            (d) =>
                                              !(
                                                d.day === item.day &&
                                                d.month === item.month &&
                                                d.year === item.year &&
                                                d.motivo === item.motivo
                                              ),
                                          ),
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {item.motivo && <span className="text-xs mt-1 opacity-80">{item.motivo}</span>}
                                </div>
                              ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">No se encontraron días inhábiles.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNonWorkingDaysDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmNonWorkingDays}>
              <Check className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
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
            <div className="p-4">
              <EmployeeList employees={employees} onDeleteEmployee={handleDeleteEmployee} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
