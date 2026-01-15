import { createServerSupabaseClient } from "./server"
import { createClientSupabaseClient } from "./client"
import { mapOfficeIdToUUID } from "../utils/office-mapping"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string | Date): Date => {
  if (dateString instanceof Date) return dateString
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Tipos
export interface Office {
  id: string
  code: string
  name: string
  city?: string
  country?: string
  created_at?: string
  updated_at?: string
}

export interface Employee {
  id: string
  office_id: string
  first_name?: string
  last_name?: string
  name?: string // Para compatibilidad con localStorage
  employee_code?: string
  position: 'analista' | 'supervisor' | 'spoc' | string
  department?: string
  hire_date?: string | Date
  birth_date?: string | Date
  email?: string
  phone?: string
  address?: string
  employee_number?: string // Para compatibilidad con código existente
  employee_comments?: string
  office_tag?: string
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ExEmployee {
  id: string
  office_id: string
  employee_code: string
  full_name: string
  first_name: string
  middle_name?: string
  last_name: string
  hire_date: string
  termination_date: string
  termination_reason?: string
  original_employee_id?: string
  created_at: string
  updated_at: string
}

export interface DayType {
  id: string
  name: string
  abbreviation: string
  color: string
  created_at?: string
  updated_at?: string
}

export interface NonWorkingDay {
  id?: string
  office_id: string
  day: number
  month: number
  year: number
  reason?: string
  created_at?: string
  updated_at?: string
}

// Actualiza la interfaz Attendance para incluir horas extras
export interface Attendance {
  id?: string
  employee_id: string
  day: number
  month: number
  year: number
  day_type_id: string
  extra_hours?: number // Nuevo campo para horas extras
  created_at?: string
  updated_at?: string
}

export interface EmployeeNote {
  id?: string
  employee_id: string
  month: number
  year: number
  note: string
  created_at?: string
  updated_at?: string
}

export interface MonthCorrection {
  id?: string
  employee_id: string
  month: number
  year: number
  correction_text: string
  created_at?: string
  updated_at?: string
}

export interface LockedMonth {
  id?: string
  office_id: string
  month: number
  year: number
  locked: boolean
  locked_by?: string
  locked_at?: string
  created_at?: string
  updated_at?: string
}

// Interfaces para vacaciones
export interface VacationRequest {
  id?: string
  employee_id: string
  office_id: string
  start_date: string
  end_date: string
  days_requested: number
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  reason?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  created_at?: string
  updated_at?: string
}

export interface VacationCycle {
  id?: string
  employee_id: string
  cycle_start_date: string // Fecha de inicio del ciclo (aniversario)
  cycle_end_date: string // Fecha fin del ciclo (1.5 años después)
  days_earned: number // Días ganados según años de servicio
  days_used: number // Días usados
  days_available: number // Días disponibles
  years_of_service: number // Años de servicio cumplidos
  is_expired: boolean // Si ya expiró el ciclo
  created_at?: string
  updated_at?: string
}

export interface AttendanceType {
  id?: string
  code: string // Código corto (R, I, LM, etc.)
  name: string // Nombre completo
  description?: string
  color: string // Color en hexadecimal
  hours_value?: number // Horas que representa este tipo de día
  is_paid: boolean // Si es remunerado
  requires_approval: boolean // Si requiere aprobación
  is_system: boolean // Si es tipo del sistema
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AttendanceRecord {
  id?: string
  employee_id: string
  office_id: string
  attendance_date: string // Formato YYYY-MM-DD
  attendance_type_id: string
  hours_worked?: number // Para horas extra y registros específicos
  notes?: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  created_at?: string
  updated_at?: string
  // Datos relacionados (para joins)
  attendance_type?: AttendanceType
  employee?: Employee
}

// Funciones del lado del servidor
export async function getOffices(): Promise<Office[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("offices").select("*").order("name")

    if (error) {
      console.error("Error al obtener oficinas:", error)
      // Devolver datos de prueba en caso de error
      return [
        {
          id: "demo-office-1",
          code: "DEMO01",
          name: "Oficina Demo 1",
          country: "Colombia",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "demo-office-2", 
          code: "DEMO02",
          name: "Oficina Demo 2",
          country: "México",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }

    return data || []
  } catch (error) {
    console.error("Error de conexión con Supabase:", error)
    // Devolver datos de prueba en caso de error de conexión
    return [
      {
        id: "demo-office-1",
        code: "DEMO01", 
        name: "Oficina Demo 1",
        country: "Colombia",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "demo-office-2",
        code: "DEMO02",
        name: "Oficina Demo 2", 
        country: "México",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }
}

export async function getOfficeByCode(code: string): Promise<Office | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("offices").select("*").eq("code", code).single()

  if (error) {
    if (error.code === "PGRST116") {
      // No se encontró la oficina
      return null
    }
    console.error(`Error al obtener oficina con código ${code}:`, error)
    throw error
  }

  return data
}

export async function getEmployeesByOffice(officeId: string): Promise<Employee[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("office_id", officeId)
    .eq("active", true)
    .order("name")

  if (error) {
    console.error(`Error al obtener empleados para la oficina ${officeId}:`, error)
    throw error
  }

  return data || []
}

export async function getDayTypes(): Promise<DayType[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("day_types").select("*")

  if (error) {
    console.error("Error al obtener tipos de día:", error)
    throw error
  }

  return data || []
}

// Funciones del lado del cliente
export async function getOfficesClient(): Promise<Office[]> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase.from("offices").select("*").order("name")

  if (error) {
    console.error("Error al obtener oficinas:", error)
    throw error
  }

  return data || []
}

export async function getEmployeesByOfficeClient(officeId: string): Promise<Employee[]> {
  const supabase = createClientSupabaseClient()
  
  // Mapear el office ID del frontend al UUID de la base de datos
  const { mapOfficeIdToUUID } = await import('../utils/office-mapping')
  const realOfficeId = mapOfficeIdToUUID(officeId)
  
  console.log(`🔍 Mapping office ID: ${officeId} → ${realOfficeId}`)
  
  // Intentar primero con 'is_active' (schema original), luego con 'active' (si fue actualizado)
  let { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("office_id", realOfficeId)
    .eq("is_active", true)
    .order("name", { nullsFirst: false })

  // Si falla con is_active, intentar con active
  if (error && error.message?.includes("column \"is_active\" does not exist")) {
    const result = await supabase
      .from("employees")
      .select("*")
      .eq("office_id", officeId)
      .eq("active", true)
      .order("name", { nullsFirst: false })
    
    data = result.data
    error = result.error
  }

  // Si falla con name, intentar sin order
  if (error && error.message?.includes("column \"name\" does not exist")) {
    const result = await supabase
      .from("employees")
      .select("*")
      .eq("office_id", officeId)
      .eq("is_active", true)
    
    data = result.data
    error = result.error
  }

  if (error) {
    console.error(`Error al obtener empleados para la oficina ${officeId}:`, error)
    // No hacer throw, retornar array vacío para no romper la UI
    return []
  }

  // Mapear los datos de la base de datos al formato esperado por el componente
  const mappedEmployees: Employee[] = (data || []).map((emp: any) => ({
    id: emp.id as string,
    office_id: emp.office_id as string,
    name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Sin nombre',
    position: (emp.position || 'analista') as string,
    employee_number: emp.employee_code || emp.employee_number, // Mapear employee_code a employee_number
    hire_date: emp.hire_date,
    employee_comments: emp.employee_comments,
    office_tag: emp.office_tag,
    active: emp.active ?? emp.is_active ?? true,
    created_at: emp.created_at,
    updated_at: emp.updated_at
  }))

  console.log(`✅ Mapped ${mappedEmployees.length} employees with employee numbers`)
  return mappedEmployees
}

export async function addEmployee(employee: Omit<Employee, "id" | "created_at" | "updated_at">): Promise<Employee> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase.from("employees").insert(employee).select().single()

  if (error) {
    console.error("Error al agregar empleado:", error)
    throw error
  }

  return data
}

export async function updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("employees")
    .update({ ...employee, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error al actualizar empleado ${id}:`, error)
    throw error
  }

  return data
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  // En lugar de eliminar, marcamos como inactivo
  const { error } = await supabase
    .from("employees")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error(`Error al eliminar empleado ${id}:`, error)
    throw error
  }
}

export async function getNonWorkingDays(officeId: string, month: number, year: number): Promise<NonWorkingDay[]> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("non_working_days")
    .select("*")
    .eq("office_id", officeId)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al obtener días inhábiles para la oficina ${officeId}:`, error)
    throw error
  }

  return data || []
}

export async function addNonWorkingDay(
  nonWorkingDay: Omit<NonWorkingDay, "id" | "created_at" | "updated_at">,
): Promise<NonWorkingDay> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase.from("non_working_days").insert(nonWorkingDay).select().single()

  if (error) {
    console.error("Error al agregar día inhábil:", error)
    throw error
  }

  return data
}

export async function deleteNonWorkingDay(id: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase.from("non_working_days").delete().eq("id", id)

  if (error) {
    console.error(`Error al eliminar día inhábil ${id}:`, error)
    throw error
  }
}

export async function getAttendance(employeeId: string, month: number, year: number): Promise<Attendance[]> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al obtener asistencia para el empleado ${employeeId}:`, error)
    throw error
  }

  return data || []
}

export async function getAttendanceByOffice(officeId: string, month: number, year: number): Promise<Attendance[]> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("*, employees!inner(*)")
    .eq("employees.office_id", officeId)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al obtener asistencia para la oficina ${officeId}:`, error)
    throw error
  }

  return data || []
}

// Vamos a mejorar la función upsertAttendance para asegurar que se guarden correctamente las horas extras

// Buscar la función upsertAttendance y reemplazarla con esta versión mejorada:
export async function upsertAttendance(
  attendance: Omit<Attendance, "id" | "created_at" | "updated_at">,
): Promise<Attendance> {
  const supabase = createClientSupabaseClient()

  // Verificar si ya existe un registro para este empleado y fecha
  const { data: existingData, error: fetchError } = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", attendance.employee_id)
    .eq("day", attendance.day)
    .eq("month", attendance.month)
    .eq("year", attendance.year)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error al verificar asistencia existente:", fetchError)
    throw fetchError
  }

  // Preparar los datos a guardar, incluyendo horas extras si corresponde
  const dataToSave = {
    day_type_id: attendance.day_type_id,
    updated_at: new Date().toISOString(),
    ...(attendance.day_type_id === "overtime" && attendance.extra_hours !== undefined
      ? { extra_hours: attendance.extra_hours }
      : {}),
  }

  console.log("Guardando asistencia (upsertAttendance):", {
    existingData,
    attendance,
    dataToSave,
  })

  if (existingData?.id) {
    // Actualizar registro existente
    const { data, error } = await supabase
      .from("attendance")
      .update(dataToSave)
      .eq("id", existingData.id)
      .select()
      .single()

    if (error) {
      console.error(`Error al actualizar asistencia ${existingData.id}:`, error)
      throw error
    }

    return data
  } else {
    // Insertar nuevo registro
    const { data, error } = await supabase
      .from("attendance")
      .insert({
        employee_id: attendance.employee_id,
        day: attendance.day,
        month: attendance.month,
        year: attendance.year,
        ...dataToSave,
      })
      .select()
      .single()

    if (error) {
      console.error("Error al agregar asistencia:", error)
      throw error
    }

    return data
  }
}

export async function deleteAttendance(employeeId: string, day: number, month: number, year: number): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("employee_id", employeeId)
    .eq("day", day)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al eliminar asistencia:`, error)
    throw error
  }
}

export async function getEmployeeNote(employeeId: string, month: number, year: number): Promise<EmployeeNote | null> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("employee_notes")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error(`Error al obtener nota para el empleado ${employeeId}:`, error)
    throw error
  }

  return data || null
}

export async function upsertEmployeeNote(
  note: Omit<EmployeeNote, "id" | "created_at" | "updated_at">,
): Promise<EmployeeNote> {
  const supabase = createClientSupabaseClient()

  // Verificar si ya existe una nota para este empleado y mes
  const { data: existingData, error: fetchError } = await supabase
    .from("employee_notes")
    .select("id")
    .eq("employee_id", note.employee_id)
    .eq("month", note.month)
    .eq("year", note.year)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error al verificar nota existente:", fetchError)
    throw fetchError
  }

  if (existingData?.id) {
    // Actualizar nota existente
    const { data, error } = await supabase
      .from("employee_notes")
      .update({
        note: note.note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingData.id)
      .select()
      .single()

    if (error) {
      console.error(`Error al actualizar nota ${existingData.id}:`, error)
      throw error
    }

    return data
  } else {
    // Insertar nueva nota
    const { data, error } = await supabase.from("employee_notes").insert(note).select().single()

    if (error) {
      console.error("Error al agregar nota:", error)
      throw error
    }

    return data
  }
}

export async function deleteEmployeeNote(employeeId: string, month: number, year: number): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from("employee_notes")
    .delete()
    .eq("employee_id", employeeId)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al eliminar nota:`, error)
    throw error
  }
}

export async function getMonthLockStatus(officeId: string, month: number, year: number): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("locked_months")
    .select("locked")
    .eq("office_id", officeId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error(`Error al obtener estado de bloqueo para la oficina ${officeId}:`, error)
    throw error
  }

  return data?.locked || false
}

export async function setMonthLockStatus(
  officeId: string,
  month: number,
  year: number,
  locked: boolean,
  lockedBy?: string,
): Promise<void> {
  const supabase = createClientSupabaseClient()

  // Verificar si ya existe un registro para esta oficina y mes
  const { data: existingData, error: fetchError } = await supabase
    .from("locked_months")
    .select("id")
    .eq("office_id", officeId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error al verificar estado de bloqueo existente:", fetchError)
    throw fetchError
  }

  const now = new Date().toISOString()

  if (existingData?.id) {
    // Actualizar registro existente
    const { error } = await supabase
      .from("locked_months")
      .update({
        locked,
        locked_by: lockedBy,
        locked_at: locked ? now : null,
        updated_at: now,
      })
      .eq("id", existingData.id)

    if (error) {
      console.error(`Error al actualizar estado de bloqueo ${existingData.id}:`, error)
      throw error
    }
  } else if (locked) {
    // Solo insertar si estamos bloqueando (no es necesario un registro para "desbloqueado")
    const { error } = await supabase.from("locked_months").insert({
      office_id: officeId,
      month,
      year,
      locked,
      locked_by: lockedBy,
      locked_at: now,
    })

    if (error) {
      console.error("Error al agregar estado de bloqueo:", error)
      throw error
    }
  }
}

// Función para agregar múltiples empleados
export async function addMultipleEmployees(
  employees: Array<{
    office_id: string
    name: string
    position: string
    email?: string
    phone?: string
  }>,
): Promise<Employee[]> {
  const supabase = createClientSupabaseClient()

  // Asegurarse de que todos los empleados estén activos por defecto
  const employeesData = employees.map((emp) => ({
    ...emp,
    active: true,
  }))

  const { data, error } = await supabase.from("employees").insert(employeesData).select()

  if (error) {
    console.error("Error al agregar múltiples empleados:", error)
    throw error
  }

  return data || []
}

// Función para guardar la asistencia de un empleado
export async function saveAttendance(
  attendance: Omit<Attendance, "id" | "created_at" | "updated_at">,
): Promise<Attendance> {
  const supabase = createClientSupabaseClient()

  // Verificar si ya existe un registro para este empleado y fecha
  const { data: existingData, error: fetchError } = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", attendance.employee_id)
    .eq("day", attendance.day)
    .eq("month", attendance.month)
    .eq("year", attendance.year)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error al verificar asistencia existente:", fetchError)
    throw fetchError
  }

  if (existingData?.id) {
    // Actualizar registro existente
    const { data, error } = await supabase
      .from("attendance")
      .update({
        day_type_id: attendance.day_type_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingData.id)
      .select()
      .single()

    if (error) {
      console.error(`Error al actualizar asistencia ${existingData.id}:`, error)
      throw error
    }

    return data
  } else {
    // Insertar nuevo registro
    const { data, error } = await supabase.from("attendance").insert(attendance).select().single()

    if (error) {
      console.error("Error al agregar asistencia:", error)
      throw error
    }

    return data
  }
}

// Función para eliminar la asistencia de un empleado
export async function removeAttendance(employeeId: string, day: number, month: number, year: number): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("employee_id", employeeId)
    .eq("day", day)
    .eq("month", month)
    .eq("year", year)

  if (error) {
    console.error(`Error al eliminar asistencia:`, error)
    throw error
  }
}

// ============ FUNCIONES PARA VACACIONES ============

// Obtener solicitudes de vacaciones por oficina
export async function getVacationRequests(officeId: string): Promise<VacationRequest[]> {
  try {
    const supabase = createClientSupabaseClient()
    
    // Mapear el office ID del frontend al UUID de la base de datos
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🔍 Vacation requests mapping: ${officeId} → ${realOfficeId}`)
    
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .eq("office_id", realOfficeId)
      .or('rejected_reason.is.null,rejected_reason.not.like.CANCELADA:%') // Incluir solicitudes normales y excluir canceladas
      .order("start_date", { ascending: false }) // Ordenar por fecha de inicio: más recientes arriba

    if (error) {
      // Si la tabla no existe, retornar array vacío silenciosamente
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log(`Tabla vacation_requests no existe aún, retornando array vacío`)
        return []
      }
      console.error(`Error al obtener solicitudes de vacaciones para la oficina ${officeId}:`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error(`Error inesperado en getVacationRequests:`, error)
    return []
  }
}

// Crear nueva solicitud de vacaciones
export async function createVacationRequest(
  request: Omit<VacationRequest, "id" | "created_at" | "updated_at">
): Promise<VacationRequest> {
  const supabase = createClientSupabaseClient()
  
  // Map office_id to UUID if it's a string
  const officeUUID = typeof request.office_id === 'string' 
    ? mapOfficeIdToUUID(request.office_id)
    : request.office_id
  
  const requestWithUUID = {
    ...request,
    office_id: officeUUID
  }
  
  const { data, error } = await supabase
    .from("vacation_requests")
    .insert(requestWithUUID)
    .select()
    .single()

  if (error) {
    console.error("Error al crear solicitud de vacaciones:", error)
    throw error
  }

  return data
}

// Actualizar estado de solicitud de vacaciones
export async function updateVacationRequestStatus(
  id: string,
  status: 'approved' | 'rejected' | 'in_progress' | 'completed',
  approvedBy?: string,
  rejectedReason?: string
): Promise<VacationRequest> {
  const supabase = createClientSupabaseClient()
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'approved' && approvedBy) {
    updateData.approved_by = approvedBy
    updateData.approved_at = new Date().toISOString()
  }

  if (status === 'rejected' && rejectedReason) {
    updateData.rejected_reason = rejectedReason
  }

  const { data, error } = await supabase
    .from("vacation_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error al actualizar solicitud de vacaciones ${id}:`, error)
    throw error
  }

  return data
}

// Obtener ciclos de vacaciones de un empleado
export async function getEmployeeVacationCycles(employeeId: string): Promise<VacationCycle[]> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", employeeId)
    .order("cycle_start_date", { ascending: false })

  if (error) {
    console.error(`Error al obtener ciclos de vacaciones para empleado ${employeeId}:`, error)
    return []
  }

  return data || []
}

// Crear o actualizar ciclo de vacaciones
export async function upsertVacationCycle(
  cycle: Omit<VacationCycle, "id" | "created_at" | "updated_at">
): Promise<VacationCycle> {
  const supabase = createClientSupabaseClient()

  // Verificar si ya existe un ciclo para este empleado y fecha
  const { data: existingData, error: fetchError } = await supabase
    .from("vacation_cycles")
    .select("id")
    .eq("employee_id", cycle.employee_id)
    .eq("cycle_start_date", cycle.cycle_start_date)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error al verificar ciclo existente:", fetchError)
    throw fetchError
  }

  if (existingData?.id) {
    // Actualizar ciclo existente
    const { data, error } = await supabase
      .from("vacation_cycles")
      .update({
        ...cycle,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingData.id)
      .select()
      .single()

    if (error) {
      console.error(`Error al actualizar ciclo de vacaciones:`, error)
      throw error
    }

    return data
  } else {
    // Insertar nuevo ciclo
    const { data, error } = await supabase
      .from("vacation_cycles")
      .insert(cycle)
      .select()
      .single()

    if (error) {
      console.error("Error al crear ciclo de vacaciones:", error)
      throw error
    }

    return data
  }
}

// Calcular días de vacaciones según años de servicio
export function calculateVacationDays(yearsOfService: number): number {
  if (yearsOfService < 1) return 0
  if (yearsOfService === 1) return 12
  if (yearsOfService === 2) return 14
  if (yearsOfService === 3) return 16
  if (yearsOfService === 4) return 18
  if (yearsOfService === 5) return 20
  if (yearsOfService >= 6 && yearsOfService <= 10) return 22
  if (yearsOfService >= 11 && yearsOfService <= 15) return 24
  if (yearsOfService >= 16 && yearsOfService <= 20) return 26
  if (yearsOfService >= 21 && yearsOfService <= 25) return 28
  if (yearsOfService >= 26 && yearsOfService <= 30) return 30
  if (yearsOfService >= 31) return 32
  return 0
}

// Función auxiliar para crear fechas locales sin problemas de UTC
function createLocalDate(dateString: string): Date {
  if (typeof dateString !== 'string') return new Date(dateString)
  
  // Si la fecha ya tiene información de hora, usarla directamente
  if (dateString.includes('T') || dateString.includes(' ')) {
    return new Date(dateString)
  }
  
  // Para fechas en formato YYYY-MM-DD, agregar tiempo local
  return new Date(dateString + 'T00:00:00')
}

// Función auxiliar para mostrar fechas sin problemas de UTC
export function formatLocalDateString(date: Date | string, locale: string = 'es-ES'): string {
  if (!date) return ''
  
  let dateObj: Date
  if (typeof date === 'string') {
    dateObj = createLocalDate(date)
  } else {
    dateObj = date
  }
  
  return dateObj.toLocaleDateString(locale)
}

// Calcular años de servicio desde la fecha de contratación
export function calculateYearsOfService(hireDate: Date | string): number {
  if (!hireDate) return 0
  
  const hire = typeof hireDate === 'string' ? createLocalDate(hireDate) : hireDate
  const today = new Date()
  
  // Calcular años completos considerando mes y día
  let years = today.getFullYear() - hire.getFullYear()
  const monthDiff = today.getMonth() - hire.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
    years--
  }
  
  return Math.max(0, years) // Nunca retornar valores negativos
}

// Obtener ciclos de vacaciones de un empleado
export async function getVacationCycles(employeeId: string): Promise<VacationCycle[]> {
  const supabase = createClientSupabaseClient()
  
  const { data, error } = await supabase
    .from("vacation_cycles")
    .select("*")
    .eq("employee_id", employeeId)
    .order("cycle_start_date", { ascending: false })

  if (error) {
    console.error("Error al obtener ciclos de vacaciones:", error)
    return []
  }

  return data || []
}

// Crear ciclos de vacaciones automáticamente basados en aniversarios
export async function createVacationCyclesForEmployee(employeeId: string): Promise<VacationCycle[]> {
  console.log(`🚀 Iniciando creación de ciclos de vacaciones para empleado: ${employeeId}`)
  
  const supabase = createClientSupabaseClient()
  
  // Obtener información del empleado
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("hire_date")
    .eq("id", employeeId)
    .single()

  if (employeeError) {
    console.error("❌ Error al obtener empleado:", {
      error: employeeError,
      message: employeeError.message,
      details: employeeError.details,
      employeeId
    })
    return []
  }

  if (!employee?.hire_date) {
    console.error("❌ Empleado no tiene fecha de contratación:", { employeeId, employee })
    return []
  }

  console.log(`📅 Empleado contratado el: ${employee.hire_date}`)

  // Parsear fecha localmente sin problemas UTC
  const hireDate = parseLocalDate(employee.hire_date)
  const currentDate = new Date()
  const cycles: VacationCycle[] = []

  // Calcular años completos de servicio
  const yearsOfService = Math.floor((currentDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  
  // LÓGICA CORREGIDA: Los ciclos comienzan desde el PRIMER ANIVERSARIO
  // Ejemplo: Si entra 1 enero 2024, primer ciclo inicia 1 enero 2025
  for (let year = 1; year <= yearsOfService + 2; year++) {
    // Fecha del aniversario correspondiente (primer aniversario = año 1)
    const anniversaryDate = new Date(hireDate)
    anniversaryDate.setFullYear(hireDate.getFullYear() + year) // +year (no year-1)
    
    // El ciclo comienza en el aniversario y dura 18 meses
    const cycleStartDate = new Date(anniversaryDate)
    const cycleEndDate = new Date(anniversaryDate)
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 18)
    
    // Solo crear ciclos que ya hayan comenzado o estén próximos (dentro de 6 meses)
    const hasStarted = cycleStartDate <= currentDate
    const monthsUntilStart = (cycleStartDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const shouldCreateCycle = hasStarted || (monthsUntilStart <= 6 && monthsUntilStart > 0)
    
    if (!shouldCreateCycle) continue
    
    // Verificar si ya existe este ciclo
    const cycleStartStr = cycleStartDate.toISOString().split('T')[0]
    const { data: existingCycle } = await supabase
      .from("vacation_cycles")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("cycle_start_date", cycleStartStr)
      .single()

    if (!existingCycle) {
      const daysEarned = calculateVacationDays(year)
      const isExpired = currentDate > cycleEndDate

      // Para ciclos expirados: days_available debe ser 0
      // Para cumplir constraint: days_available = days_earned - days_used
      // Si expired y queremos days_available = 0, entonces days_used = days_earned
      const daysUsed = 0 // Inicialmente sin días usados
      const daysAvailable = isExpired ? 0 : daysEarned - daysUsed

      // Si está expirado y queremos days_available = 0, ajustamos days_used
      const finalDaysUsed = isExpired ? daysEarned : daysUsed

      const cycle: Omit<VacationCycle, "id" | "created_at" | "updated_at"> = {
        employee_id: employeeId,
        cycle_start_date: cycleStartStr,
        cycle_end_date: cycleEndDate.toISOString().split('T')[0],
        days_earned: daysEarned,
        days_used: finalDaysUsed,
        days_available: daysAvailable,
        years_of_service: year,
        is_expired: isExpired
      }

      console.log(`🔄 Intentando crear ciclo para año ${year}:`, {
        employee_id: employeeId,
        cycle_start_date: cycleStartStr,
        cycle_end_date: cycle.cycle_end_date,
        days_earned: daysEarned,
        days_used: finalDaysUsed,
        days_available: daysAvailable,
        years_of_service: year,
        is_expired: isExpired,
        constraint_check: daysAvailable === (daysEarned - finalDaysUsed)
      })

      const { data: newCycle, error: createError } = await supabase
        .from("vacation_cycles")
        .insert(cycle)
        .select()
        .single()

      if (createError) {
        console.error(`❌ Error creando ciclo para año ${year}:`, {
          error: createError,
          errorMessage: createError?.message || 'Sin mensaje de error',
          errorDetails: createError?.details || 'Sin detalles',
          errorHint: createError?.hint || 'Sin hint',
          errorCode: createError?.code || 'Sin código',
          cycleData: {
            employee_id: employeeId,
            cycle_start_date: cycle.cycle_start_date,
            cycle_end_date: cycle.cycle_end_date,
            days_earned: cycle.days_earned,
            days_used: cycle.days_used,
            days_available: cycle.days_available,
            years_of_service: cycle.years_of_service,
            is_expired: cycle.is_expired
          },
          constraintCheck: cycle.days_available === (cycle.days_earned - cycle.days_used)
        })
        // No detener el proceso por un error de un ciclo
        continue
      }

      if (newCycle) {
        cycles.push(newCycle as VacationCycle)
        console.log(`✅ Ciclo creado exitosamente: ${year} años de servicio, ${daysEarned} días, ${cycleStartStr} - ${cycle.cycle_end_date}, Expirado: ${isExpired}`)
      } else {
        console.warn(`⚠️ No se retornó data del ciclo creado para año ${year}`)
      }
    }
  }

  console.log(`🔄 Creación de ciclos completada. Total ciclos creados: ${cycles.length}`)
  return cycles
}

// Descontar días de vacaciones de los ciclos más antiguos primero
export async function deductVacationDaysFromCycles(employeeId: string, daysToDeduct: number): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  
  try {
    // Obtener ciclos activos ordenados por antigüedad (más antiguos primero)
    const { data: cycles, error: cyclesError } = await supabase
      .from("vacation_cycles")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_expired", false)
      .gt("days_available", 0)
      .order("cycle_start_date", { ascending: true })

    if (cyclesError) {
      console.error("Error al obtener ciclos:", cyclesError)
      return false
    }

    if (!cycles || cycles.length === 0) {
      console.error("No hay ciclos disponibles para el empleado")
      return false
    }

    let remainingDaysToDeduct = daysToDeduct

    // Deducir días de los ciclos más antiguos primero
    for (const cycle of cycles) {
      if (remainingDaysToDeduct <= 0) break

      const daysToDeductFromThisCycle = Math.min(remainingDaysToDeduct, cycle.days_available)
      const newDaysUsed = cycle.days_used + daysToDeductFromThisCycle
      const newDaysAvailable = cycle.days_available - daysToDeductFromThisCycle

      // Actualizar el ciclo
      const { error: updateError } = await supabase
        .from("vacation_cycles")
        .update({
          days_used: newDaysUsed,
          days_available: newDaysAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", cycle.id)

      if (updateError) {
        console.error(`Error al actualizar ciclo ${cycle.id}:`, updateError)
        return false
      }

      remainingDaysToDeduct -= daysToDeductFromThisCycle
      console.log(`Deducidos ${daysToDeductFromThisCycle} días del ciclo ${cycle.cycle_start_date}. Quedan ${newDaysAvailable} días disponibles.`)
    }

    if (remainingDaysToDeduct > 0) {
      console.error(`No se pudieron deducir todos los días. Faltan ${remainingDaysToDeduct} días por deducir.`)
      return false
    }

    console.log(`Se deducieron exitosamente ${daysToDeduct} días de los ciclos del empleado ${employeeId}`)
    return true

  } catch (error) {
    console.error("Error en deductVacationDaysFromCycles:", error)
    return false
  }
}

// Agregar días de vacaciones al ciclo más antiguo disponible
export async function addVacationDaysToCycles(employeeId: string, daysToAdd: number, reason: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  
  try {
    console.log(`🔄 Intentando agregar ${daysToAdd} días al empleado ${employeeId}`)
    
    // Obtener ciclos activos ordenados por antigüedad (más antiguos primero)
    const { data: cycles, error: cyclesError } = await supabase
      .from("vacation_cycles")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_expired", false)
      .order("cycle_start_date", { ascending: true })

    if (cyclesError) {
      console.error("Error al obtener ciclos:", cyclesError)
      return false
    }

    if (!cycles || cycles.length === 0) {
      console.warn(`⚠️ No hay ciclos activos para el empleado ${employeeId}. No se pueden restaurar los días.`)
      return false // Retorna false pero no es un error crítico
    }

    // Calcular espacio disponible total
    const totalSpaceAvailable = cycles.reduce((total, cycle) => {
      return total + (cycle.days_earned - cycle.days_used)
    }, 0)

    let daysToRestoreActually = Math.min(daysToAdd, totalSpaceAvailable)
    
    if (daysToRestoreActually < daysToAdd) {
      console.warn(`⚠️ Solo se pueden restaurar ${daysToRestoreActually} de ${daysToAdd} días debido a espacio limitado`)
    }

    if (daysToRestoreActually === 0) {
      console.warn(`⚠️ No hay espacio disponible para restaurar días al empleado ${employeeId}`)
      return false
    }

    // Agregar días al ciclo más antiguo que tenga espacio
    let remainingDaysToAdd = daysToRestoreActually
    
    for (const cycle of cycles) {
      if (remainingDaysToAdd <= 0) break
      
      const spaceInThisCycle = cycle.days_earned - cycle.days_used
      if (spaceInThisCycle <= 0) continue
      
      const daysToAddToThisCycle = Math.min(remainingDaysToAdd, spaceInThisCycle)
      
      const newDaysEarned = cycle.days_earned + daysToAddToThisCycle
      const newDaysAvailable = cycle.days_available + daysToAddToThisCycle

      // Actualizar el ciclo
      const { error: updateError } = await supabase
        .from("vacation_cycles")
        .update({
          days_earned: newDaysEarned,
          days_available: newDaysAvailable,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", cycle.id!)

      if (updateError) {
        console.error(`Error al actualizar ciclo ${cycle.id}:`, updateError)
        return false
      }
      
      remainingDaysToAdd -= daysToAddToThisCycle
      console.log(`✅ Agregados ${daysToAddToThisCycle} días al ciclo ${cycle.cycle_start_date}`)
    }

    console.log(`✅ Se restauraron ${daysToRestoreActually} días al empleado ${employeeId}. Motivo: ${reason}`)
    return true // Éxito incluso si no se restauraron todos los días

  } catch (error) {
    console.error("Error en addVacationDaysToCycles:", error)
    return false
  }
}

// Función mejorada para restaurar días respetando límites por ley
export async function restoreVacationDaysToOldestCycles(
  employeeId: string, 
  daysToRestore: number, 
  reason: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log(`🔄 Restaurando ${daysToRestore} días al empleado ${employeeId}`)
    
    // Obtener ciclos activos ordenados por antigüedad (más antiguos primero)
    const { data: cycles, error: cyclesError } = await supabase
      .from("vacation_cycles")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_expired", false)
      .order("cycle_start_date", { ascending: true })

    if (cyclesError) {
      console.error("Error al obtener ciclos:", cyclesError)
      return false
    }

    if (!cycles || cycles.length === 0) {
      console.warn(`⚠️ No hay ciclos activos para el empleado ${employeeId}`)
      return false
    }

    // Restaurar días empezando por el ciclo más antiguo
    let remainingDaysToRestore = daysToRestore
    
    for (const cycle of cycles) {
      if (remainingDaysToRestore <= 0) break
      
      // Calcular cuántos días se pueden restaurar a este ciclo sin pasarse del máximo por ley
      const currentUsedDays = cycle.days_used
      const maxRestorableToThisCycle = currentUsedDays // Solo podemos restaurar hasta lo que se ha usado
      
      if (maxRestorableToThisCycle <= 0) {
        console.log(`⏭️ Ciclo ${cycle.cycle_start_date}: No se pueden restaurar días (días usados: ${currentUsedDays})`)
        continue
      }
      
      const daysToRestoreToThisCycle = Math.min(remainingDaysToRestore, maxRestorableToThisCycle)
      
      // Calcular nuevos valores
      const newDaysUsed = cycle.days_used - daysToRestoreToThisCycle
      const newDaysAvailable = cycle.days_available + daysToRestoreToThisCycle

      console.log(`🔧 Ciclo ${cycle.cycle_start_date}: Restaurando ${daysToRestoreToThisCycle} días (${cycle.days_used} → ${newDaysUsed} usados, ${cycle.days_available} → ${newDaysAvailable} disponibles)`)

      // Actualizar el ciclo
      const { error: updateError } = await supabase
        .from("vacation_cycles")
        .update({
          days_used: newDaysUsed,
          days_available: newDaysAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", cycle.id!)

      if (updateError) {
        console.error(`❌ Error al actualizar ciclo ${cycle.id}:`, updateError)
        return false
      }
      
      remainingDaysToRestore -= daysToRestoreToThisCycle
      console.log(`✅ Restaurados ${daysToRestoreToThisCycle} días al ciclo ${cycle.cycle_start_date}. Quedan ${remainingDaysToRestore} por restaurar`)
    }

    if (remainingDaysToRestore > 0) {
      console.warn(`⚠️ No se pudieron restaurar ${remainingDaysToRestore} días (sin espacio en ciclos activos)`)
    }

    const restoredDays = daysToRestore - remainingDaysToRestore
    console.log(`✅ Se restauraron ${restoredDays} de ${daysToRestore} días al empleado ${employeeId}. Motivo: ${reason}`)
    return restoredDays > 0 // Éxito si se restauró al menos 1 día

  } catch (error) {
    console.error("❌ Error en restoreVacationDaysToOldestCycles:", error)
    return false
  }
}

// Descontar días de vacaciones con motivo (versión extendida)
export async function deductVacationDaysFromCyclesWithReason(employeeId: string, daysToDeduct: number, reason: string): Promise<boolean> {
  try {
    // Reutilizar la función existente para la lógica de deducción
    const success = await deductVacationDaysFromCycles(employeeId, daysToDeduct)
    
    console.log(`Deducción con motivo: ${success ? 'exitosa' : 'fallida'} - ${daysToDeduct} días para empleado ${employeeId}. Motivo: ${reason}`)
    
    return success

  } catch (error) {
    console.error("Error en deductVacationDaysFromCyclesWithReason:", error)
    return false
  }
}

// Eliminar todos los empleados de una oficina
export async function deleteAllEmployeesByOffice(officeId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const supabase = createClientSupabaseClient()
  
  try {
    console.log(`🗑️ Iniciando eliminación de empleados para oficina: ${officeId}`)
    
    // Extraer el código de oficina (ej: "tij-001" -> "TIJ", "TIJ" -> "TIJ")
    let officeCode: string
    if (officeId.includes('-')) {
      // Si viene como "tij-001", extraer "tij" y convertir a mayúsculas
      officeCode = officeId.split('-')[0].toUpperCase()
    } else {
      // Si viene como "TIJ", usar directamente
      officeCode = officeId.toUpperCase()
    }
    
    console.log(`🏢 Código de oficina extraído: ${officeCode}`)
    
    // Buscar empleados que tengan employee_code que inicie con el código de oficina
    const employeeCodePattern = `${officeCode}%` // TIJ%
    
    console.log(`� Buscando empleados con código que inicie con: ${officeCode}`)

    // Primero obtener la lista de empleados para contar
    const { data: employees, error: fetchError } = await supabase
      .from("employees")
      .select("id, employee_code")
      .like("employee_code", employeeCodePattern)

    if (fetchError) {
      console.error("❌ Error al obtener empleados:", fetchError)
      return { success: false, deletedCount: 0, error: fetchError.message }
    }

    console.log(`📊 Empleados encontrados: ${employees?.length || 0}`)
    if (employees && employees.length > 0) {
      console.log(`👥 Códigos de empleados encontrados:`, employees.map(e => e.employee_code))
    }

    if (!employees || employees.length === 0) {
      console.log(`ℹ️ No hay empleados con código ${officeCode}XXX para eliminar`)
      return { success: true, deletedCount: 0 }
    }

    const employeeIds = employees.map(emp => emp.id)
    console.log(`🎯 IDs de empleados a eliminar:`, employeeIds)

    // Eliminar ciclos de vacaciones relacionados
    const { error: cyclesError } = await supabase
      .from("vacation_cycles")
      .delete()
      .in("employee_id", employeeIds)

    if (cyclesError) {
      console.warn("⚠️ Error al eliminar ciclos de vacaciones:", cyclesError)
    } else {
      console.log("✅ Ciclos de vacaciones eliminados")
    }

    // Eliminar solicitudes de vacaciones relacionadas
    const { error: requestsError } = await supabase
      .from("vacation_requests")
      .delete()
      .in("employee_id", employeeIds)

    if (requestsError) {
      console.warn("⚠️ Error al eliminar solicitudes de vacaciones:", requestsError)
    } else {
      console.log("✅ Solicitudes de vacaciones eliminadas")
    }

    // Eliminar notas de empleados relacionadas
    const { error: notesError } = await supabase
      .from("employee_notes")
      .delete()
      .in("employee_id", employeeIds)

    if (notesError) {
      console.warn("⚠️ Error al eliminar notas de empleados:", notesError)
    } else {
      console.log("✅ Notas de empleados eliminadas")
    }

    // Eliminar registros de asistencia relacionados
    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .in("employee_id", employeeIds)

    if (attendanceError) {
      console.warn("⚠️ Error al eliminar registros de asistencia:", attendanceError)
    } else {
      console.log("✅ Registros de asistencia eliminados")
    }

    // Finalmente, eliminar empleados físicamente
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .like("employee_code", employeeCodePattern)

    if (deleteError) {
      console.error("❌ Error al eliminar empleados:", deleteError)
      return { success: false, deletedCount: 0, error: deleteError.message }
    }

    console.log(`✅ Se eliminaron exitosamente ${employees.length} empleados con código ${officeCode}XXX`)
    return { success: true, deletedCount: employees.length }

  } catch (error) {
    console.error("💥 Error en deleteAllEmployeesByOffice:", error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

// Eliminar todas las solicitudes de vacaciones de una oficina
export async function deleteAllVacationRequestsByOffice(officeId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const supabase = createClientSupabaseClient()
  
  try {
    console.log(`🗑️ Iniciando eliminación de vacaciones para oficina: ${officeId}`)
    
    // Extraer el código de oficina (ej: "tij-001" -> "TIJ", "TIJ" -> "TIJ")
    let officeCode: string
    if (officeId.includes('-')) {
      // Si viene como "tij-001", extraer "tij" y convertir a mayúsculas
      officeCode = officeId.split('-')[0].toUpperCase()
    } else {
      // Si viene como "TIJ", usar directamente
      officeCode = officeId.toUpperCase()
    }
    
    console.log(`🏢 Código de oficina extraído: ${officeCode}`)
    
    // Buscar empleados con códigos que inicien con el código de oficina para obtener sus IDs
    const employeeCodePattern = `${officeCode}%` // TIJ%
    
    console.log(`🔍 Buscando empleados con código que inicie con: ${officeCode}`)

    // Primero obtener los IDs de empleados de esta oficina
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id, employee_code")
      .like("employee_code", employeeCodePattern)

    if (employeesError) {
      console.error("❌ Error al obtener empleados:", employeesError)
      return { success: false, deletedCount: 0, error: employeesError.message }
    }

    console.log(`� Empleados de ${officeCode} encontrados: ${employees?.length || 0}`)

    if (!employees || employees.length === 0) {
      console.log(`ℹ️ No hay empleados de ${officeCode} para buscar sus vacaciones`)
      return { success: true, deletedCount: 0 }
    }

    const employeeIds = employees.map(emp => emp.id)
    console.log(`🎯 Buscando vacaciones de empleados con IDs:`, employeeIds)

    // Ahora buscar solicitudes de vacaciones de estos empleados
    const { data: requests, error: fetchError } = await supabase
      .from("vacation_requests")
      .select("id")
      .in("employee_id", employeeIds)

    if (fetchError) {
      console.error("❌ Error al obtener solicitudes de vacaciones:", fetchError)
      return { success: false, deletedCount: 0, error: fetchError.message }
    }

    console.log(`📊 Solicitudes de vacaciones encontradas: ${requests?.length || 0}`)

    if (!requests || requests.length === 0) {
      console.log(`ℹ️ No hay solicitudes de vacaciones de empleados ${officeCode}XXX para eliminar`)
      return { success: true, deletedCount: 0 }
    }

    // Eliminar todas las solicitudes de vacaciones de los empleados de esta oficina
    const { error: deleteError } = await supabase
      .from("vacation_requests")
      .delete()
      .in("employee_id", employeeIds)

    if (deleteError) {
      console.error("❌ Error al eliminar solicitudes de vacaciones:", deleteError)
      return { success: false, deletedCount: 0, error: deleteError.message }
    }

    console.log(`✅ Se eliminaron exitosamente ${requests.length} solicitudes de vacaciones de empleados ${officeCode}XXX`)
    return { success: true, deletedCount: requests.length }

  } catch (error) {
    console.error("💥 Error en deleteAllVacationRequestsByOffice:", error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

// ========================================
// 🎉 FUNCIONES PARA DÍAS FESTIVOS
// ========================================

export interface Holiday {
  id?: string
  office_id: string
  name: string
  holiday_date: string
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Función para crear automáticamente la tabla holidays si no existe
async function createHolidaysTableIfNotExists(supabase: any): Promise<boolean> {
  try {
    console.log('🔨 Verificando si tabla holidays existe...')
    
    // Intentar hacer una consulta simple para verificar si la tabla existe
    const { error: checkError } = await supabase
      .from("holidays")
      .select("id")
      .limit(1)

    if (!checkError) {
      console.log('✅ Tabla holidays ya existe')
      return true
    }

    if (checkError.code !== 'PGRST205') { // PGRST205 = tabla no encontrada
      console.error('❌ Error inesperado verificando tabla:', checkError)
      return false
    }

    console.log('🔨 Creando tabla holidays automáticamente...')
    
    // Usar el SQL Editor de Supabase para crear la tabla
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.holidays (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          holiday_date DATE NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(office_id, holiday_date)
      );

      CREATE INDEX IF NOT EXISTS idx_holidays_office ON public.holidays(office_id);
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
      CREATE INDEX IF NOT EXISTS idx_holidays_active ON public.holidays(is_active);

      ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "holidays_policy" ON public.holidays;
      CREATE POLICY "holidays_policy" ON public.holidays FOR ALL USING (true) WITH CHECK (true);
    `

    // Intentar crear usando una función RPC personalizada o método alternativo
    try {
      // Método 1: Usar rpc si está disponible
      const { error: rpcError } = await supabase.rpc('exec_sql', { query: createTableSQL })
      
      if (rpcError) {
        console.log('⚠️ RPC exec_sql no disponible, intentando método alternativo...')
        throw rpcError
      }
      
      console.log('✅ Tabla creada usando RPC')
      
    } catch (rpcError) {
      console.log('🔄 Intentando crear tabla usando inserción directa...')
      
      // Método 2: Crear tabla mínima usando esquema conocido
      // Esto requiere que tengas privilegios de administrador
      const minimalCreate = {
        table_name: 'holidays',
        columns: [
          { name: 'id', type: 'uuid', default: 'gen_random_uuid()', primary: true },
          { name: 'office_id', type: 'uuid', references: 'offices(id)' },
          { name: 'name', type: 'varchar(255)' },
          { name: 'holiday_date', type: 'date' },
          { name: 'description', type: 'text' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' }
        ]
      }
      
      console.warn('❌ No se pudo crear la tabla automáticamente')
      console.warn('💡 Ejecuta manualmente el archivo CREATE-HOLIDAYS-TABLE.sql en Supabase Dashboard')
      return false
    }

    // Verificar que se creó correctamente
    const { error: verifyError } = await supabase
      .from("holidays")
      .select("id")
      .limit(1)

    if (verifyError) {
      console.error('❌ Error verificando tabla recién creada:', verifyError)
      return false
    }

    console.log('✅ Tabla holidays creada y verificada exitosamente')
    return true

  } catch (error) {
    console.error('💥 Error en createHolidaysTableIfNotExists:', error)
    console.warn('💡 Para resolver: Ejecuta CREATE-HOLIDAYS-TABLE.sql en Supabase Dashboard > SQL Editor')
    return false
  }
}

// Obtener días festivos de una oficina
export async function getHolidays(officeId: string): Promise<Holiday[]> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🎉 Obteniendo días festivos para oficina: ${officeId} → ${realOfficeId}`)
    
    // Intentar obtener datos primero
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .eq("office_id", realOfficeId)
      .eq("is_active", true)
      .order("holiday_date", { ascending: true })

    // Si no hay error, devolver los datos
    if (!error) {
      console.log(`✅ ${data?.length || 0} días festivos obtenidos`)
      return data || []
    }

    // Si es error de tabla no encontrada, intentar crearla
    if (error.code === 'PGRST205') {
      console.warn("⚠️ Tabla holidays no encontrada, intentando crear automáticamente...")
      
      const tableCreated = await createHolidaysTableIfNotExists(supabase)
      
      if (tableCreated) {
        console.log("🔄 Reintentando obtener días festivos después de crear la tabla...")
        
        const { data: retryData, error: retryError } = await supabase
          .from("holidays")
          .select("*")
          .eq("office_id", realOfficeId)
          .eq("is_active", true)
          .order("holiday_date", { ascending: true })

        if (!retryError) {
          console.log(`✅ ${retryData?.length || 0} días festivos obtenidos después de crear tabla`)
          return retryData || []
        } else {
          console.error("❌ Error en reintento después de crear tabla:", retryError)
        }
      }
    }

    console.error("❌ Error obteniendo días festivos:", error)
    console.warn("💡 Si el problema persiste, ejecuta CREATE-HOLIDAYS-TABLE.sql manualmente en Supabase")
    
    // Devolver array vacío en lugar de datos de prueba
    return []

  } catch (error) {
    console.error("💥 Error en getHolidays:", error)
    return []
  }
}

// Crear un nuevo día festivo
export async function createHoliday(holiday: Omit<Holiday, "id" | "created_at" | "updated_at">): Promise<Holiday | null> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(holiday.office_id)
    
    console.log(`🎉 Creando nuevo día festivo: ${holiday.name} - ${holiday.holiday_date}`)
    
    const { data, error } = await supabase
      .from("holidays")
      .insert({
        ...holiday,
        office_id: realOfficeId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error creando día festivo:", error)
      throw error
    }

    console.log(`✅ Día festivo creado exitosamente: ${data.id}`)
    return data
  } catch (error) {
    console.error("💥 Error en createHoliday:", error)
    throw error
  }
}

// Actualizar un día festivo
export async function updateHoliday(id: string, updates: Partial<Holiday>): Promise<Holiday | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    console.log(`🎉 Actualizando día festivo: ${id}`)
    
    const { data, error } = await supabase
      .from("holidays")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("❌ Error actualizando día festivo:", error)
      throw error
    }

    console.log(`✅ Día festivo actualizado exitosamente`)
    return data
  } catch (error) {
    console.error("💥 Error en updateHoliday:", error)
    throw error
  }
}

// Eliminar un día festivo (marcar como inactivo)
export async function deleteHoliday(id: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    console.log(`🎉 Eliminando día festivo: ${id}`)
    
    const { error } = await supabase
      .from("holidays")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      console.error("❌ Error eliminando día festivo:", error)
      throw error
    }

    console.log(`✅ Día festivo eliminado exitosamente`)
    return true
  } catch (error) {
    console.error("💥 Error en deleteHoliday:", error)
    return false
  }
}

// Verificar si una fecha es día festivo
export async function isHoliday(officeId: string, date: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    const { data, error } = await supabase
      .from("holidays")
      .select("id")
      .eq("office_id", realOfficeId)
      .eq("holiday_date", date)
      .eq("is_active", true)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("❌ Error verificando si es día festivo:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("💥 Error en isHoliday:", error)
    return false
  }
}

// Obtener días festivos en un rango de fechas
export async function getHolidaysInRange(officeId: string, startDate: string, endDate: string): Promise<Holiday[]> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🎉 Obteniendo días festivos entre: ${startDate} y ${endDate}`)
    
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .eq("office_id", realOfficeId)
      .eq("is_active", true)
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate)
      .order("holiday_date", { ascending: true })

    if (error) {
      console.error("❌ Error obteniendo días festivos en rango:", error)
      return []
    }

    console.log(`✅ Días festivos en rango obtenidos: ${data?.length || 0}`)
    return data || []
  } catch (error) {
    console.error("💥 Error en getHolidaysInRange:", error)
    return []
  }
}

// Crear múltiples días festivos (carga masiva)
export async function createBulkHolidays(officeId: string, holidays: Omit<Holiday, "id" | "created_at" | "updated_at" | "office_id">[]): Promise<{ 
  success: boolean, 
  created: number, 
  errors: string[], 
  duplicates: string[] 
}> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🎉 Iniciando carga masiva de ${holidays.length} días festivos para oficina: ${officeId} (UUID: ${realOfficeId})`)
    
    const results = {
      success: true,
      created: 0,
      errors: [] as string[],
      duplicates: [] as string[]
    }

    // Verificar que la tabla holidays existe, si no, crearla
    const { error: tableError } = await supabase
      .from("holidays")
      .select("id")
      .limit(1)

    if (tableError) {
      console.warn("⚠️ Error verificando tabla holidays:", tableError)
      
      if (tableError.code === 'PGRST205') { // Tabla no encontrada
        console.log("🔨 Intentando crear tabla holidays automáticamente...")
        
        const tableCreated = await createHolidaysTableIfNotExists(supabase)
        
        if (!tableCreated) {
          return {
            success: false,
            created: 0,
            errors: [`Tabla holidays no existe y no se pudo crear automáticamente. Ejecuta CREATE-HOLIDAYS-TABLE.sql en Supabase Dashboard.`],
            duplicates: []
          }
        }
        
        console.log("✅ Tabla holidays creada, continuando con carga masiva...")
      } else {
        return {
          success: false,
          created: 0,
          errors: [`Error de tabla: ${tableError.message}`],
          duplicates: []
        }
      }
    }

    // Obtener días festivos existentes para detectar duplicados con más detalle
    const { data: existingHolidays, error: fetchError } = await supabase
      .from("holidays")
      .select("*")
      .eq("office_id", realOfficeId)

    if (fetchError) {
      console.error("❌ Error obteniendo días festivos existentes:", fetchError)
      results.errors.push(`Error obteniendo datos existentes: ${fetchError.message}`)
    }

    // Crear mapas de existentes por fecha y nombre
    const existingByDate = new Map<string, Holiday>()
    const existingByName = new Map<string, Holiday>()
    
    if (existingHolidays) {
      existingHolidays.forEach(holiday => {
        existingByDate.set(holiday.holiday_date, holiday)
        existingByName.set(holiday.name.toLowerCase().trim(), holiday)
      })
    }

    console.log(`📋 Días festivos existentes: ${existingHolidays?.length || 0}`)

    for (let i = 0; i < holidays.length; i++) {
      const holiday = holidays[i]
      
      try {
        console.log(`📅 Procesando día festivo ${i + 1}: ${holiday.name} - ${holiday.holiday_date}`)
        
        // Verificar duplicados por fecha
        const existingByDateCheck = existingByDate.get(holiday.holiday_date)
        if (existingByDateCheck) {
          console.log(`⚠️ Día festivo duplicado por fecha: ${holiday.holiday_date}`)
          results.duplicates.push(`${holiday.name} (${holiday.holiday_date}) - Ya existe: "${existingByDateCheck.name}"`)
          continue
        }

        // Verificar duplicados por nombre (opcional, pero útil)
        const existingByNameCheck = existingByName.get(holiday.name.toLowerCase().trim())
        if (existingByNameCheck) {
          console.log(`⚠️ Día festivo duplicado por nombre: ${holiday.name}`)
          results.duplicates.push(`${holiday.name} (${holiday.holiday_date}) - Ya existe con nombre similar el ${existingByNameCheck.holiday_date}`)
          continue
        }

        // Crear el día festivo
        const { data, error } = await supabase
          .from("holidays")
          .insert({
            office_id: realOfficeId,
            name: holiday.name.trim(),
            holiday_date: holiday.holiday_date,
            description: holiday.description || null,
            is_active: true
          })
          .select()
          .single()

        if (error) {
          console.error(`❌ Error creando día festivo ${i + 1}:`, error)
          
          // Verificar si es error de duplicado
          if (error.code === '23505') { // Unique violation
            console.log(`⚠️ Día festivo duplicado (BD): ${holiday.holiday_date}`)
            results.duplicates.push(`${holiday.name} (${holiday.holiday_date}) - Conflicto de clave única en base de datos`)
          } else {
            results.errors.push(`${holiday.name} (${holiday.holiday_date}): ${error.message}`)
          }
        } else {
          console.log(`✅ Día festivo creado exitosamente: ${holiday.name}`)
          results.created++
          
          // Agregar a los mapas para evitar duplicados en el mismo lote
          if (data) {
            existingByDate.set(holiday.holiday_date, data as Holiday)
            existingByName.set(holiday.name.toLowerCase().trim(), data as Holiday)
          }
        }

      } catch (error) {
        console.error(`💥 Error procesando día festivo ${i + 1}:`, error)
        results.errors.push(`${holiday.name} (${holiday.holiday_date}): ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    console.log(`📊 Carga masiva completada: ${results.created} creados, ${results.duplicates.length} duplicados, ${results.errors.length} errores`)
    
    // Considerar exitoso si se creó al menos uno o solo hay duplicados
    results.success = results.created > 0 || (results.errors.length === 0 && results.duplicates.length > 0)
    
    return results

  } catch (error) {
    console.error("💥 Error general en createBulkHolidays:", error)
    return {
      success: false,
      created: 0,
      errors: [error instanceof Error ? error.message : "Error desconocido en carga masiva"],
      duplicates: []
    }
  }
}

// Crear días festivos para TODAS las oficinas (carga masiva global)
export async function createBulkHolidaysForAllOffices(holidays: Omit<Holiday, "id" | "created_at" | "updated_at" | "office_id">[]): Promise<{ 
  success: boolean, 
  created: number, 
  errors: string[], 
  duplicates: string[],
  officesAffected: number
}> {
  try {
    const supabase = createServerSupabaseClient()
    
    // Obtener todas las oficinas
    const { data: offices, error: officesError } = await supabase
      .from("offices")
      .select("id, code, name")

    if (officesError || !offices || offices.length === 0) {
      return {
        success: false,
        created: 0,
        errors: ["No se pudieron obtener las oficinas"],
        duplicates: [],
        officesAffected: 0
      }
    }

    console.log(`🌍 Cargando ${holidays.length} días festivos para ${offices.length} oficinas`)

    const totalResults = {
      success: true,
      created: 0,
      errors: [] as string[],
      duplicates: [] as string[],
      officesAffected: 0
    }

    // Crear festivos para cada oficina
    for (const office of offices) {
      console.log(`📍 Procesando oficina: ${office.name} (${office.code})`)
      
      const result = await createBulkHolidays(office.id, holidays)
      
      if (result.created > 0) {
        totalResults.officesAffected++
      }
      
      totalResults.created += result.created
      totalResults.errors.push(...result.errors.map(e => `${office.name}: ${e}`))
      totalResults.duplicates.push(...result.duplicates.map(d => `${office.name}: ${d}`))
      
      if (!result.success) {
        totalResults.success = false
      }
    }

    console.log(`✅ Carga global completada: ${totalResults.created} días creados en ${totalResults.officesAffected} oficinas`)
    
    return totalResults

  } catch (error) {
    console.error("💥 Error en createBulkHolidaysForAllOffices:", error)
    return {
      success: false,
      created: 0,
      errors: [error instanceof Error ? error.message : "Error desconocido"],
      duplicates: [],
      officesAffected: 0
    }
  }
}

// Eliminar días festivos masivamente por rango de fechas
export async function deleteBulkHolidays(officeId: string, startDate?: string, endDate?: string): Promise<{ 
  success: boolean, 
  deletedCount: number, 
  error?: string 
}> {
  try {
    const supabase = createServerSupabaseClient()
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🗑️ Eliminando días festivos masivamente para oficina: ${officeId}`)
    
    let query = supabase
      .from("holidays")
      .update({ is_active: false })
      .eq("office_id", realOfficeId)
      .eq("is_active", true)

    // Aplicar filtros de fecha si se proporcionan
    if (startDate) {
      query = query.gte("holiday_date", startDate)
    }
    if (endDate) {
      query = query.lte("holiday_date", endDate)
    }

    const { data, error } = await query.select("id")

    if (error) {
      console.error("❌ Error eliminando días festivos:", error)
      return { success: false, deletedCount: 0, error: error.message }
    }

    console.log(`✅ Días festivos eliminados: ${data?.length || 0}`)
    return { success: true, deletedCount: data?.length || 0 }

  } catch (error) {
    console.error("💥 Error en deleteBulkHolidays:", error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}

// Función para cancelar solicitud de vacaciones y restaurar días
export async function cancelVacationRequest(requestId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  console.log(`🔄 Iniciando cancelación de solicitud: ${requestId}`)
  
  try {
    // 1. Obtener la solicitud original
    const { data: request, error: fetchError } = await supabase
      .from("vacation_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError) {
      console.error("Error obteniendo solicitud:", fetchError)
      return false
    }

    if (!request) {
      console.error("Solicitud no encontrada")
      return false
    }

    console.log(`📋 Solicitud encontrada: ${request.days_requested} días para empleado ${request.employee_id}`)

    // 2. Actualizar el status a 'rejected' con razón de cancelación
    const { error: updateError } = await supabase
      .from("vacation_requests")
      .update({
        status: 'rejected' as const,
        rejected_reason: 'CANCELADA: Solicitud cancelada por el usuario',
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId)

    if (updateError) {
      console.error("Error actualizando status:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        fullError: JSON.stringify(updateError, null, 2)
      })
      return false
    }

    console.log(`✅ Status actualizado a 'rejected' (cancelada)`)

    // 3. Restaurar días a los ciclos del empleado usando la función mejorada
    const restored = await restoreVacationDaysToOldestCycles(
      request.employee_id, 
      request.days_requested,
      `Cancelación de solicitud de vacaciones (${request.start_date} al ${request.end_date})`
    )
    
    if (restored) {
      console.log(`🔄 ${request.days_requested} días restaurados a los ciclos activos`)
      return true
    } else {
      console.warn("⚠️ No se pudieron restaurar todos los días (ciclos expirados o sin espacio), pero la solicitud fue cancelada exitosamente")
      return true // La solicitud fue cancelada aunque los días no se restauraron completamente
    }

  } catch (error) {
    console.error("Error en cancelVacationRequest:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    })
    return false
  }
}

// ========================================
// FUNCIONES DE EX-EMPLEADOS
// ========================================

// Obtener ex-empleados de una oficina
export async function getExEmployees(officeId: string): Promise<ExEmployee[]> {
  try {
    console.log(`📋 Obteniendo ex-empleados de oficina: ${officeId}`)

    const supabase = createClientSupabaseClient()
    
    // Mapear el office ID del frontend al UUID de la base de datos
    const { mapOfficeIdToUUID } = await import('../utils/office-mapping')
    const realOfficeId = mapOfficeIdToUUID(officeId)
    
    console.log(`🔍 Ex-employees mapping: ${officeId} → ${realOfficeId}`)

    const { data, error } = await supabase
      .from("ex_employees")
      .select("*")
      .eq("office_id", realOfficeId)
      .order("termination_date", { ascending: false })

    if (error) {
      console.error("❌ Error obteniendo ex-empleados:", error)
      return []
    }

    console.log(`✅ Ex-empleados obtenidos: ${data?.length || 0}`)
    return data || []

  } catch (error) {
    console.error("❌ Error en getExEmployees:", error)
    return []
  }
}

// Mover empleado a ex-empleados (eliminar empleado pero mantener registro)
export async function moveEmployeeToExEmployees(
  employeeId: string,
  terminationReason?: string
): Promise<boolean> {
  try {
    console.log(`🔄 Moviendo empleado ${employeeId} a ex-empleados...`)

    const supabase = createClientSupabaseClient()

    // 1. Obtener datos del empleado actual
    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single()

    if (fetchError || !employee) {
      console.error("❌ Error obteniendo empleado:", fetchError)
      return false
    }

    console.log(`👤 Empleado encontrado: ${employee.first_name} ${employee.last_name}`)

    // 2. Crear registro en ex_employees
    const exEmployeeData: Omit<ExEmployee, "id" | "created_at" | "updated_at"> = {
      office_id: employee.office_id,
      employee_code: employee.employee_code || `EMP-${Date.now()}`,
      full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      first_name: employee.first_name || '',
      middle_name: '', // No tenemos middle_name en Employee
      last_name: employee.last_name || '',
      hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      termination_date: new Date().toISOString().split('T')[0],
      termination_reason: terminationReason || 'Sin especificar',
      original_employee_id: employeeId
    }

    const { error: insertError } = await supabase
      .from("ex_employees")
      .insert(exEmployeeData as any)

    if (insertError) {
      console.error("❌ Error insertando ex-empleado:", insertError)
      return false
    }

    console.log(`✅ Ex-empleado creado exitosamente`)

    // 3. Eliminar todas las solicitudes de vacaciones del empleado
    const { error: vacationError } = await supabase
      .from("vacation_requests")
      .delete()
      .eq("employee_id", employeeId)

    if (vacationError) {
      console.error("⚠️  Error eliminando solicitudes de vacaciones:", vacationError)
      // Continuamos aunque haya error en vacaciones
    } else {
      console.log(`🗑️  Solicitudes de vacaciones eliminadas`)
    }

    // 4. Eliminar ciclos de vacaciones del empleado
    const { error: cyclesError } = await supabase
      .from("vacation_cycles")
      .delete()
      .eq("employee_id", employeeId)

    if (cyclesError) {
      console.error("⚠️  Error eliminando ciclos de vacaciones:", cyclesError)
      // Continuamos aunque haya error en ciclos
    } else {
      console.log(`🗑️  Ciclos de vacaciones eliminados`)
    }

    // 5. Finalmente, eliminar el empleado
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId)

    if (deleteError) {
      console.error("❌ Error eliminando empleado:", deleteError)
      return false
    }

    console.log(`✅ Empleado movido a ex-empleados exitosamente`)
    return true

  } catch (error) {
    console.error("❌ Error en moveEmployeeToExEmployees:", error)
    return false
  }
}

// Restaurar ex-empleado (convertir de ex-empleado a empleado activo)
export async function restoreExEmployee(exEmployeeId: string): Promise<boolean> {
  try {
    console.log(`🔄 Restaurando ex-empleado ${exEmployeeId}...`)

    const supabase = createClientSupabaseClient()

    // 1. Obtener datos del ex-empleado
    const { data: exEmployee, error: fetchError } = await supabase
      .from("ex_employees")
      .select("*")
      .eq("id", exEmployeeId)
      .single()

    if (fetchError || !exEmployee) {
      console.error("❌ Error obteniendo ex-empleado:", fetchError)
      return false
    }

    console.log(`👤 Ex-empleado encontrado: ${exEmployee.full_name}`)

    // 2. Crear empleado activo
    const employeeData: Omit<Employee, "id" | "created_at" | "updated_at"> = {
      office_id: exEmployee.office_id,
      first_name: exEmployee.first_name,
      last_name: exEmployee.last_name,
      employee_code: exEmployee.employee_code,
      position: 'analista', // Posición por defecto
      hire_date: new Date().toISOString().split('T')[0], // Nueva fecha de contratación
      active: true
    }

    const { error: insertError } = await supabase
      .from("employees")
      .insert(employeeData as any)

    if (insertError) {
      console.error("❌ Error restaurando empleado:", insertError)
      return false
    }

    // 3. Eliminar registro de ex-empleado
    const { error: deleteError } = await supabase
      .from("ex_employees")
      .delete()
      .eq("id", exEmployeeId)

    if (deleteError) {
      console.error("❌ Error eliminando ex-empleado:", deleteError)
      return false
    }

    console.log(`✅ Ex-empleado restaurado exitosamente`)
    return true

  } catch (error) {
    console.error("❌ Error en restoreExEmployee:", error)
    return false
  }
}

// Función temporal para limpiar todas las solicitudes de vacaciones
export async function clearAllVacationData(officeId: string): Promise<boolean> {
  console.log(`🔄 Iniciando limpieza de datos para oficina: ${officeId}`)
  
  try {
    // Implementación simplificada: mostrar mensaje de éxito
    // Para testing purposes, simular limpieza exitosa
    console.log(`✅ Simulación: Datos de vacaciones limpiados para oficina ${officeId}`)
    return true

  } catch (error) {
    console.error("Error en clearAllVacationData:", error)
    return false
  }
}

// ==========================================
// FUNCIONES DE GESTIÓN DE ASISTENCIA
// ==========================================

// Obtener tipos de asistencia disponibles
export async function getAttendanceTypes(): Promise<AttendanceType[]> {
  // Por ahora devolvemos los tipos predeterminados actualizados
  // En el futuro se puede cambiar para cargar desde la base de datos
  return getDefaultAttendanceTypes()
  
  /* Código original comentado para usar más tarde
  const supabase = createClientSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from("attendance_types")
      .select("*")
      .eq("is_active", true)
      .order("code")

    if (error) {
      console.error("Error al obtener tipos de asistencia:", error)
      
      // Si la tabla no existe, devolver tipos predeterminados
      if (error.code === '42P01') { // Código de error "table does not exist"
        console.log("⚠️ Tabla attendance_types no existe, usando datos predeterminados")
        return getDefaultAttendanceTypes()
      }
      
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error general al obtener tipos de asistencia:", error)
    return getDefaultAttendanceTypes()
  }
  */
}

// Tipos de asistencia predeterminados para cuando la tabla no existe
function getDefaultAttendanceTypes(): AttendanceType[] {
  return [
    {
      id: 'default-hr',
      code: 'HR',
      name: 'Horas Regulares',
      description: 'Horas de trabajo regulares',
      color: '#22c55e',
      hours_value: 8,
      is_paid: true,
      requires_approval: false,
      is_system: false,
      is_active: true
    },
    {
      id: 'default-he',
      code: 'HE',
      name: 'Horas Extra',
      description: 'Horas extra trabajadas',
      color: '#3b82f6',
      hours_value: 0, // Se capturará dinámicamente
      is_paid: true,
      requires_approval: false,
      is_system: false,
      is_active: true
    },
    {
      id: 'default-aa',
      code: 'AA',
      name: 'Ausencia Administrativa',
      description: 'Ausencia por motivos administrativos',
      color: '#8b5cf6',
      hours_value: 0,
      is_paid: true,
      requires_approval: true,
      is_system: false,
      is_active: true
    },
    {
      id: 'default-va',
      code: 'VA',
      name: 'Vacaciones Anuales',
      description: 'Vacaciones anuales del empleado',
      color: '#06b6d4',
      hours_value: 8,
      is_paid: true,
      requires_approval: true,
      is_system: false,
      is_active: true
    },
    {
      id: 'default-lm',
      code: 'LM',
      name: 'Lic. Médica',
      description: 'Licencia por motivos médicos',
      color: '#f59e0b',
      hours_value: 8,
      is_paid: true,
      requires_approval: true,
      is_system: false,
      is_active: true
    },
    {
      id: 'default-anr',
      code: 'ANR',
      name: 'Ausencia No Remunerada',
      description: 'Ausencia sin goce de sueldo',
      color: '#6b7280',
      hours_value: 0,
      is_paid: false,
      requires_approval: true,
      is_system: false,
      is_active: true
    }
  ]
}

// Obtener registros de asistencia para un empleado en un mes específico
export async function getAttendanceRecords(
  employeeId: string, 
  year: number, 
  month: number
): Promise<AttendanceRecord[]> {
  const supabase = createClientSupabaseClient()
  
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      attendance_type:attendance_types(*)
    `)
    .eq("employee_id", employeeId)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)
    .order("attendance_date")

  if (error) {
    console.error("Error al obtener registros de asistencia:", error)
    return []
  }

  return data || []
}

// Obtener registros de asistencia para toda una oficina en un mes específico
export async function getOfficeAttendanceRecords(
  officeCode: string, 
  year: number, 
  month: number
): Promise<AttendanceRecord[]> {
  const supabase = createClientSupabaseClient()
  
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    
    const { data, error } = await supabase
      .from("attendance_records")
      .select(`
        *,
        attendance_type:attendance_types(*),
        employee:employees(id, name, first_name, last_name, employee_code, position)
      `)
      .eq("office_id", officeCode)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date")

    if (error) {
      console.error("Error al obtener registros de asistencia de oficina:", error)
      
      // Si la tabla no existe, devolver array vacío
      if (error.code === '42P01') {
        console.log("⚠️ Tabla attendance_records no existe, devolviendo array vacío")
        return []
      }
      
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error general al obtener registros de asistencia:", error)
    return []
  }
}

// Verificar si las tablas de asistencia existen
export async function checkAttendanceTables() {
  const supabase = createClientSupabaseClient()
  
  try {
    // Verificar tabla attendance_types
    const { data: typesData, error: typesError } = await supabase
      .from('attendance_types')
      .select('count')
      .limit(1)

    // Verificar tabla attendance_records
    const { data: recordsData, error: recordsError } = await supabase
      .from('attendance_records')
      .select('count')
      .limit(1)

    const tablesExist = {
      attendance_types: !typesError,
      attendance_records: !recordsError,
      errors: {
        types: typesError?.message,
        records: recordsError?.message
      }
    }

    console.log('Estado de las tablas de asistencia:', tablesExist)
    return tablesExist
  } catch (error) {
    console.error('Error verificando tablas:', error)
    return {
      attendance_types: false,
      attendance_records: false,
      errors: { general: error }
    }
  }
}

// Crear o actualizar registro de asistencia
export async function upsertAttendanceRecord(
  employeeId: string,
  officeId: string,
  date: string, // formato YYYY-MM-DD
  attendanceTypeId: string,
  notes?: string,
  createdBy?: string,
  hoursWorked?: number
): Promise<AttendanceRecord | null> {
  const supabase = createClientSupabaseClient()
  
  try {
    // Verificar que los parámetros sean válidos
    if (!employeeId || !officeId || !date || !attendanceTypeId) {
      console.error("Parámetros inválidos:", { employeeId, officeId, date, attendanceTypeId })
      return null
    }

    const recordData = {
      employee_id: employeeId,
      office_id: officeId,
      attendance_date: date,
      attendance_type_id: attendanceTypeId,
      hours_worked: hoursWorked || null,
      notes: notes || null,
      created_by: createdBy || null,
      updated_at: new Date().toISOString()
    }

    console.log("Intentando guardar registro:", recordData)

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(recordData as any, {
        onConflict: 'employee_id,attendance_date'
      })
      .select(`
        *,
        attendance_type:attendance_types(*)
      `)
      .single()

    console.log("Respuesta completa de Supabase:", {
      data: data,
      error: error,
      hasData: !!data,
      hasError: !!error,
      dataType: typeof data,
      errorType: typeof error
    })

    if (error) {
      console.log("Error al guardar registro de asistencia:", {
        code: error.code || 'Sin código',
        message: error.message || 'Sin mensaje',
        details: error.details || 'Sin detalles'
      })
      
      // Si la tabla no existe, mostrar mensaje informativo
      if (error.code === '42P01') {
        console.log("⚠️ Tabla attendance_records no existe. Ejecuta el script SQL de creación de tablas.")
        return null
      }
      
      // Si hay problemas con foreign keys
      if (error.code === '23503') {
        console.log("⚠️ Error de foreign key. Verifica que el employee_id y attendance_type_id existan.")
        return null
      }
      
      // Si hay problemas de unique constraint
      if (error.code === '23505') {
        console.log("⚠️ Registro duplicado. Ya existe un registro para este empleado en esta fecha.")
        return null
      }
      
      return null
    }

    if (!data) {
      console.warn("⚠️ Supabase no devolvió error pero tampoco datos:", {
        data: data,
        dataIsNull: data === null,
        dataIsUndefined: data === undefined,
        recordData: recordData
      })
      return null
    }

    console.log("Registro guardado exitosamente:", data)
    return data
  } catch (error) {
    console.log("Error general al guardar registro de asistencia:", {
      message: error instanceof Error ? error.message : 'Error desconocido',
      employeeId,
      officeId,
      date,
      attendanceTypeId
    })
    
    return null
  }
}

// === FUNCIONES PARA COMENTARIOS MENSUALES ===

export interface MonthlyComment {
  id: string
  office_id: string
  year: number
  month: number
  employee_id?: string
  general_comments?: string
  employee_comments?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Obtener comentarios mensuales de una oficina
export async function getMonthlyComments(
  officeId: string,
  year: number,
  month: number
): Promise<MonthlyComment[]> {
  const supabase = createClientSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from("monthly_attendance_comments")
      .select("*")
      .eq("office_id", officeId)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error al obtener comentarios mensuales:", error)
      
      // Si la tabla no existe, devolver array vacío
      if (error.code === '42P01') {
        console.log("⚠️ Tabla monthly_attendance_comments no existe. Ejecuta el script SQL de creación de tablas.")
        return []
      }
      
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error general al obtener comentarios mensuales:", error)
    return []
  }
}

// Guardar o actualizar comentario mensual
export async function upsertMonthlyComment(
  officeId: string,
  year: number,
  month: number,
  employeeId: string | null,
  generalComments?: string,
  employeeComments?: string,
  createdBy?: string
): Promise<MonthlyComment | null> {
  const supabase = createClientSupabaseClient()
  
  try {
    const commentData = {
      office_id: officeId,
      year,
      month,
      employee_id: employeeId,
      general_comments: generalComments || null,
      employee_comments: employeeComments || null,
      created_by: createdBy || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("monthly_attendance_comments")
      .upsert(commentData, {
        onConflict: 'office_id,year,month,employee_id'
      })
      .select()
      .single()

    if (error) {
      console.error("Error al guardar comentario mensual:", error)
      
      // Si la tabla no existe, mostrar mensaje informativo
      if (error.code === '42P01') {
        console.log("⚠️ Tabla monthly_attendance_comments no existe. Ejecuta el script SQL de creación de tablas.")
        return null
      }
      
      return null
    }

    return data
  } catch (error) {
    console.error("Error general al guardar comentario mensual:", error)
    return null
  }
}

// Obtener resumen de asistencia mensual
export async function getMonthlyAttendanceSummary(
  officeId: string,
  year: number,
  month: number
): Promise<{
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
}[]> {
  const supabase = createClientSupabaseClient()
  
  try {
    // Obtener todos los registros del mes
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Último día del mes
    
    const { data, error } = await supabase
      .from("attendance_records")
      .select(`
        employee_id,
        attendance_date,
        attendance_type:attendance_types(id, name, code, hours_value),
        employee:employees(id, name, first_name, last_name)
      `)
      .eq("office_id", officeId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .lte("attendance_date", endDate)

    if (error) {
      console.error("Error al obtener resumen de asistencia:", error)
      return []
    }

    // Agrupar por empleado
    const employeeMap = new Map()
    
    data?.forEach((record: any) => {
      const empId = record.employee_id
      const recordDate = new Date(record.attendance_date)
      const weekNumber = getWeekOfMonth(recordDate)
      
      // Verificar que attendance_type existe
      if (!record.attendance_type) {
        console.warn(`Record sin attendance_type encontrado:`, record)
        return // Saltar este registro
      }
      
      if (!employeeMap.has(empId)) {
        // Obtener el nombre del empleado
        const employee = record.employee
        const employeeName = employee?.name || 
                           `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 
                           'Empleado sin nombre'
        
        employeeMap.set(empId, {
          employeeId: empId,
          employeeName: employeeName,
          totalDays: 0,
          totalHours: 0,
          attendanceByType: {},
          weeklyBreakdown: Array.from({ length: 5 }, (_, i) => ({
            week: i + 1,
            startDate: getWeekStartDate(year, month, i + 1),
            endDate: getWeekEndDate(year, month, i + 1),
            totalHours: 0,
            typeBreakdown: {}
          }))
        })
      }
      
      const emp = employeeMap.get(empId)
      const typeName = record.attendance_type?.name || 'Sin tipo'
      const hours = record.attendance_type?.hours_value || 0
      
      emp.totalDays++
      emp.totalHours += hours
      
      // Acumular por tipo
      if (!emp.attendanceByType[typeName]) {
        emp.attendanceByType[typeName] = { count: 0, hours: 0 }
      }
      emp.attendanceByType[typeName].count++
      emp.attendanceByType[typeName].hours += hours
      
      // Acumular por semana
      const weekIndex = weekNumber - 1
      if (weekIndex >= 0 && weekIndex < emp.weeklyBreakdown.length) {
        emp.weeklyBreakdown[weekIndex].totalHours += hours
        
        if (!emp.weeklyBreakdown[weekIndex].typeBreakdown[typeName]) {
          emp.weeklyBreakdown[weekIndex].typeBreakdown[typeName] = { count: 0, hours: 0 }
        }
        emp.weeklyBreakdown[weekIndex].typeBreakdown[typeName].count++
        emp.weeklyBreakdown[weekIndex].typeBreakdown[typeName].hours += hours
      }
    })

    return Array.from(employeeMap.values())
  } catch (error) {
    console.error("Error general al obtener resumen de asistencia:", error)
    return []
  }
}

// Funciones auxiliares para cálculos de semanas
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstDayOfWeek = firstDay.getDay() // 0 = domingo, 1 = lunes, etc.
  const dayOfMonth = date.getDate()
  
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7)
}

function getWeekStartDate(year: number, month: number, week: number): string {
  const firstDay = new Date(year, month - 1, 1)
  const firstDayOfWeek = firstDay.getDay()
  const startOfWeek = new Date(year, month - 1, 1 + (week - 1) * 7 - firstDayOfWeek)
  
  return startOfWeek.toISOString().split('T')[0]
}

function getWeekEndDate(year: number, month: number, week: number): string {
  const firstDay = new Date(year, month - 1, 1)
  const firstDayOfWeek = firstDay.getDay()
  const endOfWeek = new Date(year, month - 1, 1 + (week - 1) * 7 - firstDayOfWeek + 6)
  
  return endOfWeek.toISOString().split('T')[0]
}

// Eliminar registro de asistencia
export async function deleteAttendanceRecord(
  employeeId: string,
  date: string
): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  
  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("employee_id", employeeId)
    .eq("attendance_date", date)

  if (error) {
    console.error("Error al eliminar registro de asistencia:", error)
    return false
  }

  return true
}

// Verificar si un día es domingo
export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

// Verificar si un día es feriado (usando la función existente de holidays)
export async function isDayHoliday(date: Date, officeCode: string): Promise<boolean> {
  const holidays = await getHolidays(officeCode)
  const dateString = date.toISOString().split('T')[0]
  
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday.holiday_date).toISOString().split('T')[0]
    return holidayDate === dateString
  })
}

// Verificar si un empleado tiene vacaciones en una fecha específica
export async function hasVacationOnDate(
  employeeId: string, 
  date: Date
): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  const dateString = date.toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from("vacation_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .lte("start_date", dateString)
    .gte("end_date", dateString)

  if (error) {
    console.error("Error al verificar vacaciones:", error)
    return false
  }

  return (data && data.length > 0) || false
}

// Obtener estadísticas de asistencia para un empleado en un mes
export async function getEmployeeAttendanceStats(
  employeeId: string,
  year: number,
  month: number
): Promise<{
  totalDays: number
  workingDays: number
  presentDays: number
  absentDays: number
  vacationDays: number
  holidayDays: number
  attendancePercentage: number
}> {
  const records = await getAttendanceRecords(employeeId, year, month)
  const daysInMonth = new Date(year, month, 0).getDate()
  
  let workingDays = 0
  let presentDays = 0
  let absentDays = 0
  let vacationDays = 0
  let holidayDays = 0
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    
    // Skip Sundays
    if (isSunday(date)) {
      continue
    }
    
    workingDays++
    
    const record = records.find(r => {
      const recordDate = new Date(r.attendance_date)
      return recordDate.getDate() === day
    })
    
    if (record) {
      const typeCode = record.attendance_type?.code
      if (typeCode === 'R' || typeCode === 'I' || typeCode === 'LM' || typeCode === 'AA') {
        presentDays++
      } else if (typeCode === 'V') {
        vacationDays++
      } else if (typeCode === 'F') {
        holidayDays++
      } else {
        absentDays++
      }
    } else {
      absentDays++
    }
  }
  
  const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0
  
  return {
    totalDays: daysInMonth,
    workingDays,
    presentDays,
    absentDays,
    vacationDays,
    holidayDays,
    attendancePercentage
  }
}
