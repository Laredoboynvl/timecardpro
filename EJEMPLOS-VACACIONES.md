# 📖 Ejemplos de Uso - Sistema de Gestión de Vacaciones

## 🎯 Guía Rápida con Ejemplos Prácticos

---

## 1️⃣ CREAR UNA SOLICITUD DE VACACIONES

### Escenario: Juan Pérez quiere tomar vacaciones del 15 al 19 de Enero

**Pasos en la UI:**

1. **Navegar a Vacaciones**
   ```
   Dashboard → Oficina → Vacaciones
   URL: /oficina/cdmx/vacaciones (ejemplo)
   ```

2. **Abrir Modal**
   ```
   Clic en botón: "Nueva Solicitud"
   ```

3. **Llenar Formulario**
   ```
   Empleado: Juan Pérez (1 año de servicio - 12 días/año)
   Fecha inicio: 2024-01-15
   Fecha fin: 2024-01-19
   Días calculados: 5 días
   Motivo: "Vacaciones familiares"
   ```

4. **Crear Solicitud**
   ```
   Clic en: "Crear Solicitud"
   ✅ Toast: "Solicitud de 5 días creada exitosamente"
   ```

**Resultado:**
- Aparece en la tabla con estado "Pendiente"
- Estadísticas se actualizan (+1 pendiente)
- Se guarda en base de datos

---

## 2️⃣ CONSULTAR DÍAS POR LEY

### Escenario: Verificar cuántos días le corresponden a un empleado con 7 años de servicio

**Pasos en la UI:**

1. **Abrir Modal**
   ```
   Clic en botón: "Días por Ley"
   ```

2. **Consultar Tabla**
   ```
   Buscar fila: "6-10 años"
   Resultado: 22 días
   ```

3. **Leer Nota**
   ```
   "Los días de vacaciones están vigentes por 1 año y 6 meses desde la fecha de aniversario"
   ```

**Resultado:**
- El empleado con 7 años tiene derecho a 22 días por año
- Estos días expiran 1.5 años después de su aniversario

---

## 3️⃣ BUSCAR SOLICITUDES

### Escenario: Encontrar todas las solicitudes de "María"

**Pasos en la UI:**

1. **Usar Buscador**
   ```
   Input de búsqueda: "María"
   Enter
   ```

2. **Ver Resultados Filtrados**
   ```
   Tabla muestra solo solicitudes de empleados con "María" en el nombre
   ```

3. **Limpiar Búsqueda**
   ```
   Borrar texto del input
   Tabla muestra todas las solicitudes nuevamente
   ```

---

## 4️⃣ APROBAR/RECHAZAR SOLICITUD

### Escenario A: Aprobar Solicitud

**Pasos:**

1. **Localizar Solicitud Pendiente**
   ```
   Estado: Badge amarillo "Pendiente"
   ```

2. **Aprobar**
   ```
   Clic en botón: "Aprobar"
   ✅ Estado cambia a "Aprobada" (badge verde)
   ```

### Escenario B: Rechazar Solicitud

**Pasos:**

1. **Localizar Solicitud Pendiente**
   ```
   Estado: Badge amarillo "Pendiente"
   ```

2. **Rechazar**
   ```
   Clic en botón: "Rechazar"
   ❌ Estado cambia a "Rechazada" (badge rojo)
   ```

**Nota:** En versión futura, habrá modales de confirmación con campos adicionales.

---

## 5️⃣ CALCULAR DÍAS DE VACACIONES (Backend)

### Ejemplo 1: Empleado con 1 año de servicio

```typescript
import { calculateVacationDays } from '@/lib/supabase/db-functions'

const years = 1
const days = calculateVacationDays(years)
console.log(days) // Output: 12
```

### Ejemplo 2: Empleado con 8 años de servicio

```typescript
const years = 8
const days = calculateVacationDays(years)
console.log(days) // Output: 22 (rango 6-10 años)
```

### Ejemplo 3: Empleado con 35 años de servicio

```typescript
const years = 35
const days = calculateVacationDays(years)
console.log(days) // Output: 32 (máximo)
```

---

## 6️⃣ CALCULAR AÑOS DE SERVICIO (Backend)

### Ejemplo: Empleado contratado el 15 de Marzo de 2020

```typescript
import { calculateYearsOfService } from '@/lib/supabase/db-functions'

const hireDate = '2020-03-15'
const years = calculateYearsOfService(hireDate)
console.log(years) // Output: 4 (si estamos en 2024)
```

---

## 7️⃣ CREAR CICLO VACACIONAL (Backend)

### Ejemplo: Crear ciclo para empleado en su aniversario

```typescript
import { 
  upsertVacationCycle, 
  calculateYearsOfService,
  calculateVacationDays 
} from '@/lib/supabase/db-functions'

// Datos del empleado
const employee = {
  id: 'emp-123',
  hire_date: '2020-03-15'
}

// Calcular años de servicio
const years = calculateYearsOfService(employee.hire_date)
// years = 4

// Calcular días que le corresponden
const daysEarned = calculateVacationDays(years)
// daysEarned = 18

// Fecha de aniversario (15 de Marzo 2024)
const cycleStart = new Date('2024-03-15')

// Fecha de expiración (1.5 años después = 15 de Septiembre 2025)
const cycleEnd = new Date('2024-03-15')
cycleEnd.setMonth(cycleEnd.getMonth() + 18)

// Crear ciclo
await upsertVacationCycle({
  employee_id: employee.id,
  cycle_start_date: cycleStart.toISOString().split('T')[0],
  cycle_end_date: cycleEnd.toISOString().split('T')[0],
  days_earned: daysEarned,
  days_used: 0,
  days_available: daysEarned,
  years_of_service: years,
  is_expired: false
})
```

**Resultado en DB:**
```sql
vacation_cycles:
  id: 'auto-generated-uuid'
  employee_id: 'emp-123'
  cycle_start_date: '2024-03-15'
  cycle_end_date: '2025-09-15'
  days_earned: 18
  days_used: 0
  days_available: 18
  years_of_service: 4
  is_expired: false
```

---

## 8️⃣ OBTENER SOLICITUDES DE UNA OFICINA (Backend)

### Ejemplo: Listar todas las solicitudes de CDMX

```typescript
import { getVacationRequests } from '@/lib/supabase/db-functions'

const officeId = 'cdmx-office-id'
const requests = await getVacationRequests(officeId)

console.log(requests)
// Output:
// [
//   {
//     id: 'req-001',
//     employee_id: 'emp-123',
//     office_id: 'cdmx-office-id',
//     start_date: '2024-01-15',
//     end_date: '2024-01-19',
//     days_requested: 5,
//     status: 'pending',
//     reason: 'Vacaciones familiares',
//     created_at: '2024-01-01T10:00:00Z'
//   },
//   // ... más solicitudes
// ]
```

---

## 9️⃣ CREAR SOLICITUD PROGRAMÁTICAMENTE (Backend)

### Ejemplo: Crear solicitud de vacaciones para María

```typescript
import { createVacationRequest } from '@/lib/supabase/db-functions'

const newRequest = {
  employee_id: 'emp-456',
  office_id: 'cdmx-office-id',
  start_date: '2024-02-10',
  end_date: '2024-02-17',
  days_requested: 8,
  status: 'pending' as const,
  reason: 'Viaje familiar'
}

const created = await createVacationRequest(newRequest)

console.log(created)
// Output:
// {
//   id: 'req-002',
//   employee_id: 'emp-456',
//   office_id: 'cdmx-office-id',
//   start_date: '2024-02-10',
//   end_date: '2024-02-17',
//   days_requested: 8,
//   status: 'pending',
//   reason: 'Viaje familiar',
//   created_at: '2024-01-05T14:30:00Z'
// }
```

---

## 🔟 ACTUALIZAR ESTADO DE SOLICITUD (Backend)

### Ejemplo A: Aprobar Solicitud

```typescript
import { updateVacationRequestStatus } from '@/lib/supabase/db-functions'

const requestId = 'req-002'
const updated = await updateVacationRequestStatus(
  requestId,
  'approved',
  'admin-user-id' // usuario que aprueba
)

console.log(updated)
// Output:
// {
//   id: 'req-002',
//   status: 'approved',
//   approved_by: 'admin-user-id',
//   approved_at: '2024-01-06T09:15:00Z',
//   ...
// }
```

### Ejemplo B: Rechazar Solicitud

```typescript
const requestId = 'req-003'
const updated = await updateVacationRequestStatus(
  requestId,
  'rejected',
  'admin-user-id',
  'Conflicto con proyecto importante'
)

console.log(updated)
// Output:
// {
//   id: 'req-003',
//   status: 'rejected',
//   approved_by: 'admin-user-id',
//   rejected_reason: 'Conflicto con proyecto importante',
//   approved_at: '2024-01-06T09:20:00Z',
//   ...
// }
```

---

## 1️⃣1️⃣ CONSULTAR CICLOS DE UN EMPLEADO (Backend)

### Ejemplo: Ver todos los ciclos de Juan

```typescript
import { getEmployeeVacationCycles } from '@/lib/supabase/db-functions'

const employeeId = 'emp-123'
const cycles = await getEmployeeVacationCycles(employeeId)

console.log(cycles)
// Output:
// [
//   {
//     id: 'cycle-001',
//     employee_id: 'emp-123',
//     cycle_start_date: '2023-03-15',
//     cycle_end_date: '2024-09-15',
//     days_earned: 16,
//     days_used: 5,
//     days_available: 11,
//     years_of_service: 3,
//     is_expired: false
//   },
//   {
//     id: 'cycle-002',
//     employee_id: 'emp-123',
//     cycle_start_date: '2024-03-15',
//     cycle_end_date: '2025-09-15',
//     days_earned: 18,
//     days_used: 0,
//     days_available: 18,
//     years_of_service: 4,
//     is_expired: false
//   }
// ]
```

---

## 1️⃣2️⃣ QUERY DIRECTO EN SUPABASE

### Ejemplo 1: Ver todas las solicitudes pendientes

```sql
SELECT 
  vr.*,
  e.name as employee_name,
  e.hire_date
FROM vacation_requests vr
JOIN employees e ON vr.employee_id = e.id
WHERE vr.status = 'pending'
ORDER BY vr.created_at DESC;
```

### Ejemplo 2: Ver ciclos activos con días disponibles

```sql
SELECT 
  vc.*,
  e.name as employee_name
FROM vacation_cycles vc
JOIN employees e ON vc.employee_id = e.id
WHERE vc.is_expired = FALSE
  AND vc.days_available > 0
ORDER BY vc.days_available DESC;
```

### Ejemplo 3: Usar la vista de resumen

```sql
SELECT * FROM vacation_summary
WHERE active_cycles > 0
ORDER BY total_days_available DESC;
```

### Ejemplo 4: Calcular días con función SQL

```sql
SELECT 
  name,
  hire_date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))::INTEGER as years_of_service,
  get_vacation_days_by_years(
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))::INTEGER
  ) as vacation_days
FROM employees
WHERE active = TRUE
ORDER BY years_of_service DESC;
```

---

## 1️⃣3️⃣ FLUJO COMPLETO: DESDE CONTRATACIÓN HASTA VACACIONES

### Timeline de Juan Pérez

```typescript
// DÍA 1 (15 Marzo 2020): Contratación
const employee = await createEmployee({
  name: 'Juan Pérez',
  hire_date: '2020-03-15',
  // ... otros campos
})

// 1 AÑO DESPUÉS (15 Marzo 2021): Primer aniversario
// Crear primer ciclo vacacional
const years1 = calculateYearsOfService('2020-03-15') // 1
const days1 = calculateVacationDays(years1) // 12

await upsertVacationCycle({
  employee_id: employee.id,
  cycle_start_date: '2021-03-15',
  cycle_end_date: '2022-09-15', // +18 meses
  days_earned: 12,
  days_used: 0,
  days_available: 12,
  years_of_service: 1,
  is_expired: false
})

// 6 MESES DESPUÉS (15 Sept 2021): Solicita vacaciones
await createVacationRequest({
  employee_id: employee.id,
  start_date: '2021-10-01',
  end_date: '2021-10-05',
  days_requested: 5,
  status: 'pending'
})

// 1 DÍA DESPUÉS: Manager aprueba
await updateVacationRequestStatus('req-id', 'approved', 'manager-id')

// Actualizar ciclo (descontar días)
await upsertVacationCycle({
  id: 'cycle-id',
  days_used: 5,
  days_available: 7 // 12 - 5
})

// 2 AÑOS DESPUÉS (15 Marzo 2023): Tercer aniversario
const years3 = calculateYearsOfService('2020-03-15') // 3
const days3 = calculateVacationDays(years3) // 16

await upsertVacationCycle({
  employee_id: employee.id,
  cycle_start_date: '2023-03-15',
  cycle_end_date: '2024-09-15',
  days_earned: 16,
  days_used: 0,
  days_available: 16,
  years_of_service: 3,
  is_expired: false
})

// Ahora tiene 2 ciclos activos:
// - Ciclo 2021: 7 días disponibles (expira Sept 2022)
// - Ciclo 2023: 16 días disponibles (expira Sept 2024)
```

---

## 1️⃣4️⃣ MANEJO DE ERRORES

### Ejemplo: Validación de fechas

```typescript
// ❌ Error: Fecha fin antes de fecha inicio
try {
  await createVacationRequest({
    start_date: '2024-01-20',
    end_date: '2024-01-15', // Anterior al inicio
    days_requested: 5
  })
} catch (error) {
  // Error en base de datos por constraint
  console.error('Fechas inválidas')
}

// ✅ Correcto: Validar en frontend
const start = new Date('2024-01-15')
const end = new Date('2024-01-20')

if (end < start) {
  toast({
    title: "Fechas inválidas",
    description: "La fecha fin debe ser posterior a la fecha inicio",
    variant: "destructive"
  })
  return
}
```

### Ejemplo: Campos requeridos

```typescript
// ❌ Error: Campos faltantes
if (!selectedEmployeeId || !startDate || !endDate) {
  toast({
    title: "Campos incompletos",
    description: "Por favor completa todos los campos requeridos",
    variant: "destructive"
  })
  return
}

// ✅ Correcto: Todos los campos llenos
const newRequest = {
  employee_id: selectedEmployeeId,
  office_id: office.id,
  start_date: startDate,
  end_date: endDate,
  days_requested: calculateDaysRequested(startDate, endDate),
  status: 'pending'
}
```

---

## 🎯 CASOS DE USO COMUNES

### 1. Empleado nuevo cumple 1 año
**Acción:** Crear su primer ciclo vacacional automáticamente

### 2. Empleado solicita vacaciones
**Acción:** Verificar días disponibles, crear solicitud

### 3. Manager revisa solicitudes
**Acción:** Aprobar/rechazar basado en disponibilidad del equipo

### 4. Ciclo está por expirar
**Acción:** Enviar recordatorio al empleado (futuro)

### 5. Empleado toma vacaciones
**Acción:** Actualizar estado a "in_progress", descontar días

### 6. Vacaciones terminan
**Acción:** Actualizar estado a "completed"

### 7. Generar reporte anual
**Acción:** Consultar vista vacation_summary

---

## 📚 RECURSOS ADICIONALES

- **Documentación Completa:** `INSTRUCCIONES-VACACIONES.md`
- **Schema SQL:** `supabase-vacations-schema.sql`
- **Resumen Ejecutivo:** `RESUMEN-VACACIONES.md`
- **Código Backend:** `lib/supabase/db-functions.ts`
- **Código Frontend:** `app/oficina/[officeId]/vacaciones/page.tsx`

---

**Última Actualización:** ${new Date().toLocaleDateString('es-MX', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric' 
})}
