"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { OFFICES } from "@/lib/types/auth"
import {
  getEmployeesByOfficeClient,
  getVacationRequests,
  type Employee,
  type VacationRequest,
  type Holiday,
} from "@/lib/supabase/db-functions"
import {
  fetchRoleSchedulePresets,
  insertRoleSchedulePreset,
  deleteRoleSchedulePreset,
  fetchRolePositionPresets,
  insertRolePositionPreset,
  deleteRolePositionPreset,
  fetchRoleWorkstationTemplates,
  insertRoleWorkstationTemplate,
  deleteRoleWorkstationTemplate,
} from "@/lib/supabase/role-presets"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { mapOfficeIdToUUID } from "@/lib/utils/office-mapping"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  ClipboardList,
  History,
  Loader2,
  PlusCircle,
  Printer,
  Settings2,
  ShieldAlert,
  Shuffle,
  Tag,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import {
  addDays,
  eachDayOfInterval,
  format,
  getISOWeek,
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"

interface PositionDefinition {
  id: string
  code: string
  name: string
  description: string
  category: "CAS" | "Consulado"
}

type UnitPositionId = "OPERATION" | "PICKPACK" | "CONSULATE"

interface AttributeDefinition {
  id: string
  label: string
  description?: string
  employeeIds: string[]
}

interface WeekDay {
  date: string
  label: string
  shortLabel: string
  dayNumber: number
}

type ScheduleCategory = "CAS" | "Consulado"
type ScheduleRole = "supervisors" | "employees"

interface ScheduleGroup {
  supervisors: string[]
  employees: string[]
}

type ScheduleMatrix = Record<ScheduleCategory, ScheduleGroup>

interface SchedulePreset {
  id: string
  name: string
  shiftName: string
  startTime: string
  endTime: string
  scheduleMatrix: ScheduleMatrix
}

interface PositionPreset {
  id: string
  name: string
  slots: Record<string, number>
}

interface AttributePreset {
  id: string
  name: string
  assignments: Record<string, string[]>
}

interface DailyUnitAssignments {
  [dateISO: string]: Record<UnitPositionId, string[]>
}

type WorkstationCode = "O" | "R" | "F" | "WS"

type WorkstationDistribution = Record<WorkstationCode, number>

type WorkstationAssignments = Record<string, Record<string, WorkstationCode>>

interface WorkstationTemplate {
  id: string
  name: string
  distribution: WorkstationDistribution
}

interface MealSlotConfig {
  id: string
  label: string
  startTime: string
  endTime: string
  capacity: number
  appliesTo: UnitPositionId[]
  enabled: boolean
  fixedEmployeeIds: string[]
  // Capacidad específica por unidad
  operationCapacity?: number
  pickpackCapacity?: number
}

type DailyMealAssignments = Record<string, Record<string, string[]>>

interface MealSlotTemplate {
  id: string
  name: string
  slots: MealSlotConfig[]
}

interface SavedRoleDayEntry {
  date: string
  label: string
  displayValue: string
  locked: boolean
  base: string
}

interface SavedRoleAssignment {
  employeeId: string
  displayName: string
  employeeCode?: string
  attributeLabels: string[]
  dayEntries: SavedRoleDayEntry[]
  position: Pick<PositionDefinition, "id" | "code" | "name">
  isFixed: boolean
  attributeIds: string[]
}

interface RoleSnapshot {
  id: string
  createdAt: string
  officeId: string
  officeName: string
  weekStartDate: string
  weekNumber?: number
  weekRangeLabel: string
  shiftName: string
  startTime: string
  endTime: string
  notes: string
  defaultShiftLabel: string
  scheduleMatrix: ScheduleMatrix
  weekDays: WeekDay[]
  totalEmployees: number
  totalPositions: number
  attributeColumns: Array<Pick<AttributeDefinition, "id" | "label">>
  assignments: SavedRoleAssignment[]
}

type WeeklySchedulePlan = Record<ScheduleCategory, Record<ScheduleRole, number[]>>

type SaturdayTeam = "team1" | "team2"

// Calendario fijo de descansos de supervisores para sábados en 2026
// Formato: fecha del sábado -> array de nombres de supervisores que descansan
const SUPERVISOR_SATURDAY_REST_CALENDAR_2026: Record<string, string[]> = {
  // ENERO
  "2026-01-03": ["Vanessa", "Jose Angel"],
  "2026-01-10": ["Maria", "Viridiana"],
  "2026-01-17": ["Vanessa", "Jose Angel"],
  "2026-01-24": ["Maria", "Viridiana"],
  "2026-01-31": ["Vanessa", "Jose Angel"],
  // FEBRERO
  "2026-02-07": ["Vanessa", "Maria"],
  "2026-02-14": ["Jose Angel", "Viridiana"],
  "2026-02-21": ["Vanessa", "Maria"],
  "2026-02-28": ["Jose Angel", "Viridiana"],
  // MARZO
  "2026-03-07": ["Vanessa", "Viridiana"],
  "2026-03-14": ["Jose Angel", "Maria"],
  "2026-03-21": ["Vanessa", "Viridiana"],
  "2026-03-28": ["Jose Angel", "Maria"],
  // ABRIL
  "2026-04-04": ["Vanessa", "Jose Angel"],
  "2026-04-11": ["Maria", "Viridiana"],
  "2026-04-18": ["Vanessa", "Jose Angel"],
  "2026-04-25": ["Maria", "Viridiana"],
  // MAYO
  "2026-05-02": ["Vanessa", "Maria"],
  "2026-05-09": ["Jose Angel", "Viridiana"],
  "2026-05-16": ["Vanessa", "Maria"],
  "2026-05-23": ["Jose Angel", "Viridiana"],
  "2026-05-30": ["Vanessa", "Maria"],
  // JUNIO
  "2026-06-06": ["Vanessa", "Viridiana"],
  "2026-06-13": ["Jose Angel", "Maria"],
  "2026-06-20": ["Vanessa", "Viridiana"],
  "2026-06-27": ["Jose Angel", "Maria"],
  // JULIO
  "2026-07-04": ["Vanessa", "Jose Angel"],
  "2026-07-11": ["Maria", "Viridiana"],
  "2026-07-18": ["Vanessa", "Jose Angel"],
  "2026-07-25": ["Maria", "Viridiana"],
  // AGOSTO
  "2026-08-01": ["Vanessa", "Maria"],
  "2026-08-08": ["Jose Angel", "Viridiana"],
  "2026-08-15": ["Vanessa", "Maria"],
  "2026-08-22": ["Jose Angel", "Viridiana"],
  "2026-08-29": ["Vanessa", "Maria"],
  // SEPTIEMBRE
  "2026-09-05": ["Vanessa", "Viridiana"],
  "2026-09-12": ["Jose Angel", "Maria"],
  "2026-09-19": ["Vanessa", "Viridiana"],
  "2026-09-26": ["Jose Angel", "Maria"],
  // OCTUBRE
  "2026-10-03": ["Vanessa", "Jose Angel"],
  "2026-10-10": ["Maria", "Viridiana"],
  "2026-10-17": ["Vanessa", "Jose Angel"],
  "2026-10-24": ["Maria", "Viridiana"],
  "2026-10-31": ["Vanessa", "Jose Angel"],
  // NOVIEMBRE
  "2026-11-07": ["Vanessa", "Maria"],
  "2026-11-14": ["Jose Angel", "Viridiana"],
  "2026-11-21": ["Vanessa", "Maria"],
  "2026-11-28": ["Jose Angel", "Viridiana"],
  // DICIEMBRE
  "2026-12-05": ["Vanessa", "Viridiana"],
  "2026-12-12": ["Jose Angel", "Maria"],
  "2026-12-19": ["Vanessa", "Viridiana"],
  "2026-12-26": ["Jose Angel", "Maria"],
}

const MEAL_ALLOWED_POSITION_IDS = new Set(["OPERATION", "PICKPACK"])

const ALL_POSITIONS: PositionDefinition[] = [
  {
    id: "CAS_SUPERVISOR",
    code: "SUP-CAS",
    name: "Supervisor CAS",
    description: "Líder de equipo CAS",
    category: "CAS",
  },
  {
    id: "OPERATION",
    code: "OPER",
    name: "Operación",
    description: "Personal operativo CAS",
    category: "CAS",
  },
  {
    id: "PICKPACK_SUPERVISOR",
    code: "SUP-PP",
    name: "Supervisor Pick & Pack",
    description: "Líder de Pick & Pack",
    category: "CAS",
  },
  {
    id: "PICKPACK",
    code: "PP",
    name: "Pick & Pack",
    description: "Colaborador Pick & Pack",
    category: "CAS",
  },
  {
    id: "PICKPACK_PASSBACK",
    code: "PP-PB",
    name: "Pick & Pack Passback",
    description: "PP con devoluciones",
    category: "CAS",
  },
  {
    id: "CONSULATE_SUPERVISOR",
    code: "SUP-CON",
    name: "Supervisor Consulado",
    description: "Líder Consulado",
    category: "Consulado",
  },
  {
    id: "CONSULATE",
    code: "CON",
    name: "Consulado",
    description: "Personal Consulado",
    category: "Consulado",
  },
]

const SUPERVISOR_POSITIONS = ALL_POSITIONS.filter((p) => p.id.includes("SUPERVISOR"))

const UNIT_POSITIONS = [
  ALL_POSITIONS.find((p) => p.id === "OPERATION")!,
  ALL_POSITIONS.find((p) => p.id === "PICKPACK")!,
  ALL_POSITIONS.find((p) => p.id === "CONSULATE")!,
]

const CONSULATE_POSITION_IDS = ["CONSULATE_SUPERVISOR", "CONSULATE"] as const

const VACATION_RESTRICTED_POSITION_IDS = [
  "PICKPACK_SUPERVISOR",
  "CAS_SUPERVISOR",
  "CONSULATE_SUPERVISOR",
] as const

const SATURDAY_TEAM_POSITION_IDS = new Set(["OPERATION", "PICKPACK"])

const isVacationRestrictedPositionId = (positionId: string): boolean =>
  VACATION_RESTRICTED_POSITION_IDS.includes(positionId as (typeof VACATION_RESTRICTED_POSITION_IDS)[number])

const WORKSTATION_CODES: WorkstationCode[] = ["O", "R", "F", "WS"]

const WORKSTATION_CODE_LABELS: Record<WorkstationCode, string> = {
  O: "Operación",
  R: "Recepción",
  F: "Folio",
  WS: "WS",
}

const POSITION_LABEL_OVERRIDES: Record<string, string> = {
  PICKPACK: "Pick & Pack",
  PICKPACK_PASSBACK: "Pick & Pack Passback",
  PICKPACK_SUPERVISOR: "Supervisor Pick & Pack",
}

const POSITION_ROW_CLASSES: Record<string, string> = {
  CAS_SUPERVISOR: "bg-blue-50 border-l-4 border-l-blue-500",
  PICKPACK_SUPERVISOR: "bg-purple-50 border-l-4 border-l-purple-500",
  CONSULATE_SUPERVISOR: "bg-emerald-50 border-l-4 border-l-emerald-500",
  OPERATION: "bg-slate-50",
  PICKPACK: "bg-slate-50",
  PICKPACK_PASSBACK: "bg-slate-50",
  CONSULATE: "bg-slate-50",
}

const DEFAULT_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: "ws",
    label: "WS",
    description: "Responsable de Seguridad Operacional asignado para la semana.",
    employeeIds: [],
  },
  {
    id: "training",
    label: "Entrenamiento",
    description: "Colaboradores en etapa de entrenamiento y acompañamiento.",
    employeeIds: [],
  },
  {
    id: "consulado",
    label: "Consulado",
    description: "Equipo designado para soporte directo en Consulado.",
    employeeIds: [],
  },
  {
    id: "restricted_pickpack",
    label: "Restricción P&P",
    description: "Empleados que NO pueden ser asignados a Pick & Pack esta semana.",
    employeeIds: [],
  },
  {
    id: "restricted_consulate",
    label: "Restricción Consulado",
    description: "Empleados que NO pueden ser asignados a Consulado esta semana.",
    employeeIds: [],
  },
]

const MEAL_TIME_OPTIONS = [
  { value: "11:00", label: "11:00" },
  { value: "11:30", label: "11:30" },
  { value: "12:00", label: "12:00" },
  { value: "12:30", label: "12:30" },
  { value: "13:00", label: "13:00" },
  { value: "13:30", label: "13:30" },
  { value: "14:00", label: "14:00" },
  { value: "14:30", label: "14:30" },
  { value: "15:00", label: "15:00" },
]

const SCHEDULE_PLAN_DAY_COUNT = 6
const SATURDAY_INDEX = 5

// Calcula la semana del mes basándose en el día del mes
const getWeekOfMonth = (dateString: string): number => {
  try {
    const date = parseISO(dateString)
    const dayOfMonth = Number(format(date, "d"))
    return Math.ceil(dayOfMonth / 7)
  } catch {
    return 1
  }
}

// Detecta qué equipo sabatino debe descansar basado en la semana del mes y la paridad configurada
const getRestingSaturdayTeam = <T extends string>(
  weekStartDate: string,
  parityRestTeam: T,
  alternateTeam: T
): T => {
  const weekOfMonth = getWeekOfMonth(weekStartDate)
  const isEvenWeek = weekOfMonth % 2 === 0
  
  // Si es semana par, descansa el equipo configurado en paridad
  // Si es semana impar, descansa el otro equipo
  if (isEvenWeek) {
    return parityRestTeam
  } else {
    return alternateTeam
  }
}

// Obtiene los nombres de supervisores que descansan en un sábado específico según el calendario fijo
const getSupervisorRestNamesForSaturday = (saturdayDate: string): string[] => {
  return SUPERVISOR_SATURDAY_REST_CALENDAR_2026[saturdayDate] || []
}

// Encuentra IDs de empleados que coincidan con los nombres de supervisores que descansan
const getSupervisorRestIdsForSaturday = (
  saturdayDate: string,
  employees: Employee[]
): Set<string> => {
  const restNames = getSupervisorRestNamesForSaturday(saturdayDate)
  if (restNames.length === 0) return new Set()
  
  const restIds = new Set<string>()
  const normalizedRestNames = restNames.map(name => 
    name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  )
  
  employees.forEach(employee => {
    const employeeName = (employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    
    // Verificar si el nombre del empleado contiene alguno de los nombres que descansan
    if (normalizedRestNames.some(restName => employeeName.includes(restName) || restName.includes(employeeName))) {
      restIds.add(employee.id)
    }
  })
  
  return restIds
}

/**
 * ✅ IMPLEMENTADO: Rotación automática de supervisores
 * 
 * Funcionalidad: El supervisor que trabaja en Consulado una semana 
 * es asignado automáticamente como el supervisor de CAS con el horario 
 * más temprano (apertura) la siguiente semana.
 * 
 * Implementación:
 * 1. Al generar un rol, se guarda el supervisor de Consulado en localStorage
 * 2. Al cargar la siguiente semana, se detecta automáticamente
 * 3. Se asigna ese supervisor a CAS_SUPERVISOR en la primera posición
 * 4. Se configura schedulePlan para usar el índice 0 (primer horario = apertura)
 * 5. Se muestra notificación de éxito al usuario
 * 
 * Storage key: role-consulate-supervisor-rotation-{officeId}
 * Estructura guardada:
 * {
 *   weekStartDate: "2026-01-06",
 *   supervisorId: "uuid-del-supervisor",
 *   supervisorName: "Nombre del Supervisor",
 *   savedAt: "timestamp ISO"
 * }
 */

const createDefaultWeeklySchedulePlan = (): WeeklySchedulePlan => ({
  CAS: {
    supervisors: Array.from({ length: SCHEDULE_PLAN_DAY_COUNT }, () => 0),
    employees: Array.from({ length: SCHEDULE_PLAN_DAY_COUNT }, () => 0),
  },
  Consulado: {
    supervisors: Array.from({ length: SCHEDULE_PLAN_DAY_COUNT }, () => 0),
    employees: Array.from({ length: SCHEDULE_PLAN_DAY_COUNT }, () => 0),
  },
})

const clampWeeklySchedulePlan = (
  currentPlan: WeeklySchedulePlan | null | undefined,
  matrix: ScheduleMatrix,
  dayCount: number
): WeeklySchedulePlan => {
  const normalizedDayCount = Math.max(dayCount, SCHEDULE_PLAN_DAY_COUNT)
  const nextPlan: WeeklySchedulePlan = {
    CAS: { supervisors: [], employees: [] },
    Consulado: { supervisors: [], employees: [] },
  }

  const areas: ScheduleCategory[] = ["CAS", "Consulado"]
  const roles: ScheduleRole[] = ["supervisors", "employees"]

  for (const area of areas) {
    for (const role of roles) {
      const options = matrix[area]?.[role] ?? []
      const maxIndex = options.length - 1
      const existing = currentPlan?.[area]?.[role] ?? []
      const clamped: number[] = []
      for (let index = 0; index < normalizedDayCount; index += 1) {
        const rawValue = existing[index] ?? 0
        if (options.length === 0) {
          clamped.push(-1)
          continue
        }
        if (rawValue < 0) {
          clamped.push(-1)
          continue
        }
        clamped.push(Math.min(rawValue, maxIndex))
      }
      nextPlan[area][role] = clamped
    }
  }

  return nextPlan
}

const POSITION_SCHEDULE_MAPPING: Record<string, { area: ScheduleCategory; role: ScheduleRole }> = {
  CAS_SUPERVISOR: { area: "CAS", role: "supervisors" },
  PICKPACK_SUPERVISOR: { area: "CAS", role: "supervisors" },
  CONSULATE_SUPERVISOR: { area: "Consulado", role: "supervisors" },
  OPERATION: { area: "CAS", role: "employees" },
  PICKPACK: { area: "CAS", role: "employees" },
  PICKPACK_PASSBACK: { area: "CAS", role: "employees" },
  CONSULATE: { area: "Consulado", role: "employees" },
}

const SCHEDULE_PLAN_SECTIONS: Array<{
  key: string
  label: string
  area: ScheduleCategory
  role: ScheduleRole
  description: string
}> = [
  {
    key: "CAS-supervisors",
    label: "CAS • Supervisores",
    area: "CAS",
    role: "supervisors",
    description: "Aplica al personal supervisor de CAS y Pick & Pack.",
  },
  {
    key: "CAS-employees",
    label: "CAS • Colaboradores",
    area: "CAS",
    role: "employees",
    description: "Se asigna a los colaboradores operativos de CAS y Pick & Pack.",
  },
  {
    key: "Consulado-supervisors",
    label: "Consulado • Supervisores",
    area: "Consulado",
    role: "supervisors",
    description: "Horarios para líderes asignados al consulado.",
  },
  {
    key: "Consulado-employees",
    label: "Consulado • Colaboradores",
    area: "Consulado",
    role: "employees",
    description: "Horarios para personal operativo en consulado.",
  },
]

const cloneScheduleMatrix = (matrix: ScheduleMatrix): ScheduleMatrix => ({
  CAS: {
    supervisors: [...matrix.CAS.supervisors],
    employees: [...matrix.CAS.employees],
  },
  Consulado: {
    supervisors: [...matrix.Consulado.supervisors],
    employees: [...matrix.Consulado.employees],
  },
})

const clonePositionSlots = (slots: Record<string, number>): Record<string, number> => ({
  ...Object.fromEntries(Object.entries(slots || {}).map(([key, value]) => [key, Number(value) || 0])),
})

const cloneDefaultAttributes = (): AttributeDefinition[] =>
  DEFAULT_ATTRIBUTES.map((attribute) => ({
    ...attribute,
    employeeIds: [...attribute.employeeIds],
  }))

const createEmptyWorkstationDistribution = (): WorkstationDistribution => ({
  O: 0,
  R: 0,
  F: 0,
  WS: 0,
})

const normalizeWorkstationDistribution = (input: unknown): WorkstationDistribution => {
  const base = createEmptyWorkstationDistribution()
  if (!input || typeof input !== "object") {
    return base
  }
  const raw = input as Record<string, unknown>
  for (const code of WORKSTATION_CODES) {
    const value = raw[code]
    const numeric = typeof value === "number" ? value : Number(value)
    base[code] = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0
  }
  return base
}

const cloneWorkstationDistribution = (distribution: WorkstationDistribution): WorkstationDistribution => ({
  O: Math.max(0, Math.floor(distribution.O || 0)),
  R: Math.max(0, Math.floor(distribution.R || 0)),
  F: Math.max(0, Math.floor(distribution.F || 0)),
  WS: Math.max(0, Math.floor(distribution.WS || 0)),
})

const sumWorkstationDistribution = (distribution: WorkstationDistribution): number =>
  WORKSTATION_CODES.reduce((total, code) => total + (distribution[code] || 0), 0)

const clampWorkstationDistribution = (distribution: WorkstationDistribution, limit: number): WorkstationDistribution => {
  if (limit <= 0) {
    return createEmptyWorkstationDistribution()
  }
  const sanitized = cloneWorkstationDistribution(distribution)
  const result = createEmptyWorkstationDistribution()
  let remaining = Math.max(0, Math.floor(limit))

  // Asigna al menos una plaza por código si hay disponibilidad y demanda
  for (const code of WORKSTATION_CODES) {
    if (remaining === 0) break
    const desired = sanitized[code]
    if (desired <= 0) continue
    result[code] = 1
    sanitized[code] = desired - 1
    remaining -= 1
  }

  // Reparte plazas restantes respetando el orden de códigos
  for (const code of WORKSTATION_CODES) {
    if (remaining === 0) break
    const desired = sanitized[code]
    if (desired <= 0) continue
    const applied = Math.min(desired, remaining)
    result[code] += applied
    remaining -= applied
  }

  return result
}

const expandWorkstationDistribution = (distribution: WorkstationDistribution): WorkstationCode[] => {
  const entries: WorkstationCode[] = []
  for (const code of WORKSTATION_CODES) {
    const count = Math.max(0, Math.floor(distribution[code] || 0))
    for (let index = 0; index < count; index += 1) {
      entries.push(code)
    }
  }
  return entries
}

const sanitizeWorkstationDistributionForEmployees = (
  distribution: WorkstationDistribution,
  employeeCount: number
): WorkstationDistribution => {
  if (employeeCount <= 0) {
    return createEmptyWorkstationDistribution()
  }

  const sanitized = cloneWorkstationDistribution(distribution)
  let total = sumWorkstationDistribution(sanitized)

  if (total <= 0) {
    sanitized.O = employeeCount
    return sanitized
  }

  if (total < employeeCount) {
    sanitized.O += employeeCount - total
    return sanitized
  }

  if (total === employeeCount) {
    return sanitized
  }

  return clampWorkstationDistribution(sanitized, employeeCount)
}

const generateWorkstationRotationAssignments = (
  baseDistribution: WorkstationDistribution,
  employees: Employee[],
  workingWeekDays: Array<{ day: WeekDay; dayIndex: number }>,
  vacationMap: Record<string, Set<string>>,
  holidaySet: Set<string>
): {
  assignments: WorkstationAssignments
  appliedDistribution: WorkstationDistribution
  shortagesByDate: Record<string, number>
} => {
  const employeeIds = employees
    .map((employee) => employee.id)
    .filter((employeeId): employeeId is string => Boolean(employeeId))

  const appliedDistribution = sanitizeWorkstationDistributionForEmployees(baseDistribution, employeeIds.length)
  const codeSequence = expandWorkstationDistribution(appliedDistribution)

  if (employeeIds.length === 0 || codeSequence.length === 0) {
    return {
      assignments: {},
      appliedDistribution,
      shortagesByDate: {},
    }
  }

  const assignments: WorkstationAssignments = {}
  const shortagesByDate: Record<string, number> = {}

  let rotationDayIndex = 0

  for (const { day } of workingWeekDays) {
    const date = day.date

    if (holidaySet.has(date)) {
      continue
    }

    const usedEmployees = new Set<string>()
    const orderedIndices: number[] = []

    const offset = employeeIds.length > 0 ? rotationDayIndex % employeeIds.length : 0
    for (let index = 0; index < employeeIds.length; index += 1) {
      orderedIndices.push((offset + index) % employeeIds.length)
    }

    let dayShortage = 0

    for (const code of codeSequence) {
      let assigned = false

      for (const positionIndex of orderedIndices) {
        const employee = employees[positionIndex]
        if (!employee) continue
        const employeeId = employee.id
        if (!employeeId) continue
        if (usedEmployees.has(employeeId)) continue
        if (vacationMap[employeeId]?.has(date)) continue

        if (!assignments[employeeId]) {
          assignments[employeeId] = {}
        }
        assignments[employeeId][date] = code
        usedEmployees.add(employeeId)
        assigned = true
        break
      }

      if (!assigned) {
        dayShortage += 1
      }
    }

    if (dayShortage > 0) {
      shortagesByDate[date] = dayShortage
    }

    rotationDayIndex += 1
  }

  return {
    assignments,
    appliedDistribution,
    shortagesByDate,
  }
}

const normalizeWorkstationValue = (value: string | null | undefined): WorkstationCode | null => {
  if (!value) return null
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  if (normalized.includes("WS")) return "WS"
  if (normalized.startsWith("WS")) return "WS"
  if (normalized.startsWith("O") || normalized.includes("OPER")) return "O"
  if (normalized.startsWith("R") || normalized.includes("RECEP")) return "R"
  if (normalized.startsWith("F") || normalized.includes("FOL")) return "F"
  return null
}

const createEmptyAssignments = (): Record<string, string[]> =>
  ALL_POSITIONS.reduce<Record<string, string[]>>((acc, position) => {
    acc[position.id] = []
    return acc
  }, {})

const createDefaultPositionSlots = (): Record<string, number> =>
  ALL_POSITIONS.reduce<Record<string, number>>((acc, position) => {
    acc[position.id] = 0
    return acc
  }, {})

const shouldExcludeFromRoster = (employee: Employee): boolean => {
  if (!employee) return true
  if (employee.active === false) return true
  const tag = employee.office_tag?.toLowerCase() || ""
  if (tag.includes("spoc")) return true
  const positionLabel = employee.position?.toLowerCase() || ""
  return positionLabel.includes("spoc")
}

const getPositionDisplayLabel = (
  position: Pick<PositionDefinition, "id" | "name"> | PositionDefinition | null | undefined
): string => {
  if (!position) return "Sin puesto"
  return POSITION_LABEL_OVERRIDES[position.id] ?? position.name
}

const getPositionRowClass = (
  position: Pick<PositionDefinition, "id"> | PositionDefinition | null | undefined
): string => {
  if (!position) return ""
  return POSITION_ROW_CLASSES[position.id] ?? ""
}

const getSlotLabelForPosition = (positionId: string): string =>
  isSupervisorPositionId(positionId) ? "Supervisores" : "Puestos"

const getSlotHelpText = (positionId: string): string =>
  isSupervisorPositionId(positionId)
    ? "Ajusta la cantidad de líderes necesarios para el turno."
    : "La asignación se realiza automáticamente al generar el rol."

const getFixLabelForPosition = (positionId: string): string =>
  isSupervisorPositionId(positionId) ? "Fijar supervisor específico" : "Fijar colaborador específico"

const getFixPlaceholderForPosition = (positionId: string): string =>
  isSupervisorPositionId(positionId) ? "Seleccionar supervisor" : "Seleccionar colaborador"

const getEmployeeDisplayName = (employee: Employee | null | undefined): string => {
  if (!employee) return "Sin asignar"
  if (employee.first_name || employee.last_name) {
    return [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim()
  }
  return employee.name || "Sin nombre"
}

const sortEmployeesByName = (a: Employee, b: Employee): number => {
  return getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), "es", { sensitivity: "base" })
}

const isSupervisorPositionId = (positionId: string): boolean =>
  SUPERVISOR_POSITIONS.some((position) => position.id === positionId)

const isConsulatePositionId = (positionId: string): boolean =>
  CONSULATE_POSITION_IDS.includes(positionId as (typeof CONSULATE_POSITION_IDS)[number])

const isEmployeeEligibleForPosition = (employee: Employee | null | undefined, positionId: string): boolean => {
  if (!employee) return false
  const employeeRole = employee.position?.toLowerCase() || ""
  const isEmployeeSupervisor = employeeRole.includes("supervisor") || employeeRole.includes("coord")
  const requiresSupervisor = isSupervisorPositionId(positionId)
  if (requiresSupervisor) {
    return isEmployeeSupervisor
  }
  return !isEmployeeSupervisor
}

const getNextWeekMondayISO = (): string => {
  const today = new Date()
  const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 })
  return format(nextMonday, "yyyy-MM-dd")
}

const computeWeekDays = (weekStartISO: string): WeekDay[] => {
  const start = parseISO(weekStartISO)
  return Array.from({ length: 6 }, (_, index) => {
    const current = addDays(start, index)
    return {
      date: format(current, "yyyy-MM-dd"),
      label: format(current, "EEEE", { locale: es }),
      shortLabel: format(current, "EEE", { locale: es }),
      dayNumber: Number(format(current, "d")),
    }
  })
}

const formatISODateLong = (isoDate: string): string => {
  try {
    return format(parseISO(isoDate), "EEEE d 'de' MMMM yyyy", { locale: es })
  } catch (error) {
    return isoDate
  }
}

const formatWeekRange = (weekDays: WeekDay[]): string => {
  if (weekDays.length === 0) return ""
  const start = parseISO(weekDays[0].date)
  const end = parseISO(weekDays[weekDays.length - 1].date)
  const startLabel = format(start, "d MMM", { locale: es })
  const endLabel = format(end, "d MMM", { locale: es })
  return `${startLabel} - ${endLabel}`
}

const formatScheduleList = (entries: string[]): string => {
  if (!entries || entries.length === 0) return "Sin horarios"
  return entries.join(" · ")
}

const parseISODate = (isoDate: string): Date => parseISO(isoDate)

const getISOWeekNumber = (date: Date): number => getISOWeek(date)

const normalizeScheduleMatrixData = (input: unknown): ScheduleMatrix => {
  const fallback: ScheduleMatrix = {
    CAS: { supervisors: [], employees: [] },
    Consulado: { supervisors: [], employees: [] },
  }
  if (!input || typeof input !== "object") return fallback

  const raw = input as Record<string, unknown>

  const toStringArray = (value: unknown): string[] => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string")
    }
    return []
  }

  const readGroup = (key: keyof ScheduleMatrix): ScheduleGroup => {
    const value = raw[key]
    if (!value || typeof value !== "object") {
      return { supervisors: [], employees: [] }
    }
    const group = value as Record<string, unknown>
    return {
      supervisors: toStringArray(group.supervisors),
      employees: toStringArray(group.employees),
    }
  }

  return {
    CAS: readGroup("CAS"),
    Consulado: readGroup("Consulado"),
  }
}

const shuffleArray = <T,>(source: T[]): T[] => {
  const copy = [...source]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

const shuffleAndPick = <T,>(source: T[], count: number): { selected: T[]; remaining: T[] } => {
  if (count <= 0) return { selected: [], remaining: [...source] }
  const shuffled = shuffleArray(source)
  const selected = shuffled.slice(0, count)
  const remaining = shuffled.slice(count)
  return { selected, remaining }
}

const buildVacationMap = (
  requests: VacationRequest[],
  startDateISO: string,
  endDateISO: string,
): Record<string, Set<string>> => {
  if (!Array.isArray(requests) || requests.length === 0) return {}
  const map: Record<string, Set<string>> = {}
  const rangeStart = parseISO(startDateISO)
  const rangeEnd = parseISO(endDateISO)

  for (const request of requests) {
    if (!request.employee_id) continue
    const requestStart = parseISO(request.start_date)
    const requestEnd = parseISO(request.end_date)
    if (isAfter(requestStart, rangeEnd) || isBefore(requestEnd, rangeStart)) continue

    const overlapStart = isAfter(requestStart, rangeStart) ? requestStart : rangeStart
    const overlapEnd = isBefore(requestEnd, rangeEnd) ? requestEnd : rangeEnd
    const daysInRange = eachDayOfInterval({ start: overlapStart, end: overlapEnd })
    for (const date of daysInRange) {
      const iso = format(date, "yyyy-MM-dd")
      if (!map[request.employee_id]) {
        map[request.employee_id] = new Set<string>()
      }
      map[request.employee_id].add(iso)
    }
  }

  return map
}

const fetchHolidaysInRangeClient = async (
  officeId: string,
  startDate: string,
  endDate: string
): Promise<Holiday[]> => {
  try {
    const supabase = createClientSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)

    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .eq("office_id", realOfficeId)
      .eq("is_active", true)
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate)
      .order("holiday_date", { ascending: true })

    if (error) {
      const typedError = error as { code?: string; message?: string; details?: string }
      const hasMeaningfulInfo = Boolean(typedError.code || typedError.message || typedError.details)

      if (
        typedError.code === "PGRST116" ||
        typedError.code === "PGRST205" ||
        typedError.message?.includes("does not exist")
      ) {
        return []
      }

      if (hasMeaningfulInfo) {
        console.error("Error al obtener días festivos (cliente):", typedError)
        return []
      }

      // Respuesta vacía/no informativa: tratamos la petición como éxito silencioso.
      return data || []
    }

    return data || []
  } catch (error) {
    console.error("Error inesperado al traer días festivos:", error)
    return []
  }
}

export default function GeneradorRolPage() {
  const params = useParams()
  const { toast } = useToast()

  const officeParam = typeof params.officeId === "string" ? params.officeId : params.officeId?.[0] || ""
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeParam.toLowerCase())

  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() => createEmptyAssignments())
  const [positionSlots, setPositionSlots] = useState<Record<string, number>>(() => createDefaultPositionSlots())
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(() => cloneDefaultAttributes())
  const [attributePresets, setAttributePresets] = useState<AttributePreset[]>([])
  const [selectedAttributePresetId, setSelectedAttributePresetId] = useState<string | null>(null)
  const [isSaveAttributePresetModalOpen, setIsSaveAttributePresetModalOpen] = useState(false)
  const [attributePresetName, setAttributePresetName] = useState("")
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false)
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false)
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false)
  const [isOperationalModalOpen, setIsOperationalModalOpen] = useState(false)
  const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false)
  const [isRoleGenerated, setIsRoleGenerated] = useState(false)
  const [fixedEmployeeIds, setFixedEmployeeIds] = useState<string[]>([])

  const [savedRoles, setSavedRoles] = useState<RoleSnapshot[]>([])
  const [isSavedRolesModalOpen, setIsSavedRolesModalOpen] = useState(false)
  const [positionPresets, setPositionPresets] = useState<PositionPreset[]>([])
  const [selectedPositionPresetId, setSelectedPositionPresetId] = useState<string | null>(null)
  const [isSavePositionPresetModalOpen, setIsSavePositionPresetModalOpen] = useState(false)
  const [positionPresetName, setPositionPresetName] = useState("")
  const [isLoadingPositionPresets, setIsLoadingPositionPresets] = useState(false)
  const [isSavingPositionPreset, setIsSavingPositionPreset] = useState(false)
  const [deletingPositionPresetId, setDeletingPositionPresetId] = useState<string | null>(null)
  const [shouldFinalizeGeneration, setShouldFinalizeGeneration] = useState(false)
  const [dailyUnitAssignments, setDailyUnitAssignments] = useState<DailyUnitAssignments>({})
  const [unitShortages, setUnitShortages] = useState<Record<UnitPositionId, number>>({
    OPERATION: 0,
    PICKPACK: 0,
    CONSULATE: 0,
  })
  const [mealSlots, setMealSlots] = useState<MealSlotConfig[]>([])
  const [dailyMealAssignments, setDailyMealAssignments] = useState<DailyMealAssignments>({})
  const [isMealPlannerOpen, setIsMealPlannerOpen] = useState(false)
  const [mealSlotDrafts, setMealSlotDrafts] = useState<MealSlotConfig[]>([])
  const [mealTemplates, setMealTemplates] = useState<MealSlotTemplate[]>([])
  const [selectedMealTemplateId, setSelectedMealTemplateId] = useState<string | null>(null)
  const [isSaveMealTemplateModalOpen, setIsSaveMealTemplateModalOpen] = useState(false)
  const [mealTemplateName, setMealTemplateName] = useState("")
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)
  const [isSaturdayTeamsModalOpen, setIsSaturdayTeamsModalOpen] = useState(false)
  const [saturdayTeamAssignments, setSaturdayTeamAssignments] =
    useState<Record<string, SaturdayTeam>>({})
  const [saturdayParityRestTeam, setSaturdayParityRestTeam] =
    useState<SaturdayTeam>("team1")
  const [areSaturdayTeamsLoaded, setAreSaturdayTeamsLoaded] = useState(false)
  const [isSaturdayParityLoaded, setIsSaturdayParityLoaded] = useState(false)
  const [workstationTemplates, setWorkstationTemplates] = useState<WorkstationTemplate[]>([])
  const [selectedWorkstationTemplateId, setSelectedWorkstationTemplateId] = useState<string | null>(null)
  const [isLoadingWorkstationTemplates, setIsLoadingWorkstationTemplates] = useState(false)
  const [isSavingWorkstationTemplate, setIsSavingWorkstationTemplate] = useState(false)
  const [deletingWorkstationTemplateId, setDeletingWorkstationTemplateId] = useState<string | null>(null)
  const [isSaveWorkstationTemplateModalOpen, setIsSaveWorkstationTemplateModalOpen] = useState(false)
  const [workstationTemplateName, setWorkstationTemplateName] = useState("")
  const [workstationTemplateDistribution, setWorkstationTemplateDistribution] = useState<WorkstationDistribution>(() =>
    createEmptyWorkstationDistribution()
  )
  const [workstationDistribution, setWorkstationDistribution] = useState<WorkstationDistribution>(() =>
    createEmptyWorkstationDistribution()
  )

  // Estados para el calendario de supervisores y rotación
  const [showSupervisorCalendar, setShowSupervisorCalendar] = useState(false)
  const [previousWeekConsulateSupervisor, setPreviousWeekConsulateSupervisor] = useState<string | null>(null)

  const [weekStartDate, setWeekStartDate] = useState<string>(getNextWeekMondayISO())
  const [ppSupervisorSchedules, setPpSupervisorSchedules] = useState<string[]>(() => ["07:00 - 15:00"])
  const [showWeeklyPlan, setShowWeeklyPlan] = useState<boolean>(false)
  const [startTime, setStartTime] = useState("07:00")
  const [endTime, setEndTime] = useState("17:00")
  const [shiftName, setShiftName] = useState("Turno general")
  const [notes, setNotes] = useState("")
  const [scheduleMatrix, setScheduleMatrix] = useState<ScheduleMatrix>(() => ({
    CAS: {
      supervisors: ["07:00 - 15:00"],
      employees: ["07:00 - 15:00"],
    },
    Consulado: {
      supervisors: ["08:00 - 16:00"],
      employees: ["08:00 - 16:00"],
    },
  }))
  const [weeklySchedulePlan, setWeeklySchedulePlan] = useState<WeeklySchedulePlan>(() => createDefaultWeeklySchedulePlan())
  const [schedulePresets, setSchedulePresets] = useState<SchedulePreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [isSaveScheduleModalOpen, setIsSaveScheduleModalOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [isLoadingSchedulePresets, setIsLoadingSchedulePresets] = useState(false)
  const [isSavingSchedulePreset, setIsSavingSchedulePreset] = useState(false)
  const [deletingSchedulePresetId, setDeletingSchedulePresetId] = useState<string | null>(null)

  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [vacationMap, setVacationMap] = useState<Record<string, Set<string>>>({})
  const employeesWithVacation = useMemo(() => {
    const entries = Object.entries(vacationMap)
    if (entries.length === 0) {
      return new Set<string>()
    }
    const withDays = entries
      .filter(([, days]) => days && days.size > 0)
      .map(([employeeId]) => employeeId)
    return new Set(withDays)
  }, [vacationMap])
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, Record<string, string>>>({})
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [isWorkstationModalOpen, setIsWorkstationModalOpen] = useState(false)
  const [workstationAssignments, setWorkstationAssignments] = useState<WorkstationAssignments>({})
  const [isSupervisorWeekendModalOpen, setIsSupervisorWeekendModalOpen] = useState(false)
  const [supervisorWeekendAssignments, setSupervisorWeekendAssignments] = useState<Record<string, "team-a" | "team-b">>({})
  const [supervisorParityRestTeam, setSupervisorParityRestTeam] = useState<"team-a" | "team-b">("team-b")

  const attributePresetStorageKey = useMemo(() => (office ? `role-attribute-presets-${office.id}` : null), [office])
  const attributeAssignmentsStorageKey = useMemo(() => (office ? `role-attribute-assignments-${office.id}` : null), [office])
  const positionSlotsStorageKey = useMemo(() => (office ? `role-position-slots-${office.id}` : null), [office])
  const positionPresetSelectionStorageKey = useMemo(
    () => (office ? `role-position-selected-preset-${office.id}` : null),
    [office]
  )
  const mealSlotStorageKey = useMemo(() => (office ? `role-meal-slots-${office.id}` : null), [office])
  const mealTemplateStorageKey = useMemo(
    () => (office ? `role-meal-templates-${office.id}` : null),
    [office]
  )
  const mealTemplateSelectionStorageKey = useMemo(
    () => (office ? `role-meal-selected-template-${office.id}` : null),
    [office]
  )
  const saturdayTeamsStorageKey = useMemo(
    () => (office ? `role-saturday-teams-${office.id}` : null),
    [office]
  )
  const saturdayParityStorageKey = useMemo(
    () => (office ? `role-saturday-parity-${office.id}` : null),
    [office]
  )
  const supervisorWeekendStorageKey = useMemo(
    () => (office ? `role-supervisor-weekend-${office.id}` : null),
    [office]
  )
  const supervisorParityStorageKey = useMemo(
    () => (office ? `role-supervisor-parity-${office.id}` : null),
    [office]
  )
  const consulateSupervisorRotationKey = useMemo(
    () => (office ? `role-consulate-supervisor-rotation-${office.id}` : null),
    [office]
  )
  const savedRolesStorageKey = useMemo(() => (office ? `role-snapshots-${office.id}` : null), [office])
  const workstationAssignmentsStorageKey = useMemo(
    () => (office ? `role-workstations-${office.id}-${weekStartDate}` : null),
    [office, weekStartDate]
  )
  const workstationTemplateSelectionStorageKey = useMemo(
    () => (office ? `role-workstation-template-${office.id}` : null),
    [office]
  )
  const workstationDistributionStorageKey = useMemo(
    () => (office ? `role-workstation-distribution-${office.id}-${weekStartDate}` : null),
    [office, weekStartDate]
  )

  useEffect(() => {
    if (!office) return

    let cancelled = false
    const loadEmployees = async () => {
      setIsLoadingEmployees(true)
      try {
        const data = await getEmployeesByOfficeClient(office.id)
        if (!cancelled) {
          const filtered = data.filter((employee) => !shouldExcludeFromRoster(employee))
          setEmployees(filtered)
        }
      } catch (error) {
        console.error("Error al cargar empleados:", error)
        toast({
          title: "No se pudieron cargar los empleados",
          description: "Intenta nuevamente más tarde",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) {
          setIsLoadingEmployees(false)
        }
      }
    }

    loadEmployees()
    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    if (!saturdayTeamsStorageKey || typeof window === "undefined") {
      setAreSaturdayTeamsLoaded(true)
      return
    }

    try {
      const stored = window.localStorage.getItem(saturdayTeamsStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, SaturdayTeam>
        setSaturdayTeamAssignments(parsed)
      }
    } catch (error) {
      console.error("No se pudieron cargar los equipos sabatinos:", error)
    } finally {
      setAreSaturdayTeamsLoaded(true)
    }
  }, [saturdayTeamsStorageKey])

  useEffect(() => {
    if (!saturdayParityStorageKey || typeof window === "undefined") {
      setIsSaturdayParityLoaded(true)
      return
    }

    try {
      const stored = window.localStorage.getItem(saturdayParityStorageKey)
      if (stored === "team1" || stored === "team2") {
        setSaturdayParityRestTeam(stored)
      }
    } catch (error) {
      console.error("No se pudo cargar la preferencia de rotación sabatina:", error)
    } finally {
      setIsSaturdayParityLoaded(true)
    }
  }, [saturdayParityStorageKey])

  useEffect(() => {
    if (!areSaturdayTeamsLoaded || !saturdayTeamsStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        saturdayTeamsStorageKey,
        JSON.stringify(saturdayTeamAssignments)
      )
    } catch (error) {
      console.error("No se pudieron guardar los equipos sabatinos:", error)
    }
  }, [areSaturdayTeamsLoaded, saturdayTeamAssignments, saturdayTeamsStorageKey])

  useEffect(() => {
    if (!isSaturdayParityLoaded || !saturdayParityStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(saturdayParityStorageKey, saturdayParityRestTeam)
    } catch (error) {
      console.error("No se pudo guardar la preferencia de rotación sabatina:", error)
    }
  }, [isSaturdayParityLoaded, saturdayParityRestTeam, saturdayParityStorageKey])

  useEffect(() => {
    if (!supervisorWeekendStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(supervisorWeekendStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, "team-a" | "team-b">
        setSupervisorWeekendAssignments(parsed)
      }
    } catch (error) {
      console.error("No se pudieron cargar las asignaciones de supervisores:", error)
    }
  }, [supervisorWeekendStorageKey])

  useEffect(() => {
    if (!supervisorWeekendStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(supervisorWeekendStorageKey, JSON.stringify(supervisorWeekendAssignments))
    } catch (error) {
      console.error("No se pudieron guardar las asignaciones de supervisores:", error)
    }
  }, [supervisorWeekendAssignments, supervisorWeekendStorageKey])

  useEffect(() => {
    if (!supervisorParityStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(supervisorParityStorageKey)
      if (stored && (stored === "team-a" || stored === "team-b")) {
        setSupervisorParityRestTeam(stored)
      }
    } catch (error) {
      console.error("No se pudo cargar la paridad de supervisores:", error)
    }
  }, [supervisorParityStorageKey])

  useEffect(() => {
    if (!supervisorParityStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(supervisorParityStorageKey, supervisorParityRestTeam)
    } catch (error) {
      console.error("No se pudo guardar la paridad de supervisores:", error)
    }
  }, [supervisorParityRestTeam, supervisorParityStorageKey])

  // Cargar el supervisor de Consulado de la semana anterior para la rotación
  useEffect(() => {
    if (!consulateSupervisorRotationKey || typeof window === "undefined") return
    if (employees.length === 0) return // Esperar a que los empleados estén cargados
    
    try {
      const stored = window.localStorage.getItem(consulateSupervisorRotationKey)
      if (!stored) {
        setPreviousWeekConsulateSupervisor(null)
        return
      }
      
      const rotationData = JSON.parse(stored)
      
      // Verificar que todos los supervisores todavía existen y están activos
      const consuladoSupervisor = rotationData.consuladoSupervisorId 
        ? employees.find(emp => emp.id === rotationData.consuladoSupervisorId && emp.active !== false)
        : null
      const cas1Supervisor = rotationData.cas1SupervisorId
        ? employees.find(emp => emp.id === rotationData.cas1SupervisorId && emp.active !== false)
        : null
      const cas2Supervisor = rotationData.cas2SupervisorId
        ? employees.find(emp => emp.id === rotationData.cas2SupervisorId && emp.active !== false)
        : null
      
      if (rotationData.weekStartDate !== weekStartDate && (consuladoSupervisor || cas1Supervisor || cas2Supervisor)) {
        const rotatedIds = []
        const rotatedNames = []
        
        // ROTACIÓN CIRCULAR COMPLETA:
        // Consulado → CAS 1º puesto
        // CAS 1º → CAS 2º puesto  
        // CAS 2º → Consulado
        setAssignments(prev => {
          const newAssignments = { ...prev }
          const newCasSupervisors = []
          const newConsuladoSupervisors = []
          
          // 1. Consulado → CAS 1º puesto (horario apertura)
          if (consuladoSupervisor) {
            newCasSupervisors.push(rotationData.consuladoSupervisorId)
            rotatedIds.push(rotationData.consuladoSupervisorId)
            rotatedNames.push(`${rotationData.consuladoSupervisorName}: Consulado → CAS 1º`)
          }
          
          // 2. CAS 1º → CAS 2º puesto
          if (cas1Supervisor) {
            newCasSupervisors.push(rotationData.cas1SupervisorId)
            rotatedIds.push(rotationData.cas1SupervisorId)
            rotatedNames.push(`${rotationData.cas1SupervisorName}: CAS 1º → CAS 2º`)
          }
          
          // 3. CAS 2º → Consulado
          if (cas2Supervisor) {
            newConsuladoSupervisors.push(rotationData.cas2SupervisorId)
            rotatedIds.push(rotationData.cas2SupervisorId)
            rotatedNames.push(`${rotationData.cas2SupervisorName}: CAS 2º → Consulado`)
          }
          
          // Asignar los nuevos arrays
          newAssignments.CAS_SUPERVISOR = newCasSupervisors
          newAssignments.CONSULATE_SUPERVISOR = newConsuladoSupervisors
          
          console.log("✅ Rotación circular automática aplicada:", {
            rotaciones: rotatedNames
          })
          
          return newAssignments
        })
        
        // Asegurar que el plan de horarios use el primer horario (índice 0) para el primer supervisor CAS
        setWeeklySchedulePlan(prev => {
          const newPlan = { ...prev }
          if (newPlan.CAS && newPlan.CAS.supervisors) {
            newPlan.CAS.supervisors = newPlan.CAS.supervisors.map(() => 0)
          }
          return newPlan
        })
        
        // Mostrar notificación de éxito
        if (rotatedNames.length > 0) {
          toast({
            title: "🔄 Rotación Circular Automática Aplicada",
            description: rotatedNames.join(" • "),
            duration: 8000,
          })
        }
        
        setPreviousWeekConsulateSupervisor(rotationData.consuladoSupervisorId || null)
      } else {
        setPreviousWeekConsulateSupervisor(null)
      }
    } catch (error) {
      console.error("Error al cargar y aplicar rotación de supervisor:", error)
      setPreviousWeekConsulateSupervisor(null)
    }
  }, [consulateSupervisorRotationKey, employees, weekStartDate, toast])

  useEffect(() => {
    const validIds = new Set(employees.map((emp) => emp.id))

    setAssignments((prev) => {
      const next = createEmptyAssignments()
      for (const position of ALL_POSITIONS) {
        const current = prev[position.id] || []
        next[position.id] = current.filter((employeeId) => validIds.has(employeeId))
      }
      return next
    })

    setAttributes((prev) =>
      prev.map((attribute) => ({
        ...attribute,
        employeeIds: attribute.employeeIds.filter((employeeId) => validIds.has(employeeId)),
      }))
    )

    setScheduleOverrides((prev) => {
      const next: Record<string, Record<string, string>> = {}
      for (const [employeeId, overrides] of Object.entries(prev)) {
        if (!validIds.has(employeeId)) continue
        next[employeeId] = { ...overrides }
      }
      return next
    })
  }, [employees])

  const weekDays = useMemo(() => computeWeekDays(weekStartDate), [weekStartDate])
  const workingWeekDays = useMemo(
    () => weekDays.map((day, dayIndex) => ({ day, dayIndex })),
    [weekDays]
  )

  const weekRangeLabel = useMemo(() => formatWeekRange(weekDays), [weekDays])

  const weekNumber = useMemo(() => {
    if (weekDays.length === 0) return undefined
    return getISOWeekNumber(parseISODate(weekDays[0].date))
  }, [weekDays])

  const weekOfMonth = useMemo(() => {
    return getWeekOfMonth(weekStartDate)
  }, [weekStartDate])

  useEffect(() => {
    const validDates = new Set(weekDays.map((day) => day.date))
    setScheduleOverrides((prev) => {
      const next: Record<string, Record<string, string>> = {}
      for (const [employeeId, overrides] of Object.entries(prev)) {
        const filteredEntries = Object.entries(overrides).filter(
          ([date, value]) => validDates.has(date) && value.trim().length > 0
        )
        if (filteredEntries.length > 0) {
          next[employeeId] = Object.fromEntries(filteredEntries)
        }
      }
      return next
    })
  }, [weekDays])

  useEffect(() => {
    setWeeklySchedulePlan((prev) => clampWeeklySchedulePlan(prev, scheduleMatrix, weekDays.length))
  }, [scheduleMatrix, weekDays])

  useEffect(() => {
    if (!office || weekDays.length === 0) return

    let cancelled = false

    const loadCalendarData = async () => {
      setIsLoadingCalendar(true)
      try {
        const start = weekDays[0].date
        const end = weekDays[weekDays.length - 1].date

        const [holidays, vacationRequests] = await Promise.all([
          fetchHolidaysInRangeClient(office.id, start, end),
          getVacationRequests(office.id),
        ])

        if (cancelled) return

        setHolidayDates(holidays.map((holiday) => holiday.holiday_date))
        setVacationMap(buildVacationMap(vacationRequests, start, end))
      } catch (error) {
        console.error("Error al cargar vacaciones/festivos:", error)
        if (!cancelled) {
          toast({
            title: "No se pudo cargar el calendario",
            description: "Verifica tu conexión e intenta de nuevo",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCalendar(false)
        }
      }
    }

    loadCalendarData()

    return () => {
      cancelled = true
    }
  }, [office, weekDays, toast])

  useEffect(() => {
    if (!office) return

    let cancelled = false

    const loadSchedulePresets = async () => {
      setIsLoadingSchedulePresets(true)
      try {
        const records = await fetchRoleSchedulePresets(office.id)
        if (cancelled) return

        const normalized = records.map((record) => ({
          id: record.id,
          name: record.name,
          shiftName: record.shift_name,
          startTime: record.start_time,
          endTime: record.end_time,
          scheduleMatrix: cloneScheduleMatrix(normalizeScheduleMatrixData(record.schedule_matrix)),
          ppSupervisorSchedules: Array.isArray(record.pp_supervisor_schedules) ? [...record.pp_supervisor_schedules] : undefined,
        }))

        setSchedulePresets(normalized)
        setSelectedPresetId((prev) => (prev && normalized.some((preset) => preset.id === prev) ? prev : null))
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las configuraciones de horarios:", error)
          toast({
            title: "No se pudieron cargar los horarios guardados",
            description: "Verifica tu conexión e intenta nuevamente.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchedulePresets(false)
        }
      }
    }

    void loadSchedulePresets()

    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    if (!office) return

    let cancelled = false

    const loadPositionPresets = async () => {
      setIsLoadingPositionPresets(true)
      try {
        const records = await fetchRolePositionPresets(office.id)
        if (cancelled) return

        const normalized = records.map((record) => ({
          id: record.id,
          name: record.name,
          slots: clonePositionSlots(
            record.slots && typeof record.slots === "object" && record.slots !== null
              ? (record.slots as Record<string, number>)
              : {},
          ),
          assignments:
            record.assignments && typeof record.assignments === "object" && record.assignments !== null
              ? JSON.parse(JSON.stringify(record.assignments as Record<string, string[]>))
              : undefined,
          fixedEmployeeIds: Array.isArray(record.fixed_employee_ids)
            ? (record.fixed_employee_ids as string[]).filter((value): value is string => typeof value === "string")
            : undefined,
        }))

        setPositionPresets(normalized)
        setSelectedPositionPresetId((prev) => (prev && normalized.some((preset) => preset.id === prev) ? prev : null))
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las configuraciones de cupos:", error)
          toast({
            title: "No se pudieron cargar los cupos guardados",
            description: "Intenta nuevamente en unos minutos.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPositionPresets(false)
        }
      }
    }

    void loadPositionPresets()

    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    if (!office) return

    let cancelled = false

    const loadWorkstationTemplates = async () => {
      setIsLoadingWorkstationTemplates(true)
      try {
        const records = await fetchRoleWorkstationTemplates(office.id)
        if (cancelled) return

        const normalized = records.map((record) => ({
          id: record.id,
          name: record.name,
          distribution: normalizeWorkstationDistribution(record.distribution),
        }))

        setWorkstationTemplates(normalized)
        setSelectedWorkstationTemplateId((prev) =>
          prev && normalized.some((template) => template.id === prev) ? prev : null
        )
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las plantillas de puestos operativos:", error)
          toast({
            title: "No se pudieron cargar las plantillas",
            description: "Verifica tu conexión e intenta nuevamente.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkstationTemplates(false)
        }
      }
    }

    void loadWorkstationTemplates()

    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    if (!positionSlotsStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(positionSlotsStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, number>
        setPositionSlots(clonePositionSlots(parsed))
      }
    } catch (error) {
      console.error("No se pudieron cargar los cupos seleccionados previamente:", error)
    }
  }, [positionSlotsStorageKey])

  useEffect(() => {
    if (!positionSlotsStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(positionSlotsStorageKey, JSON.stringify(clonePositionSlots(positionSlots)))
    } catch (error) {
      console.error("No se pudieron guardar los cupos seleccionados:", error)
    }
  }, [positionSlots, positionSlotsStorageKey])

  useEffect(() => {
    if (!positionPresetSelectionStorageKey || typeof window === "undefined") return
    try {
      const storedSelection = window.localStorage.getItem(positionPresetSelectionStorageKey)
      if (storedSelection && positionPresets.some((preset) => preset.id === storedSelection)) {
        setSelectedPositionPresetId(storedSelection)
      } else if (storedSelection && positionPresets.length > 0) {
        window.localStorage.removeItem(positionPresetSelectionStorageKey)
        setSelectedPositionPresetId((prev) =>
          prev && positionPresets.some((preset) => preset.id === prev) ? prev : null
        )
      }
    } catch (error) {
      console.error("No se pudo restaurar la selección de cupos:", error)
    }
  }, [positionPresetSelectionStorageKey, positionPresets])

  useEffect(() => {
    if (!workstationTemplateSelectionStorageKey || typeof window === "undefined") return
    try {
      const storedSelection = window.localStorage.getItem(workstationTemplateSelectionStorageKey)
      if (storedSelection && workstationTemplates.some((template) => template.id === storedSelection)) {
        setSelectedWorkstationTemplateId(storedSelection)
      } else if (storedSelection && workstationTemplates.length > 0) {
        window.localStorage.removeItem(workstationTemplateSelectionStorageKey)
        setSelectedWorkstationTemplateId((prev) =>
          prev && workstationTemplates.some((template) => template.id === prev) ? prev : null
        )
      }
    } catch (error) {
      console.error("No se pudo restaurar la plantilla de puestos seleccionada:", error)
    }
  }, [workstationTemplateSelectionStorageKey, workstationTemplates])

  useEffect(() => {
    if (!workstationTemplateSelectionStorageKey || typeof window === "undefined") return
    try {
      if (selectedWorkstationTemplateId) {
        window.localStorage.setItem(workstationTemplateSelectionStorageKey, selectedWorkstationTemplateId)
      } else {
        window.localStorage.removeItem(workstationTemplateSelectionStorageKey)
      }
    } catch (error) {
      console.error("No se pudo persistir la plantilla de puestos seleccionada:", error)
    }
  }, [selectedWorkstationTemplateId, workstationTemplateSelectionStorageKey])

  useEffect(() => {
    if (!attributePresetStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(attributePresetStorageKey)
      setSelectedAttributePresetId(null)
      if (stored) {
        const parsed = JSON.parse(stored) as AttributePreset[]
        const normalized = parsed.map((preset) => ({
          ...preset,
          assignments: Object.fromEntries(
            Object.entries(preset.assignments || {}).map(([attributeId, employeeIds]) => [
              attributeId,
              Array.isArray(employeeIds) ? [...employeeIds] : [],
            ])
          ),
        }))
        setAttributePresets(normalized)
      } else {
        setAttributePresets([])
      }
    } catch (error) {
      console.error("No se pudieron cargar los atributos guardados:", error)
    }
  }, [attributePresetStorageKey])

  useEffect(() => {
    if (!attributePresetStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(attributePresetStorageKey, JSON.stringify(attributePresets))
    } catch (error) {
      console.error("No se pudieron guardar las configuraciones de atributos:", error)
    }
  }, [attributePresets, attributePresetStorageKey])

  useEffect(() => {
    if (!attributeAssignmentsStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(attributeAssignmentsStorageKey)
      if (!stored) return

      const parsed = JSON.parse(stored) as Array<{ id?: string; employeeIds?: unknown }>
      if (!Array.isArray(parsed)) return

      setAttributes((prev) =>
        prev.map((attribute) => {
          const saved = parsed.find((item) => item?.id === attribute.id)
          if (!saved || !Array.isArray(saved.employeeIds)) return attribute

          const uniqueIds = Array.from(
            new Set(saved.employeeIds.filter((value): value is string => typeof value === "string"))
          )

          return { ...attribute, employeeIds: uniqueIds }
        })
      )
    } catch (error) {
      console.error("No se pudieron restaurar las asignaciones de atributos:", error)
    }
  }, [attributeAssignmentsStorageKey])

  useEffect(() => {
    if (!attributeAssignmentsStorageKey || typeof window === "undefined") return
    try {
      const payload = attributes.map((attribute) => ({ id: attribute.id, employeeIds: attribute.employeeIds }))
      window.localStorage.setItem(attributeAssignmentsStorageKey, JSON.stringify(payload))
    } catch (error) {
      console.error("No se pudieron guardar las asignaciones de atributos:", error)
    }
  }, [attributes, attributeAssignmentsStorageKey])

  useEffect(() => {
    if (!mealSlotStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(mealSlotStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as MealSlotConfig[]
        const allowedUnits = new Set<UnitPositionId>(["OPERATION", "PICKPACK"])
        const normalized: MealSlotConfig[] = parsed.map((slot) => {
          const rawUnits = Array.isArray(slot.appliesTo) ? slot.appliesTo : []
          const appliesTo = rawUnits
            .map((unitId) => (allowedUnits.has(unitId as UnitPositionId) ? (unitId as UnitPositionId) : null))
            .filter((value): value is UnitPositionId => value !== null)

          const fixedEmployeeIds = Array.isArray(slot.fixedEmployeeIds)
            ? Array.from(
                new Set(
                  slot.fixedEmployeeIds.filter((value): value is string => typeof value === "string")
                )
              )
            : []

          return {
            ...slot,
            appliesTo: appliesTo.length > 0 ? appliesTo : ["OPERATION"],
            enabled: slot.enabled !== false,
            fixedEmployeeIds,
          }
        })
        setMealSlots(normalized)
      } else {
        setMealSlots([])
      }
    } catch (error) {
      console.error("No se pudieron cargar los horarios de comida guardados:", error)
    }
  }, [mealSlotStorageKey])

  useEffect(() => {
    if (!mealTemplateStorageKey || typeof window === "undefined") {
      setMealTemplates([])
      return
    }

    try {
      const stored = window.localStorage.getItem(mealTemplateStorageKey)
      if (!stored) {
        setMealTemplates([])
        return
      }

      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) {
        setMealTemplates([])
        return
      }

      const normalized = parsed
        .map((template: unknown) => {
          if (!template || typeof template !== "object") return null
          const typed = template as Partial<MealSlotTemplate> & { slots?: unknown }
          const templateId = typeof typed.id === "string" && typed.id.trim().length > 0
            ? typed.id
            : `meal-template-${Math.random().toString(16).slice(2)}`
          const templateName = typeof typed.name === "string" && typed.name.trim().length > 0
            ? typed.name.trim()
            : "Plantilla sin nombre"
          const slotsPayload = Array.isArray(typed.slots) ? typed.slots : []
          const slots = slotsPayload
            .map((slot: unknown) => {
              if (!slot || typeof slot !== "object") return null
              const slotShape = slot as Partial<MealSlotConfig>
              const id = typeof slotShape.id === "string" && slotShape.id.trim().length > 0
                ? slotShape.id
                : createMealSlotId()
              const startTime = typeof slotShape.startTime === "string" ? slotShape.startTime : "12:00"
              const endTime = typeof slotShape.endTime === "string" ? slotShape.endTime : "12:30"
              const rawCapacity = Number.parseInt(String(slotShape.capacity ?? 0), 10)
              const capacity = Number.isNaN(rawCapacity) ? 0 : Math.max(0, rawCapacity)
              const appliesToRaw = Array.isArray(slotShape.appliesTo) ? slotShape.appliesTo : []
              const appliesTo = appliesToRaw
                .map((unitId) => (unitId === "OPERATION" || unitId === "PICKPACK" ? unitId : null))
                .filter((unitId): unitId is UnitPositionId => Boolean(unitId))
              const normalizedAppliesTo = appliesTo.length > 0 ? Array.from(new Set(appliesTo)) : (["OPERATION"] as UnitPositionId[])
              const fixedEmployeeIds = Array.isArray(slotShape.fixedEmployeeIds)
                ? Array.from(
                    new Set(
                      slotShape.fixedEmployeeIds.filter((value): value is string => typeof value === "string")
                    )
                  )
                : []
              return {
                id,
                label:
                  typeof slotShape.label === "string" && slotShape.label.trim().length > 0
                    ? slotShape.label
                    : `${startTime} - ${endTime}`,
                startTime,
                endTime,
                capacity,
                appliesTo: normalizedAppliesTo,
                enabled: slotShape.enabled !== false,
                fixedEmployeeIds,
              }
            })
            .filter((slot): slot is MealSlotConfig => Boolean(slot))

          return {
            id: templateId,
            name: templateName,
            slots,
          }
        })
        .filter((template): template is MealSlotTemplate => Boolean(template))

      setMealTemplates(normalized)
    } catch (error) {
      console.error("No se pudieron cargar las plantillas de comidas:", error)
      setMealTemplates([])
    }
  }, [mealTemplateStorageKey])

  useEffect(() => {
    if (!mealTemplateStorageKey || typeof window === "undefined") return
    try {
      if (mealTemplates.length === 0) {
        window.localStorage.removeItem(mealTemplateStorageKey)
        return
      }

      const payload = mealTemplates.map((template) => ({
        ...template,
        slots: template.slots.map((slot) => ({
          ...slot,
          appliesTo: [...slot.appliesTo],
          fixedEmployeeIds: [...slot.fixedEmployeeIds],
        })),
      }))

      window.localStorage.setItem(mealTemplateStorageKey, JSON.stringify(payload))
    } catch (error) {
      console.error("No se pudieron guardar las plantillas de comidas:", error)
    }
  }, [mealTemplateStorageKey, mealTemplates])

  useEffect(() => {
    if (!mealTemplateSelectionStorageKey || typeof window === "undefined") {
      setSelectedMealTemplateId(null)
      return
    }

    try {
      const stored = window.localStorage.getItem(mealTemplateSelectionStorageKey)
      if (stored && mealTemplates.some((template) => template.id === stored)) {
        setSelectedMealTemplateId((prev) => (prev === stored ? prev : stored))
      } else {
        setSelectedMealTemplateId(null)
        if (stored) {
          window.localStorage.removeItem(mealTemplateSelectionStorageKey)
        }
      }
    } catch (error) {
      console.error("No se pudo restaurar la plantilla de comidas seleccionada:", error)
    }
  }, [mealTemplateSelectionStorageKey, mealTemplates])

  useEffect(() => {
    if (!mealTemplateSelectionStorageKey || typeof window === "undefined") return
    try {
      if (selectedMealTemplateId) {
        window.localStorage.setItem(mealTemplateSelectionStorageKey, selectedMealTemplateId)
      } else {
        window.localStorage.removeItem(mealTemplateSelectionStorageKey)
      }
    } catch (error) {
      console.error("No se pudo guardar la plantilla de comidas seleccionada:", error)
    }
  }, [mealTemplateSelectionStorageKey, selectedMealTemplateId])

  useEffect(() => {
    if (!mealSlotStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(mealSlotStorageKey, JSON.stringify(mealSlots))
    } catch (error) {
      console.error("No se pudieron guardar los horarios de comida:", error)
    }
  }, [mealSlots, mealSlotStorageKey])

  useEffect(() => {
    if (!isMealPlannerOpen) return
    setMealSlotDrafts(
      mealSlots.map((slot) => ({
        ...slot,
        appliesTo: [...slot.appliesTo],
        fixedEmployeeIds: [...slot.fixedEmployeeIds],
      }))
    )
  }, [isMealPlannerOpen, mealSlots])

  useEffect(() => {
    if (!savedRolesStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(savedRolesStorageKey)
      if (!stored) return
      const parsed = JSON.parse(stored) as RoleSnapshot[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSavedRoles(parsed)
      }
    } catch (error) {
      console.error("No se pudieron cargar los roles guardados:", error)
    }
  }, [savedRolesStorageKey])

  useEffect(() => {
    if (!savedRolesStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(savedRolesStorageKey, JSON.stringify(savedRoles))
    } catch (error) {
      console.error("No se pudieron guardar los roles generados:", error)
    }
  }, [savedRoles, savedRolesStorageKey])

  useEffect(() => {
    if (!workstationAssignmentsStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(workstationAssignmentsStorageKey)
      if (!stored) {
        setWorkstationAssignments({})
        return
      }
      const parsed = JSON.parse(stored) as WorkstationAssignments
      if (parsed && typeof parsed === "object") {
        setWorkstationAssignments(parsed)
      } else {
        setWorkstationAssignments({})
      }
    } catch (error) {
      console.error("No se pudieron cargar los puestos internos guardados:", error)
      setWorkstationAssignments({})
    }
  }, [workstationAssignmentsStorageKey])

  useEffect(() => {
    if (!workstationAssignmentsStorageKey || typeof window === "undefined") return
    try {
      if (Object.keys(workstationAssignments).length === 0) {
        window.localStorage.removeItem(workstationAssignmentsStorageKey)
        return
      }
      window.localStorage.setItem(
        workstationAssignmentsStorageKey,
        JSON.stringify(workstationAssignments)
      )
    } catch (error) {
      console.error("No se pudieron guardar los puestos internos:", error)
    }
  }, [workstationAssignments, workstationAssignmentsStorageKey])

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>()
    for (const employee of employees) {
      map.set(employee.id, employee)
    }
    return map
  }, [employees])

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active !== false && !shouldExcludeFromRoster(employee)),
    [employees]
  )

  const sortedActiveEmployees = useMemo(
    () => [...activeEmployees].sort(sortEmployeesByName),
    [activeEmployees]
  )

  const saturdayTeams = useMemo(() => {
    const team1 = new Set<string>()
    const team2 = new Set<string>()
    for (const [employeeId, team] of Object.entries(saturdayTeamAssignments)) {
      if (!employeeMap.has(employeeId)) continue
      if (team === "team1") {
        team1.add(employeeId)
      } else if (team === "team2") {
        team2.add(employeeId)
      }
    }
    
    return {
      team1,
      team2,
      team1List: Array.from(team1),
      team2List: Array.from(team2),
    }
  }, [employeeMap, saturdayTeamAssignments])

  const saturdayRestTeamForWeek = useMemo((): SaturdayTeam => {
    const alternateTeam = saturdayParityRestTeam === "team1" ? "team2" : "team1"
    return getRestingSaturdayTeam(weekStartDate, saturdayParityRestTeam, alternateTeam)
  }, [saturdayParityRestTeam, weekStartDate])

  const saturdayWorkingTeamForWeek = useMemo<SaturdayTeam>(
    () => (saturdayRestTeamForWeek === "team1" ? "team2" : "team1"),
    [saturdayRestTeamForWeek]
  )

  // Calcular la fecha del sábado ANTES de usarla
  const saturdayDate = useMemo(() => {
    if (weekDays.length <= SATURDAY_INDEX) return null
    return weekDays[SATURDAY_INDEX]?.date ?? null
  }, [weekDays])

  // Supervisores: mantener compatibilidad con el sistema anterior de equipos
  const supervisorRestTeamForWeek = useMemo(() => {
    const alternateTeam = supervisorParityRestTeam === "team-a" ? "team-b" : "team-a"
    return getRestingSaturdayTeam(weekStartDate, supervisorParityRestTeam, alternateTeam)
  }, [weekStartDate, supervisorParityRestTeam])

  // Supervisores: determinar qué supervisores descansan este sábado usando el calendario fijo
  const supervisorRestingEmployeeIds = useMemo(() => {
    if (!saturdayDate) return new Set<string>()
    
    // Usar el calendario fijo de 2026 para determinar qué supervisores descansan
    const restingIds = getSupervisorRestIdsForSaturday(saturdayDate, employees)
    
    // Fallback: Si no hay coincidencias en el calendario fijo, usar la lógica anterior
    if (restingIds.size === 0 && supervisorRestTeamForWeek) {
      const fallbackIds = Object.entries(supervisorWeekendAssignments)
        .filter(([, team]) => team === supervisorRestTeamForWeek)
        .map(([employeeId]) => employeeId)
      return new Set(fallbackIds)
    }
    
    return restingIds
  }, [saturdayDate, employees, supervisorRestTeamForWeek, supervisorWeekendAssignments])

  const supervisorWorkingEmployeeIds = useMemo(() => {
    // Obtener todos los supervisores CAS
    const allSupervisors = employees.filter(emp => 
      emp.position?.toLowerCase().includes("supervisor") ||
      emp.position?.toLowerCase().includes("sup")
    )
    
    // Los que trabajan son todos excepto los que descansan
    const workingIds = allSupervisors
      .filter(emp => !supervisorRestingEmployeeIds.has(emp.id))
      .map(emp => emp.id)
    
    return new Set(workingIds)
  }, [employees, supervisorRestingEmployeeIds])

  const saturdayRestingEmployeeIds = useMemo(() => {
    const regularTeamResting = saturdayRestTeamForWeek === "team1"
      ? saturdayTeams.team1List
      : saturdayTeams.team2List
    
    // Combinar empleados regulares y supervisores que descansan
    const combined = new Set([...regularTeamResting, ...Array.from(supervisorRestingEmployeeIds)])
    return combined
  }, [saturdayRestTeamForWeek, saturdayTeams, supervisorRestingEmployeeIds])

  const saturdayWorkingEmployeeIds = useMemo(() => {
    const regularTeamWorking = saturdayWorkingTeamForWeek === "team1"
      ? saturdayTeams.team1List
      : saturdayTeams.team2List
    // Combinar empleados regulares y supervisores que trabajan
    return new Set([...regularTeamWorking, ...Array.from(supervisorWorkingEmployeeIds)])
  }, [saturdayTeams, saturdayWorkingTeamForWeek, supervisorWorkingEmployeeIds])

  const trainingEmployeeIds = useMemo(
    () => new Set(attributes.find((attribute) => attribute.id === "training")?.employeeIds ?? []),
    [attributes]
  )

  const consulateAuthorizedEmployeeIds = useMemo(
    () => new Set(attributes.find((attribute) => attribute.id === "consulado")?.employeeIds ?? []),
    [attributes]
  )

  const restrictedPickPackIds = useMemo(
    () => new Set(attributes.find((attribute) => attribute.id === "restricted_pickpack")?.employeeIds ?? []),
    [attributes]
  )

  const restrictedConsulateIds = useMemo(
    () => new Set(attributes.find((attribute) => attribute.id === "restricted_consulate")?.employeeIds ?? []),
    [attributes]
  )

  const canEmployeeCoverPosition = useCallback(
    (employee: Employee | null | undefined, positionId: string): boolean => {
      if (!isEmployeeEligibleForPosition(employee, positionId)) return false
      if (!employee) return false

      if (!isConsulatePositionId(positionId)) {
        return true
      }

      const employeeId = employee.id
      if (!employeeId) return false
      if (trainingEmployeeIds.has(employeeId)) return false
      if (!consulateAuthorizedEmployeeIds.has(employeeId)) return false

      return true
    },
    [consulateAuthorizedEmployeeIds, trainingEmployeeIds]
  )

  const eligibleEmployeesByPosition = useMemo((): Record<string, Employee[]> => {
    const map: Record<string, Employee[]> = {}

    for (const position of ALL_POSITIONS) {
      map[position.id] = sortedActiveEmployees.filter((employee) => canEmployeeCoverPosition(employee, position.id))
    }

    return map
  }, [sortedActiveEmployees, canEmployeeCoverPosition])

  useEffect(() => {
    if (employeeMap.size === 0) return

    let removedAssignments = false

    setAssignments((prev) => {
      let changed = false
      const next: Record<string, string[]> = { ...prev }
      const vacationRemovals = new Set<string>()

      for (const positionId of CONSULATE_POSITION_IDS) {
        const current = next[positionId] || []
        const filtered = current.filter((employeeId) => {
          const employee = employeeMap.get(employeeId)
          return Boolean(employee && canEmployeeCoverPosition(employee, positionId))
        })

        if (filtered.length !== current.length) {
          next[positionId] = filtered
          changed = true
        }
      }

      for (const positionId of VACATION_RESTRICTED_POSITION_IDS) {
        const current = next[positionId] || []
        const filtered = current.filter((employeeId) => {
          const keep = !employeesWithVacation.has(employeeId)
          if (!keep) {
            vacationRemovals.add(employeeId)
          }
          return keep
        })

        if (filtered.length !== current.length) {
          next[positionId] = filtered
          changed = true
        }
      }

      if (vacationRemovals.size > 0) {
        const operationAssignments = new Set(next.OPERATION || [])
        let operationChanged = false
        vacationRemovals.forEach((employeeId) => {
          const employee = employeeMap.get(employeeId)
          if (!employee) return
          if (!canEmployeeCoverPosition(employee, "OPERATION")) return
          if (!operationAssignments.has(employeeId)) {
            operationAssignments.add(employeeId)
            operationChanged = true
          }
        })
        if (operationChanged) {
          next.OPERATION = Array.from(operationAssignments)
          changed = true
        }
      }

      if (!changed) {
        return prev
      }

      removedAssignments = true
      return next
    })

    if (removedAssignments) {
      setIsRoleGenerated(false)
      setSelectedPositionPresetId(null)
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(positionPresetSelectionStorageKey)
      }
    }
  }, [
    employeeMap,
    canEmployeeCoverPosition,
    employeesWithVacation,
    positionPresetSelectionStorageKey,
  ])

  const casSchedules = scheduleMatrix.CAS
  const consSchedules = scheduleMatrix.Consulado

  const formatScheduleList = useCallback((values: string[]) => {
    const sanitized = values.map((value) => value.trim()).filter((value) => value.length > 0)
    return sanitized.length > 0 ? sanitized.join(", ") : "-"
  }, [])

  const defaultShiftLabel = useMemo(() => `${startTime} A ${endTime}`.toUpperCase(), [startTime, endTime])

  const employeeAssignments = useMemo(() => {
    const map: Record<string, PositionDefinition> = {}
    for (const position of ALL_POSITIONS) {
      for (const employeeId of assignments[position.id] || []) {
        map[employeeId] = position
      }
    }
    return map
  }, [assignments])

  const renderEligibleSelectItems = useCallback(
    (positionId: string) => {
      const eligibleEmployees = eligibleEmployeesByPosition[positionId] || []
      let candidates = eligibleEmployees
      let note: string | null = null
      let filteredByVacation = false

      if (candidates.length === 0 && isConsulatePositionId(positionId)) {
        candidates = sortedActiveEmployees.filter((employee) => {
          if (!isEmployeeEligibleForPosition(employee, positionId)) return false
          if (trainingEmployeeIds.has(employee.id)) return false
          return true
        })
        note = "(sin atributo Consulado)"
      }

      if (isVacationRestrictedPositionId(positionId)) {
        const filtered = candidates.filter(
          (employee) => !employeesWithVacation.has(employee.id)
        )
        filteredByVacation = filtered.length !== candidates.length
        candidates = filtered
      }

      if (candidates.length === 0) {
        if (filteredByVacation) {
          return (
            <SelectItem
              key="vacation-restricted"
              value="__vacation-restricted__"
              disabled
            >
              Personal con vacaciones se reubica en Operación CAS
            </SelectItem>
          )
        }
        return (
          <SelectItem key="no-eligible" value="__no-eligible__" disabled>
            Sin colaboradores compatibles
          </SelectItem>
        )
      }

      const items = candidates.map((employee) => {
        const currentAssignment = employeeAssignments[employee.id]
        const labelParts = [getEmployeeDisplayName(employee)]
        if (employee.employee_code) {
          labelParts.push(`Código ${employee.employee_code}`)
        }
        if (currentAssignment && currentAssignment.id !== positionId) {
          labelParts.push(`(${currentAssignment.code})`)
        }
        if (note && !consulateAuthorizedEmployeeIds.has(employee.id)) {
          labelParts.push(note)
        }
        return (
          <SelectItem key={employee.id} value={employee.id}>
            {labelParts.join(" · ")}
          </SelectItem>
        )
      })

      if (filteredByVacation) {
        items.unshift(
          <SelectItem
            key="vacation-restricted-info"
            value="__vacation-restricted-info__"
            disabled
            className="text-xs text-muted-foreground"
          >
            Personal con vacaciones se reubica en Operación CAS
          </SelectItem>
        )
      }

      return items
    },
    [
      consulateAuthorizedEmployeeIds,
      eligibleEmployeesByPosition,
      employeeAssignments,
      employeesWithVacation,
      sortedActiveEmployees,
      trainingEmployeeIds,
    ]
  )

  const assignedEmployeeIds = useMemo(() => new Set(Object.keys(employeeAssignments)), [employeeAssignments])

  useEffect(() => {
    const assignedSet = new Set<string>()
    for (const position of ALL_POSITIONS) {
      for (const employeeId of assignments[position.id] || []) {
        assignedSet.add(employeeId)
      }
    }
    setFixedEmployeeIds((prev) => prev.filter((employeeId) => assignedSet.has(employeeId)))
  }, [assignments])

  const fixedEmployeeSet = useMemo(() => new Set(fixedEmployeeIds), [fixedEmployeeIds])

  const activeEmployeeCount = activeEmployees.length

  useEffect(() => {
    if (isLoadingEmployees) return

    setPositionSlots((prev) => {
      const total = Object.values(prev).reduce((sum, count) => sum + (count || 0), 0)

      if (activeEmployeeCount === 0) {
        if (total === 0) return prev
        const cleared: Record<string, number> = {}
        for (const position of ALL_POSITIONS) {
          cleared[position.id] = 0
        }
        return cleared
      }

      if (total <= activeEmployeeCount) return prev

      const next = { ...prev }
      let excess = total - activeEmployeeCount

      for (const position of [...ALL_POSITIONS].reverse()) {
        if (excess <= 0) break
        const current = next[position.id] || 0
        if (current === 0) continue
        const reduction = Math.min(current, excess)
        next[position.id] = current - reduction
        excess -= reduction
      }

      return next
    })
  }, [activeEmployeeCount, isLoadingEmployees])

  const unassignedEmployees = useMemo(() => {
    return activeEmployees
      .filter((employee) => !assignedEmployeeIds.has(employee.id))
      .sort(sortEmployeesByName)
  }, [activeEmployees, assignedEmployeeIds])

  const orderedEmployeeIds = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []

    const push = (employeeId: string) => {
      if (!seen.has(employeeId)) {
        seen.add(employeeId)
        order.push(employeeId)
      }
    }

    for (const position of ALL_POSITIONS) {
      for (const employeeId of assignments[position.id] || []) {
        push(employeeId)
      }
    }

    for (const employee of [...activeEmployees].sort(sortEmployeesByName)) {
      push(employee.id)
    }

    return order
  }, [assignments, activeEmployees])

  const orderedEmployees = useMemo(() => {
    return orderedEmployeeIds
      .map((id) => employeeMap.get(id))
      .filter((employee): employee is Employee => Boolean(employee))
  }, [employeeMap, orderedEmployeeIds])

  const passbackAssignmentList = assignments.PICKPACK_PASSBACK ?? []

  const passbackAssignedIds = useMemo(
    () => new Set(passbackAssignmentList),
    [passbackAssignmentList]
  )

  const mealEligibleEmployees = useMemo(() => {
    return orderedEmployees.filter((employee) => {
      const assignment = employeeAssignments[employee.id]
      if (!assignment) return false
      return MEAL_ALLOWED_POSITION_IDS.has(assignment.id)
    })
  }, [employeeAssignments, orderedEmployees])

  const mealEligibleEmployeeIds = useMemo(
    () => new Set(mealEligibleEmployees.map((employee) => employee.id)),
    [mealEligibleEmployees]
  )

  const saturdayEligibleEmployees = useMemo(() => {
    // Filtrar supervisores - excluir cualquier empleado que tenga puesto de supervisor
    return sortedActiveEmployees.filter((employee) => {
      const position = employee.position?.toLowerCase() || ''
      return !position.includes('supervisor') && !position.includes('supervisa')
    })
  }, [sortedActiveEmployees])

  const supervisorEmployees = useMemo(() => {
    // Incluir solo empleados con puesto de supervisor
    return sortedActiveEmployees.filter((employee) => {
      const position = employee.position?.toLowerCase() || ''
      return position.includes('supervisor') || position.includes('supervisa')
    })
  }, [sortedActiveEmployees])

  const saturdayTeamMembers = useMemo(() => {
    const team1Members: Employee[] = []
    const team2Members: Employee[] = []

    for (const employee of sortedActiveEmployees) {
      const assignment = saturdayTeamAssignments[employee.id]
      if (assignment === "team1") {
        team1Members.push(employee)
      } else if (assignment === "team2") {
        team2Members.push(employee)
      }
    }

    return { team1Members, team2Members }
  }, [saturdayTeamAssignments, sortedActiveEmployees])

  useEffect(() => {
    if (!areSaturdayTeamsLoaded) return
    if (saturdayEligibleEmployees.length === 0) return

    setSaturdayTeamAssignments((prev) => {
      const eligibleIds = new Set(saturdayEligibleEmployees.map((employee) => employee.id))
      let modified = false
      const next: Record<string, SaturdayTeam> = {}
      let team1Count = 0
      let team2Count = 0

      for (const [employeeId, team] of Object.entries(prev)) {
        if (!eligibleIds.has(employeeId)) {
          modified = true
          continue
        }
        next[employeeId] = team
        if (team === "team1") {
          team1Count += 1
        } else if (team === "team2") {
          team2Count += 1
        }
      }

      for (const employee of saturdayEligibleEmployees) {
        if (next[employee.id]) continue
        const assignTeam: SaturdayTeam = team1Count <= team2Count ? "team1" : "team2"
        next[employee.id] = assignTeam
        if (assignTeam === "team1") {
          team1Count += 1
        } else {
          team2Count += 1
        }
        modified = true
      }

      return modified ? next : prev
    })
  }, [areSaturdayTeamsLoaded, saturdayEligibleEmployees])

  const schedulePlanAssignments = useMemo(() => {
    if (weekDays.length === 0) {
      return {}
    }

    const plan: Record<string, Record<string, string>> = {}

    weekDays.forEach((day, dayIndex) => {
      for (const position of ALL_POSITIONS) {
        const mapping = POSITION_SCHEDULE_MAPPING[position.id]
        if (!mapping) continue

        const rolePlan = weeklySchedulePlan[mapping.area]?.[mapping.role] || []
        const selectedIndex = rolePlan[dayIndex] ?? 0
        const options = scheduleMatrix[mapping.area]?.[mapping.role] ?? []
        if (options.length === 0) continue

        if (selectedIndex < 0) continue

        const sanitizedIndex = Math.min(Math.max(selectedIndex, 0), options.length - 1)
        const selectedValue = options[sanitizedIndex]?.trim() ?? ""
        if (selectedValue.length === 0) continue

        const employeeIds = assignments[position.id] || []
        if (employeeIds.length === 0) continue

        for (const employeeId of employeeIds) {
          if (!plan[employeeId]) {
            plan[employeeId] = {}
          }
          plan[employeeId][day.date] = selectedValue
        }
      }
    })

    return plan
  }, [assignments, scheduleMatrix, weekDays, weeklySchedulePlan])

  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates])

  const operationSlotLimit = positionSlots.OPERATION || 0

  const limitedOperationEmployeeIds = useMemo(() => {
    const current = assignments.OPERATION || []
    if (operationSlotLimit <= 0) {
      return []
    }
    return current.slice(0, operationSlotLimit)
  }, [assignments, operationSlotLimit])

  const passbackWorkstationCount = useMemo(() => {
    if (passbackAssignmentList.length === 0) {
      return 0
    }
    const baseIds = new Set(limitedOperationEmployeeIds)
    return passbackAssignmentList.reduce((count, employeeId) => {
      if (baseIds.has(employeeId)) {
        return count
      }
      return count + 1
    }, 0)
  }, [limitedOperationEmployeeIds, passbackAssignmentList])

  const extraOperationEmployees = useMemo(() => {
    const currentCount = assignments.OPERATION?.length || 0
    if (operationSlotLimit <= 0) {
      return currentCount
    }
    return Math.max(currentCount - operationSlotLimit, 0)
  }, [assignments, operationSlotLimit])

  const operationEmployees = useMemo(() => {
    const baseEmployees = limitedOperationEmployeeIds
      .map((employeeId) => employeeMap.get(employeeId))
      .filter((employee): employee is Employee => Boolean(employee))

    if (passbackAssignmentList.length === 0) {
      return baseEmployees
    }

    const seenIds = new Set(baseEmployees.map((employee) => employee.id))
    const passbackEmployees = passbackAssignmentList
      .map((employeeId) => employeeMap.get(employeeId))
      .filter((employee): employee is Employee => Boolean(employee) && !seenIds.has(employee.id))

    if (passbackEmployees.length === 0) {
      return baseEmployees
    }

    return [...baseEmployees, ...passbackEmployees]
  }, [employeeMap, limitedOperationEmployeeIds, passbackAssignmentList])

  const workstationCapacityLimit = useMemo(
    () => operationSlotLimit + passbackWorkstationCount,
    [operationSlotLimit, passbackWorkstationCount]
  )

  const workstationDistributionTotal = useMemo(
    () => sumWorkstationDistribution(workstationDistribution),
    [workstationDistribution]
  )

  const workstationDistributionGap = useMemo(
    () => operationEmployees.length - workstationDistributionTotal,
    [operationEmployees.length, workstationDistributionTotal]
  )

  const applyWorkstationDistribution = useCallback(
    (
      distribution: WorkstationDistribution,
      options?: { templateName?: string; silent?: boolean; clearTemplateSelection?: boolean }
    ) => {
      if (operationSlotLimit <= 0) {
        if (!options?.silent) {
          toast({
            title: "Configura cupos de Operación",
            description: "Define al menos un puesto CAS-OP antes de generar la rotación interna.",
            variant: "destructive",
          })
        }
        return null
      }

      if (operationEmployees.length === 0) {
        if (!options?.silent) {
          toast({
            title: "Sin colaboradores CAS-OP",
            description: "Genera el rol o asigna personal a Operación general antes de generar la rotación interna.",
            variant: "destructive",
          })
        }
        return null
      }

      if (workingWeekDays.length === 0) {
        if (!options?.silent) {
          toast({
            title: "Semana no disponible",
            description: "Selecciona una semana válida para generar la rotación interna.",
            variant: "destructive",
          })
        }
        return null
      }

      const { assignments: generatedAssignments, appliedDistribution, shortagesByDate } =
        generateWorkstationRotationAssignments(distribution, operationEmployees, workingWeekDays, vacationMap, holidaySet)

      const totalShortage = Object.values(shortagesByDate).reduce((sum, value) => sum + value, 0)
      const summaryLabel = WORKSTATION_CODES.map((code) => `${code}: ${appliedDistribution[code] || 0}`).join(" • ")
      const requestedTotal = sumWorkstationDistribution(distribution)
      const appliedTotal = sumWorkstationDistribution(appliedDistribution)
      const distributionModified = WORKSTATION_CODES.some(
        (code) => (distribution[code] || 0) !== (appliedDistribution[code] || 0)
      )
      let adjustmentNote = ""
      if (distributionModified) {
        if (appliedTotal > requestedTotal) {
          adjustmentNote = ` Se agregaron ${appliedTotal - requestedTotal} puesto(s) O para cubrir a todo el equipo.`
        } else if (appliedTotal < requestedTotal) {
          adjustmentNote = ` Se recortó la plantilla para ajustarse a los ${operationEmployees.length} colaboradores disponibles.`
        }
      }

      if (options?.clearTemplateSelection) {
        setSelectedWorkstationTemplateId(null)
      }

      setWorkstationAssignments(generatedAssignments)
      setWorkstationDistribution(appliedDistribution)

      if (options?.silent) {
        return { appliedDistribution, shortagesByDate }
      }

      if (totalShortage > 0) {
        toast({
          title: "Rotación generada con pendientes",
          description: `No se pudieron cubrir ${totalShortage} turno(s) por ausencias o festivos. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`,
          variant: "destructive",
        })
        return { appliedDistribution, shortagesByDate }
      }

      const baseTitle = options?.templateName
        ? `Plantilla "${options.templateName}" aplicada`
        : "Rotación generada"
      const baseDescription = options?.templateName
        ? `Se asignaron los puestos internos con rotación uniforme. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`
        : `Se asignaron los puestos internos con rotación uniforme. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`

      toast({
        title: baseTitle,
        description: baseDescription,
      })

      return { appliedDistribution, shortagesByDate }
    },
    [holidaySet, operationEmployees, operationSlotLimit, toast, vacationMap, workingWeekDays]
  )

  const shortageSummary = useMemo(
    () =>
      UNIT_POSITIONS.map((unit) => ({
        unit,
        count: unitShortages[unit.id as UnitPositionId] || 0,
      })).filter((item) => item.count > 0),
    [unitShortages]
  )

  const getAbsenceScore = useCallback(
    (employeeId: string): number => {
      let score = 0
      for (const day of weekDays) {
        if (holidaySet.has(day.date)) continue
        if (vacationMap[employeeId]?.has(day.date)) {
          score += 1
        }
      }
      return score
    },
    [holidaySet, vacationMap, weekDays]
  )

  const recomputeDailyUnitAssignments = useCallback(
    (
      baseAssignments: Record<string, string[]>,
      slotConfig: Record<string, number>
    ): { dailyAssignments: DailyUnitAssignments; shortages: Record<UnitPositionId, number> } => {
      const shortages: Record<UnitPositionId, number> = {
        OPERATION: 0,
        PICKPACK: 0,
        CONSULATE: 0,
      }
      const result: DailyUnitAssignments = {}

      const operationSlots = slotConfig.OPERATION || 0

      weekDays.forEach((day, dayIndex) => {
        const dayAssignments: Record<UnitPositionId, string[]> = {
          OPERATION: [],
          PICKPACK: [],
          CONSULATE: [],
        }

        if (holidaySet.has(day.date)) {
          result[day.date] = dayAssignments
          return
        }

        const isSaturday = dayIndex === SATURDAY_INDEX

        // Fixed units (Pick & Pack, Consulado)
        for (const unitId of ["PICKPACK", "CONSULATE"] as const) {
          const slotsForUnit = slotConfig[unitId] || 0
          const baseList = baseAssignments[unitId] || []
          let prioritized = baseList
          
          // En sábados, excluir explícitamente a los empleados del equipo que descansa
          if (isSaturday) {
            // Primero filtrar a los que descansan (para PICKPACK y CONSULATE)
            const workingCandidates = baseList.filter((employeeId) =>
              saturdayWorkingEmployeeIds.has(employeeId)
            )
            const neutralCandidates = baseList.filter(
              (employeeId) =>
                !saturdayWorkingEmployeeIds.has(employeeId) &&
                !saturdayRestingEmployeeIds.has(employeeId)
            )
            // IMPORTANTE: NO incluir a los que descansan
            prioritized = [...workingCandidates, ...neutralCandidates]
          }

          const assigned = prioritized.slice(0, slotsForUnit)
          dayAssignments[unitId] = assigned

          const availableToday = assigned.filter((employeeId) => !vacationMap[employeeId]?.has(day.date))
          const shortfall = Math.max(slotsForUnit - availableToday.length, 0)
          if (shortfall > shortages[unitId]) {
            shortages[unitId] = shortfall
          }
        }

        // Operation daily rotation
        let operationPool = (baseAssignments.OPERATION || []).filter(
          (employeeId) => !vacationMap[employeeId]?.has(day.date)
        )
        
        // En sábados, excluir explícitamente a los empleados del equipo que descansa
        if (isSaturday) {
          operationPool = operationPool.filter(
            (employeeId) => !saturdayRestingEmployeeIds.has(employeeId)
          )
        }
        
        const shuffledPool = shuffleArray(operationPool)
        const assignedToday = shuffledPool.slice(0, operationSlots)
        dayAssignments.OPERATION = assignedToday

        const opShortfall = Math.max(operationSlots - assignedToday.length, 0)
        if (opShortfall > shortages.OPERATION) {
          shortages.OPERATION = opShortfall
        }

        result[day.date] = dayAssignments
      })

      return { dailyAssignments: result, shortages }
    },
    [holidaySet, saturdayRestingEmployeeIds, saturdayWorkingEmployeeIds, vacationMap, weekDays]
  )

  const recomputeMealAssignments = useCallback(
    (
      dailyAssignments: DailyUnitAssignments,
      slots: MealSlotConfig[],
      baseAssignments: Record<string, string[]>
    ): DailyMealAssignments => {
      if (slots.length === 0 || weekDays.length === 0) return {}

      const activeSlots = slots.filter((slot) => slot.enabled && slot.capacity > 0)
      if (activeSlots.length === 0) return {}

      const assignments: DailyMealAssignments = {}

      weekDays.forEach((day, dayIndex) => {
        const dayKey = day.date
        const unitAssignments = dailyAssignments[dayKey]
        if (!unitAssignments) {
          assignments[dayKey] = {}
          return
        }

        const usedToday = new Set<string>()
        assignments[dayKey] = {}

        activeSlots.forEach((slot) => {
          const operationCap = Math.max(0, Math.floor(slot.operationCapacity ?? 0))
          const pickpackCap = Math.max(0, Math.floor(slot.pickpackCapacity ?? 0))
          const totalCapacity = operationCap + pickpackCap

          if (totalCapacity === 0) {
            assignments[dayKey][slot.id] = []
            return
          }

          // Crear pools separados por unidad
          const operationPool = new Set<string>()
          const pickpackPool = new Set<string>()

          // Pool de Operación (incluye CAS supervisores)
          const operationEmployees = new Set<string>(unitAssignments["OPERATION"] || [])
          ;(baseAssignments.CAS_SUPERVISOR || []).forEach((employeeId) => operationEmployees.add(employeeId))
          
          operationEmployees.forEach((employeeId) => {
            if (vacationMap[employeeId]?.has(dayKey)) return
            if (dayIndex === SATURDAY_INDEX && saturdayRestingEmployeeIds.has(employeeId)) return
            operationPool.add(employeeId)
          })

          // Pool de Pick & Pack (incluye supervisores y passback)
          const pickpackEmployees = new Set<string>(unitAssignments["PICKPACK"] || [])
          ;(baseAssignments.PICKPACK_SUPERVISOR || []).forEach((employeeId) => pickpackEmployees.add(employeeId))
          ;(baseAssignments.PICKPACK_PASSBACK || []).forEach((employeeId) => pickpackEmployees.add(employeeId))
          
          pickpackEmployees.forEach((employeeId) => {
            if (vacationMap[employeeId]?.has(dayKey)) return
            if (dayIndex === SATURDAY_INDEX && saturdayRestingEmployeeIds.has(employeeId)) return
            pickpackPool.add(employeeId)
          })

          const selected: string[] = []

          // 1. Asignar colaboradores fijos primero (respetando su área)
          const normalizedFixedIds = Array.isArray(slot.fixedEmployeeIds)
            ? Array.from(new Set(slot.fixedEmployeeIds))
            : []

          for (const employeeId of normalizedFixedIds) {
            if (selected.length >= totalCapacity) break
            if (usedToday.has(employeeId)) continue
            if (vacationMap[employeeId]?.has(dayKey)) continue
            if (dayIndex === SATURDAY_INDEX && saturdayRestingEmployeeIds.has(employeeId)) continue
            selected.push(employeeId)
            usedToday.add(employeeId)
            operationPool.delete(employeeId)
            pickpackPool.delete(employeeId)
          }

          // 2. Asignar de Operación hasta alcanzar su capacidad
          if (operationCap > 0) {
            const operationNeeded = operationCap
            const operationAvailable = shuffleArray(Array.from(operationPool)).filter((employeeId) => !usedToday.has(employeeId))
            const operationPicked = operationAvailable.slice(0, operationNeeded)
            selected.push(...operationPicked)
            operationPicked.forEach((employeeId) => usedToday.add(employeeId))
          }

          // 3. Asignar de Pick & Pack hasta alcanzar su capacidad
          if (pickpackCap > 0) {
            const pickpackNeeded = pickpackCap
            const pickpackAvailable = shuffleArray(Array.from(pickpackPool)).filter((employeeId) => !usedToday.has(employeeId))
            const pickpackPicked = pickpackAvailable.slice(0, pickpackNeeded)
            selected.push(...pickpackPicked)
            pickpackPicked.forEach((employeeId) => usedToday.add(employeeId))
          }

          assignments[dayKey][slot.id] = selected
        })
      })

      return assignments
    },
    [saturdayRestingEmployeeIds, vacationMap, weekDays]
  )

  useEffect(() => {
    if (weekDays.length === 0) return
    const { dailyAssignments, shortages } = recomputeDailyUnitAssignments(assignments, positionSlots)
    setDailyUnitAssignments(dailyAssignments)
    setUnitShortages(shortages)
  }, [assignments, positionSlots, recomputeDailyUnitAssignments, weekDays])

  useEffect(() => {
    if (mealSlots.length === 0 || Object.keys(dailyUnitAssignments).length === 0) {
      setDailyMealAssignments({})
      return
    }
    const computed = recomputeMealAssignments(dailyUnitAssignments, mealSlots, assignments)
    setDailyMealAssignments(computed)
  }, [assignments, dailyUnitAssignments, mealSlots, recomputeMealAssignments])

  const getCellInfo = useCallback(
    (employeeId: string, date: string) => {
      if (holidaySet.has(date)) {
        return { locked: true, base: "FESTIVO" }
      }
      if (vacationMap[employeeId]?.has(date)) {
        return { locked: true, base: "VACACIONES" }
      }

      // IMPORTANTE: Verificar descanso de sábado ANTES de verificar asignaciones de unidades
      // Esto garantiza que los empleados del equipo que descansa se marquen correctamente
      if (saturdayDate && date === saturdayDate && saturdayRestingEmployeeIds.has(employeeId)) {
        return { locked: false, base: "DESCANSO" }
      }

      const assignment = employeeAssignments[employeeId]

      const unitAssignmentsForDay = dailyUnitAssignments[date]
      if (unitAssignmentsForDay) {
        for (const unit of UNIT_POSITIONS) {
          const assignedIds = unitAssignmentsForDay[unit.id as UnitPositionId] || []
          if (assignedIds.includes(employeeId)) {
            return { locked: false, base: unit.name.toUpperCase() }
          }
        }
      }

      if (assignment) {
        return { locked: false, base: "LIBRE" }
      }

      return { locked: false, base: "SIN UNIDAD" }
    },
    [
      dailyUnitAssignments,
      employeeAssignments,
      holidaySet,
      saturdayDate,
      saturdayRestingEmployeeIds,
      vacationMap,
    ]
  )

  const renderSummaryRow = (
    employee: Employee,
    {
      key,
      displayPosition,
      editable,
      isPassbackDuplicate = false,
      roleLabelOverride,
    }: {
      key: string
      displayPosition: PositionDefinition | null
      editable: boolean
      isPassbackDuplicate?: boolean
      roleLabelOverride?: { text: string; className?: string }
    }
  ): JSX.Element => {
    const rowTintClass = getPositionRowClass(displayPosition)
    const isFixed = fixedEmployeeSet.has(employee.id)
    const positionLabel = roleLabelOverride?.text ?? getPositionDisplayLabel(displayPosition)
    const statusLabel = employee.position || "---"
    const classes = ["align-top", rowTintClass].filter(Boolean).join(" ")
    const roleLabelClassName = roleLabelOverride?.className

    return (
      <tr key={key} className={classes}>
        <td className="px-3 py-2">
          <div className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
            {getEmployeeDisplayName(employee)}
          </div>
          {employee.employee_code ? (
            <div className="text-[10px] uppercase text-muted-foreground">
              Código {employee.employee_code}
            </div>
          ) : null}
        </td>
        <td className="px-3 py-2 text-xs uppercase text-slate-600">{statusLabel}</td>
        <td className="px-3 py-2 text-xs uppercase text-slate-700">
          <span className={roleLabelClassName}>{positionLabel}</span>
          {isPassbackDuplicate ? (
            <Badge
              variant="outline"
              className="ml-2 border-blue-200 bg-blue-50 text-[10px] uppercase tracking-wide text-blue-700"
            >
              Apoyo CAS
            </Badge>
          ) : null}
        </td>
        <td className="px-3 py-2 text-xs uppercase text-slate-700">
          {isFixed ? (
            <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              FIJO
            </Badge>
          ) : (
            <span className="text-muted-foreground">No</span>
          )}
        </td>
        {weekDays.map((day) => {
          const cellInfo = getCellInfo(employee.id, day.date)
          const overrideValue = scheduleOverrides[employee.id]?.[day.date] ?? ""
          const planValue = schedulePlanAssignments[employee.id]?.[day.date] ?? ""
          
          // Si el estado base es uno de estos, tiene prioridad sobre horarios
          const priorityStates = ["DESCANSO", "FESTIVO", "VACACIONES"]
          const hasPriorityState = priorityStates.includes(cellInfo.base)
          const isLocked = cellInfo.locked || hasPriorityState
          
          const effectiveDisplay = isLocked
            ? cellInfo.base
            : overrideValue.trim().length > 0
              ? overrideValue
              : planValue.trim().length > 0
                ? planValue
                : cellInfo.base

          if (!editable) {
            return (
              <td key={`${key}-${day.date}`} className="px-3 py-2 text-xs text-slate-700">
                <div className="font-semibold uppercase tracking-wide">{effectiveDisplay}</div>
              </td>
            )
          }

          return (
            <td key={`${key}-${day.date}`} className="px-3 py-2 text-xs text-slate-700">
              <div className="hidden print:block font-semibold uppercase tracking-wide">
                {effectiveDisplay}
              </div>
              {isLocked ? (
                <div className="flex flex-col items-start gap-1 print:hidden">
                  <Badge variant="secondary" className="uppercase">
                    {cellInfo.base}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {hasPriorityState ? "Sistema de turnos" : "Calendario automático"}
                  </span>
                </div>
              ) : (
                <Input
                  value={overrideValue}
                  placeholder={planValue || cellInfo.base}
                  onChange={(event) => updateScheduleOverride(employee.id, day.date, event.target.value)}
                  className="h-9 text-[11px] uppercase print:hidden"
                />
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  const updateScheduleEntry = (area: ScheduleCategory, role: ScheduleRole, index: number, value: string) => {
    setScheduleMatrix((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [role]: prev[area][role].map((entry, entryIndex) => (entryIndex === index ? value : entry)),
      },
    }))
    setSelectedPresetId(null)
  }

  const addScheduleEntry = (area: ScheduleCategory, role: ScheduleRole) => {
    setScheduleMatrix((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [role]: [...prev[area][role], prev[area][role][prev[area][role].length - 1] || ""],
      },
    }))
    setSelectedPresetId(null)
  }

  const removeScheduleEntry = (area: ScheduleCategory, role: ScheduleRole, index: number) => {
    setScheduleMatrix((prev) => {
      if (prev[area][role].length <= 1) return prev
      return {
        ...prev,
        [area]: {
          ...prev[area],
          [role]: prev[area][role].filter((_, entryIndex) => entryIndex !== index),
        },
      }
    })
    setSelectedPresetId(null)
  }

  const handleSchedulePlanChange = (
    area: ScheduleCategory,
    role: ScheduleRole,
    dayIndex: number,
    rawValue: string
  ) => {
    const parsed = Number.parseInt(rawValue, 10)
    const sanitized = Number.isNaN(parsed) ? -1 : parsed
    setWeeklySchedulePlan((prev) => {
      const next: WeeklySchedulePlan = {
        CAS: {
          supervisors: [...(prev.CAS?.supervisors || [])],
          employees: [...(prev.CAS?.employees || [])],
        },
        Consulado: {
          supervisors: [...(prev.Consulado?.supervisors || [])],
          employees: [...(prev.Consulado?.employees || [])],
        },
      }
      const planRow = next[area][role]
      if (planRow[dayIndex] === sanitized) {
        return prev
      }
      planRow[dayIndex] = sanitized
      return next
    })
  }

  const handleSchedulePlanCopyAll = (
    area: ScheduleCategory,
    role: ScheduleRole,
    sourceIndex = 0
  ) => {
    setWeeklySchedulePlan((prev) => {
      const sourceValue = prev[area]?.[role]?.[sourceIndex] ?? 0
      const currentRow = prev[area]?.[role] || []
      const shouldUpdate = currentRow.some((value, index) => (index !== sourceIndex ? value !== sourceValue : false))
      if (!shouldUpdate) {
        return prev
      }
      const next: WeeklySchedulePlan = {
        CAS: {
          supervisors: [...(prev.CAS?.supervisors || [])],
          employees: [...(prev.CAS?.employees || [])],
        },
        Consulado: {
          supervisors: [...(prev.Consulado?.supervisors || [])],
          employees: [...(prev.Consulado?.employees || [])],
        },
      }
      next[area][role] = next[area][role].map(() => sourceValue)
      return next
    })
  }

  const handleApplySchedulePreset = (presetId: string) => {
    const preset = schedulePresets.find((item) => item.id === presetId)
    if (!preset) return
    setSelectedPresetId(presetId)
    setShiftName(preset.shiftName)
    setStartTime(preset.startTime)
    setEndTime(preset.endTime)
    setScheduleMatrix(cloneScheduleMatrix(preset.scheduleMatrix))
    if (Array.isArray(preset.ppSupervisorSchedules)) {
      const sanitized = preset.ppSupervisorSchedules.length > 0 ? [...preset.ppSupervisorSchedules] : ["07:00 - 15:00"]
      setPpSupervisorSchedules(sanitized)
    }
    setIsRoleGenerated(false)
  }

  const handleDeleteSchedulePreset = async (presetId: string) => {
    if (deletingSchedulePresetId) return

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("¿Eliminar esta configuración guardada?")
      if (!confirmed) return
    }

    setDeletingSchedulePresetId(presetId)
    try {
      await deleteRoleSchedulePreset(presetId)
      setSchedulePresets((prev) => prev.filter((preset) => preset.id !== presetId))
      setSelectedPresetId((current) => (current === presetId ? null : current))
      toast({
        title: "Configuración eliminada",
        description: "Los horarios guardados ya no estarán disponibles para futuras sesiones.",
      })
    } catch (error) {
      console.error("No se pudo eliminar la configuración de horarios desde Supabase:", error)
      toast({
        title: "No se pudo eliminar",
        description: "Ocurrió un error al eliminar la configuración guardada.",
        variant: "destructive",
      })
    } finally {
      setDeletingSchedulePresetId((current) => (current === presetId ? null : current))
    }
  }

  function createMealSlotId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
    return `meal-slot-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function createMealTemplateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
    return `meal-template-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const cloneMealSlotConfig = (slot: MealSlotConfig): MealSlotConfig => ({
    ...slot,
    appliesTo: [...slot.appliesTo],
    fixedEmployeeIds: [...slot.fixedEmployeeIds],
  })

  const sanitizeMealSlotForTemplate = (slot: MealSlotConfig): MealSlotConfig => {
    const startTime = slot.startTime || "12:00"
    const endTime = slot.endTime || "12:30"
    const normalizedCapacity = Math.max(0, Math.floor(slot.capacity || 0))
    const normalizedLabel = slot.label && slot.label.trim().length > 0 ? slot.label.trim() : `${startTime} - ${endTime}`
    const appliesToSource = Array.isArray(slot.appliesTo) ? slot.appliesTo : []
    const appliesTo = appliesToSource
      .map((unitId) => (unitId === "OPERATION" || unitId === "PICKPACK" ? unitId : null))
      .filter((unitId): unitId is UnitPositionId => Boolean(unitId))
    const normalizedAppliesTo = appliesTo.length > 0 ? Array.from(new Set(appliesTo)) : (["OPERATION"] as UnitPositionId[])
    const fixedEmployeeIdsSource = Array.isArray(slot.fixedEmployeeIds) ? slot.fixedEmployeeIds : []
    const fixedEmployeeIds = Array.from(new Set(fixedEmployeeIdsSource))

    return {
      ...slot,
      label: normalizedLabel,
      startTime,
      endTime,
      capacity: normalizedCapacity,
      appliesTo: normalizedAppliesTo,
      enabled: slot.enabled !== false,
      fixedEmployeeIds,
    }
  }

  const mutateMealSlotDraft = (
    slotId: string,
    updater: (slot: MealSlotConfig) => MealSlotConfig
  ) => {
    setMealSlotDrafts((prev) => prev.map((slot) => (slot.id === slotId ? updater(slot) : slot)))
  }

  const handleAddMealSlotDraft = () => {
    setMealSlotDrafts((prev) => {
      const defaultSlot: MealSlotConfig = {
        id: createMealSlotId(),
        label: `Bloque ${prev.length + 1}`,
        startTime: "12:00",
        endTime: "13:00", // Bloque de 1 hora por defecto
        capacity: 4, // Capacidad total por defecto
        appliesTo: ["OPERATION", "PICKPACK"],
        enabled: true,
        fixedEmployeeIds: [],
        operationCapacity: 2, // 2 de Operación por defecto
        pickpackCapacity: 2,  // 2 de Pick & Pack por defecto
      }
      return [...prev, defaultSlot]
    })
  }

  const handleMealSlotLabelChange = (slotId: string, value: string) => {
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, label: value }))
  }

  const handleMealSlotCapacityChange = (slotId: string, value: string) => {
    const parsed = Number.parseInt(value, 10)
    const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, capacity: sanitized }))
  }

  const handleMealSlotOperationCapacityChange = (slotId: string, value: string) => {
    const parsed = Number.parseInt(value, 10)
    const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, operationCapacity: sanitized }))
  }

  const handleMealSlotPickpackCapacityChange = (slotId: string, value: string) => {
    const parsed = Number.parseInt(value, 10)
    const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, pickpackCapacity: sanitized }))
  }

  const handleToggleMealSlotEnabled = (slotId: string, checked: boolean | "indeterminate") => {
    const isChecked = checked === true
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, enabled: isChecked }))
  }

  const handleRemoveMealSlotDraft = (slotId: string) => {
    setMealSlotDrafts((prev) => prev.filter((slot) => slot.id !== slotId))
  }

  const handleMealSlotStartChange = (slotId: string, value: string) => {
    mutateMealSlotDraft(slotId, (slot) => {
      if (slot.endTime > value) {
        return { ...slot, startTime: value }
      }
      const nextOption = MEAL_TIME_OPTIONS.find((option) => option.value > value)
      return {
        ...slot,
        startTime: value,
        endTime: nextOption?.value ?? slot.endTime,
      }
    })
  }

  const handleMealSlotEndChange = (slotId: string, value: string) => {
    mutateMealSlotDraft(slotId, (slot) => ({ ...slot, endTime: value }))
  }

  const handleToggleMealSlotUnit = (
    slotId: string,
    unitId: UnitPositionId,
    checked: boolean
  ) => {
    mutateMealSlotDraft(slotId, (slot) => {
      const next = new Set(slot.appliesTo)
      if (checked) {
        next.add(unitId)
      } else {
        next.delete(unitId)
      }
      return { ...slot, appliesTo: Array.from(next) }
    })
  }

  const handleToggleMealSlotFixedEmployee = (
    slotId: string,
    employeeId: string,
    checked: boolean
  ) => {
    mutateMealSlotDraft(slotId, (slot) => {
      const next = new Set(slot.fixedEmployeeIds)
      if (checked) {
        next.add(employeeId)
      } else {
        next.delete(employeeId)
      }
      return { ...slot, fixedEmployeeIds: Array.from(next) }
    })
  }

  const handleOpenSaveMealTemplateModal = () => {
    if (mealSlotDrafts.length === 0) {
      toast({
        title: "Agrega bloques de comida",
        description: "Configura al menos un bloque antes de guardar la plantilla.",
        variant: "destructive",
      })
      return
    }
    setMealTemplateName(`Plantilla ${mealTemplates.length + 1}`)
    setIsSaveMealTemplateModalOpen(true)
  }

  const handleConfirmSaveMealTemplate = () => {
    const normalizedName = mealTemplateName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Ingresa un nombre para identificar esta plantilla de comidas.",
        variant: "destructive",
      })
      return
    }

    if (mealSlotDrafts.length === 0) {
      toast({
        title: "Sin bloques configurados",
        description: "Agrega al menos un bloque para guardar la plantilla.",
        variant: "destructive",
      })
      return
    }

    if (mealTemplates.some((template) => template.name.toLowerCase() === normalizedName.toLowerCase())) {
      toast({
        title: "Nombre duplicado",
        description: "Elige un nombre distinto para identificar la plantilla.",
        variant: "destructive",
      })
      return
    }

    const sanitizedSlots = mealSlotDrafts.map((slot) => sanitizeMealSlotForTemplate(cloneMealSlotConfig(slot)))
    const newTemplate: MealSlotTemplate = {
      id: createMealTemplateId(),
      name: normalizedName,
      slots: sanitizedSlots,
    }

    setMealTemplates((prev) => [newTemplate, ...prev])
    setSelectedMealTemplateId(newTemplate.id)
    setIsSaveMealTemplateModalOpen(false)
    setMealTemplateName("")
    toast({
      title: "Plantilla guardada",
      description: "La configuración de bloques quedó disponible para futuras semanas.",
    })
  }

  const handleApplyMealTemplate = (templateId: string) => {
    const template = mealTemplates.find((item) => item.id === templateId)
    if (!template) return

    const clonedSlots = template.slots.map((slot) => sanitizeMealSlotForTemplate(cloneMealSlotConfig(slot)))
    setMealSlotDrafts(clonedSlots)
    setSelectedMealTemplateId(templateId)
    toast({
      title: `Plantilla "${template.name}" aplicada`,
      description: "Revisa los bloques y guarda el rol para confirmar los cambios.",
    })
  }

  const handleDeleteMealTemplate = (templateId: string) => {
    const template = mealTemplates.find((item) => item.id === templateId)
    if (!template) return

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`¿Eliminar la plantilla "${template.name}"?`)
      if (!confirmed) return
    }

    setMealTemplates((prev) => prev.filter((item) => item.id !== templateId))
    if (selectedMealTemplateId === templateId) {
      setSelectedMealTemplateId(null)
    }
    toast({
      title: "Plantilla eliminada",
      description: "La configuración guardada ya no estará disponible.",
    })
  }

  const handleAssignSaturdayTeam = useCallback((employeeId: string, team: SaturdayTeam | null) => {
    setSaturdayTeamAssignments((prev) => {
      const currentTeam = prev[employeeId]
      if (currentTeam === team || (!team && !currentTeam)) {
        return prev
      }
      const next = { ...prev }
      if (team) {
        next[employeeId] = team
      } else {
        delete next[employeeId]
      }
      return next
    })
  }, [])

  const handleAutoDistributeSaturdayTeams = useCallback(() => {
    if (saturdayEligibleEmployees.length === 0) {
      toast({
        title: "Sin personal elegible",
        description: "Agrega colaboradores activos antes de dividirlos en equipos.",
        variant: "destructive",
      })
      return
    }

    const ordered = [...saturdayEligibleEmployees].sort(sortEmployeesByName)
    const team1: string[] = []
    const team2: string[] = []

    ordered.forEach((employee, index) => {
      if (index % 2 === 0) {
        team1.push(employee.id)
      } else {
        team2.push(employee.id)
      }
    })

    setSaturdayTeamAssignments((prev) => {
      const next = { ...prev }
      const eligibleIds = new Set(ordered.map((employee) => employee.id))
      eligibleIds.forEach((employeeId) => {
        delete next[employeeId]
      })
      team1.forEach((employeeId) => {
        next[employeeId] = "team1"
      })
      team2.forEach((employeeId) => {
        next[employeeId] = "team2"
      })
      return next
    })

    toast({
      title: "Equipos alternos listos",
      description: "El personal elegible se dividió en equipos que rotarán cada semana.",
    })
  }, [saturdayEligibleEmployees, toast])

  const handleClearSaturdayTeams = useCallback(() => {
    const eligibleIds = new Set(saturdayEligibleEmployees.map((employee) => employee.id))
    let cleared = false

    setSaturdayTeamAssignments((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev
      }

      if (eligibleIds.size === 0) {
        cleared = true
        return {}
      }

      const next: Record<string, SaturdayTeam> = {}
      for (const [employeeId, team] of Object.entries(prev)) {
        if (eligibleIds.has(employeeId)) {
          cleared = true
          continue
        }
        next[employeeId] = team
      }

      return cleared ? next : prev
    })

    if (cleared) {
      toast({
        title: "Equipos limpiados",
        description: "Puedes volver a definir la rotación cuando lo necesites.",
      })
    } else if (saturdayEligibleEmployees.length === 0) {
      toast({
        title: "Sin personal elegible",
        description: "No hay colaboradores activos disponibles para administrar equipos.",
        variant: "destructive",
      })
    }
  }, [saturdayEligibleEmployees, toast])

  const handleAssignSupervisorWeekend = useCallback((employeeId: string, team: "team-a" | "team-b" | null) => {
    setSupervisorWeekendAssignments((prev) => {
      const currentTeam = prev[employeeId]
      if (currentTeam === team || (!team && !currentTeam)) {
        return prev
      }
      const next = { ...prev }
      if (team) {
        next[employeeId] = team
      } else {
        delete next[employeeId]
      }
      return next
    })
  }, [])

  const handleClearSupervisorWeekend = useCallback(() => {
    setSupervisorWeekendAssignments({})
    toast({
      title: "Equipos limpiados",
      description: "Se ha limpiado la asignación de equipos de supervisores.",
    })
  }, [toast])

  const handleToggleSupervisorParity = useCallback(() => {
    setSupervisorParityRestTeam((prev) => prev === "team-a" ? "team-b" : "team-a")
  }, [])

  const handleConfirmMealPlanner = () => {
    if (mealSlotDrafts.length === 0) {
      setMealSlots([])
      setIsMealPlannerOpen(false)
      return
    }

    for (const slot of mealSlotDrafts) {
      if (!slot.enabled) continue
      if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
        toast({
          title: "Revisa los horarios",
          description: "Cada bloque debe tener un horario de fin posterior al inicio.",
          variant: "destructive",
        })
        return
      }
      const normalizedCapacity = Math.max(0, Math.floor(slot.capacity || 0))
      const fixedCount = slot.fixedEmployeeIds.filter((employeeId) =>
        mealEligibleEmployeeIds.has(employeeId)
      ).length
      if (normalizedCapacity < fixedCount) {
        toast({
          title: "Capacidad insuficiente",
          description: `Ajusta el cupo del bloque ${slot.label || `${slot.startTime} - ${slot.endTime}`} o reduce colaboradores fijos.`,
          variant: "destructive",
        })
        return
      }
    }

    const sanitized = mealSlotDrafts.map((slot) => {
      const trimmedLabel = slot.label.trim()
      const normalizedCapacity = Math.max(0, Math.floor(slot.capacity || 0))
      const allowedUnits = slot.appliesTo.filter((unitId) => unitId === "OPERATION" || unitId === "PICKPACK")
      const normalizedAppliesTo: UnitPositionId[] =
        allowedUnits.length > 0 ? Array.from(new Set(allowedUnits)) : (["OPERATION"] as UnitPositionId[])
      const filteredFixed = slot.fixedEmployeeIds.filter((employeeId) =>
        mealEligibleEmployeeIds.has(employeeId)
      )
      return {
        ...slot,
        label: trimmedLabel.length > 0 ? trimmedLabel : `${slot.startTime} - ${slot.endTime}`,
        capacity: normalizedCapacity,
        appliesTo: normalizedAppliesTo,
        fixedEmployeeIds: Array.from(new Set(filteredFixed)),
      }
    })

    setMealSlots(sanitized)
    setMealSlotDrafts(sanitized)
    setIsMealPlannerOpen(false)
    toast({
      title: "Rol de comidas actualizado",
      description: "Los bloques se guardaron y se utilizarán al recalcular el rol.",
    })
  }

  const handleConfirmSaveSchedulePreset = async () => {
    const normalizedName = presetName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Ingresa un nombre para identificar esta configuración.",
        variant: "destructive",
      })
      return
    }

    if (!office?.id) {
      toast({
        title: "Operación no válida",
        description: "No se encontró la oficina para guardar la configuración.",
        variant: "destructive",
      })
      return
    }

    if (isSavingSchedulePreset) return

    setIsSavingSchedulePreset(true)

    try {
      const existingPreset = schedulePresets.find(
        (preset) => preset.name.trim().toLowerCase() === normalizedName.toLowerCase()
      )

      if (existingPreset) {
        await deleteRoleSchedulePreset(existingPreset.id)
      }

      const sanitizedSupervisorSchedules = ppSupervisorSchedules
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

      const savedRecord = await insertRoleSchedulePreset(office.id, {
        name: normalizedName,
        shiftName,
        startTime,
        endTime,
        scheduleMatrix: cloneScheduleMatrix(scheduleMatrix),
        ppSupervisorSchedules:
          sanitizedSupervisorSchedules.length > 0
            ? sanitizedSupervisorSchedules
            : ["07:00 - 15:00"],
      })

      const normalizedPreset: SchedulePreset = {
        id: savedRecord.id,
        name: savedRecord.name,
        shiftName: savedRecord.shift_name,
        startTime: savedRecord.start_time,
        endTime: savedRecord.end_time,
        scheduleMatrix: cloneScheduleMatrix(normalizeScheduleMatrixData(savedRecord.schedule_matrix)),
        ppSupervisorSchedules: Array.isArray(savedRecord.pp_supervisor_schedules) ? [...savedRecord.pp_supervisor_schedules] : undefined,
      }

      setSchedulePresets((prev) => {
        const filtered = prev.filter((preset) => preset.id !== existingPreset?.id)
        return [normalizedPreset, ...filtered]
      })
      setSelectedPresetId(normalizedPreset.id)
      setIsSaveScheduleModalOpen(false)
      setPresetName("")
      toast({
        title: "Configuración guardada",
        description: "Ahora puedes reutilizar estos horarios en futuros roles.",
      })
    } catch (error) {
      console.error("No se pudo guardar la configuración de horarios en Supabase:", error)
      toast({
        title: "No se pudo guardar",
        description: "Ocurrió un error al guardar la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsSavingSchedulePreset(false)
    }
  }

  const handleSlotChange = (positionId: string, value: string) => {
    const parsed = Number.parseInt(value, 10)
    const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    const currentValue = positionSlots[positionId] ?? 0
    if (currentValue === sanitized) return

    let updated = false
    setPositionSlots((prev) => {
      const fixedInPosition = (assignments[positionId] || []).filter((employeeId) =>
        fixedEmployeeSet.has(employeeId)
      ).length
      if (sanitized < fixedInPosition) {
        const positionInfo = ALL_POSITIONS.find((item) => item.id === positionId)
        toast({
          title: "No puedes reducir más este puesto",
          description: `Hay ${fixedInPosition} colaborador(es) marcados como fijos en ${positionInfo?.name || "este puesto"}.`,
          variant: "destructive",
        })
        return prev
      }

      const next = { ...prev, [positionId]: sanitized }
      const nextTotal = Object.values(next).reduce((sum, count) => sum + (count || 0), 0)

      if (activeEmployeeCount > 0 && nextTotal > activeEmployeeCount) {
        toast({
          title: "Límite de puestos alcanzado",
          description: `Solo hay ${activeEmployeeCount} colaborador(es) activos disponibles.`,
          variant: "destructive",
        })
        return prev
      }

      updated = true
      return next
    })
    if (updated) {
      setIsRoleGenerated(false)
      setSelectedPositionPresetId(null)
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(positionPresetSelectionStorageKey)
      }
    }
  }

  const handleFixEmployeeToPosition = (positionId: string, employeeId: string) => {
    if (!employeeId || employeeId.startsWith("__")) return

    const positionInfo = ALL_POSITIONS.find((position) => position.id === positionId)
    if (!positionInfo) return

    const requiredCount = positionSlots[positionId] || 0
    if (requiredCount === 0) {
      toast({
        title: "Configura puestos disponibles",
        description: `Primero agrega al menos un puesto en ${positionInfo.name} antes de fijar personal.`,
        variant: "destructive",
      })
      return
    }

    const selectedEmployee = employeeMap.get(employeeId)
    const canAssign = canEmployeeCoverPosition(selectedEmployee, positionId)
    const hasFallbackEligibility =
      isConsulatePositionId(positionId) &&
      selectedEmployee &&
      !trainingEmployeeIds.has(selectedEmployee.id) &&
      isEmployeeEligibleForPosition(selectedEmployee, positionId)

    if (!selectedEmployee || (!canAssign && !hasFallbackEligibility)) {
      let description = `${getEmployeeDisplayName(selectedEmployee)} no cumple con los requisitos de ${positionInfo.name}.`

      if (selectedEmployee && isConsulatePositionId(positionId)) {
        if (trainingEmployeeIds.has(selectedEmployee.id)) {
          description = `${getEmployeeDisplayName(selectedEmployee)} está marcado en Entrenamiento y no puede cubrir Consulado.`
        } else if (!consulateAuthorizedEmployeeIds.has(selectedEmployee.id)) {
          description = `${getEmployeeDisplayName(selectedEmployee)} no tiene habilitado el atributo Consulado.`
        }
      }

      toast({
        title: "Perfil incompatible",
        description,
        variant: "destructive",
      })
      return
    }
    const displayName = getEmployeeDisplayName(selectedEmployee)

    if (
      isVacationRestrictedPositionId(positionId) &&
      selectedEmployee.id &&
      employeesWithVacation.has(selectedEmployee.id)
    ) {
      toast({
        title: "Vacaciones activas",
        description: `${displayName} se reubica en Operación CAS mientras dure su descanso.`,
        variant: "destructive",
      })
      return
    }
    if (!canAssign && hasFallbackEligibility && isConsulatePositionId(positionId)) {
      toast({
        title: "Asignación sin atributo",
        description: `${displayName} no tiene el atributo Consulado activo. Se asignará de forma excepcional.`,
      })
    }
    let applied = false
    let failureReason: "locked" | null = null

    setAssignments((prev) => {
      const next: Record<string, string[]> = {}

      for (const position of ALL_POSITIONS) {
        const current = prev[position.id] || []
        next[position.id] = current.filter((id) => id !== employeeId)
      }

      const existingEntries = next[positionId] || []
      let targetList = [...existingEntries]

      if (targetList.length >= requiredCount) {
        const removableIndex = targetList.findIndex((id) => !fixedEmployeeSet.has(id))
        if (removableIndex === -1) {
          failureReason = "locked"
          return prev
        }
        targetList = targetList.filter((_, index) => index !== removableIndex)
      }

      targetList.push(employeeId)
      next[positionId] = targetList
      applied = true
      return next
    })

    if (!applied) {
      toast({
        title: "Sin espacios disponibles",
        description:
          failureReason === "locked"
            ? `Todos los puestos en ${positionInfo.name} están ocupados por colaboradores fijos. Libera uno antes de fijar a ${displayName}.`
            : `Incrementa los puestos de ${positionInfo.name} para asignar a ${displayName}.`,
        variant: "destructive",
      })
      return
    }

    setFixedEmployeeIds((prev) => {
      const next = new Set(prev)
      next.add(employeeId)
      return Array.from(next)
    })
    setIsRoleGenerated(false)
    setSelectedPositionPresetId(null)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }

    toast({
      title: "Empleado fijado",
      description: `${displayName} quedó asignado a ${positionInfo.name}.`,
    })
  }

  const handleAttributeToggle = (attributeId: string, employeeId: string, checked: boolean | string) => {
    const isChecked = checked === true

    setIsRoleGenerated(false)
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.id !== attributeId) return attribute

        const nextIds = new Set(attribute.employeeIds)
        if (isChecked) {
          nextIds.add(employeeId)
        } else {
          nextIds.delete(employeeId)
        }

        const orderedIds = Array.from(nextIds).sort((a, b) => {
          const employeeA = employeeMap.get(a)
          const employeeB = employeeMap.get(b)
          return getEmployeeDisplayName(employeeA).localeCompare(
            getEmployeeDisplayName(employeeB),
            "es"
          )
        })

        return { ...attribute, employeeIds: orderedIds }
      })
    )
  }

  const handleAttributeColumnToggle = (attributeId: string, action: "selectAll" | "clear") => {
    setIsRoleGenerated(false)
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.id !== attributeId) return attribute
        if (action === "clear") {
          return { ...attribute, employeeIds: [] }
        }

        const allIds = sortedActiveEmployees.map((employee) => employee.id)
        return { ...attribute, employeeIds: allIds }
      })
    )
  }

  const autoAssignEmployees = (options?: {
    successToast?: { title: string; description?: string } | null
  }): boolean => {
    const totalSlots = Object.values(positionSlots).reduce((sum, count) => sum + (count || 0), 0)

    if (totalSlots === 0) {
      toast({
        title: "Define cupos",
        description: "Indica al menos un cupo en alguna unidad antes de asignar empleados.",
        variant: "destructive",
      })
      return false
    }

    if (activeEmployeeCount === 0) {
      toast({
        title: "Sin colaboradores activos",
        description: "No hay personal disponible para asignar en este momento.",
        variant: "destructive",
      })
      return false
    }

    const nextAssignments = createEmptyAssignments()
    const usedEmployeeIds = new Set<string>()

    for (const position of ALL_POSITIONS) {
      const requiredCount = positionSlots[position.id] || 0
      const current = assignments[position.id] || []
      const fixedInPosition = current.filter((employeeId) => {
        if (!fixedEmployeeSet.has(employeeId)) return false
        if (isVacationRestrictedPositionId(position.id) && employeesWithVacation.has(employeeId)) {
          return false
        }
        const employee = employeeMap.get(employeeId)
        return Boolean(employee && canEmployeeCoverPosition(employee, position.id))
      })

      // Para Pick & Pack y Consulado el personal fijo no puede exceder los cupos
      if (position.id !== "OPERATION" && fixedInPosition.length > requiredCount) {
        toast({
          title: "Cupos insuficientes para personal fijo",
          description: `Incrementa los cupos de ${position.name} o libera colaboradores fijos antes de continuar.`,
          variant: "destructive",
        })
        return false
      }

      const uniqueFixed = Array.from(new Set(fixedInPosition))
      nextAssignments[position.id] = uniqueFixed
      uniqueFixed.forEach((employeeId) => usedEmployeeIds.add(employeeId))
    }

    const remainingEmployees = activeEmployees.filter((employee) => !usedEmployeeIds.has(employee.id))

    const sortedRemaining = [...remainingEmployees].sort((a, b) => {
      const diff = getAbsenceScore(a.id) - getAbsenceScore(b.id)
      if (diff !== 0) return diff
      return getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), "es")
    })

    const pickEligibleEmployees = (
      pool: Employee[],
      positionId: string,
      count: number
    ): { selected: Employee[]; remaining: Employee[] } => {
      if (count <= 0) return { selected: [], remaining: pool }

      const pickFromCandidates = (candidates: Employee[], needed: number, currentPool: Employee[]) => {
        if (needed <= 0 || candidates.length === 0) {
          return { picked: [] as Employee[], remainingPool: currentPool, remainingNeed: needed }
        }
        const shuffled = shuffleArray(candidates)
        const chosen = shuffled.slice(0, Math.min(needed, shuffled.length))
        const chosenIds = new Set(chosen.map((employee) => employee.id))
        const remainingPool = currentPool.filter((employee) => !chosenIds.has(employee.id))
        return { picked: chosen, remainingPool, remainingNeed: needed - chosen.length }
      }

      let need = count
      let workingPool = [...pool]
      const selected: Employee[] = []

      const eligiblePool = workingPool.filter((employee) => {
        if (!canEmployeeCoverPosition(employee, positionId)) return false
        if (isVacationRestrictedPositionId(positionId) && employeesWithVacation.has(employee.id)) {
          return false
        }
        // Excluir empleados con restricción de Pick & Pack
        if ((positionId === "PICKPACK" || positionId === "PICKPACK_SUPERVISOR" || 
             positionId === "PICKPACK_PASSBACK") && 
            restrictedPickPackIds.has(employee.id)) {
          return false
        }
        // Excluir empleados con restricción de Consulado
        if ((positionId === "CONSULATE" || positionId === "CONSULATE_SUPERVISOR") && 
            restrictedConsulateIds.has(employee.id)) {
          return false
        }
        return true
      })
      const primaryResult = pickFromCandidates(eligiblePool, need, workingPool)
      selected.push(...primaryResult.picked)
      workingPool = primaryResult.remainingPool
      need = primaryResult.remainingNeed

      if (need > 0 && isConsulatePositionId(positionId)) {
        const fallbackPool = workingPool.filter((employee) => {
          if (!employee) return false
          if (!isEmployeeEligibleForPosition(employee, positionId)) return false
          if (trainingEmployeeIds.has(employee.id)) return false
          if (isVacationRestrictedPositionId(positionId) && employeesWithVacation.has(employee.id)) return false
          // Excluir empleados con restricción de Consulado del fallback
          if (restrictedConsulateIds.has(employee.id)) return false
          return true
        })
        const fallbackResult = pickFromCandidates(fallbackPool, need, workingPool)
        selected.push(...fallbackResult.picked)
        workingPool = fallbackResult.remainingPool
        need = fallbackResult.remainingNeed
      }

      return { selected, remaining: workingPool }
    }

    let availablePool = [...sortedRemaining]
    const shortages: Record<UnitPositionId, number> = {
      OPERATION: 0,
      PICKPACK: 0,
      CONSULATE: 0,
    }

    for (const position of ALL_POSITIONS) {
      if (position.id === "OPERATION") continue
      const required = positionSlots[position.id] || 0
      const fixedCount = nextAssignments[position.id].length
      const needed = Math.max(required - fixedCount, 0)

      if (needed === 0) continue

      const { selected, remaining } = pickEligibleEmployees(availablePool, position.id, needed)
      nextAssignments[position.id].push(...selected.map((employee) => employee.id))
      availablePool = remaining

      if (selected.length < needed) {
        shortages[position.id as UnitPositionId] = needed - selected.length
      }
    }

    const operationSet = new Set<string>(
      nextAssignments.OPERATION.filter((employeeId) => {
        const employee = employeeMap.get(employeeId)
        return Boolean(employee && canEmployeeCoverPosition(employee, "OPERATION"))
      })
    )
    availablePool.forEach((employee) => {
      if (canEmployeeCoverPosition(employee, "OPERATION")) {
        operationSet.add(employee.id)
      }
    })
    nextAssignments.OPERATION = Array.from(operationSet)

    setAssignments(nextAssignments)
    setIsRoleGenerated(false)
    setSelectedPositionPresetId(null)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }

    const { dailyAssignments, shortages: computedShortages } = recomputeDailyUnitAssignments(
      nextAssignments,
      positionSlots
    )
    const mergedShortages: Record<UnitPositionId, number> = { ...shortages }
    for (const unitId of Object.keys(computedShortages) as UnitPositionId[]) {
      mergedShortages[unitId] = Math.max(mergedShortages[unitId] || 0, computedShortages[unitId])
    }
    setDailyUnitAssignments(dailyAssignments)
    setUnitShortages(mergedShortages)

    const mealAssignments = recomputeMealAssignments(dailyAssignments, mealSlots, nextAssignments)
    setDailyMealAssignments(mealAssignments)

    const successToast = options?.successToast ?? {
      title: "Asignación actualizada",
      description: "Se recalcularon las unidades y la rotación diaria de operación.",
    }
    if (successToast) {
      toast(successToast)
    }

    return true
  }

  const toggleFixedEmployee = (employeeId: string, checked: boolean | string) => {
    if (!assignedEmployeeIds.has(employeeId)) return
    setIsRoleGenerated(false)
    const isChecked = checked === true
    setFixedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (isChecked) {
        next.add(employeeId)
      } else {
        next.delete(employeeId)
      }
      return Array.from(next)
    })
  }

  const handleApplyPositionPreset = (presetId: string) => {
    const preset = positionPresets.find((item) => item.id === presetId)
    if (!preset) return

    setPositionSlots((prev) => {
      const applied = clonePositionSlots(preset.slots)
      for (const position of ALL_POSITIONS) {
        if (applied[position.id] < (assignments[position.id]?.filter((employeeId) => fixedEmployeeSet.has(employeeId)).length || 0)) {
          applied[position.id] = assignments[position.id]?.filter((employeeId) => fixedEmployeeSet.has(employeeId)).length || 0
        }
      }
      return applied
    })
    
    // Aplicar las asignaciones guardadas si existen
    if (preset.assignments) {
      setAssignments(() => {
        const base = createEmptyAssignments()
        for (const [positionId, employeeIds] of Object.entries(preset.assignments)) {
          if (!Object.prototype.hasOwnProperty.call(base, positionId)) continue
          const validEmployeeIds = employeeIds.filter((id) =>
            operationEmployees.some((emp) => emp.id === id)
          )
          base[positionId] = validEmployeeIds
        }
        return base
      })
    }

    if (preset.fixedEmployeeIds) {
      setFixedEmployeeIds(() => {
        const validIds = preset.fixedEmployeeIds?.filter((employeeId) =>
          operationEmployees.some((employee) => employee.id === employeeId)
        )
        return Array.isArray(validIds) ? Array.from(new Set(validIds)) : []
      })
    }
    
    setSelectedPositionPresetId(presetId)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(positionPresetSelectionStorageKey, presetId)
    }
    setIsRoleGenerated(false)
    toast({
      title: "Cupos aplicados",
      description: `Se cargó la configuración "${preset.name}".`,
    })
  }

  const handleDeletePositionPreset = async (presetId: string) => {
    if (deletingPositionPresetId) return

    setDeletingPositionPresetId(presetId)
    try {
      await deleteRolePositionPreset(presetId)
      setPositionPresets((prev) => prev.filter((preset) => preset.id !== presetId))
      setSelectedPositionPresetId((current) => (current === presetId ? null : current))
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        const current = window.localStorage.getItem(positionPresetSelectionStorageKey)
        if (current === presetId) {
          window.localStorage.removeItem(positionPresetSelectionStorageKey)
        }
      }
      toast({
        title: "Configuración eliminada",
        description: "Los cupos guardados ya no estarán disponibles.",
      })
    } catch (error) {
      console.error("No se pudo eliminar la configuración de puestos en Supabase:", error)
      toast({
        title: "No se pudo eliminar",
        description: "Ocurrió un error al eliminar la configuración de puestos.",
        variant: "destructive",
      })
    } finally {
      setDeletingPositionPresetId((current) => (current === presetId ? null : current))
    }
  }

  const handleConfirmSavePositionPreset = async () => {
    const normalizedName = positionPresetName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Especifica un nombre para identificar esta configuración de puestos.",
        variant: "destructive",
      })
      return
    }

    if (!office?.id) {
      toast({
        title: "Operación no válida",
        description: "No se encontró la oficina para guardar los cupos.",
        variant: "destructive",
      })
      return
    }

    if (isSavingPositionPreset) return

    setIsSavingPositionPreset(true)

    try {
      const existingPreset = positionPresets.find(
        (preset) => preset.name.trim().toLowerCase() === normalizedName.toLowerCase()
      )

      if (existingPreset) {
        await deleteRolePositionPreset(existingPreset.id)
      }

      const validEmployeeIds = new Set(employees.map((employee) => employee.id))
      const sanitizedAssignments = createEmptyAssignments()
      for (const [positionId, employeeIds] of Object.entries(assignments)) {
        if (!Object.prototype.hasOwnProperty.call(sanitizedAssignments, positionId)) continue
        sanitizedAssignments[positionId] = employeeIds.filter((employeeId) => validEmployeeIds.has(employeeId))
      }

      const savedRecord = await insertRolePositionPreset(office.id, {
        name: normalizedName,
        slots: clonePositionSlots(positionSlots),
        assignments: sanitizedAssignments,
        fixedEmployeeIds: [...new Set(fixedEmployeeIds.filter((employeeId) => validEmployeeIds.has(employeeId)))],
      })

      const normalizedPreset: PositionPreset = {
        id: savedRecord.id,
        name: savedRecord.name,
        slots:
          savedRecord.slots && typeof savedRecord.slots === "object" && savedRecord.slots !== null
            ? clonePositionSlots(savedRecord.slots as Record<string, number>)
            : clonePositionSlots({}),
        assignments:
          savedRecord.assignments && typeof savedRecord.assignments === "object" && savedRecord.assignments !== null
            ? JSON.parse(JSON.stringify(savedRecord.assignments))
            : undefined,
        fixedEmployeeIds: Array.isArray(savedRecord.fixed_employee_ids)
          ? (savedRecord.fixed_employee_ids as string[]).filter((value): value is string => typeof value === "string")
          : undefined,
      }

      setPositionPresets((prev) => {
        const filtered = prev.filter((preset) => preset.id !== existingPreset?.id)
        return [normalizedPreset, ...filtered]
      })
      setSelectedPositionPresetId(normalizedPreset.id)
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(positionPresetSelectionStorageKey, normalizedPreset.id)
      }
      setPositionPresetName("")
      setIsSavePositionPresetModalOpen(false)
      toast({
        title: "Cupos guardados",
        description: "Ahora puedes reutilizar esta distribución de puestos cuando lo necesites.",
      })
    } catch (error) {
      console.error("No se pudo guardar la configuración de puestos en Supabase:", error)
      toast({
        title: "No se pudo guardar",
        description: "Ocurrió un error al guardar los cupos.",
        variant: "destructive",
      })
    } finally {
      setIsSavingPositionPreset(false)
    }
  }

  const handleOpenSaveWorkstationTemplateModal = () => {
    const derived = deriveWorkstationDistributionFromAssignments()
    const derivedTotal = sumWorkstationDistribution(derived)
    const candidate = derivedTotal > 0 ? derived : workstationDistribution
    const fallback = createEmptyWorkstationDistribution()
    if (sumWorkstationDistribution(candidate) === 0 && operationEmployees.length > 0) {
      fallback.O = operationEmployees.length
    }
    const nextDistribution = sumWorkstationDistribution(candidate) > 0 ? candidate : fallback
    setWorkstationTemplateDistribution(cloneWorkstationDistribution(nextDistribution))
    setWorkstationTemplateName("")
    setIsSaveWorkstationTemplateModalOpen(true)
  }

  const handleWorkstationTemplateDistributionChange = (code: WorkstationCode, rawValue: string) => {
    setWorkstationTemplateDistribution((prev) => {
      const next = cloneWorkstationDistribution(prev)
      const parsed = Number(rawValue)
      next[code] = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
      return next
    })
  }

  const handleWorkstationDistributionChange = (code: WorkstationCode, rawValue: string) => {
    setWorkstationDistribution((prev) => {
      const next = cloneWorkstationDistribution(prev)
      const parsed = Number(rawValue)
      const sanitized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
      next[code] = sanitized

      const limit = operationEmployees.length
      if (limit > 0) {
        const total = sumWorkstationDistribution(next)
        if (total > limit) {
          const others = total - next[code]
          next[code] = Math.max(0, Math.min(sanitized, Math.max(0, limit - others)))
        }
      }

      return next
    })
  }

  const handleGenerateWorkstationRotation = () => {
    applyWorkstationDistribution(workstationDistribution, {
      clearTemplateSelection: true,
    })
  }

  const handleConfirmSaveWorkstationTemplate = async () => {
    const normalizedName = workstationTemplateName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Especifica un nombre para identificar esta plantilla de puestos.",
        variant: "destructive",
      })
      return
    }

    if (!office?.id) {
      toast({
        title: "Operación no válida",
        description: "No se encontró la oficina para guardar la plantilla.",
        variant: "destructive",
      })
      return
    }

    if (operationSlotLimit <= 0) {
      toast({
        title: "Configura cupos de Operación",
        description: "Define al menos un cupo CAS-OP antes de guardar una plantilla.",
        variant: "destructive",
      })
      return
    }

    const totalSlots = sumWorkstationDistribution(workstationTemplateDistribution)
    if (totalSlots === 0) {
      toast({
        title: "Define puestos",
        description: "Agrega al menos un puesto O, R, F o WS a la plantilla.",
        variant: "destructive",
      })
      return
    }

    if (totalSlots > workstationCapacityLimit) {
      toast({
        title: "Excede los cupos disponibles",
        description: `La plantilla supera los ${workstationCapacityLimit} puestos disponibles para la rotación interna. Ajusta las cantidades antes de guardar.`,
        variant: "destructive",
      })
      return
    }

    if (isSavingWorkstationTemplate) return

    setIsSavingWorkstationTemplate(true)

    try {
      const existingTemplate = workstationTemplates.find(
        (template) => template.name.trim().toLowerCase() === normalizedName.toLowerCase()
      )

      if (existingTemplate) {
        await deleteRoleWorkstationTemplate(existingTemplate.id)
      }

      const savedRecord = await insertRoleWorkstationTemplate(office.id, {
        name: normalizedName,
        distribution: cloneWorkstationDistribution(workstationTemplateDistribution),
      })

      const normalizedTemplate: WorkstationTemplate = {
        id: savedRecord.id,
        name: savedRecord.name,
        distribution: normalizeWorkstationDistribution(savedRecord.distribution),
      }

      setWorkstationTemplates((prev) => {
        const filtered = prev.filter((template) => template.id !== existingTemplate?.id)
        return [normalizedTemplate, ...filtered]
      })
      setSelectedWorkstationTemplateId(normalizedTemplate.id)
      if (workstationTemplateSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(workstationTemplateSelectionStorageKey, normalizedTemplate.id)
      }
      setWorkstationTemplateName("")
      setIsSaveWorkstationTemplateModalOpen(false)
      toast({
        title: "Plantilla guardada",
        description: "Ahora puedes reutilizar esta distribución de puestos operativos.",
      })
    } catch (error) {
      console.error("No se pudo guardar la plantilla de puestos operativos en Supabase:", error)
      toast({
        title: "No se pudo guardar",
        description: "Ocurrió un error al guardar la plantilla de puestos.",
        variant: "destructive",
      })
    } finally {
      setIsSavingWorkstationTemplate(false)
    }
  }

  const handleDeleteWorkstationTemplate = async (templateId: string) => {
    if (deletingWorkstationTemplateId) return

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("¿Eliminar esta plantilla de puestos?")
      if (!confirmed) return
    }

    setDeletingWorkstationTemplateId(templateId)
    try {
      await deleteRoleWorkstationTemplate(templateId)
      setWorkstationTemplates((prev) => prev.filter((template) => template.id !== templateId))
      setSelectedWorkstationTemplateId((current) => (current === templateId ? null : current))
      if (workstationTemplateSelectionStorageKey && typeof window !== "undefined") {
        const current = window.localStorage.getItem(workstationTemplateSelectionStorageKey)
        if (current === templateId) {
          window.localStorage.removeItem(workstationTemplateSelectionStorageKey)
        }
      }
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla ya no estará disponible para futuras semanas.",
      })
    } catch (error) {
      console.error("No se pudo eliminar la plantilla de puestos operativos en Supabase:", error)
      toast({
        title: "No se pudo eliminar",
        description: "Ocurrió un error al eliminar la plantilla de puestos.",
        variant: "destructive",
      })
    } finally {
      setDeletingWorkstationTemplateId((current) => (current === templateId ? null : current))
    }
  }

  const handleApplyWorkstationTemplate = (templateId: string) => {
    const template = workstationTemplates.find((item) => item.id === templateId)
    if (!template) return

    const result = applyWorkstationDistribution(template.distribution, { silent: true })
    if (!result) {
      return
    }

    setSelectedWorkstationTemplateId(templateId)

    const requestedTotal = sumWorkstationDistribution(template.distribution)
    const appliedDistribution = result.appliedDistribution
    const appliedTotal = sumWorkstationDistribution(appliedDistribution)
    const totalShortage = Object.values(result.shortagesByDate).reduce((sum, value) => sum + value, 0)
    const distributionModified = WORKSTATION_CODES.some(
      (code) => (template.distribution[code] || 0) !== (appliedDistribution[code] || 0)
    )
    const summaryLabel = WORKSTATION_CODES.map((code) => `${code}: ${appliedDistribution[code] || 0}`).join(" • ")
    let adjustmentNote = ""
    if (distributionModified) {
      if (appliedTotal > requestedTotal) {
        adjustmentNote = ` Se agregaron ${appliedTotal - requestedTotal} puesto(s) O para cubrir a todo el equipo.`
      } else if (appliedTotal < requestedTotal) {
        adjustmentNote = ` Se recortó la plantilla para ajustarse a los ${operationEmployees.length} colaboradores disponibles.`
      }
    }

    if (totalShortage > 0) {
      toast({
        title: "Plantilla aplicada con pendientes",
        description: `No se pudieron cubrir ${totalShortage} turno(s) por ausencias o festivos. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`,
        variant: "destructive",
      })
      return
    }

    if (appliedTotal < requestedTotal) {
      toast({
        title: "Plantilla ajustada",
        description: `La plantilla superaba el personal disponible. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`,
      })
      return
    }

    if (distributionModified && appliedTotal > requestedTotal) {
      toast({
        title: "Plantilla complementada",
        description: `Se completaron puestos adicionales para cubrir a todo el equipo. Distribución aplicada: ${summaryLabel}.${adjustmentNote}`,
      })
      return
    }

    toast({
      title: `Plantilla "${template.name}" aplicada`,
      description: `Distribución aplicada: ${summaryLabel}.${adjustmentNote}`,
    })
  }

  const handleDeleteRole = (roleId: string) => {
    if (typeof window !== "undefined") {
      const role = savedRoles.find(r => r.id === roleId)
      const confirmed = window.confirm(
        `¿Eliminar el rol de la ${role?.weekRangeLabel || 'semana'}? Esta acción no se puede deshacer.`
      )
      if (!confirmed) return
    }

    setSavedRoles((prev) => prev.filter((role) => role.id !== roleId))
    toast({
      title: "Rol eliminado",
      description: "El rol fue eliminado del historial.",
    })
  }

  const handleSetAsLastRole = (roleId: string) => {
    const role = savedRoles.find(r => r.id === roleId)
    if (!role) return

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `¿Marcar el rol de la ${role.weekRangeLabel} como base para la próxima rotación?\n\nEsto configurará los supervisores de CAS y Consulado de este rol como punto de partida para la rotación automática.`
      )
      if (!confirmed) return
    }

    // Obtener supervisores del rol seleccionado
    const consuladoAssignment = role.assignments.find(a => a.position === 'CONSULATE_SUPERVISOR')
    const casSupervisors = role.assignments.filter(a => a.position === 'CAS_SUPERVISOR')
    
    const consuladoSupervisorId = consuladoAssignment?.employeeId || null
    const cas1SupervisorId = casSupervisors[0]?.employeeId || null
    const cas2SupervisorId = casSupervisors[1]?.employeeId || null

    if (!consuladoSupervisorId && !cas1SupervisorId && !cas2SupervisorId) {
      toast({
        title: "No se puede aplicar",
        description: "Este rol no tiene supervisores asignados para la rotación.",
        variant: "destructive",
      })
      return
    }

    // Guardar en localStorage como base de rotación
    if (consulateSupervisorRotationKey && typeof window !== "undefined") {
      const rotationData = {
        weekStartDate: role.weekStartDate,
        consuladoSupervisorId,
        consuladoSupervisorName: consuladoAssignment?.displayName || null,
        cas1SupervisorId,
        cas1SupervisorName: casSupervisors[0]?.displayName || null,
        cas2SupervisorId,
        cas2SupervisorName: casSupervisors[1]?.displayName || null,
        savedAt: new Date().toISOString(),
        markedAsBase: true
      }
      
      window.localStorage.setItem(consulateSupervisorRotationKey, JSON.stringify(rotationData))
      
      toast({
        title: "✅ Rol marcado como base",
        description: `El rol de la ${role.weekRangeLabel} será la base para la próxima rotación automática.`,
      })
    }
  }

  const handleClearAssignments = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "¿Deseas limpiar todas las asignaciones, atributos y horarios personalizados?"
      )
      if (!confirmed) return
    }

    setAssignments(createEmptyAssignments())
    setScheduleOverrides({})
    setAttributes((prev) => prev.map((attribute) => ({ ...attribute, employeeIds: [] })))
    setFixedEmployeeIds([])
    setWeeklySchedulePlan(createDefaultWeeklySchedulePlan())
    setWorkstationAssignments({})
    setWorkstationDistribution(createEmptyWorkstationDistribution())
    setSelectedWorkstationTemplateId(null)
    setIsRoleGenerated(false)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }
    if (positionSlotsStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionSlotsStorageKey)
    }

    toast({
      title: "Rol reiniciado",
      description: "Se limpiaron las asignaciones y ajustes personalizados",
    })
  }

  const handlePrint = () => {
    if (typeof window === "undefined") return
    window.print()
  }

  const totalRequiredSlots = useMemo(
    () => Object.values(positionSlots).reduce((sum, count) => sum + (count || 0), 0),
    [positionSlots]
  )

  const assignedCount = useMemo(
    () => Object.values(assignments).reduce((sum, employeeIds) => sum + employeeIds.length, 0),
    [assignments]
  )

  const unfilledSlots = useMemo(
    () => Math.max(totalRequiredSlots - assignedCount, 0),
    [totalRequiredSlots, assignedCount]
  )

  const slotBalance = useMemo(
    () => activeEmployeeCount - totalRequiredSlots,
    [activeEmployeeCount, totalRequiredSlots]
  )

  const pendingEmployees = useMemo(
    () => Math.max(activeEmployeeCount - assignedCount, 0),
    [activeEmployeeCount, assignedCount]
  )

  const selectedWorkstationTemplate = useMemo(() => {
    if (!selectedWorkstationTemplateId) return null
    return workstationTemplates.find((item) => item.id === selectedWorkstationTemplateId) ?? null
  }, [selectedWorkstationTemplateId, workstationTemplates])

  useEffect(() => {
    if (weekDays.length === 0) return
    const allowedEmployees = new Set(limitedOperationEmployeeIds)
    const validDates = new Set(weekDays.map((day) => day.date))

    setWorkstationAssignments((prev) => {
      let changed = false
      const next: WorkstationAssignments = {}

      for (const [employeeId, entries] of Object.entries(prev)) {
        if (!allowedEmployees.has(employeeId)) {
          changed = true
          continue
        }

        const filtered: Record<string, string> = {}
        for (const [date, value] of Object.entries(entries)) {
          if (!validDates.has(date)) {
            changed = true
            continue
          }
          const isHoliday = holidaySet.has(date)
          const isVacation = vacationMap[employeeId]?.has(date) ?? false
          if (isHoliday || isVacation) {
            changed = true
            continue
          }
          const trimmed = value.trim()
          if (trimmed.length === 0) {
            changed = true
            continue
          }
          filtered[date] = trimmed
        }

        if (Object.keys(filtered).length > 0) {
          next[employeeId] = filtered
        } else if (Object.keys(entries).length > 0) {
          changed = true
        }
      }

      if (!changed) {
        return prev
      }

      return next
    })
  }, [limitedOperationEmployeeIds, weekDays, holidaySet, vacationMap])

  const deriveWorkstationDistributionFromAssignments = useCallback((): WorkstationDistribution => {
    const base = createEmptyWorkstationDistribution()
    if (operationEmployees.length === 0) {
      return base
    }
    const referenceDates = workingWeekDays.map(({ day }) => day.date)
    for (const employee of operationEmployees) {
      const entries = workstationAssignments[employee.id]
      if (!entries) continue
      let matched: WorkstationCode | null = null
      for (const date of referenceDates) {
        const rawValue = entries[date]
        if (!rawValue) continue
        const normalized = normalizeWorkstationValue(rawValue)
        if (normalized) {
          matched = normalized
          break
        }
      }
      if (matched) {
        base[matched] += 1
      }
    }
    return base
  }, [operationEmployees, workstationAssignments, workingWeekDays])

  useEffect(() => {
    const applyDistribution = (target: WorkstationDistribution) => {
      setWorkstationDistribution((prev) => {
        const matches = WORKSTATION_CODES.every((code) => (prev[code] || 0) === (target[code] || 0))
        return matches ? prev : cloneWorkstationDistribution(target)
      })
    }

    const fallbackToDerived = () => {
      const derived = deriveWorkstationDistributionFromAssignments()
      if (sumWorkstationDistribution(derived) > 0) {
        applyDistribution(derived)
        return
      }
      if (operationEmployees.length > 0) {
        const fallback = createEmptyWorkstationDistribution()
        fallback.O = operationEmployees.length
        applyDistribution(fallback)
      } else {
        applyDistribution(createEmptyWorkstationDistribution())
      }
    }

    if (!workstationDistributionStorageKey || typeof window === "undefined") {
      fallbackToDerived()
      return
    }

    try {
      const stored = window.localStorage.getItem(workstationDistributionStorageKey)
      if (stored) {
        const parsed = normalizeWorkstationDistribution(JSON.parse(stored))
        applyDistribution(parsed)
        return
      }
    } catch (error) {
      console.error("No se pudo cargar la distribución de puestos internos:", error)
    }

    fallbackToDerived()
  }, [
    deriveWorkstationDistributionFromAssignments,
    operationEmployees.length,
    workstationDistributionStorageKey,
  ])

  useEffect(() => {
    if (!workstationDistributionStorageKey || typeof window === "undefined") return
    try {
      const total = sumWorkstationDistribution(workstationDistribution)
      if (total === 0) {
        window.localStorage.removeItem(workstationDistributionStorageKey)
        return
      }
      window.localStorage.setItem(
        workstationDistributionStorageKey,
        JSON.stringify(cloneWorkstationDistribution(workstationDistribution))
      )
    } catch (error) {
      console.error("No se pudo guardar la distribución de puestos internos:", error)
    }
  }, [workstationDistribution, workstationDistributionStorageKey])

  const buildRoleSnapshot = useCallback((): RoleSnapshot => {
    if (!office) {
      throw new Error("No se encontró la oficina para el rol generado")
    }

    const attributeColumns = attributes.map(({ id, label }) => ({ id, label }))

    const attributeInfoByEmployee: Record<string, { ids: string[]; labels: string[] }> = {}
    attributes.forEach((attribute) => {
      attribute.employeeIds.forEach((employeeId) => {
        if (!attributeInfoByEmployee[employeeId]) {
          attributeInfoByEmployee[employeeId] = { ids: [], labels: [] }
        }
        attributeInfoByEmployee[employeeId].ids.push(attribute.id)
        attributeInfoByEmployee[employeeId].labels.push(attribute.label)
      })
    })

    const assignmentsSnapshot: SavedRoleAssignment[] = []
    for (const employee of orderedEmployees) {
      const assignment = employeeAssignments[employee.id]
      if (!assignment) continue

      const attributeInfo = attributeInfoByEmployee[employee.id] || { ids: [], labels: [] }
      const dayEntries = weekDays.map((day) => {
        const cellInfo = getCellInfo(employee.id, day.date)
        const overrideValue = scheduleOverrides[employee.id]?.[day.date] ?? ""
        const planValue = schedulePlanAssignments[employee.id]?.[day.date] ?? ""
        
        // Si el estado base es uno de estos, tiene prioridad sobre horarios
        const priorityStates = ["DESCANSO", "FESTIVO", "VACACIONES"]
        const hasPriorityState = priorityStates.includes(cellInfo.base)
        
        const displayValue = cellInfo.locked || hasPriorityState
          ? cellInfo.base
          : overrideValue.trim().length > 0
            ? overrideValue
            : planValue.trim().length > 0
              ? planValue
              : cellInfo.base

        return {
          date: day.date,
          label: day.label,
          displayValue,
          locked: cellInfo.locked || hasPriorityState,
          base: cellInfo.base,
        }
      })

      assignmentsSnapshot.push({
        employeeId: employee.id,
        displayName: getEmployeeDisplayName(employee),
        employeeCode: employee.employee_code || undefined,
        status: employee.position || undefined,
        position: {
          id: assignment.id,
          code: assignment.code,
          name: assignment.name,
        },
        isFixed: fixedEmployeeSet.has(employee.id),
        attributeIds: attributeInfo.ids,
        attributeLabels: attributeInfo.labels,
        dayEntries,
      })
    }

    const snapshotId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    return {
      id: snapshotId,
      createdAt: new Date().toISOString(),
      officeId: office.id,
      officeName: office.name,
      weekStartDate,
      weekNumber,
      weekRangeLabel,
      shiftName,
      startTime,
      endTime,
      notes,
      defaultShiftLabel,
      scheduleMatrix: cloneScheduleMatrix(scheduleMatrix),
      weekDays: weekDays.map((day) => ({ ...day })),
      totalEmployees: activeEmployeeCount,
      totalPositions: totalRequiredSlots,
      attributeColumns,
      assignments: assignmentsSnapshot,
    }
  }, [
    office,
    attributes,
    orderedEmployees,
    employeeAssignments,
    weekDays,
    getCellInfo,
    scheduleOverrides,
    schedulePlanAssignments,
    fixedEmployeeSet,
    weekStartDate,
    weekNumber,
    weekRangeLabel,
    shiftName,
    startTime,
    endTime,
    notes,
    defaultShiftLabel,
    scheduleMatrix,
    activeEmployeeCount,
    totalRequiredSlots,
  ])

  const handleGenerateRole = () => {
    if (activeEmployeeCount === 0) {
      toast({
        title: "Sin colaboradores activos",
        description: "Registra al menos un empleado activo antes de generar el rol.",
        variant: "destructive",
      })
      return
    }

    const success = autoAssignEmployees({ successToast: null })
    if (!success) return

    setShouldFinalizeGeneration(true)
  }

  useEffect(() => {
    if (!shouldFinalizeGeneration) return

    const remainingMissingPositions = ALL_POSITIONS.filter((position) => {
      const requiredCount = positionSlots[position.id] || 0
      if (requiredCount === 0) return false
      const assignedCountForPosition = assignments[position.id]?.length || 0
      return assignedCountForPosition < requiredCount
    })

    const missingLabels = remainingMissingPositions.map((position) => position.code).join(", ")
    const hasMissingPositions = remainingMissingPositions.length > 0

    setIsRoleGenerated(true)
    toast({
      title: hasMissingPositions ? "Rol generado con pendientes" : "Rol generado",
      description: hasMissingPositions
        ? `El resumen está disponible, pero quedan puestos por asignar: ${missingLabels}. Ajusta antes de imprimir.`
        : "El resumen semanal está listo para revisión e impresión. Se guardó automáticamente en el historial.",
      variant: hasMissingPositions ? "destructive" : undefined,
    })

    try {
      const snapshot = buildRoleSnapshot()
      setSavedRoles((prev) => [snapshot, ...prev.filter((role) => role.id !== snapshot.id)].slice(0, 20))
      
      // Guardar todos los supervisores para la rotación circular de la próxima semana
      const consulateSupervisorIds = assignments.CONSULATE_SUPERVISOR || []
      const casSupervisorIds = assignments.CAS_SUPERVISOR || []
      
      if (consulateSupervisorRotationKey && typeof window !== "undefined") {
        // Obtener datos de cada supervisor
        const consuladoSupervisorId = consulateSupervisorIds[0] || null
        const cas1SupervisorId = casSupervisorIds[0] || null
        const cas2SupervisorId = casSupervisorIds[1] || null
        
        const consuladoSupervisor = consuladoSupervisorId ? employeeMap.get(consuladoSupervisorId) : null
        const cas1Supervisor = cas1SupervisorId ? employeeMap.get(cas1SupervisorId) : null
        const cas2Supervisor = cas2SupervisorId ? employeeMap.get(cas2SupervisorId) : null
        
        const rotationData = {
          weekStartDate,
          // Supervisor de Consulado
          consuladoSupervisorId,
          consuladoSupervisorName: consuladoSupervisor ? getEmployeeDisplayName(consuladoSupervisor) : null,
          // Supervisor CAS 1º puesto
          cas1SupervisorId,
          cas1SupervisorName: cas1Supervisor ? getEmployeeDisplayName(cas1Supervisor) : null,
          // Supervisor CAS 2º puesto
          cas2SupervisorId,
          cas2SupervisorName: cas2Supervisor ? getEmployeeDisplayName(cas2Supervisor) : null,
          savedAt: new Date().toISOString()
        }
        
        window.localStorage.setItem(consulateSupervisorRotationKey, JSON.stringify(rotationData))
        console.log("✅ Supervisores guardados para rotación circular:", {
          consulado: rotationData.consuladoSupervisorName,
          cas1: rotationData.cas1SupervisorName,
          cas2: rotationData.cas2SupervisorName
        })
      }
    } catch (error) {
      console.error("No se pudo preparar el snapshot del rol:", error)
    } finally {
      setShouldFinalizeGeneration(false)
    }
  }, [assignments, buildRoleSnapshot, positionSlots, shouldFinalizeGeneration, toast, consulateSupervisorRotationKey, weekStartDate, employeeMap])

  const updateScheduleOverride = (employeeId: string, date: string, value: string) => {
    setScheduleOverrides((prev) => {
      const next = { ...prev }
      const employeeOverrides = { ...(next[employeeId] || {}) }
      const trimmed = value.toUpperCase()
      if (trimmed.trim().length > 0) {
        employeeOverrides[date] = trimmed
      } else {
        delete employeeOverrides[date]
      }
      if (Object.keys(employeeOverrides).length > 0) {
        next[employeeId] = employeeOverrides
      } else {
        delete next[employeeId]
      }
      return next
    })
  }

  const updateWorkstationAssignment = (employeeId: string, date: string, value: string) => {
    setWorkstationAssignments((prev) => {
      const next: WorkstationAssignments = { ...prev }
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        if (!next[employeeId]) return prev
        const updated = { ...next[employeeId] }
        delete updated[date]
        if (Object.keys(updated).length > 0) {
          next[employeeId] = updated
        } else {
          delete next[employeeId]
        }
        return next
      }
      const updated = { ...(next[employeeId] || {}) }
      updated[date] = trimmed
      next[employeeId] = updated
      return next
    })
  }

  const handleClearWorkstationAssignments = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("¿Deseas limpiar las asignaciones internas de puestos?")
      if (!confirmed) return
    }
    setWorkstationAssignments({})
  }

  if (!office) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Card className="max-w-md border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Oficina no encontrada</CardTitle>
            <CardDescription>Verifica el identificador en la URL.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <OfficeHeader office={office} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Generador de Rol Operativo</h1>
              <p className="text-sm text-muted-foreground">
                Asigna puestos operativos, agrega atributos especiales y genera un formato listo para impresión considerando vacaciones y días festivos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsSavedRolesModalOpen(true)}>
              <History className="mr-2 h-4 w-4" /> Historial de roles
            </Button>
            <Button variant="outline" onClick={handleClearAssignments}>
              Reiniciar rol
            </Button>
            <Button variant="outline" onClick={() => setIsWorkstationModalOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" /> Rol de puestos
            </Button>
            <Button variant="outline" onClick={() => setIsSaturdayTeamsModalOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Equipos sabatinos
            </Button>
            <Button variant="outline" onClick={() => setIsSupervisorWeekendModalOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Supervisores fin de semana
            </Button>
            <Button variant="outline" onClick={() => setIsMealPlannerOpen(true)}>
              <UtensilsCrossed className="mr-2 h-4 w-4" /> Rol de comidas
            </Button>
            <Button variant="outline" onClick={() => setIsAttributeModalOpen(true)}>
              <ShieldAlert className="mr-2 h-4 w-4" /> Restricciones P&P/Consulado
            </Button>
            <Button variant="outline" onClick={() => setIsRestrictionModalOpen(true)} title="Ver recordatorio de restricciones">
              <ShieldAlert className="mr-2 h-4 w-4" />
            </Button>
            <Button onClick={handleGenerateRole} className="bg-indigo-600 hover:bg-indigo-700">
              Generar rol
            </Button>
            {isRoleGenerated ? (
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="mr-2 h-4 w-4" /> Imprimir rol
              </Button>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm md:flex-1"
            onClick={() => setIsGeneralModalOpen(true)}
          >
            <span className="text-sm font-semibold text-slate-800">Datos generales del rol</span>
            <span className="text-xs text-muted-foreground">
              Semana #{weekNumber ?? "-"} • {weekRangeLabel || "Sin definir"}
            </span>
            <span className="text-xs text-muted-foreground">Haz clic para editar fecha, horarios y notas.</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm md:flex-1"
            onClick={() => setIsOperationalModalOpen(true)}
          >
            <span className="text-sm font-semibold text-slate-800">Configuración operativa</span>
            <span className="text-xs text-muted-foreground">
              {totalRequiredSlots} puestos • {assignedCount} asignaciones actuales
            </span>
            <span className="text-xs text-muted-foreground">Accede a cupos, atributos y personal fijo.</span>
          </Button>

          {unassignedEmployees.length > 0 ? (
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 text-left text-amber-700 shadow-sm md:flex-1"
              onClick={() => setIsUnassignedModalOpen(true)}
            >
              <span className="text-sm font-semibold">Empleados sin puesto asignado</span>
              <span className="text-xs uppercase tracking-wide">
                {unassignedEmployees.length} colaborador(es) pendientes
              </span>
              <span className="text-xs">Presiona para consultar la lista de pendientes.</span>
            </Button>
          ) : null}
        </section>

        {isRoleGenerated ? (
          <>
            <Card className="border-indigo-100 bg-white shadow-sm print:border print:border-slate-200 print:shadow-none">
              <CardHeader>
                <CardTitle>Resumen semanal listo para impresión</CardTitle>
                <CardDescription>
                  Incluye horario sugerido, vacaciones y festivos detectados automáticamente.
                  {isLoadingCalendar ? (
                    <span className="ml-2 inline-flex items-center gap-2 text-xs text-indigo-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Actualizando calendario...
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Oficina</p>
                  <p className="font-semibold text-slate-800">{office.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Semana</p>
                  <p className="font-semibold text-slate-800">
                    {weekNumber ? `#${weekNumber}` : "Sin definir"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Rango</p>
                  <p className="font-semibold text-slate-800">{weekRangeLabel || "Sin definir"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horario base</p>
                  <p className="font-semibold text-slate-800">{defaultShiftLabel}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horarios CAS</p>
                  <p className="font-semibold text-slate-800">
                    Supervisores: {formatScheduleList(casSchedules.supervisors)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Colaboradores: {formatScheduleList(casSchedules.employees)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horarios Consulado</p>
                  <p className="font-semibold text-slate-800">
                    Supervisores: {formatScheduleList(consSchedules.supervisors)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Colaboradores: {formatScheduleList(consSchedules.employees)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase text-slate-700">Resumen rápido:</span> {activeEmployees.length} empleados activos • {totalRequiredSlots} puestos configurados
              </div>

              {shortageSummary.length > 0 ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <AlertTitle>Vacantes sin cubrir</AlertTitle>
                  <AlertDescription>
                    {shortageSummary
                      .map(({ unit, count }) => `${unit.name}: ${count} vacante${count === 1 ? "" : "s"}`)
                      .join(" • ")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Nombre</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Puesto rol</th>
                      <th className="px-3 py-3">Asignación fija</th>
                      {weekDays.map((day) => (
                        <th key={day.date} className="px-3 py-3">
                          <div className="flex flex-col">
                            <span>{day.label.toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const passbackDuplicateRows = orderedEmployees
                        .filter((employee) => passbackAssignedIds.has(employee.id))
                        .map((employee) =>
                          renderSummaryRow(employee, {
                            key: `${employee.id}-operation-duplicate`,
                            displayPosition: ALL_POSITIONS.find((p) => p.id === "OPERATION")!,
                            editable: true,
                            isPassbackDuplicate: true,
                            roleLabelOverride: { text: "Passback P&P", className: "text-blue-600" },
                          })
                        )

                      let duplicatesInserted = false
                      const rows: JSX.Element[] = []

                      for (const employee of orderedEmployees) {
                        const assignment = employeeAssignments[employee.id] ?? null

                        if (
                          !duplicatesInserted &&
                          passbackDuplicateRows.length > 0 &&
                          assignment?.id === "PICKPACK_SUPERVISOR"
                        ) {
                          rows.push(...passbackDuplicateRows)
                          duplicatesInserted = true
                        }

                        rows.push(
                          renderSummaryRow(employee, {
                            key: employee.id,
                            displayPosition: assignment,
                            editable: true,
                          })
                        )
                      }

                      if (!duplicatesInserted && passbackDuplicateRows.length > 0) {
                        rows.unshift(...passbackDuplicateRows)
                      }

                      return rows
                    })()}
                  </tbody>
                </table>
              </div>

              {notes.trim() ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notas internas
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{notes}</p>
                </div>
              ) : null}
              </CardContent>
            </Card>
            {mealSlots.filter((slot) => slot.enabled && slot.appliesTo.length > 0 && slot.capacity > 0).length > 0 ? (
              <Card className="border-emerald-100 bg-white shadow-sm print:border print:border-slate-200 print:shadow-none">
                <CardHeader>
                  <CardTitle>Rol de comidas</CardTitle>
                  <CardDescription>
                    Distribución aleatoria de horarios de comida por día considerando unidades elegibles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weekDays.map((day) => {
                    const dayAssignments = dailyMealAssignments[day.date] || {}
                    const activeSlots = mealSlots.filter((slot) => slot.enabled && slot.appliesTo.length > 0 && slot.capacity > 0)
                    if (activeSlots.length === 0) return null
                    return (
                      <div key={day.date} className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {day.label} {day.dayNumber}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {activeSlots.map((slot) => {
                            const assignedIds = dayAssignments[slot.id] || []
                            const assignedNames = assignedIds.map((employeeId) => getEmployeeDisplayName(employeeMap.get(employeeId)))
                            const vacancies = Math.max(slot.capacity - assignedIds.length, 0)
                            return (
                              <div key={`${day.date}-${slot.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase text-slate-600">
                                  {slot.label || `${slot.startTime} - ${slot.endTime}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cupo: {slot.capacity} • Aplica a {slot.appliesTo.map((unitId) => UNIT_POSITIONS.find((unit) => unit.id === unitId)?.name || unitId).join(", ")}
                                </p>
                                {assignedNames.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                                    {assignedNames.map((name) => (
                                      <li key={`${day.date}-${slot.id}-${name}`}>{name}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">Sin asignaciones</p>
                                )}
                                {vacancies > 0 ? (
                                  <p className="mt-1 text-xs text-amber-600">Vacantes sin cubrir: {vacancies}</p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50/40 shadow-none print:hidden">
            <CardHeader>
              <CardTitle>Genera tu rol semanal</CardTitle>
              <CardDescription>
                Ajusta los criterios y pulsa "Generar rol" para mostrar el resumen listo para impresión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Verifica que los puestos configurados coincidan con el personal activo y que no haya colaboradores pendientes por asignar.</p>
              <p>El resumen se habilitará automáticamente una vez completados los requisitos.</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={isGeneralModalOpen} onOpenChange={setIsGeneralModalOpen}>
        <DialogContent className="sm:max-w-[98vw] lg:max-w-7xl">
          <DialogHeader>
            <DialogTitle>Datos generales del rol</DialogTitle>
            <DialogDescription>
              Define semana, horarios y notas internas para el turno seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-4">
              {/* El aviso de "Semana siguiente" fue removido por petición. */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="week-start">Inicio de la semana</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStartDate}
                    onChange={(event) => {
                      setWeekStartDate(event.target.value)
                      setScheduleOverrides({})
                      setWorkstationAssignments({})
                      setIsRoleGenerated(false)
                    }}
                  />
                </div>
                {/* El input "Nombre del turno" se eliminó según indicación. */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Hora inicio</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(event) => {
                        setStartTime(event.target.value)
                        setSelectedPresetId(null)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Hora fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(event) => {
                        setEndTime(event.target.value)
                        setSelectedPresetId(null)
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold uppercase text-slate-700">Resumen de semana</p>
                <p>Semana: {weekNumber ? `#${weekNumber}` : "Sin definir"}</p>
                <p>Rango: {weekRangeLabel || "Sin definir"}</p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-800">Configuraciones guardadas</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="sm:w-auto"
                        onClick={() => {
                          setPresetName(`${formatISODateLong(weekStartDate)} • ${startTime} - ${endTime}`)
                          setIsSaveScheduleModalOpen(true)
                        }}
                      >
                        Guardar configuración actual
                      </Button>
                </div>
                {isLoadingSchedulePresets ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando configuraciones guardadas...
                  </p>
                ) : schedulePresets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aún no hay configuraciones almacenadas. Guarda esta para reutilizar horarios y turnos en futuros roles.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="sm:flex-1">
                      <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                      <Select
                        value={selectedPresetId ?? ""}
                        onValueChange={(value) => {
                          handleApplySchedulePreset(value)
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Elige una opción guardada" />
                        </SelectTrigger>
                        <SelectContent>
                          {schedulePresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPresetId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start gap-2 text-red-600 hover:text-red-600"
                        onClick={() => void handleDeleteSchedulePreset(selectedPresetId)}
                        disabled={deletingSchedulePresetId === selectedPresetId}
                      >
                        {deletingSchedulePresetId === selectedPresetId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes" className="text-sm font-semibold text-slate-800">
                    Notas internas
                  </Label>
                  <span className="text-[11px] uppercase text-muted-foreground">Opcional</span>
                </div>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones rápidas, recordatorios o pendientes de cierre."
                />
              </div>
            </div>

              <div className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  {(["CAS", "Consulado"] as const).map((area) => {
                    const areaLabel = area === "CAS" ? "Horarios CAS" : "Horarios Consulado"
                    const baseClasses =
                      area === "CAS"
                        ? "bg-blue-50/80 border-blue-200"
                        : "bg-emerald-50/80 border-emerald-200"
                    const headerClasses = area === "CAS" ? "text-blue-700" : "text-emerald-700"
                    const badgeClasses = area === "CAS" ? "text-blue-500" : "text-emerald-500"

                    return (
                      <div key={area} className={`space-y-3 rounded-lg border ${baseClasses} p-4`}>
                        <p className={`text-sm font-semibold uppercase ${headerClasses}`}>{areaLabel}</p>
                        {(
                          [
                            {
                              role: "supervisors" as const,
                              label: "Supervisores",
                              tone: "bg-white/70",
                              placeholder: "Supervisor 1",
                              buttonLabel: "Agregar supervisor",
                            },
                            {
                              role: "employees" as const,
                              label: "Colaboradores",
                              tone: "bg-white/40",
                              placeholder: "07:00 - 15:00",
                              buttonLabel: "Agregar horario",
                            },
                          ]
                        ).map(({ role, label, tone, placeholder, buttonLabel }) => (
                          <div
                            key={`${area}-${role}`}
                            className={`space-y-2 rounded-md border border-white/60 ${tone} p-3 shadow-sm`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Label className={`text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}>
                                {label}
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 whitespace-nowrap"
                                onClick={() => addScheduleEntry(area, role)}
                              >
                                <PlusCircle className="h-4 w-4" /> {buttonLabel}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {scheduleMatrix[area][role].map((value, index) => (
                                <div key={`${area}-${role}-${index}`} className="flex items-center gap-2">
                                  <Input
                                    value={value}
                                    onChange={(event) => updateScheduleEntry(area, role, index, event.target.value)}
                                    placeholder={placeholder}
                                  />
                                  {scheduleMatrix[area][role].length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeScheduleEntry(area, role, index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}

                  {/* Supervisor P&P column */}
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                    <p className="text-sm font-semibold uppercase text-amber-700">Supervisor P&P</p>
                    <p className="text-xs text-muted-foreground">Horario(es) aplicable(s) para el supervisor de Pick &amp; Pack</p>
                    <div className="space-y-2 mt-2">
                      {ppSupervisorSchedules.map((value, index) => (
                        <div key={`pnp-supervisor-${index}`} className="flex items-center gap-2">
                          <Input
                            value={value}
                            onChange={(event) => {
                              const next = [...ppSupervisorSchedules]
                              next[index] = event.target.value
                              setPpSupervisorSchedules(next)
                            }}
                            placeholder="07:00 - 15:00"
                          />
                          {ppSupervisorSchedules.length > 1 ? (
                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                              setPpSupervisorSchedules((prev) => prev.filter((_, i) => i !== index))
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      <div>
                        <Button type="button" size="sm" onClick={() => setPpSupervisorSchedules((prev) => [...prev, prev[prev.length - 1] || ""]) }>
                          <PlusCircle className="h-4 w-4" /> Agregar horario
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

              {showWeeklyPlan ? (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Plan semanal de horarios</p>
                      <p className="text-xs text-muted-foreground">
                        Define qué horario aplica a cada día para automatizar las entradas escalonadas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Selecciona "Sin horario" si prefieres editar manualmente desde el resumen.</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowWeeklyPlan(false)}>Ocultar</Button>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200/80">
                    <ScrollArea className="max-h-[360px] w-full">
                      <div className="min-w-full">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-100 text-left text-[11px] font-semibold uppercase text-slate-600">
                            <tr>
                              <th className="px-3 py-2">Grupo</th>
                              {workingWeekDays.map(({ day }) => (
                                <th key={day.date} className="px-2 py-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span>{day.shortLabel.toUpperCase()}</span>
                                    <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                                  </div>
                                </th>
                              ))}
                              <th className="px-2 py-2 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {SCHEDULE_PLAN_SECTIONS.map((section) => {
                              const options = scheduleMatrix[section.area][section.role]
                              const selections = weeklySchedulePlan[section.area]?.[section.role] || []
                              const hasOptions = options.length > 0

                              return (
                                <tr key={section.key}>
                                  <td className="px-3 py-3 align-top">
                                    <div className="font-semibold text-slate-800">{section.label}</div>
                                    <div className="text-[11px] text-muted-foreground">{section.description}</div>
                                    {!hasOptions ? (
                                      <div className="mt-2 text-[11px] text-amber-600">
                                        Agrega al menos un horario en la sección superior para habilitar este plan.
                                      </div>
                                    ) : null}
                                  </td>
                                  {workingWeekDays.map(({ day, dayIndex }) => {
                                    const currentValue = selections[dayIndex] ?? (hasOptions ? 0 : -1)
                                    return (
                                      <td key={`${section.key}-${day.date}`} className="px-2 py-2 text-center">
                                        <Select
                                          value={String(currentValue)}
                                          disabled={!hasOptions}
                                          onValueChange={(value) =>
                                            handleSchedulePlanChange(section.area, section.role, dayIndex, value)
                                          }
                                        >
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Sin horario" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="-1">Sin horario</SelectItem>
                                            {options.map((option, index) => (
                                              <SelectItem key={`${section.key}-option-${index}`} value={String(index)}>
                                                {option}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                    )
                                  })}
                                  <td className="px-2 py-2 text-center">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs"
                                      onClick={() => handleSchedulePlanCopyAll(section.area, section.role)}
                                      disabled={!hasOptions}
                                    >
                                      Replicar semana
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Domingo se mantiene libre automáticamente.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Plan semanal de horarios</p>
                      <p className="text-xs text-muted-foreground">Oculto por defecto. Haz clic para mostrar y editar el plan semanal.</p>
                    </div>
                    <Button size="sm" onClick={() => setShowWeeklyPlan(true)}>Mostrar plan semanal</Button>
                  </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Domingo se mantiene libre automáticamente.</p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneralModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSaveScheduleModalOpen}
        onOpenChange={(open) => {
          setIsSaveScheduleModalOpen(open)
          if (!open) {
            setPresetName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar configuración de horarios</DialogTitle>
            <DialogDescription>
              Almacena esta combinación de horarios y turnos para reutilizarla en futuros roles sin volver a capturarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nombre de la configuración</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Ej. Rol matutino CAS/Consulado"
              />
            </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold">Se guardarán los siguientes datos:</p>
                <p>• Horario base ({startTime} - {endTime}).</p>
                <p>• Listado de horarios para supervisores y colaboradores de CAS, Consulado y Supervisor P&P.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Las configuraciones guardadas quedan ligadas a esta oficina y no se sincronizan entre oficinas distintas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsSaveScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSaveSchedulePreset()}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSavingSchedulePreset}
            >
              {isSavingSchedulePreset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar configuración"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOperationalModalOpen} onOpenChange={setIsOperationalModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configuración operativa</DialogTitle>
            <DialogDescription>
              Comprueba que los cupos coincidan con el personal activo y gestiona atributos especiales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="justify-start gap-2" onClick={() => setIsPositionModalOpen(true)}>
                <Settings2 className="h-4 w-4" /> Configurar puestos y cupos
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="justify-start gap-2"
                onClick={() => setIsAttributeModalOpen(true)}
              >
                <Tag className="h-4 w-4" /> Asignar atributos WS / Entrenamiento
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Empleados activos</p>
                <p className="text-xl font-semibold text-slate-800">{activeEmployeeCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Puestos configurados</p>
                <p className="text-xl font-semibold text-slate-800">{totalRequiredSlots}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Asignaciones actuales</p>
                <p className="text-xl font-semibold text-slate-800">{assignedCount}</p>
              </div>
            </div>

            {slotBalance < 0 ? (
              <Alert variant="destructive">
                <AlertTitle>Exceso de puestos configurados</AlertTitle>
                <AlertDescription>
                  Reduce {Math.abs(slotBalance)} puesto(s) para coincidir con los {activeEmployeeCount} colaboradores activos.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Asignaciones de atributos</p>
              <div className="flex flex-wrap gap-2">
                {attributes.map((attribute) => (
                  <Badge key={attribute.id} variant="secondary" className="px-3 py-1">
                    {attribute.label}: {attribute.employeeIds.length}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Colaboradores marcados como fijos</p>
              {fixedEmployeeIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay colaboradores bloqueados en un puesto específico.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fixedEmployeeIds.map((employeeId) => {
                    const employee = employeeMap.get(employeeId)
                    return (
                      <Badge key={employeeId} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        {getEmployeeDisplayName(employee)}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOperationalModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnassignedModalOpen} onOpenChange={setIsUnassignedModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Empleados sin puesto asignado</DialogTitle>
            <DialogDescription>
              Estas personas aún no tienen un puesto asignado para la semana actual. Genera el rol para que el sistema las distribuya automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {unassignedEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los colaboradores están asignados.</p>
            ) : (
              unassignedEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{getEmployeeDisplayName(employee)}</p>
                    {employee.employee_code ? (
                      <p className="text-xs text-muted-foreground">Código {employee.employee_code}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline">Pendiente</Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnassignedModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSavedRolesModalOpen} onOpenChange={setIsSavedRolesModalOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Historial de roles generados</DialogTitle>
            <DialogDescription>
              Consulta versiones anteriores tal cual se generaron. Los datos guardados no se actualizan si el personal cambia.
            </DialogDescription>
          </DialogHeader>
          {savedRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se genera ningún rol. Ejecuta una generación para comenzar el historial automático.
            </p>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-6 pr-2">
                {savedRoles.map((role) => (
                  <div
                    key={role.id}
                    className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Semana #{role.weekNumber ?? "-"} • {role.weekRangeLabel || "Sin definir"}
                        </p>
                        <p className="text-xs text-muted-foreground">Turno: {role.shiftName}</p>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Guardado el {new Date(role.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 hover:text-indigo-700"
                            onClick={() => handleSetAsLastRole(role.id)}
                          >
                            <Clock className="mr-1 h-3 w-3" /> Marcar como último
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horario base</p>
                        <p className="text-sm font-semibold text-slate-800">{role.defaultShiftLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horarios CAS</p>
                        <p className="text-xs text-slate-800">
                          Supervisores: {formatScheduleList(role.scheduleMatrix.CAS.supervisors)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Colaboradores: {formatScheduleList(role.scheduleMatrix.CAS.employees)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horarios Consulado</p>
                        <p className="text-xs text-slate-800">
                          Supervisores: {formatScheduleList(role.scheduleMatrix.Consulado.supervisors)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Colaboradores: {formatScheduleList(role.scheduleMatrix.Consulado.employees)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Totales</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {role.totalEmployees} empleados / {role.totalPositions} puestos
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-3">Nombre</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Puesto rol</th>
                            <th className="px-3 py-3">Asignación fija</th>
                            {role.weekDays.map((day) => (
                              <th key={day.date} className="px-3 py-3">
                                <div className="flex flex-col">
                                  <span>{day.label.toUpperCase()}</span>
                                  <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {role.assignments.map((assignment) => {
                            return (
                              <tr key={`${role.id}-${assignment.employeeId}`} className="align-top">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
                                    {assignment.displayName}
                                  </div>
                                  {assignment.employeeCode ? (
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Código {assignment.employeeCode}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-xs uppercase text-slate-600">
                                  {assignment.status || "---"}
                                </td>
                                <td className="px-3 py-2 text-xs uppercase text-slate-700">
                                  {getPositionDisplayLabel(assignment.position)}
                                </td>
                                <td className="px-3 py-2 text-xs uppercase text-slate-700">
                                  {assignment.isFixed ? (
                                    <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                      FIJO
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </td>
                                {assignment.dayEntries.map((dayEntry) => (
                                  <td key={dayEntry.date} className="px-3 py-2 text-xs text-slate-700">
                                    <div className="font-semibold uppercase tracking-wide">
                                      {dayEntry.displayValue}
                                    </div>
                                    {dayEntry.locked ? (
                                      <span className="text-[10px] text-muted-foreground">Calendario automático</span>
                                    ) : null}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {role.notes.trim() ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Notas internas
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{role.notes}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavedRolesModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMealPlannerOpen} onOpenChange={setIsMealPlannerOpen}>
        <DialogContent className="w-[95vw] max-h-[90vh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Configurar rol de comidas</DialogTitle>
            <DialogDescription>
              Define bloques de 1 hora con capacidad específica por área (Operación y Pick & Pack). Puedes asignar colaboradores fijos o dejar que el sistema los distribuya aleatoriamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Colaboradores elegibles</p>
                <p className="text-xl font-semibold text-slate-800">{mealEligibleEmployees.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  Incluye Operación general, supervisores CAS y Pick &amp; Pack.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Bloques configurados</p>
                <p className="text-xl font-semibold text-slate-800">{mealSlotDrafts.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  Agrega bloques de 1 hora con capacidad específica por área.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Unidades consideradas</p>
                <p className="text-xl font-semibold text-slate-800">CAS / P&amp;P</p>
                <p className="text-[11px] text-muted-foreground">Consulado queda excluido automáticamente.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Ajusta los bloques necesarios para escalonar la hora de comida del personal elegible.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={handleAddMealSlotDraft}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Agregar bloque
                </Button>
                {mealSlotDrafts.length > 0 ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMealSlotDrafts([])}>
                    Limpiar bloques
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">Plantillas de bloques</p>
                  <p className="text-xs text-muted-foreground">
                    Guarda y reutiliza combinaciones de horarios, cupos y unidades para acelerar la planificación.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" size="sm" variant="outline" onClick={handleOpenSaveMealTemplateModal}>
                    Guardar configuración
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => selectedMealTemplateId && handleApplyMealTemplate(selectedMealTemplateId)}
                    disabled={!selectedMealTemplateId}
                  >
                    Aplicar plantilla
                  </Button>
                </div>
              </div>
              {mealTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no guardas plantillas de bloques. Configura los espacios y guárdalos para reutilizarlos más adelante.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Selecciona una plantilla</Label>
                    <Select
                      value={selectedMealTemplateId ?? ""}
                      onValueChange={(value) => setSelectedMealTemplateId(value || null)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Elige una plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {mealTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedMealTemplateId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start gap-2 text-red-600 hover:text-red-600"
                      onClick={() => handleDeleteMealTemplate(selectedMealTemplateId)}
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            {mealSlotDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                Aún no hay bloques configurados. Agrega al menos uno para comenzar.
              </div>
            ) : (
              <ScrollArea className="max-h-[55vh] pr-3">
                <div className="space-y-4 pb-2">
                  {mealSlotDrafts.map((slot, index) => {
                    const fixedMembers = slot.fixedEmployeeIds
                      .map((employeeId) => employeeMap.get(employeeId))
                      .filter((employee): employee is Employee => Boolean(employee))
                    const endOptions = MEAL_TIME_OPTIONS.filter((option) => option.value > slot.startTime)
                    const effectiveEndOptions = endOptions.length > 0 ? endOptions : MEAL_TIME_OPTIONS

                    return (
                      <div
                        key={slot.id}
                        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground">Nombre del bloque</Label>
                            <Input
                              value={slot.label}
                              onChange={(event) => handleMealSlotLabelChange(slot.id, event.target.value)}
                              placeholder={`Bloque ${index + 1}`}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                              <Checkbox
                                checked={slot.enabled}
                                onCheckedChange={(checked) => handleToggleMealSlotEnabled(slot.id, checked)}
                              />
                              Activo
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMealSlotDraft(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-slate-500">
                          <Badge variant="outline">Bloque {index + 1}</Badge>
                          <Badge variant="outline">
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                            Operación: {slot.operationCapacity ?? 0}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                            P&P: {slot.pickpackCapacity ?? 0}
                          </Badge>
                          <Badge variant="outline" className="font-semibold">
                            Total: {(slot.operationCapacity ?? 0) + (slot.pickpackCapacity ?? 0)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground">Inicio</Label>
                            <Select
                              value={slot.startTime}
                              onValueChange={(value) => handleMealSlotStartChange(slot.id, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Hora inicio" />
                              </SelectTrigger>
                              <SelectContent>
                                {MEAL_TIME_OPTIONS.map((option) => (
                                  <SelectItem key={`${slot.id}-start-${option.value}`} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground">Fin</Label>
                            <Select
                              value={slot.endTime}
                              onValueChange={(value) => handleMealSlotEndChange(slot.id, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Hora fin" />
                              </SelectTrigger>
                              <SelectContent>
                                {effectiveEndOptions.map((option) => (
                                  <SelectItem key={`${slot.id}-end-${option.value}`} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground">Personas por bloque</Label>
                            <Input
                              type="number"
                              min="0"
                              value={slot.capacity}
                              onChange={(event) => handleMealSlotCapacityChange(slot.id, event.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">
                              El sistema asignará automáticamente hasta esta cantidad de colaboradores cada día.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50/50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-700">Capacidad por unidad</p>
                          <p className="text-[11px] text-muted-foreground">
                            Define cuántas personas de cada área saldrán a comer en este bloque horario.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                Operación General
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Ej: 2"
                                value={slot.operationCapacity ?? 0}
                                onChange={(event) => handleMealSlotOperationCapacityChange(slot.id, event.target.value)}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Personas de Operación que salen en este horario
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                Pick & Pack
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Ej: 2"
                                value={slot.pickpackCapacity ?? 0}
                                onChange={(event) => handleMealSlotPickpackCapacityChange(slot.id, event.target.value)}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Personas de P&P que salen en este horario
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                            <Badge variant="secondary" className="font-semibold">
                              Total: {(slot.operationCapacity ?? 0) + (slot.pickpackCapacity ?? 0)} personas
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Se asignarán aleatoriamente cada día
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-600">Unidades aplicables</p>
                          <div className="flex flex-wrap gap-3">
                            {MEAL_UNIT_OPTIONS.map((unit) => {
                              const isChecked = slot.appliesTo.includes(unit.id)
                              return (
                                <label
                                  key={`${slot.id}-unit-${unit.id}`}
                                  className="flex items-center gap-2 text-xs uppercase text-slate-600"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      handleToggleMealSlotUnit(slot.id, unit.id, checked === true)
                                    }
                                  />
                                  {unit.label}
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase text-slate-600">
                              Colaboradores fijos ({fixedMembers.length})
                            </p>
                            {fixedMembers.length > slot.capacity ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                Exceden el cupo
                              </Badge>
                            ) : null}
                          </div>
                          {mealEligibleEmployees.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No hay colaboradores elegibles para fijar en este bloque.
                            </p>
                          ) : (
                            <ScrollArea className="max-h-32 pr-2">
                              <div className="space-y-2">
                                {mealEligibleEmployees.map((employee) => {
                                  const isSelected = slot.fixedEmployeeIds.includes(employee.id)
                                  return (
                                    <label
                                      key={`${slot.id}-fixed-${employee.id}`}
                                      className="flex items-center justify-between gap-2 text-xs text-slate-600"
                                    >
                                      <span>{getEmployeeDisplayName(employee)}</span>
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) =>
                                          handleToggleMealSlotFixedEmployee(slot.id, employee.id, checked === true)
                                        }
                                      />
                                    </label>
                                  )
                                })}
                              </div>
                              <ScrollBar orientation="vertical" forceMount />
                            </ScrollArea>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMealPlannerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmMealPlanner} className="bg-amber-500 hover:bg-amber-600">
              Guardar rol de comidas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveMealTemplateModalOpen} onOpenChange={setIsSaveMealTemplateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Guardar plantilla de comidas</DialogTitle>
            <DialogDescription>
              Asigna un nombre para reutilizar estos bloques, horarios y cupos en otras semanas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meal-template-name" className="text-xs uppercase text-muted-foreground">
                Nombre de la plantilla
              </Label>
              <Input
                id="meal-template-name"
                value={mealTemplateName}
                onChange={(event) => setMealTemplateName(event.target.value)}
                placeholder="Ej. Turno escalonado"
                autoFocus
              />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">
                Bloques incluidos: {mealSlotDrafts.length}
              </p>
              <p className="mt-1 text-muted-foreground">
                Se guardarán los horarios, las unidades seleccionadas, los cupos y los colaboradores fijos habilitados.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveMealTemplateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSaveMealTemplate} disabled={mealSlotDrafts.length === 0}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaturdayTeamsModalOpen} onOpenChange={setIsSaturdayTeamsModalOpen}>
        <DialogContent className="flex w-[95vw] max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Equipos DE TRABAJO SABADOS</DialogTitle>
            <DialogDescription>
              Divide al personal en dos equipos para alternar descansos sabatinos cada semana del año. Los grupos se mantienen guardados y no cambian hasta que vuelvas a actualizarlos.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3">
            <div className="grid gap-4 lg:grid-cols-[1fr,1.5fr] pr-2">
              {/* Sección izquierda - Configuración */}
              <div className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <AlertTitle>Rotación semanal</AlertTitle>
                  <AlertDescription>
                    Semana {weekOfMonth} del mes ({weekOfMonth % 2 === 0 ? "PAR" : "IMPAR"}): descansa <strong>{saturdayRestTeamForWeek === "team1" ? "Equipo A" : "Equipo B"}</strong>; el equipo contrario atiende la operación sabatina.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">Equipo que descansa semanas pares</p>
                  <RadioGroup
                    value={saturdayParityRestTeam}
                    onValueChange={(value) => setSaturdayParityRestTeam(value === "team2" ? "team2" : "team1")}
                    className="mt-3 grid gap-3"
                  >
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <RadioGroupItem value="team1" id="parity-team1" />
                      <Label htmlFor="parity-team1" className="text-sm text-slate-700">
                        Equipo A descansa en semanas pares
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <RadioGroupItem value="team2" id="parity-team2" />
                      <Label htmlFor="parity-team2" className="text-sm text-slate-700">
                        Equipo B descansa en semanas pares
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    El equipo opuesto cubrirá las semanas impares automáticamente.
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Equipo A</p>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                      {saturdayTeamMembers.team1Members.length} colaboradores
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Descansa semanas {saturdayParityRestTeam === "team1" ? "pares" : "impares"}.
                  </p>
                  {saturdayTeamMembers.team1Members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                  ) : (
                    <ScrollArea className="max-h-48 pr-2">
                      <div className="flex flex-wrap gap-2 pb-2">
                        {saturdayTeamMembers.team1Members.map((employee) => (
                          <Badge key={`team1-${employee.id}`} variant="outline" className="px-2 py-1">
                            {getEmployeeDisplayName(employee)}
                          </Badge>
                        ))}
                      </div>
                      <ScrollBar orientation="vertical" forceMount />
                    </ScrollArea>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Equipo B</p>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      {saturdayTeamMembers.team2Members.length} colaboradores
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Descansa semanas {saturdayParityRestTeam === "team2" ? "pares" : "impares"}.
                  </p>
                  {saturdayTeamMembers.team2Members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                  ) : (
                    <ScrollArea className="max-h-48 pr-2">
                      <div className="flex flex-wrap gap-2 pb-2">
                        {saturdayTeamMembers.team2Members.map((employee) => (
                          <Badge key={`team2-${employee.id}`} variant="outline" className="px-2 py-1">
                            {getEmployeeDisplayName(employee)}
                          </Badge>
                        ))}
                      </div>
                      <ScrollBar orientation="vertical" forceMount />
                    </ScrollArea>
                  )}
                </div>
              </div>

              {/* Sección derecha - Personal elegible */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Personal elegible</p>
                    <p className="text-xs text-muted-foreground">
                      Se muestran todos los colaboradores activos de esta oficina para definir qué equipo integra cada uno.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAutoDistributeSaturdayTeams}
                      disabled={saturdayEligibleEmployees.length === 0}
                    >
                      Repartir automáticamente
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleClearSaturdayTeams}
                      disabled={Object.keys(saturdayTeamAssignments).length === 0}
                    >
                      Limpiar equipos
                    </Button>
                  </div>
                </div>
                {saturdayEligibleEmployees.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                    No hay colaboradores activos disponibles para administrar equipos.
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 overflow-hidden">
                    <div className="max-h-[500px] overflow-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 bg-slate-100">Colaborador</th>
                            <th className="px-3 py-2 text-center bg-slate-100">Asignar a equipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {saturdayEligibleEmployees.map((employee) => {
                          const assignment = saturdayTeamAssignments[employee.id] ?? null
                          return (
                            <tr key={`eligible-${employee.id}`}>
                              <td className="px-3 py-2 align-middle">
                                <div className="text-sm font-semibold text-slate-800">
                                  {getEmployeeDisplayName(employee)}
                                </div>
                                {employee.employee_code ? (
                                  <div className="text-[11px] uppercase text-muted-foreground">
                                    Código {employee.employee_code}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={assignment === "team1" ? "default" : "outline"}
                                    onClick={() => handleAssignSaturdayTeam(employee.id, assignment === "team1" ? null : "team1")}
                                    className={assignment === "team1" 
                                      ? "border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700" 
                                      : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}
                                  >
                                    Equipo A
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={assignment === "team2" ? "default" : "outline"}
                                    onClick={() => handleAssignSaturdayTeam(employee.id, assignment === "team2" ? null : "team2")}
                                    className={assignment === "team2" 
                                      ? "border-amber-300 bg-amber-600 text-white hover:bg-amber-700" 
                                      : "border-amber-200 text-amber-700 hover:bg-amber-50"}
                                  >
                                    Equipo B
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </div>
            </div>
            <ScrollBar orientation="vertical" forceMount />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaturdayTeamsModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupervisorWeekendModalOpen} onOpenChange={setIsSupervisorWeekendModalOpen}>
        <DialogContent className="flex w-[95vw] max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Equipos de Supervisores - Sábados</DialogTitle>
            <DialogDescription>
              Los descansos de supervisores para 2026 están basados en un calendario fijo predefinido que respeta la rotación establecida.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-4 pr-2">
              <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                <AlertTitle>Calendario Fijo 2026</AlertTitle>
                <AlertDescription>
                  Los descansos de supervisores para sábados siguen un calendario predefinido para todo el año 2026. 
                  El sistema identifica automáticamente qué supervisores descansan cada sábado según el calendario establecido.
                  {saturdayDate && getSupervisorRestNamesForSaturday(saturdayDate).length > 0 && (
                    <div className="mt-2 font-semibold">
                      Este sábado ({saturdayDate}): {getSupervisorRestNamesForSaturday(saturdayDate).join(", ")}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSupervisorCalendar(!showSupervisorCalendar)}
                      className="bg-white hover:bg-blue-100"
                    >
                      {showSupervisorCalendar ? "Ocultar" : "Ver"} Calendario Completo 2026
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              {showSupervisorCalendar && (
                <div className="rounded-lg border border-slate-300 bg-white p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-lg mb-4">Calendario de Descansos de Supervisores 2026</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(SUPERVISOR_SATURDAY_REST_CALENDAR_2026).map(([date, supervisors]) => {
                      const dateObj = parseISO(date)
                      const monthName = format(dateObj, "MMMM", { locale: { localize: { month: (n: number) => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][n] } } })
                      const dayNum = format(dateObj, "dd")
                      
                      return (
                        <div key={date} className="border rounded p-2 text-sm">
                          <div className="font-semibold text-indigo-700">{dayNum} {monthName}</div>
                          <div className="text-xs text-muted-foreground">{date}</div>
                          <div className="mt-1 text-xs">
                            {supervisors.map((sup, idx) => (
                              <div key={idx} className="text-slate-700">• {sup}</div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Sistema de respaldo (solo si no hay coincidencias en el calendario):</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSupervisorParity}
                    className={supervisorParityRestTeam === "team-a" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-amber-300 bg-amber-50 text-amber-700"}
                  >
                    {supervisorParityRestTeam === "team-a" ? "Equipo A" : "Equipo B"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El otro equipo descansará en semanas IMPARES. Haz clic en el botón para cambiar.
                </p>
              </div>

              {supervisorEmployees.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                  No hay supervisores disponibles en esta oficina.
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 bg-slate-100">Supervisor</th>
                          <th className="px-3 py-2 text-center bg-slate-100">Asignar a Equipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {supervisorEmployees.map((employee) => {
                          const assignment = supervisorWeekendAssignments[employee.id] ?? null
                          return (
                            <tr key={`supervisor-${employee.id}`}>
                              <td className="px-3 py-2 align-middle">
                                <div className="text-sm font-semibold text-slate-800">
                                  {getEmployeeDisplayName(employee)}
                                </div>
                                {employee.employee_code ? (
                                  <div className="text-[11px] uppercase text-muted-foreground">
                                    Código {employee.employee_code}
                                  </div>
                                ) : null}
                                <div className="text-[11px] text-muted-foreground">
                                  {employee.position}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={assignment === "team-a" ? "default" : "outline"}
                                    onClick={() => handleAssignSupervisorWeekend(employee.id, assignment === "team-a" ? null : "team-a")}
                                    className={assignment === "team-a" 
                                      ? "border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700" 
                                      : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}
                                  >
                                    Equipo A
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={assignment === "team-b" ? "default" : "outline"}
                                    onClick={() => handleAssignSupervisorWeekend(employee.id, assignment === "team-b" ? null : "team-b")}
                                    className={assignment === "team-b" 
                                      ? "border-amber-300 bg-amber-600 text-white hover:bg-amber-700" 
                                      : "border-amber-200 text-amber-700 hover:bg-amber-50"}
                                  >
                                    Equipo B
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <ScrollBar orientation="vertical" forceMount />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClearSupervisorWeekend} disabled={Object.keys(supervisorWeekendAssignments).length === 0}>
              Limpiar
            </Button>
            <Button variant="outline" onClick={() => setIsSupervisorWeekendModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWorkstationModalOpen} onOpenChange={setIsWorkstationModalOpen}>
        <DialogContent className="w-[95vw] max-h-[90vh] overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Rol de puestos operativos</DialogTitle>
            <DialogDescription>
              Distribuye tareas internas para el equipo de Operación general (CAS-OP) de esta semana.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Puestos configurados</p>
                  <p className="text-xl font-semibold text-slate-800">{operationSlotLimit}</p>
                  <p className="text-[11px] text-muted-foreground">Corresponde a los cupos activos de Operación general.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Colaboradores asignados</p>
                  <p className="text-xl font-semibold text-slate-800">{operationEmployees.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Se listan los colaboradores CAS-OP considerados y se agrega el apoyo Passback P&P cuando aplica.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Notas</p>
                  <p className="text-[11px] text-slate-700">
                    Los ajustes se guardan automáticamente en este navegador para la semana seleccionada.
                  </p>
                </div>
              </div>

              {operationSlotLimit <= 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>Configura cupos de Operación</AlertTitle>
                  <AlertDescription>
                    Define al menos un puesto en Operación general dentro de "Configuración operativa" para habilitar este rol.
                  </AlertDescription>
                </Alert>
              ) : operationEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay colaboradores asignados actualmente a Operación general. Genera el rol o ajusta las asignaciones para comenzar.
                </p>
              ) : (
                <>
                  {extraOperationEmployees > 0 ? (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                      <AlertTitle>Colaboradores adicionales</AlertTitle>
                      <AlertDescription>
                        El sistema asignó {extraOperationEmployees} colaborador(es) extra a Operación. Solo los primeros {operationSlotLimit} se incluyen en este plan manual.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Distribución diaria por puesto</p>
                        <p className="text-xs text-muted-foreground">
                          Define cuántas personas ocuparán O, R, F y WS cada día antes de generar la rotación automática.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-muted-foreground">
                        <span>Total configurado: {workstationDistributionTotal} / {operationEmployees.length}</span>
                        {workstationDistributionGap === 0 ? (
                          <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Equilibrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            {workstationDistributionGap > 0
                              ? `Faltan ${workstationDistributionGap}`
                              : `Exceden ${Math.abs(workstationDistributionGap)}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {WORKSTATION_CODES.map((code) => {
                        const headerLabel = code === "F" ? "Manifiesto" : `Puesto ${code}`
                        return (
                          <div
                            key={`distribution-${code}`}
                            className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase text-slate-700">{headerLabel}</p>
                              <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
                                {WORKSTATION_CODE_LABELS[code]}
                              </Badge>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              value={workstationDistribution[code] ?? 0}
                              onChange={(event) => handleWorkstationDistributionChange(code, event.target.value)}
                              className="h-10"
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {workstationDistributionGap === 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          La suma coincide con el personal considerado en Operación general.
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600">
                          {workstationDistributionGap > 0
                            ? `Aún faltan ${workstationDistributionGap} persona(s) por distribuir.`
                            : `Hay ${Math.abs(workstationDistributionGap)} puesto(s) extra configurado(s).`}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" onClick={handleGenerateWorkstationRotation}>
                          Generar rotación automática
                        </Button>
                        {workstationDistributionTotal > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setWorkstationDistribution(createEmptyWorkstationDistribution())}
                          >
                            Limpiar distribución
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">Plantillas de puestos</p>
                        <p className="text-xs text-muted-foreground">
                          Guarda combinaciones base de O, R, F y WS para reutilizarlas en semanas futuras.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleOpenSaveWorkstationTemplateModal}
                        >
                          Guardar plantilla
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            selectedWorkstationTemplateId && handleApplyWorkstationTemplate(selectedWorkstationTemplateId)
                          }
                          disabled={!selectedWorkstationTemplateId}
                        >
                          Aplicar plantilla
                        </Button>
                      </div>
                    </div>
                    {isLoadingWorkstationTemplates ? (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Cargando plantillas guardadas...
                      </p>
                    ) : workstationTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aún no guardas plantillas de puestos. Configura las asignaciones internas y guárdalas para reutilizarlas.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">Selecciona una plantilla</Label>
                          <Select
                            value={selectedWorkstationTemplateId ?? ""}
                            onValueChange={(value) => setSelectedWorkstationTemplateId(value || null)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Elige una plantilla" />
                            </SelectTrigger>
                            <SelectContent>
                              {workstationTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedWorkstationTemplate ? (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-muted-foreground">
                            {WORKSTATION_CODES.map((code) => (
                              <span
                                key={code}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600"
                              >
                                {code}: {selectedWorkstationTemplate.distribution[code] || 0}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {selectedWorkstationTemplateId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="justify-start gap-2 text-red-600 hover:text-red-600"
                            onClick={() => void handleDeleteWorkstationTemplate(selectedWorkstationTemplateId)}
                            disabled={deletingWorkstationTemplateId === selectedWorkstationTemplateId}
                          >
                            {deletingWorkstationTemplateId === selectedWorkstationTemplateId ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-3">Colaborador</th>
                          <th className="px-3 py-3">Puesto</th>
                          {weekDays.map((day) => (
                            <th key={day.date} className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span>{day.label.toUpperCase()}</span>
                                <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {operationEmployees.map((employee) => {
                          const position = employeeAssignments[employee.id]
                          const positionLabel = getPositionDisplayLabel(position)
                          const dayAssignments = workstationAssignments[employee.id] ?? {}

                          return (
                            <tr key={employee.id} className="align-top">
                              <td className="px-3 py-2">
                                <div className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
                                  {getEmployeeDisplayName(employee)}
                                </div>
                                {employee.employee_code ? (
                                  <div className="text-[10px] uppercase text-muted-foreground">
                                    Código {employee.employee_code}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-middle text-xs uppercase text-slate-700">
                                {positionLabel ? positionLabel : <span className="text-muted-foreground">Sin puesto</span>}
                              </td>
                              {weekDays.map((day) => {
                                const normalizedValue = normalizeWorkstationValue(dayAssignments?.[day.date])
                                const selectValue = normalizedValue ?? "none"
                                const isHoliday = holidaySet.has(day.date)
                                const isVacation = vacationMap[employee.id]?.has(day.date) ?? false
                                const helperLabel = isHoliday ? "Festivo" : isVacation ? "Vacaciones" : null

                                return (
                                  <td key={`${employee.id}-${day.date}`} className="px-2 py-2 align-middle text-center">
                                    <Select
                                      value={selectValue}
                                      onValueChange={(value) =>
                                        updateWorkstationAssignment(employee.id, day.date, value === "none" ? "" : value)
                                      }
                                      disabled={isHoliday || isVacation}
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="--" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sin asignar</SelectItem>
                                        {WORKSTATION_CODES.map((code) => (
                                          <SelectItem key={code} value={code}>
                                            {WORKSTATION_CODE_LABELS[code]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {helperLabel ? (
                                      <p className="mt-1 text-[10px] text-muted-foreground">{helperLabel}</p>
                                    ) : null}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClearWorkstationAssignments}>
            Limpiar asignaciones
          </Button>
          <Button onClick={handleGenerateWorkstationRotation}>Generar rotación automática</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={isSaveWorkstationTemplateModalOpen}
      onOpenChange={(open) => {
        setIsSaveWorkstationTemplateModalOpen(open)
        if (!open) {
          setWorkstationTemplateName("")
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Guardar plantilla de puestos</DialogTitle>
          <DialogDescription>
            Almacena esta distribución interna de puestos O, R, F y WS para reutilizarla en futuras semanas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workstation-template-name">Nombre de la plantilla</Label>
            <Input
              id="workstation-template-name"
              value={workstationTemplateName}
              onChange={(event) => setWorkstationTemplateName(event.target.value)}
              placeholder="Ej. Rotación estándar"
            />
            <p className="text-xs text-muted-foreground">
              Usa un nombre descriptivo para identificar rápidamente la rotación interna.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKSTATION_CODES.map((code) => {
              const headerLabel = code === "F" ? "Manifiesto" : `Puesto ${code}`
              return (
                <div key={code} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-slate-700">{headerLabel}</p>
                    <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
                      {WORKSTATION_CODE_LABELS[code]}
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={workstationTemplateDistribution[code] ?? 0}
                    onChange={(event) => handleWorkstationTemplateDistributionChange(code, event.target.value)}
                    className="h-10"
                  />
                </div>
              )
            })}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              Total configurado: {sumWorkstationDistribution(workstationTemplateDistribution)} / {workstationCapacityLimit}
            </p>
            <p className="mt-1 text-muted-foreground">
              Debe ser menor o igual al personal disponible en Operación general y apoyo Passback P&amp;P.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsSaveWorkstationTemplateModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmSaveWorkstationTemplate} disabled={isSavingWorkstationTemplate}>
            {isSavingWorkstationTemplate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isPositionModalOpen} onOpenChange={setIsPositionModalOpen}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Puestos y cupos por área</DialogTitle>
            <DialogDescription>
              Ajusta la cantidad de colaboradores por puesto y deja que el sistema los asigne automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          {previousWeekConsulateSupervisor && assignments.CAS_SUPERVISOR?.includes(previousWeekConsulateSupervisor) && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <AlertTitle className="text-emerald-800 flex items-center gap-2">
                🔄 Rotación Automática Activa
              </AlertTitle>
              <AlertDescription className="text-emerald-700">
                {employeeMap.get(previousWeekConsulateSupervisor) && getEmployeeDisplayName(employeeMap.get(previousWeekConsulateSupervisor))} fue automáticamente asignado a <strong>Supervisor CAS con horario de apertura</strong> porque trabajó en Consulado la semana anterior.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex w-full flex-col gap-4 lg:max-w-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Colaboradores registrados</p>
                    <p className="text-xl font-semibold text-slate-800">{activeEmployeeCount}</p>
                    <p className="text-[10px] text-muted-foreground">Se excluyen perfiles etiquetados como SPOC.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Puestos configurados</p>
                    <p className="text-xl font-semibold text-slate-800">{totalRequiredSlots}</p>
                    <p className="text-[10px] text-muted-foreground">Suma de cupos ingresados por cada posición.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Vacantes por cubrir</p>
                    <p className={`text-xl font-semibold ${unfilledSlots > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {unfilledSlots}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Cupos sin colaborador asignado actualmente.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Colaboradores sin puesto</p>
                    <p className={`text-xl font-semibold ${pendingEmployees > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {pendingEmployees}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Personas activas que aún no tienen unidad asignada.</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-slate-800">Configuraciones guardadas de cupos</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() => {
                        setPositionPresetName("")
                        setIsSavePositionPresetModalOpen(true)
                      }}
                    >
                      Guardar cupos actuales
                    </Button>
                  </div>
                  {isLoadingPositionPresets ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Cargando configuraciones guardadas...
                    </p>
                  ) : positionPresets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aún no guardas distribuciones de puestos. Configura los cupos y almacénalos para reutilizarlos en semanas futuras.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div>
                        <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                        <Select
                          value={selectedPositionPresetId ?? ""}
                          onValueChange={(value) => handleApplyPositionPreset(value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Elige cupos guardados" />
                          </SelectTrigger>
                          <SelectContent>
                            {positionPresets.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                {preset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedPositionPresetId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="justify-start gap-2 text-red-600 hover:text-red-600"
                          onClick={() => void handleDeletePositionPreset(selectedPositionPresetId)}
                          disabled={deletingPositionPresetId === selectedPositionPresetId}
                        >
                          {deletingPositionPresetId === selectedPositionPresetId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <Tabs defaultValue="CAS" className="space-y-4">
                  <TabsList className="grid gap-2 md:w-[480px] md:grid-cols-3">
                    <TabsTrigger value="CAS">Operación CAS</TabsTrigger>
                    <TabsTrigger value="Consulado">Consulado</TabsTrigger>
                    <TabsTrigger value="PICKPACK">P&P</TabsTrigger>
                  </TabsList>
                  <TabsContent value="CAS">
                    <div className="mb-3 space-y-1">
                      <h3 className="text-sm font-semibold uppercase text-slate-700">
                        Centro de Atención a Solicitantes
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Configura los puestos operativos base para la semana seleccionada.
                      </p>
                    </div>
                    <ScrollArea className="max-h-[60vh] overflow-y-auto pr-3">
                      <div className="space-y-4 py-1">
                        {ALL_POSITIONS.filter(
                          (position) =>
                            position.category === "CAS" &&
                            position.id !== "PICKPACK" &&
                            position.id !== "PICKPACK_SUPERVISOR" &&
                            position.id !== "PICKPACK_PASSBACK"
                        ).map((position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div
                              key={position.id}
                              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs uppercase">
                                      {position.code}
                                    </Badge>
                                    <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                  </div>
                                  <span className="text-[11px] font-mono uppercase text-slate-500">
                                    {assignedCount} / {requiredCount}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Cupos configurados
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={positionSlots[position.id] ?? 0}
                                      onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                      className="h-10 w-24 text-center"
                                    />
                                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                      {getSlotLabelForPosition(position.id)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {getSlotHelpText(position.id)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {getFixLabelForPosition(position.id)}
                                  </Label>
                                  <Select
                                    key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                    onValueChange={(employeeId) => handleFixEmployeeToPosition(position.id, employeeId)}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder={getFixPlaceholderForPosition(position.id)} />
                                    </SelectTrigger>
                                    <SelectContent>{renderEligibleSelectItems(position.id)}</SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  <div className="grid gap-2">
                                    {assignments[position.id].map((employeeId) => {
                                      const employee = employeeMap.get(employeeId)
                                      const isFixed = fixedEmployeeSet.has(employeeId)
                                      return (
                                        <div
                                          key={employeeId}
                                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                              {getEmployeeDisplayName(employee)}
                                            </Badge>
                                            {employee?.employee_code ? (
                                              <span className="text-[11px] uppercase text-muted-foreground">
                                                {employee.employee_code}
                                              </span>
                                            ) : null}
                                          </div>
                                          <label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                                            <Checkbox
                                              checked={isFixed}
                                              onCheckedChange={(checked) => toggleFixedEmployee(employeeId, checked)}
                                            />
                                            Fijo
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <ScrollBar orientation="vertical" forceMount />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="PICKPACK">
                    <div className="mb-3 space-y-1">
                      <h3 className="text-sm font-semibold uppercase text-slate-700">Pick &amp; Pack</h3>
                      <p className="text-xs text-muted-foreground">
                        Define el equipo operativo y los supervisores responsables de la célula Pick &amp; Pack.
                      </p>
                    </div>
                    <ScrollArea className="max-h-[50vh] overflow-y-auto pr-3">
                      <div className="space-y-4 py-1">
                        {ALL_POSITIONS.filter(
                          (position) =>
                            position.id === "PICKPACK_SUPERVISOR" ||
                            position.id === "PICKPACK" ||
                            position.id === "PICKPACK_PASSBACK"
                        ).map((position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div
                              key={position.id}
                              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs uppercase">
                                      {position.code}
                                    </Badge>
                                    <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                  </div>
                                  <span className="text-[11px] font-mono uppercase text-slate-500">
                                    {assignedCount} / {requiredCount}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Gestiona los cupos y colaboradores dedicados al flujo Pick &amp; Pack.
                                </p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Cupos configurados
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={positionSlots[position.id] ?? 0}
                                      onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                      className="h-10 w-24 text-center"
                                    />
                                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                      {getSlotLabelForPosition(position.id)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {getSlotHelpText(position.id)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {getFixLabelForPosition(position.id)}
                                  </Label>
                                  <Select
                                    key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                    onValueChange={(employeeId) => handleFixEmployeeToPosition(position.id, employeeId)}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder={getFixPlaceholderForPosition(position.id)} />
                                    </SelectTrigger>
                                    <SelectContent>{renderEligibleSelectItems(position.id)}</SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    {position.id === "PICKPACK_SUPERVISOR"
                                      ? "Sin supervisores asignados."
                                      : "Sin colaboradores asignados."}
                                  </p>
                                ) : (
                                  <div className="grid gap-2">
                                    {assignments[position.id].map((employeeId) => {
                                      const employee = employeeMap.get(employeeId)
                                      const isFixed = fixedEmployeeSet.has(employeeId)
                                      return (
                                        <div
                                          key={employeeId}
                                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                              {getEmployeeDisplayName(employee)}
                                            </Badge>
                                            {employee?.employee_code ? (
                                              <span className="text-[11px] uppercase text-muted-foreground">
                                                {employee.employee_code}
                                              </span>
                                            ) : null}
                                          </div>
                                          <label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                                            <Checkbox
                                              checked={isFixed}
                                              onCheckedChange={(checked) => toggleFixedEmployee(employeeId, checked)}
                                            />
                                            Fijo
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="Consulado">
                    <div className="mb-3 space-y-1">
                      <h3 className="text-sm font-semibold uppercase text-slate-700">Consulado</h3>
                      <p className="text-xs text-muted-foreground">
                        Define los puestos administrativos para el personal del consulado.
                      </p>
                    </div>
                    <ScrollArea className="max-h-[60vh] overflow-y-auto pr-3">
                      <div className="space-y-4 py-1">
                        {ALL_POSITIONS.filter((position) => position.category === "Consulado").map((position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div
                              key={position.id}
                              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs uppercase">
                                      {position.code}
                                    </Badge>
                                    <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                  </div>
                                  <span className="text-[11px] font-mono uppercase text-slate-500">
                                    {assignedCount} / {requiredCount}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Cupos configurados
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={positionSlots[position.id] ?? 0}
                                      onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                      className="h-10 w-24 text-center"
                                    />
                                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                      {getSlotLabelForPosition(position.id)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {getSlotHelpText(position.id)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {getFixLabelForPosition(position.id)}
                                  </Label>
                                  <Select
                                    key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                    onValueChange={(employeeId) => handleFixEmployeeToPosition(position.id, employeeId)}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder={getFixPlaceholderForPosition(position.id)} />
                                    </SelectTrigger>
                                    <SelectContent>{renderEligibleSelectItems(position.id)}</SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  <div className="grid gap-2">
                                    {assignments[position.id].map((employeeId) => {
                                      const employee = employeeMap.get(employeeId)
                                      const isFixed = fixedEmployeeSet.has(employeeId)
                                      return (
                                        <div
                                          key={employeeId}
                                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                              {getEmployeeDisplayName(employee)}
                                            </Badge>
                                            {employee?.employee_code ? (
                                              <span className="text-[11px] uppercase text-muted-foreground">
                                                {employee.employee_code}
                                              </span>
                                            ) : null}
                                          </div>
                                          <label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                                            <Checkbox
                                              checked={isFixed}
                                              onCheckedChange={(checked) => toggleFixedEmployee(employeeId, checked)}
                                            />
                                            Fijo
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPositionModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSavePositionPresetModalOpen}
        onOpenChange={(open) => {
          setIsSavePositionPresetModalOpen(open)
          if (!open) {
            setPositionPresetName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar configuración de cupos</DialogTitle>
            <DialogDescription>
              Almacena la cantidad de colaboradores por puesto para reutilizarla en próximas semanas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position-preset-name">Nombre de la configuración</Label>
              <Input
                id="position-preset-name"
                value={positionPresetName}
                onChange={(event) => setPositionPresetName(event.target.value)}
                placeholder="Ej. Operación completa CAS"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">Se guardarán los siguientes datos:</p>
              <p>• Número de puestos por cada posición del CAS y Consulado.</p>
              <p>• Se respetarán los puestos mínimos necesarios para los colaboradores marcados como fijos.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Las configuraciones quedan asociadas a esta oficina dentro de Supabase y no afectan otras sedes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsSavePositionPresetModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSavePositionPreset()}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSavingPositionPreset}
            >
              {isSavingPositionPreset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar cupos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAttributeModalOpen} onOpenChange={setIsAttributeModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Asignar atributos especiales</DialogTitle>
            <DialogDescription>
              Marca qué colaboradores fungirán como WS o estarán en entrenamiento esta semana.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea
              className="h-[60vh] rounded-md border pr-4"
              type="always"
              scrollHideDelay={0}
            >
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Empleado</th>
                      {attributes.map((attribute) => {
                        const allSelected =
                          sortedActiveEmployees.length > 0 &&
                          attribute.employeeIds.length === sortedActiveEmployees.length
                        const anySelected = attribute.employeeIds.length > 0
                        const isRestrictionColumn = attribute.id === "restricted_pickpack" || attribute.id === "restricted_consulate"
                        return (
                          <th key={attribute.id} className={`px-3 py-3 text-center ${isRestrictionColumn ? "bg-red-50" : ""}`}>
                            <div className="flex flex-col items-center gap-1">
                              <span>{attribute.label.toUpperCase()}</span>
                              {attribute.description ? (
                                <span className="text-[10px] text-muted-foreground">{attribute.description}</span>
                              ) : null}
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] uppercase"
                                  onClick={() => handleAttributeColumnToggle(attribute.id, "selectAll")}
                                  disabled={allSelected || sortedActiveEmployees.length === 0}
                                >
                                  Marcar
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] uppercase"
                                  onClick={() => handleAttributeColumnToggle(attribute.id, "clear")}
                                  disabled={!anySelected}
                                >
                                  Limpiar
                                </Button>
                              </div>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedActiveEmployees.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={1 + attributes.length}>
                          No hay colaboradores activos para asignar atributos.
                        </td>
                      </tr>
                    ) : (
                      sortedActiveEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            {getEmployeeDisplayName(employee)}
                            {employee.employee_code ? (
                              <div className="text-[10px] text-muted-foreground">Código {employee.employee_code}</div>
                            ) : null}
                          </td>
                          {attributes.map((attribute) => {
                            const isRestrictionColumn = attribute.id === "restricted_pickpack" || attribute.id === "restricted_consulate"
                            return (
                              <td key={attribute.id} className={`px-3 py-2 text-center ${isRestrictionColumn ? "bg-red-50" : ""}`}>
                                <Checkbox
                                  checked={attribute.employeeIds.includes(employee.id)}
                                  onCheckedChange={(checked) =>
                                    handleAttributeToggle(attribute.id, employee.id, checked)
                                  }
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="vertical" forceMount />
              <ScrollBar orientation="horizontal" forceMount />
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttributeModalOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRestrictionModalOpen} onOpenChange={setIsRestrictionModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Restricciones P&P/Consulado
            </DialogTitle>
            <DialogDescription>
              Gestiona los empleados que no pueden ser asignados a Pick & Pack o Consulado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTitle className="text-amber-800">¿Cómo funciona?</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                Los empleados marcados con los atributos de restricción nunca serán asignados
                automáticamente a las unidades especificadas durante la generación del rol.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-800">Puestos excluidos</h4>
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Restricción Pick & Pack:</p>
                      <ul className="space-y-1 text-xs text-slate-600 ml-2">
                        <li>• Pick & Pack (PP)</li>
                        <li>• Supervisor Pick & Pack (SUP-PP)</li>
                        <li>• Pick & Pack Passback (PP-PB)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Restricción Consulado:</p>
                      <ul className="space-y-1 text-xs text-slate-600 ml-2">
                        <li>• Consulado (CONSUL)</li>
                        <li>• Supervisor Consulado (SUP-CONSUL)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-3">
                    Restricción Pick & Pack ({restrictedPickPackIds.size})
                  </h4>
                  {restrictedPickPackIds.size === 0 ? (
                    <p className="text-xs text-red-700">
                      No hay empleados con esta restricción.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sortedActiveEmployees
                        .filter((emp) => restrictedPickPackIds.has(emp.id))
                        .map((employee) => (
                          <div
                            key={employee.id}
                            className="rounded border border-red-300 bg-white px-2 py-1.5"
                          >
                            <p className="text-xs font-semibold text-slate-800">
                              {getEmployeeDisplayName(employee)}
                            </p>
                            {employee.employee_code ? (
                              <p className="text-[10px] text-slate-600">Código: {employee.employee_code}</p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-3">
                    Restricción Consulado ({restrictedConsulateIds.size})
                  </h4>
                  {restrictedConsulateIds.size === 0 ? (
                    <p className="text-xs text-red-700">
                      No hay empleados con esta restricción.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sortedActiveEmployees
                        .filter((emp) => restrictedConsulateIds.has(emp.id))
                        .map((employee) => (
                          <div
                            key={employee.id}
                            className="rounded border border-red-300 bg-white px-2 py-1.5"
                          >
                            <p className="text-xs font-semibold text-slate-800">
                              {getEmployeeDisplayName(employee)}
                            </p>
                            {employee.employee_code ? (
                              <p className="text-[10px] text-slate-600">Código: {employee.employee_code}</p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestrictionModalOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setIsRestrictionModalOpen(false)
              setIsAttributeModalOpen(true)
            }} className="bg-indigo-600 hover:bg-indigo-700">
              <Tag className="mr-2 h-4 w-4" />
              Ir a Atributos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
