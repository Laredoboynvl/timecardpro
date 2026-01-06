import type { PostgrestError } from "@supabase/supabase-js"
import { createClientSupabaseClient } from "./client"
import { mapOfficeIdToUUID } from "../utils/office-mapping"

export interface RoleSchedulePresetRecord {
  id: string
  office_id: string
  name: string
  shift_name: string
  start_time: string
  end_time: string
  schedule_matrix: unknown
  pp_supervisor_schedules?: unknown
  created_at: string
  updated_at: string
}

export interface RolePositionPresetRecord {
  id: string
  office_id: string
  name: string
  slots: unknown
  assignments?: unknown
  fixed_employee_ids?: unknown
  created_at: string
  updated_at: string
}

export interface RoleWorkstationTemplateRecord {
  id: string
  office_id: string
  name: string
  distribution: unknown
  created_at: string
  updated_at: string
}

export async function fetchRoleSchedulePresets(officeFrontendId: string): Promise<RoleSchedulePresetRecord[]> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)

  const { data, error } = await supabase
    .from("role_schedule_presets")
    .select("id, office_id, name, shift_name, start_time, end_time, schedule_matrix, pp_supervisor_schedules, created_at, updated_at")
    .eq("office_id", officeUuid)
    .order("updated_at", { ascending: false })

  if (error) {
    const typedError = error as PostgrestError & { status?: number }
    const tableMissing =
      typedError.code === "PGRST116" ||
      typedError.code === "PGRST205" ||
      typedError.code === "42P01"
    const permissionDenied = typedError.code === "42501" || typedError.status === 403 || typedError.code === "PGRST301"

    if (tableMissing) {
      return []
    }

    if (permissionDenied) {
      console.warn("Sin permisos para leer role_schedule_presets; devolviendo arreglo vacío")
      return []
    }

    console.error("Error al obtener configuraciones de horarios:", JSON.stringify(
      {
        code: typedError.code,
        status: typedError.status,
        message: typedError.message,
        details: typedError.details,
        hint: typedError.hint,
      },
      null,
      2,
    ))
    throw error
  }

  return data ?? []
}

export async function insertRoleSchedulePreset(
  officeFrontendId: string,
  preset: {
    name: string
    shiftName: string
    startTime: string
    endTime: string
    scheduleMatrix: unknown
    ppSupervisorSchedules?: string[]
  },
): Promise<RoleSchedulePresetRecord> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)
  const timestamp = new Date().toISOString()

  const payload = {
    office_id: officeUuid,
    name: preset.name,
    shift_name: preset.shiftName,
    start_time: preset.startTime,
    end_time: preset.endTime,
    schedule_matrix: JSON.parse(JSON.stringify(preset.scheduleMatrix ?? {})),
    pp_supervisor_schedules: preset.ppSupervisorSchedules ? JSON.parse(JSON.stringify(preset.ppSupervisorSchedules)) : null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  const { data, error } = await (supabase.from("role_schedule_presets") as any)
    .insert([payload])
    .select("id, office_id, name, shift_name, start_time, end_time, schedule_matrix, pp_supervisor_schedules, created_at, updated_at")
    .single()

  if (error) {
    console.error("Error al guardar configuración de horarios:", error)
    throw error
  }

  if (!data) {
    throw new Error("No se recibió la configuración de horarios guardada")
  }

  return data
}

export async function deleteRoleSchedulePreset(presetId: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase.from("role_schedule_presets").delete().eq("id", presetId)

  if (error) {
    console.error(`Error al eliminar configuración de horarios ${presetId}:`, error)
    throw error
  }
}

export async function fetchRolePositionPresets(officeFrontendId: string): Promise<RolePositionPresetRecord[]> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)

  const { data, error } = await supabase
    .from("role_position_presets")
    .select("id, office_id, name, slots, assignments, fixed_employee_ids, created_at, updated_at")
    .eq("office_id", officeUuid)
    .order("updated_at", { ascending: false })

  if (error) {
    const typedError = error as PostgrestError & { status?: number }
    const tableMissing =
      typedError.code === "PGRST116" ||
      typedError.code === "PGRST205" ||
      typedError.code === "42P01"
    const permissionDenied = typedError.code === "42501" || typedError.status === 403 || typedError.code === "PGRST301"

    if (tableMissing) {
      return []
    }

    if (permissionDenied) {
      console.warn("Sin permisos para leer role_position_presets; devolviendo arreglo vacío")
      return []
    }

    console.error("Error al obtener configuraciones de cupos:", JSON.stringify(
      {
        code: typedError.code,
        status: typedError.status,
        message: typedError.message,
        details: typedError.details,
        hint: typedError.hint,
      },
      null,
      2,
    ))
    throw error
  }

  return data ?? []
}

export async function insertRolePositionPreset(
  officeFrontendId: string,
  preset: { name: string; slots: unknown; assignments?: unknown; fixedEmployeeIds?: string[] },
): Promise<RolePositionPresetRecord> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)
  const timestamp = new Date().toISOString()

  const payload = {
    office_id: officeUuid,
    name: preset.name,
    slots: JSON.parse(JSON.stringify(preset.slots ?? {})),
    assignments: preset.assignments ? JSON.parse(JSON.stringify(preset.assignments)) : null,
    fixed_employee_ids: Array.isArray(preset.fixedEmployeeIds)
      ? JSON.parse(JSON.stringify(preset.fixedEmployeeIds))
      : null,
    created_at: timestamp,
    updated_at: timestamp,
  }

  const { data, error } = await (supabase.from("role_position_presets") as any)
    .insert([payload])
    .select("id, office_id, name, slots, assignments, fixed_employee_ids, created_at, updated_at")
    .single()

  if (error) {
    console.error("Error al guardar configuración de cupos:", error)
    throw error
  }

  if (!data) {
    throw new Error("No se recibió la configuración de cupos guardada")
  }

  return data
}

export async function deleteRolePositionPreset(presetId: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase.from("role_position_presets").delete().eq("id", presetId)

  if (error) {
    console.error(`Error al eliminar configuración de cupos ${presetId}:`, error)
    throw error
  }
}

export async function fetchRoleWorkstationTemplates(
  officeFrontendId: string,
): Promise<RoleWorkstationTemplateRecord[]> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)

  const { data, error } = await supabase
    .from("role_workstation_templates")
    .select("id, office_id, name, distribution, created_at, updated_at")
    .eq("office_id", officeUuid)
    .order("updated_at", { ascending: false })

  if (error) {
    const typedError = error as PostgrestError & { status?: number }
    const tableMissing =
      typedError.code === "PGRST116" ||
      typedError.code === "PGRST205" ||
      typedError.code === "42P01"
    const permissionDenied = typedError.code === "42501" || typedError.status === 403 || typedError.code === "PGRST301"

    if (tableMissing) {
      return []
    }

    if (permissionDenied) {
      console.warn("Sin permisos para leer role_workstation_templates; devolviendo arreglo vacío")
      return []
    }

    console.error(
      "Error al obtener plantillas de puestos operativos:",
      JSON.stringify(
        {
          code: typedError.code,
          status: typedError.status,
          message: typedError.message,
          details: typedError.details,
          hint: typedError.hint,
        },
        null,
        2,
      ),
    )
    throw error
  }

  return data ?? []
}

export async function insertRoleWorkstationTemplate(
  officeFrontendId: string,
  template: { name: string; distribution: unknown },
): Promise<RoleWorkstationTemplateRecord> {
  const supabase = createClientSupabaseClient()
  const officeUuid = mapOfficeIdToUUID(officeFrontendId)
  const timestamp = new Date().toISOString()

  const payload = {
    office_id: officeUuid,
    name: template.name,
    distribution: JSON.parse(JSON.stringify(template.distribution ?? {})),
    created_at: timestamp,
    updated_at: timestamp,
  }

  const { data, error } = await (supabase.from("role_workstation_templates") as any)
    .insert([payload])
    .select("id, office_id, name, distribution, created_at, updated_at")
    .single()

  if (error) {
    console.error("Error al guardar la plantilla de puestos operativos:", error)
    throw error
  }

  if (!data) {
    throw new Error("No se recibió la plantilla de puestos operativos guardada")
  }

  return data
}

export async function deleteRoleWorkstationTemplate(templateId: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase.from("role_workstation_templates").delete().eq("id", templateId)

  if (error) {
    console.error(`Error al eliminar la plantilla de puestos operativos ${templateId}:`, error)
    throw error
  }
}
