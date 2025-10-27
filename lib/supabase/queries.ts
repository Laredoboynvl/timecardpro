import { createClientSupabaseClient } from "./client"
import type { Employee, EmployeeNote } from "./db-functions"

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

// Función para obtener una nota de empleado
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

// Función para guardar o actualizar una nota de empleado
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

// Función para eliminar una nota de empleado
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

// Función para agregar un empleado
export async function addEmployee(employee: {
  office_id: string
  name: string
  position: string
  email?: string
  phone?: string
  active?: boolean
}): Promise<Employee> {
  const supabase = createClientSupabaseClient()

  // Asegurarse de que el empleado esté activo por defecto
  const employeeData = {
    ...employee,
    active: employee.active !== undefined ? employee.active : true,
  }

  const { data, error } = await supabase.from("employees").insert(employeeData).select().single()

  if (error) {
    console.error("Error al agregar empleado:", error)
    throw error
  }

  if (!data) {
    throw new Error("No se recibieron datos del empleado guardado")
  }

  return data
}

// Función para agregar múltiples empleados
export async function addMultipleEmployees(
  employees: Array<{
    office_id: string
    name: string
    position: string
    email?: string
    phone?: string
    active?: boolean
  }>,
): Promise<Employee[]> {
  const supabase = createClientSupabaseClient()

  // Asegurarse de que todos los empleados estén activos por defecto
  const employeesData = employees.map((emp) => ({
    ...emp,
    active: emp.active !== undefined ? emp.active : true,
  }))

  const { data, error } = await supabase.from("employees").insert(employeesData).select()

  if (error) {
    console.error("Error al agregar múltiples empleados:", error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error("No se recibieron datos de los empleados guardados")
  }

  return data
}

// Función para obtener la asistencia de un empleado
export async function getEmployeeAttendance(employeeId: string, month: number, year: number): Promise<Attendance[]> {
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

// Vamos a mejorar la función saveAttendance para asegurar que se guarden correctamente las horas extras

// Buscar la función saveAttendance y reemplazarla con esta versión mejorada:
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

  // Preparar los datos a guardar, incluyendo horas extras si corresponde
  const dataToSave = {
    day_type_id: attendance.day_type_id,
    updated_at: new Date().toISOString(),
    ...(attendance.day_type_id === "overtime" && attendance.extra_hours !== undefined
      ? { extra_hours: attendance.extra_hours }
      : {}),
  }

  console.log("Guardando asistencia:", {
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
