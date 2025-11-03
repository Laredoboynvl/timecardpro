"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  Search,
  Check,
  X,
  Download,
  Filter,
  Settings,
  BarChart
} from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useToast } from "@/hooks/use-toast"
import {
  getEmployeesByOfficeClient,
  getAttendanceTypes,
  getOfficeAttendanceRecords,
  upsertAttendanceRecord,
  deleteAttendanceRecord,
  checkAttendanceTables,
  isSunday,
  isDayHoliday,
  hasVacationOnDate,
  getHolidays,
  type Employee,
  type AttendanceType,
  type AttendanceRecord as DBAttendanceRecord,
} from "@/lib/supabase/db-functions"
import { MonthlyDetailsModal } from "@/components/monthly-details-modal"
import { AttendanceTypesModal } from "@/components/attendance-types-modal"
import { AttendanceSystemDiagnostic } from "@/components/attendance-system-diagnostic"
import { AttendanceDebugger } from "@/components/attendance-debugger"
import { SpecificEmployeeDebugger } from "@/components/specific-employee-debugger"
import { DirectSupabaseTest } from "@/components/direct-supabase-test"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

interface AttendanceRecord {
  employeeId: string
  date: string
  attendanceTypeId: string
  notes?: string
}

interface DayInfo {
  date: Date
  isDisabled: boolean
  disabledReason?: string
  attendanceType?: AttendanceType
}

export default function AsistenciaPage() {
  const params = useParams()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())
  const { toast } = useToast()

  // Estados principales
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceTypes, setAttendanceTypes] = useState<AttendanceType[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, DBAttendanceRecord>>(new Map())
  const [searchTerm, setSearchTerm] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [tablesConfigured, setTablesConfigured] = useState<boolean | null>(null)
  const [holidays, setHolidays] = useState<any[]>([])
  const [vacationDays, setVacationDays] = useState<Set<string>>(new Set())
  const [selectedCell, setSelectedCell] = useState<{employeeId: string, date: Date} | null>(null)
  const [showMonthlyModal, setShowMonthlyModal] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedAttendanceType, setSelectedAttendanceType] = useState<AttendanceType | null>(null)
  
  // Estados para selección múltiple por arrastre
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectionStart, setSelectionStart] = useState<{employeeId: string, date: Date} | null>(null)
  const [showTypesModal, setShowTypesModal] = useState(false)
  
  // Estado para controlar si estamos marcando o desmarcando
  const [selectionMode, setSelectionMode] = useState<'mark' | 'unmark'>('mark')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Estados para el modal de progreso
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressData, setProgressData] = useState({
    current: 0,
    total: 0,
    currentEmployee: '',
    phase: 'preparing' as 'preparing' | 'processing' | 'complete'
  })

  // Estados para modal de horas extra
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [selectedCellForHours, setSelectedCellForHours] = useState<{employeeId: string, date: Date} | null>(null)
  const [hoursWorked, setHoursWorked] = useState<number>(8)

  // Estado para confirmación de marcado masivo
  const [showConfirmMarkAll, setShowConfirmMarkAll] = useState(false)

  // Función para ordenar tipos de asistencia en el orden deseado
  const getOrderedAttendanceTypes = (types: AttendanceType[]) => {
    const order = ['HR', 'HE', 'AA', 'VA', 'LM', 'ANR']
    
    return types.sort((a, b) => {
      const indexA = order.indexOf(a.code)
      const indexB = order.indexOf(b.code)
      
      // Si ambos están en el orden definido, usar ese orden
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      // Si solo uno está en el orden, ese va primero
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      // Si ninguno está en el orden, mantener orden alfabético por código
      return a.code.localeCompare(b.code)
    })
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (!office) return
      
      try {
        setIsLoading(true)
        
        // Verificar que las tablas de asistencia existan
        const tablesStatus = await checkAttendanceTables()
        console.log("Estado de tablas de asistencia:", tablesStatus)
        
        if (!tablesStatus.attendance_types || !tablesStatus.attendance_records) {
          setTablesConfigured(false)
          toast({
            title: "⚠️ Tablas de asistencia no configuradas",
            description: "Las tablas de asistencia no están creadas en la base de datos. Ejecuta el script SQL de configuración.",
            variant: "destructive",
          })
          console.error("Tablas faltantes:", tablesStatus.errors)
          setIsLoading(false)
          return
        }
        
        setTablesConfigured(true)
        
        // Cargar empleados, tipos de asistencia y feriados en paralelo
        const [employeeData, typesData, holidaysData] = await Promise.all([
          getEmployeesByOfficeClient(office.code),
          getAttendanceTypes(),
          getHolidays(office.code)
        ])
        
        setEmployees(employeeData)
        setAttendanceTypes(typesData)
        setHolidays(holidaysData)
        
        // Cargar registros de asistencia del mes actual
        await loadAttendanceRecords(currentDate.getFullYear(), currentDate.getMonth() + 1)
        
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [office, toast])

  // Cargar registros de asistencia cuando cambia el mes
  useEffect(() => {
    if (office && !isLoading) {
      loadAttendanceRecords(currentDate.getFullYear(), currentDate.getMonth() + 1)
    }
  }, [currentDate, office, isLoading])

  // Función para cargar registros de asistencia de un mes específico
  const loadAttendanceRecords = async (year: number, month: number) => {
    if (!office) return
    
    try {
      const records = await getOfficeAttendanceRecords(office.code, year, month)
      const recordsMap = new Map<string, DBAttendanceRecord>()
      
      records.forEach(record => {
        const key = `${record.employee_id}-${record.attendance_date}`
        recordsMap.set(key, record)
      })
      
      setAttendanceRecords(recordsMap)
    } catch (error) {
      console.error("Error al cargar registros de asistencia:", error)
    }
  }

  // Confirmar marcado masivo
  const handleMarkAllRegular = () => {
    setShowConfirmMarkAll(true)
  }

  // Ejecutar marcado masivo después de confirmación
  const executeMarkAllRegular = async () => {
    if (!office || isMarkingAll) return
    
    setShowConfirmMarkAll(false)
    setIsMarkingAll(true)
    setShowProgressModal(true)
    
    try {
      // Buscar el tipo "Horas Regulares"
      const regularType = attendanceTypes.find(t => t.code === 'HR' || t.name === 'Horas Regulares')
      if (!regularType) {
        toast({
          title: "Error",
          description: "No se encontró el tipo 'Horas Regulares' en el sistema",
          variant: "destructive",
        })
        setShowProgressModal(false)
        setIsMarkingAll(false)
        return
      }

      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const daysInMonth = getDaysInMonth(currentDate)
      
      // Calcular operaciones necesarias
      const operations = []
      for (const employee of filteredEmployees) {
        for (let day = 1; day <= daysInMonth.length; day++) {
          const date = new Date(year, currentDate.getMonth(), day)
          
          // Saltar si es domingo
          if (isSunday(date)) continue
          
          // Saltar si es día festivo
          const isHoliday = holidays.some(holiday => {
            const holidayDate = new Date(holiday.holiday_date).toISOString().split('T')[0]
            const checkDate = date.toISOString().split('T')[0]
            return holidayDate === checkDate
          })
          if (isHoliday) continue
          
          // Verificar si ya tiene un registro
          const key = formatDateKey(employee.id, date)
          const existingRecord = attendanceRecords.get(key)
          if (existingRecord && existingRecord.attendance_type) {
            // Ya está marcado, saltar
            continue
          }
          
          operations.push({ employee, date, key })
        }
      }

      // Configurar el progreso inicial
      setProgressData({
        current: 0,
        total: operations.length,
        currentEmployee: '',
        phase: 'preparing'
      })

      if (operations.length === 0) {
        toast({
          title: "Sin cambios",
          description: "Todos los días disponibles ya están marcados",
        })
        setShowProgressModal(false)
        setIsMarkingAll(false)
        return
      }

      // Iniciar procesamiento
      setProgressData(prev => ({
        ...prev,
        phase: 'processing'
      }))

      // Procesar en lotes para mejor rendimiento
      const BATCH_SIZE = 15
      const batches = []
      for (let i = 0; i < operations.length; i += BATCH_SIZE) {
        batches.push(operations.slice(i, i + BATCH_SIZE))
      }

      let successCount = 0
      let errorCount = 0
      const newRecords = new Map(attendanceRecords)

      for (const batch of batches) {
        // Procesar lote en paralelo
        const batchPromises = batch.map(async ({ employee, date, key }) => {
          try {
            const dateString = date.toISOString().split('T')[0]
            const result = await upsertAttendanceRecord(
              employee.id,
              office.code,
              dateString,
              regularType.id!
            )
            
            if (result) {
              newRecords.set(key, result)
              return { success: true, employee }
            } else {
              return { success: false, employee, error: 'No result' }
            }
          } catch (error) {
            console.error(`Error procesando ${employee.name}:`, error)
            return { success: false, employee, error }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        
        // Contar resultados
        batchResults.forEach(result => {
          if (result.success) {
            successCount++
          } else {
            errorCount++
          }
        })

        // Actualizar progreso
        const currentProgress = successCount + errorCount
        setProgressData(prev => ({
          ...prev,
          current: currentProgress,
          currentEmployee: batch[batch.length - 1]?.employee.name || ''
        }))

        // Actualizar UI con resultados del lote
        setAttendanceRecords(new Map(newRecords))

        // Pequeña pausa entre lotes
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      // Completar progreso
      setProgressData(prev => ({
        ...prev,
        phase: 'complete'
      }))

      // Mostrar resultado
      if (errorCount === 0) {
        toast({
          title: "Marcado automático completado",
          description: `Se marcaron ${successCount} días como horas regulares`,
        })
      } else {
        toast({
          title: "Marcado completado con errores",
          description: `Éxito: ${successCount}, Errores: ${errorCount}`,
          variant: errorCount > successCount ? "destructive" : "default",
        })
      }

      // Cerrar modal después de un momento
      setTimeout(() => {
        setShowProgressModal(false)
        setIsMarkingAll(false)
      }, 2000)

    } catch (error) {
      console.error("Error en marcado automático:", error)
      toast({
        title: "Error",
        description: "Error al marcar días como horas regulares",
        variant: "destructive",
      })
      setShowProgressModal(false)
      setIsMarkingAll(false)
    }
  }

  // Obtener el nombre completo del empleado
  const getEmployeeName = (employee: Employee) => {
    return employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
  }

  // Filtrar empleados por búsqueda
  const filteredEmployees = employees.filter(employee => {
    const name = getEmployeeName(employee).toLowerCase()
    const position = employee.position?.toLowerCase() || ''
    const code = employee.employee_code?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    
    return name.includes(search) || position.includes(search) || code.includes(search)
  })

  // Generar días del mes actual
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  // Formatear fecha para usar como key
  const formatDateKey = (employeeId: string, date: Date) => {
    return `${employeeId}-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }

  // Obtener información de un día específico
  const getDayInfo = async (employeeId: string, date: Date): Promise<DayInfo> => {
    const dayInfo: DayInfo = {
      date,
      isDisabled: false,
    }

    // Verificar si es domingo
    if (isSunday(date)) {
      dayInfo.isDisabled = true
      dayInfo.disabledReason = "Domingo"
      // Buscar tipo "Descanso"
      const restType = attendanceTypes.find(t => t.code === 'D')
      if (restType) {
        dayInfo.attendanceType = restType
      }
      return dayInfo
    }

    // Verificar si es feriado
    const isHoliday = holidays.some(holiday => {
      const holidayDate = new Date(holiday.holiday_date).toISOString().split('T')[0]
      const checkDate = date.toISOString().split('T')[0]
      return holidayDate === checkDate
    })

    if (isHoliday) {
      dayInfo.isDisabled = true
      dayInfo.disabledReason = "Día festivo"
      // Buscar tipo "Día Festivo"
      const holidayType = attendanceTypes.find(t => t.code === 'F')
      if (holidayType) {
        dayInfo.attendanceType = holidayType
      }
      return dayInfo
    }

    // Verificar si tiene vacaciones
    const hasVacation = await hasVacationOnDate(employeeId, date)
    if (hasVacation) {
      dayInfo.isDisabled = true
      dayInfo.disabledReason = "Vacaciones"
      // Buscar tipo "Vacaciones"
      const vacationType = attendanceTypes.find(t => t.code === 'V')
      if (vacationType) {
        dayInfo.attendanceType = vacationType
      }
      return dayInfo
    }

    // Verificar si ya tiene un registro de asistencia
    const key = formatDateKey(employeeId, date)
    const existingRecord = attendanceRecords.get(key)
    if (existingRecord && existingRecord.attendance_type) {
      dayInfo.attendanceType = existingRecord.attendance_type as AttendanceType
    }

    return dayInfo
  }

  // Manejar click directo en círculo (con tipo preseleccionado)
  const handleDirectAttendanceClick = async (employeeId: string, date: Date) => {
    if (!selectedAttendanceType) {
      toast({
        title: "Selecciona un tipo",
        description: "Primero selecciona un tipo de asistencia en el dropdown del header",
        variant: "destructive",
      })
      return
    }

    // Si es "Horas Extra", abrir modal para capturar horas
    if (selectedAttendanceType.code === 'HE') {
      setSelectedCellForHours({ employeeId, date })
      setHoursWorked(8) // Valor por defecto
      setShowHoursModal(true)
      return
    }

    // Para otros tipos, procesar directamente
    await processAttendanceDirectly(employeeId, date, selectedAttendanceType)
  }

  // Funciones para selección múltiple por arrastre
  const handleMouseDown = (employeeId: string, date: Date) => {
    if (!selectedAttendanceType) {
      toast({
        title: "Selecciona un tipo",
        description: "Primero selecciona un tipo de asistencia en el dropdown del header",
        variant: "destructive",
      })
      return
    }

    console.log(`🖱️ Mouse down en empleado ${employeeId}, fecha ${date.toISOString().split('T')[0]}`)
    
    // Verificar si este día ya está marcado con el tipo seleccionado
    const key = formatDateKey(employeeId, date)
    const existingRecord = attendanceRecords.get(key)
    const isAlreadyMarked = existingRecord && 
                           existingRecord.attendance_type && 
                           existingRecord.attendance_type.id === selectedAttendanceType.id
    
    // Establecer el modo: si ya está marcado con el mismo tipo, desmarcamos; si no, marcamos
    const mode = isAlreadyMarked ? 'unmark' : 'mark'
    setSelectionMode(mode)
    
    console.log(`📍 Día ${isAlreadyMarked ? 'YA MARCADO' : 'SIN MARCAR'} - Modo: ${mode}`)
    
    setIsSelecting(true)
    setSelectionStart({ employeeId, date })
    const cellKey = `${employeeId}-${date.toISOString().split('T')[0]}`
    setSelectedCells(new Set([cellKey]))
  }

  const handleMouseEnter = (employeeId: string, date: Date) => {
    if (!isSelecting || !selectionStart || !selectedAttendanceType) return

    console.log(`📍 Mouse enter en empleado ${employeeId}, fecha ${date.toISOString().split('T')[0]}`)

    // Crear la selección rectangular desde el punto inicial hasta el actual
    const startEmployee = employees.findIndex(emp => emp.id === selectionStart.employeeId)
    const endEmployee = employees.findIndex(emp => emp.id === employeeId)
    const startDate = new Date(selectionStart.date)
    const endDate = new Date(date)
    
    const minEmployee = Math.min(startEmployee, endEmployee)
    const maxEmployee = Math.max(startEmployee, endEmployee)
    const minDate = new Date(Math.min(startDate.getTime(), endDate.getTime()))
    const maxDate = new Date(Math.max(startDate.getTime(), endDate.getTime()))
    
    const newSelectedCells = new Set<string>()
    
    for (let empIndex = minEmployee; empIndex <= maxEmployee; empIndex++) {
      const employee = employees[empIndex]
      const currentDate = new Date(minDate)
      
      while (currentDate <= maxDate) {
        const cellKey = `${employee.id}-${currentDate.toISOString().split('T')[0]}`
        newSelectedCells.add(cellKey)
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    setSelectedCells(newSelectedCells)
    console.log(`📋 Selección actualizada: ${newSelectedCells.size} celdas (modo: ${selectionMode})`)
  }

  const handleMouseUp = async () => {
    if (!isSelecting || !selectedAttendanceType || selectedCells.size === 0) {
      setIsSelecting(false)
      setSelectedCells(new Set())
      setSelectionStart(null)
      setSelectionMode('mark')
      return
    }

    try {
      console.log(`🚀 Procesando ${selectedCells.size} días seleccionados con tipo: ${selectedAttendanceType.name} - Modo: ${selectionMode}`)
      
      // Si solo hay una celda seleccionada, usar el método directo más rápido
      if (selectedCells.size === 1) {
        const cellKey = Array.from(selectedCells)[0]
        const lastHyphenIndex = cellKey.lastIndexOf('-')
        const secondLastHyphenIndex = cellKey.lastIndexOf('-', lastHyphenIndex - 1)
        const thirdLastHyphenIndex = cellKey.lastIndexOf('-', secondLastHyphenIndex - 1)
        
        const employeeId = cellKey.substring(0, thirdLastHyphenIndex)
        const dateString = cellKey.substring(thirdLastHyphenIndex + 1)
        const date = new Date(dateString + 'T00:00:00.000Z')
        
        let success = false
        
        if (selectionMode === 'mark') {
          success = await handleAttendanceTypeSelect(employeeId, date, selectedAttendanceType)
          if (success) {
            toast({
              title: "Día marcado",
              description: `Marcado como ${selectedAttendanceType.name}`,
            })
          }
        } else if (selectionMode === 'unmark') {
          // Desmarcar día eliminando el registro
          success = await handleAttendanceDelete(employeeId, date)
          if (success) {
            toast({
              title: "Día desmarcado",
              description: `Se eliminó la asistencia`,
            })
          }
        }
        
        setIsSelecting(false)
        setSelectedCells(new Set())
        setSelectionStart(null)
        setSelectionMode('mark')
        return
      }
      
      // Para selecciones múltiples, procesar en lotes
      console.log(`📋 Procesando selección múltiple de ${selectedCells.size} días en modo ${selectionMode}...`)
      
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const pendingUpdates: Array<{key: string, record: DBAttendanceRecord | null}> = []

      for (const cellKey of Array.from(selectedCells)) {
        try {
          console.log(`\n=== PROCESANDO REGISTRO ${successCount + errorCount + 1} ===`)
          
          // Separar employeeId y fecha del cellKey
          const lastHyphenIndex = cellKey.lastIndexOf('-')
          const secondLastHyphenIndex = cellKey.lastIndexOf('-', lastHyphenIndex - 1)
          const thirdLastHyphenIndex = cellKey.lastIndexOf('-', secondLastHyphenIndex - 1)
          
          if (lastHyphenIndex === -1 || secondLastHyphenIndex === -1 || thirdLastHyphenIndex === -1) {
            console.error(`❌ Formato de cellKey inválido: ${cellKey}`)
            errorCount++
            errors.push(cellKey)
            continue
          }
          
          const employeeId = cellKey.substring(0, thirdLastHyphenIndex)
          const dateString = cellKey.substring(thirdLastHyphenIndex + 1) // YYYY-MM-DD
          
          console.log(`Procesando - employeeId: ${employeeId}, fecha: ${dateString}, modo: ${selectionMode}`)
          
          // Validar formato de fecha
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(dateString)) {
            console.error(`❌ Formato de fecha inválido: ${dateString}`)
            errorCount++
            errors.push(cellKey)
            continue
          }
          
          const date = new Date(dateString + 'T00:00:00.000Z') // Forzar UTC para evitar problemas de zona horaria
          
          // Verificar que la fecha sea válida
          if (isNaN(date.getTime())) {
            console.error(`❌ Fecha inválida: ${dateString}`)
            errorCount++
            errors.push(cellKey)
            continue
          }
          
          console.log(`✅ Procesando: empleado ${employeeId}, fecha ${dateString}, date object:`, date)
          
          let result = false
          let dbResult: DBAttendanceRecord | null = null
          
          if (selectionMode === 'mark') {
            console.log(`Tipo de asistencia seleccionado:`, {
              id: selectedAttendanceType.id,
              name: selectedAttendanceType.name,
              code: selectedAttendanceType.code
            })
            
            // Llamar directamente a upsertAttendanceRecord sin actualizar UI aún
            dbResult = await upsertAttendanceRecord(
              employeeId,
              office!.code,
              dateString,
              selectedAttendanceType.id!
            )
            result = !!dbResult
          } else if (selectionMode === 'unmark') {
            console.log(`Desmarcando día: ${dateString}`)
            const deleteResult = await deleteAttendanceRecord(employeeId, dateString)
            result = deleteResult
            dbResult = null // Para eliminaciones, el resultado es null
          }
          
          console.log(`Resultado para ${cellKey}:`, {
            result: result,
            wasSuccessful: result === true,
            recordNumber: successCount + errorCount + 1,
            mode: selectionMode
          })
          
          if (result === true) { // Si retornó true, fue exitoso
            successCount++
            console.log(`✅ ÉXITO: Registro ${successCount} procesado correctamente`)
            
            // Guardar para actualización en lote
            const key = formatDateKey(employeeId, date)
            pendingUpdates.push({ key, record: dbResult })
          } else {
            errorCount++
            errors.push(`${employeeId}-${dateString}`)
            console.error(`❌ FALLO: Registro falló para ${employeeId}-${dateString}`)
          }
          
          // Pequeña pausa para evitar saturar la base de datos
          await new Promise(resolve => setTimeout(resolve, 50))
          
        } catch (error) {
          console.error(`❌ EXCEPCIÓN procesando ${cellKey}:`, {
            error: error,
            message: error instanceof Error ? error.message : 'Error desconocido',
            stack: error instanceof Error ? error.stack : undefined
          })
          errorCount++
          errors.push(cellKey)
        }
      }

      // ✨ ACTUALIZAR TODO EL ESTADO DE UNA VEZ AL FINAL
      if (pendingUpdates.length > 0) {
        console.log(`🔄 Aplicando ${pendingUpdates.length} actualizaciones de UI de una vez...`)
        const newRecords = new Map(attendanceRecords)
        
        pendingUpdates.forEach(({ key, record }) => {
          if (record) {
            newRecords.set(key, record)
          } else {
            newRecords.delete(key) // Para eliminaciones
          }
        })
        
        // Actualizar todo el estado de una vez
        setAttendanceRecords(newRecords)
        console.log(`✅ UI actualizada con ${pendingUpdates.length} cambios`)
      }

      // Mostrar resultado
      console.log(`\n=== RESUMEN FINAL ===`)
      console.log(`Total procesados: ${successCount + errorCount}`)
      console.log(`Éxitos: ${successCount}`)
      console.log(`Errores: ${errorCount}`)
      console.log(`Lista de errores:`, errors)
      
      if (errorCount === 0) {
        const action = selectionMode === 'mark' ? 'marcaron' : 'desmarcaron'
        const description = selectionMode === 'mark' 
          ? `Se marcaron ${successCount} días como ${selectedAttendanceType.name}` 
          : `Se desmarcaron ${successCount} días`
        
        toast({
          title: `Días ${action} exitosamente`,
          description: description,
        })
      } else {
        toast({
          title: "Proceso completado con errores",
          description: `Éxito: ${successCount}, Errores: ${errorCount}`,
          variant: "destructive",
        })
        console.error("❌ REGISTROS CON ERRORES DETALLADOS:", errors)
        
        // Log adicional para debugging
        console.error("=== INFORMACIÓN ADICIONAL PARA DEBUG ===")
        console.error("Tipo de asistencia seleccionado:", selectedAttendanceType)
        console.error("Oficina:", office)
        console.error("Células seleccionadas originales:", Array.from(selectedCells))
        console.error("Modo de selección:", selectionMode)
      }

    } catch (error) {
      console.error("Error general al procesar días:", error)
      toast({
        title: "Error",
        description: "Error general al procesar la selección múltiple",
        variant: "destructive",
      })
    } finally {
      setIsSelecting(false)
      setSelectedCells(new Set())
      setSelectionStart(null)
      setSelectionMode('mark')
    }
  }

  // Agregar listener global para mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp()
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isSelecting, selectedCells, selectedAttendanceType])

  // Función para procesar asistencia directamente
  const processAttendanceDirectly = async (employeeId: string, date: Date, attendanceType: AttendanceType, hoursWorked?: number) => {
    try {
      const key = formatDateKey(employeeId, date)
      const existingRecord = attendanceRecords.get(key)
      
      if (existingRecord && existingRecord.attendance_type?.id === attendanceType.id) {
        // Si ya está marcado con el mismo tipo, desmarcarlo
        const success = await handleAttendanceDelete(employeeId, date)
        if (success) {
          toast({
            title: "Día desmarcado",
            description: `Se eliminó la asistencia`,
          })
        }
      } else {
        // Marcar con el nuevo tipo
        const dateString = date.toISOString().split('T')[0]
        const result = await upsertAttendanceRecord(
          employeeId,
          office!.code,
          dateString,
          attendanceType.id!,
          undefined, // notes
          undefined, // createdBy
          hoursWorked // horas trabajadas
        )
        
        if (result) {
          // Actualizar el mapa local
          const newRecords = new Map(attendanceRecords)
          newRecords.set(key, result)
          setAttendanceRecords(newRecords)
          
          const hoursText = hoursWorked ? ` (${hoursWorked} horas)` : ''
          toast({
            title: "Asistencia marcada",
            description: `Marcado como ${attendanceType.name}${hoursText}`,
          })
        }
      }
    } catch (error) {
      console.error("Error al procesar asistencia:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar la asistencia",
        variant: "destructive",
      })
    }
  }

  // Función para guardar horas extra
  const saveExtraHours = async () => {
    if (!selectedCellForHours || !selectedAttendanceType) return
    
    await processAttendanceDirectly(
      selectedCellForHours.employeeId, 
      selectedCellForHours.date, 
      selectedAttendanceType,
      hoursWorked
    )
    
    setShowHoursModal(false)
    setSelectedCellForHours(null)
    setHoursWorked(8)
  }

  // Manejar selección de tipo de asistencia
  const handleAttendanceTypeSelect = async (
    employeeId: string, 
    date: Date, 
    attendanceType: AttendanceType
  ): Promise<boolean> => {
    try {
      const dateString = date.toISOString().split('T')[0]
      
      console.log("=== INICIO handleAttendanceTypeSelect ===")
      console.log("Intentando guardar registro:", {
        employeeId,
        officeCode: office?.code,
        dateString,
        attendanceTypeId: attendanceType.id,
        attendanceTypeName: attendanceType.name
      })
      
      // Crear o actualizar registro
      const result = await upsertAttendanceRecord(
        employeeId,
        office!.code,
        dateString,
        attendanceType.id!
      )

      console.log("=== RESULTADO upsertAttendanceRecord ===")
      console.log("Resultado completo:", {
        result: result,
        isNull: result === null,
        isUndefined: result === undefined,
        type: typeof result,
        hasResult: !!result
      })

      if (result) {
        // Actualizar el mapa local
        const key = formatDateKey(employeeId, date)
        const newRecords = new Map(attendanceRecords)
        newRecords.set(key, result)
        setAttendanceRecords(newRecords)

        console.log("✅ Registro guardado exitosamente:", result)
        console.log("=== FIN handleAttendanceTypeSelect (ÉXITO) ===")
        return true
      } else {
        console.error("❌ upsertAttendanceRecord devolvió null/undefined")
        console.error("=== FIN handleAttendanceTypeSelect (FALLO - NULL RESULT) ===")
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar el registro. Verifica que las tablas estén configuradas.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("❌ EXCEPCIÓN en handleAttendanceTypeSelect:", {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        employeeId,
        date: date.toISOString(),
        attendanceType: attendanceType
      })
      console.error("=== FIN handleAttendanceTypeSelect (FALLO - EXCEPCIÓN) ===")
      
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido al actualizar la asistencia",
        variant: "destructive",
      })
      return false
    }
  }

  // Eliminar registro de asistencia (para uso en modo toggle)
  const handleAttendanceDelete = async (employeeId: string, date: Date): Promise<boolean> => {
    try {
      const dateString = date.toISOString().split('T')[0]
      const success = await deleteAttendanceRecord(employeeId, dateString)

      if (success) {
        // Actualizar el mapa local
        const key = formatDateKey(employeeId, date)
        const newRecords = new Map(attendanceRecords)
        newRecords.delete(key)
        setAttendanceRecords(newRecords)
        return true
      }
      return false
    } catch (error) {
      console.error("Error al eliminar asistencia:", error)
      return false
    }
  }

  // Eliminar registro de asistencia
  const handleRemoveAttendance = async (employeeId: string, date: Date) => {
    try {
      const dateString = date.toISOString().split('T')[0]
      const success = await deleteAttendanceRecord(employeeId, dateString)

      if (success) {
        // Actualizar el mapa local
        const key = formatDateKey(employeeId, date)
        const newRecords = new Map(attendanceRecords)
        newRecords.delete(key)
        setAttendanceRecords(newRecords)

        toast({
          title: "Asistencia eliminada",
          description: "El registro ha sido eliminado",
        })
      }
    } catch (error) {
      console.error("Error al eliminar asistencia:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la asistencia",
        variant: "destructive",
      })
    }
    
    setSelectedCell(null)
  }

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Ir al mes actual
  const goToCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  // Calcular estadísticas
  const getAttendanceStats = () => {
    const daysInMonth = getDaysInMonth(currentDate).length
    let totalPresent = 0
    let totalPossible = 0

    filteredEmployees.forEach(employee => {
      getDaysInMonth(currentDate).forEach(date => {
        if (!isSunday(date)) { // No contar domingos
          totalPossible++
          const key = formatDateKey(employee.id, date)
          const record = attendanceRecords.get(key)
          if (record && record.attendance_type?.code === 'R') {
            totalPresent++
          }
        }
      })
    })

    return {
      totalPresent,
      totalPossible,
      percentage: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0
    }
  }

  const stats = getAttendanceStats()
  const daysInMonth = getDaysInMonth(currentDate)

  if (!office) {
    return <div>Oficina no encontrada</div>
  }

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <OfficeHeader office={office} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando sistema de asistencia...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si las tablas no están configuradas, mostrar diagnóstico
  if (tablesConfigured === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <OfficeHeader office={office} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Sistema de Asistencia - {office?.name}
            </h1>
            <p className="mt-2 text-gray-600">
              Se requiere configuración inicial de la base de datos
            </p>
          </div>
          <AttendanceSystemDiagnostic />
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Herramienta de Depuración Avanzada</h2>
            <AttendanceDebugger />
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Diagnóstico de Empleado Específico</h2>
            <SpecificEmployeeDebugger />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <OfficeHeader office={office} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header de la página */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestión de Asistencia
              </h1>
              <p className="text-gray-600">
                Controla la asistencia diaria de todos los empleados
              </p>
            </div>
            
            {/* Estadísticas rápidas */}
            <div className="flex gap-4">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Empleados</p>
                      <p className="text-xl font-bold">{filteredEmployees.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Asistencia</p>
                      <p className="text-xl font-bold">{stats.percentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Controles */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Primera fila: Título y botones principales */}
              <div className="flex items-center justify-between">
                {/* Controles de navegación y título */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToCurrentMonth}
                    >
                      Hoy
                    </Button>
                  </div>
                  
                  <h2 className="text-xl font-semibold flex items-center gap-3">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    
                    {/* Selector de tipo de asistencia activo */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-2">
                          {selectedAttendanceType ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: selectedAttendanceType.color }}
                              >
                                {selectedAttendanceType.code}
                              </div>
                              {selectedAttendanceType.name}
                            </div>
                          ) : (
                            <>
                              <Settings className="h-4 w-4 mr-2" />
                              Seleccionar Tipo
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <div className="p-1">
                          {getOrderedAttendanceTypes(attendanceTypes)
                            .map((type) => (
                              <DropdownMenuItem
                                key={type.id}
                                onClick={() => setSelectedAttendanceType(type)}
                                className="flex items-center gap-2 p-2 cursor-pointer"
                              >
                                <div
                                  className="w-4 h-4 rounded-full border flex items-center justify-center text-xs font-bold text-white"
                                  style={{ backgroundColor: type.color }}
                                >
                                  {type.code}
                                </div>
                                <span className="text-sm">{type.name}</span>
                              </DropdownMenuItem>
                            ))}
                          
                          {selectedAttendanceType && (
                            <>
                              <div className="border-t mt-1 pt-1">
                                <DropdownMenuItem
                                  onClick={() => setSelectedAttendanceType(null)}
                                  className="flex items-center gap-2 p-2 cursor-pointer text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                  Limpiar selección
                                </DropdownMenuItem>
                              </div>
                            </>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </h2>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                  {/* Botón para marcar todos como horas regulares */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRegular}
                    disabled={isMarkingAll}
                    className="flex items-center gap-2"
                    title="Marca todos los días disponibles como horas regulares"
                  >
                    {isMarkingAll ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Marcando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Marcar H. Regulares
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployeeId(null)
                      setShowMonthlyModal(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <BarChart className="h-4 w-4" />
                    Resumen
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTypesModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Gestionar Tipos
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Segunda fila: Barra de búsqueda e indicadores */}
              <div className="flex items-center justify-between">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendario Matrix */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Cargando empleados...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Encabezado con días */}
                  <thead className="bg-gray-50/50 sticky top-0">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-900 border-r bg-white/90 sticky left-0 z-10 min-w-[200px]">
                        Empleado
                      </th>
                      {daysInMonth.map((date, index) => {
                        const isToday = date.toDateString() === new Date().toDateString()
                        const dayOfWeek = DAYS_OF_WEEK[date.getDay()]
                        
                        return (
                          <th 
                            key={index} 
                            className={cn(
                              "p-2 text-center font-medium text-xs min-w-[50px]",
                              isToday ? "bg-blue-100 text-blue-800" : "text-gray-700"
                            )}
                          >
                            <div>{dayOfWeek}</div>
                            <div className="text-lg font-bold">{date.getDate()}</div>
                          </th>
                        )
                      })}
                      <th className="p-4 text-center font-medium text-gray-900 bg-white/90 min-w-[100px]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  
                  {/* Filas de empleados */}
                  <tbody>
                    {filteredEmployees.map((employee, employeeIndex) => (
                      <tr 
                        key={employee.id}
                        className={cn(
                          "border-b hover:bg-gray-50/50",
                          employeeIndex % 2 === 0 ? "bg-white/50" : "bg-gray-50/30"
                        )}
                      >
                        {/* Celda del empleado */}
                        <td className="p-4 border-r bg-white/90 sticky left-0 z-10">
                          <div>
                            <p className="font-medium text-sm">{getEmployeeName(employee)}</p>
                            {employee.employee_code && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {employee.employee_code}
                              </Badge>
                            )}
                          </div>
                        </td>
                        
                        {/* Celdas de días */}
                        {daysInMonth.map((date, dayIndex) => {
                          const key = formatDateKey(employee.id, date)
                          const record = attendanceRecords.get(key)
                          const isToday = date.toDateString() === new Date().toDateString()
                          const isSundayDay = isSunday(date)
                          
                          // Verificar si es feriado
                          const isHoliday = holidays.some(holiday => {
                            const holidayDate = new Date(holiday.holiday_date).toISOString().split('T')[0]
                            const checkDate = date.toISOString().split('T')[0]
                            return holidayDate === checkDate
                          })
                          
                          const isDisabled = isSundayDay || isHoliday
                          const attendanceType = record?.attendance_type as AttendanceType | undefined
                          
                          return (
                            <td 
                              key={dayIndex}
                              className={cn(
                                "p-1 text-center",
                                isToday ? "bg-blue-50" : "",
                                isDisabled ? "bg-gray-100" : ""
                              )}
                            >
                              {isDisabled ? (
                                // Mostrar círculo deshabilitado para domingos y feriados
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                                    isSundayDay ? "bg-gray-300 border-gray-400 text-gray-600" : "bg-pink-200 border-pink-400 text-pink-800"
                                  )}
                                >
                                  {isSundayDay ? 'D' : 'F'}
                                </div>
                              ) : (
                                // Círculo clickeable para días normales
                                selectedAttendanceType ? (
                                  // Click directo cuando hay tipo seleccionado
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      handleMouseDown(employee.id, date)
                                    }}
                                    onMouseEnter={() => handleMouseEnter(employee.id, date)}
                                    onDragStart={(e) => e.preventDefault()} // Prevenir drag nativo
                                    style={{
                                      backgroundColor: attendanceType?.color || 'white',
                                      borderColor: attendanceType?.color || '#d1d5db',
                                      userSelect: 'none', // Prevenir selección de texto
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none'
                                    }}
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold",
                                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                                      "select-none", // Prevenir selección
                                      attendanceType
                                        ? `border-2 text-white`
                                        : "bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50",
                                      // Resaltar si está siendo seleccionado
                                      selectedCells.has(`${employee.id}-${date.toISOString().split('T')[0]}`)
                                        ? "ring-2 ring-blue-400 ring-offset-1"
                                        : ""
                                    )}
                                    title={`Marcar como ${selectedAttendanceType.name}`}
                                  >
                                    {attendanceType?.code || ''}
                                  </button>
                                ) : (
                                  // Botón simple sin popover cuando no hay tipo seleccionado
                                  <button
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold",
                                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                                      attendanceType
                                        ? `border-2 text-white`
                                        : "bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                    )}
                                    style={{
                                      backgroundColor: attendanceType?.color || 'white',
                                      borderColor: attendanceType?.color || '#d1d5db'
                                    }}
                                    onClick={() => handleDirectAttendanceClick(employee.id, date)}
                                    title="Hacer clic para marcar (primero selecciona un tipo en el header)"
                                  >
                                    {attendanceType?.code || ''}
                                  </button>
                                )
                              )}
                            </td>
                          )
                        })}
                        
                        {/* Celda de acciones al final */}
                        <td className="p-4 text-center bg-white/90">
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployeeId(employee.id)
                                setShowMonthlyModal(true)
                              }}
                              className="h-8 w-8 p-0"
                              title="Ver detalles del empleado"
                            >
                              <BarChart className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leyenda y acciones */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            {attendanceTypes.map((type) => (
              <div key={type.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: type.color }}
                >
                  {type.code}
                </div>
                <span>{type.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-50"></div>
              <span>Hoy</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Recargar datos
                loadAttendanceRecords(currentDate.getFullYear(), currentDate.getMonth() + 1)
                toast({
                  title: "Datos recargados",
                  description: "Se han actualizado los registros de asistencia",
                })
              }}
            >
              Recargar
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de detalles mensuales */}
      <MonthlyDetailsModal
        open={showMonthlyModal}
        onOpenChange={(open) => {
          setShowMonthlyModal(open)
          if (!open) setSelectedEmployeeId(null)
        }}
        officeId={office?.code || ''}
        officeName={office?.name || ''}
        year={currentDate.getFullYear()}
        month={currentDate.getMonth() + 1}
        employees={selectedEmployeeId ? employees.filter(emp => emp.id === selectedEmployeeId) : employees}
        attendanceTypes={attendanceTypes}
        selectedEmployeeId={selectedEmployeeId}
      />

      {/* Modal de gestión de tipos de asistencia */}
      <AttendanceTypesModal
        open={showTypesModal}
        onOpenChange={setShowTypesModal}
        attendanceTypes={attendanceTypes}
        onTypesUpdated={() => {
          // Recargar tipos de asistencia
          const loadTypes = async () => {
            const types = await getAttendanceTypes()
            setAttendanceTypes(types)
          }
          loadTypes()
        }}
      />

      {/* Modal de horas extra */}
      <Dialog open={showHoursModal} onOpenChange={setShowHoursModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capturar Horas Extra</DialogTitle>
            <DialogDescription>
              ¿Cuántas horas trabajó este día?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="hours-worked" className="block text-sm font-medium mb-2">
                Horas trabajadas
              </label>
              <Input
                id="hours-worked"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                className="w-full"
                placeholder="8"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHoursModal(false)
                  setSelectedCellForHours(null)
                  setHoursWorked(8)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveExtraHours}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para marcado masivo */}
      <Dialog open={showConfirmMarkAll} onOpenChange={setShowConfirmMarkAll}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Confirmar Marcado Masivo
            </DialogTitle>
            <DialogDescription>
              Esta acción marcará automáticamente todos los días disponibles como "Horas Regulares".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Importante:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• No se cambiarán días que ya tienen asistencia marcada</li>
                <li>• No se marcarán domingos ni días festivos</li>
                <li>• No se afectarán días con vacaciones programadas</li>
                <li>• Solo se marcarán días completamente vacíos</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmMarkAll(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={executeMarkAllRegular}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirmar Marcado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Componente de prueba directa de Supabase */}
      <DirectSupabaseTest />
    </div>
  )
}