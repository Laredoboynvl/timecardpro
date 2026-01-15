#!/usr/bin/env tsx

/**
 * Ajusta manualmente el ciclo 2026 de Werner restando 5 dias adicionales
 * que fueron agregados por error. El script buscara al empleado por nombre
 * y luego actualizara el ciclo cuyo inicio corresponda al ano objetivo.
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

const TARGET_YEAR = 2026
const DAYS_TO_REMOVE = 5

async function resolveEnv() {
  // Cargar variables desde .env.local si esta disponible
  dotenv.config({ path: path.join(process.cwd(), ".env.local") })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return { url, key }
}

async function findWernerId(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, first_name, last_name, active, is_active")
    .or("name.ilike.%werner%,first_name.ilike.%werner%,last_name.ilike.%werner%")

  if (error) {
    throw new Error(`No se pudo buscar al empleado: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error("No se encontro ningun empleado que coincide con 'Werner'")
  }

  const activeMatches = data.filter((employee) => {
    const flag = (employee as any).active
    const legacyFlag = (employee as any).is_active
    return flag !== false && legacyFlag !== false
  })

  if (activeMatches.length === 1) {
    return activeMatches[0].id as string
  }

  if (activeMatches.length === 0) {
    throw new Error("Se encontraron coincidencias para 'Werner', pero todas estan inactivas")
  }

  console.log("Coincidencias encontradas:")
  activeMatches.forEach((employee) => {
    console.log(`- ${employee.name ?? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim()} (${employee.id})`)
  })

  throw new Error("Se encontraron multiples coincidencias activas para 'Werner'. Ajusta el script con el ID correcto.")
}

async function fixWernerCycle() {
  const { url, key } = await resolveEnv()
  const supabase = createClient(url, key)

  console.log("Iniciando correccion de ciclo para Werner")

  const employeeId = await findWernerId(supabase)
  console.log(`Empleado localizado: ${employeeId}`)

  const { data: cycles, error: cyclesError } = await supabase
    .from("vacation_cycles")
    .select("id, cycle_start_date, cycle_end_date, days_earned, days_used, days_available")
    .eq("employee_id", employeeId)
    .order("cycle_start_date", { ascending: true })

  if (cyclesError) {
    throw new Error(`No se pudieron leer los ciclos: ${cyclesError.message}`)
  }

  if (!cycles || cycles.length === 0) {
    throw new Error("El empleado no tiene ciclos registrados")
  }

  const targetCycle = cycles.find((cycle) => cycle.cycle_start_date.startsWith(`${TARGET_YEAR}-`))

  if (!targetCycle) {
    console.log("Ciclos disponibles:")
    cycles.forEach((cycle) => {
      console.log(`- ${cycle.cycle_start_date} -> ${cycle.cycle_end_date} | Disponibles: ${cycle.days_available}`)
    })
    throw new Error(`No se encontro un ciclo que inicie en ${TARGET_YEAR}`)
  }

  console.log(
    `Ciclo encontrado: ${targetCycle.cycle_start_date} -> ${targetCycle.cycle_end_date} | Earned: ${targetCycle.days_earned} | Available: ${targetCycle.days_available}`
  )

  const newDaysAvailable = Math.max(0, (targetCycle.days_available ?? 0) - DAYS_TO_REMOVE)
  const shouldAdjustEarned = (targetCycle.days_available ?? 0) === (targetCycle.days_earned ?? 0)
  const newDaysEarned = shouldAdjustEarned
    ? Math.max(targetCycle.days_used ?? 0, (targetCycle.days_earned ?? 0) - DAYS_TO_REMOVE)
    : targetCycle.days_earned

  const updatePayload: Record<string, number | string> = {
    days_available: newDaysAvailable,
    updated_at: new Date().toISOString(),
  }

  if (shouldAdjustEarned && typeof newDaysEarned === "number") {
    updatePayload.days_earned = newDaysEarned
  }

  console.log(
    `Ajuste aplicado: disponibles ${targetCycle.days_available} -> ${newDaysAvailable}` +
      (shouldAdjustEarned && typeof newDaysEarned === "number"
        ? ` | por ley ${targetCycle.days_earned} -> ${newDaysEarned}`
        : "")
  )

  const { error: updateError } = await supabase
    .from("vacation_cycles")
    .update(updatePayload)
    .eq("id", targetCycle.id)

  if (updateError) {
    throw new Error(`No se pudo actualizar el ciclo ${targetCycle.id}: ${updateError.message}`)
  }

  const { data: verification } = await supabase
    .from("vacation_cycles")
    .select("cycle_start_date, days_earned, days_used, days_available")
    .eq("id", targetCycle.id)
    .single()

  console.log("Ciclo actualizado correctamente")
  console.log("Estado final:", verification)
}

fixWernerCycle()
  .then(() => {
    console.log("Script finalizado")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error durante la correccion:", error)
    process.exit(1)
  })
