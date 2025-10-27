# ✅ CHECKLIST DE IMPLEMENTACIÓN - Sistema de Vacaciones

## 📋 Guía Paso a Paso para Activar el Sistema

---

## FASE 1: PREPARACIÓN DE BASE DE DATOS

### ⬜ 1.1 Abrir Supabase Dashboard
- [ ] Ir a https://app.supabase.com
- [ ] Seleccionar tu proyecto
- [ ] Verificar que estás en el proyecto correcto

### ⬜ 1.2 Abrir SQL Editor
- [ ] En el menú lateral, hacer clic en "SQL Editor"
- [ ] Crear un nuevo query

### ⬜ 1.3 Ejecutar Script SQL
- [ ] Abrir archivo: `supabase-vacations-schema.sql`
- [ ] Copiar TODO el contenido del archivo
- [ ] Pegar en el SQL Editor de Supabase
- [ ] Hacer clic en el botón "Run" (▶️)
- [ ] Esperar a que termine la ejecución (10-15 segundos)

### ⬜ 1.4 Verificar Creación de Tablas
```sql
-- Ejecutar este query en SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vacation%';
```

**Resultado esperado:**
```
vacation_requests
vacation_cycles
```

### ⬜ 1.5 Verificar Estructura de vacation_requests
```sql
-- Ejecutar este query
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vacation_requests'
ORDER BY ordinal_position;
```

**Debe mostrar:**
- id (uuid)
- employee_id (uuid)
- office_id (uuid)
- start_date (date)
- end_date (date)
- days_requested (integer)
- status (text)
- reason (text)
- approved_by (text)
- approved_at (timestamp with time zone)
- rejected_reason (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### ⬜ 1.6 Verificar Estructura de vacation_cycles
```sql
-- Ejecutar este query
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vacation_cycles'
ORDER BY ordinal_position;
```

**Debe mostrar:**
- id (uuid)
- employee_id (uuid)
- cycle_start_date (date)
- cycle_end_date (date)
- days_earned (integer)
- days_used (integer)
- days_available (integer)
- years_of_service (integer)
- is_expired (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### ⬜ 1.7 Verificar Índices
```sql
-- Ejecutar este query
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('vacation_requests', 'vacation_cycles');
```

**Debe incluir:**
- idx_vacation_requests_employee
- idx_vacation_requests_office
- idx_vacation_requests_status
- idx_vacation_requests_dates
- idx_vacation_cycles_employee
- idx_vacation_cycles_dates
- idx_vacation_cycles_expired

### ⬜ 1.8 Verificar Triggers
```sql
-- Ejecutar este query
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('vacation_requests', 'vacation_cycles');
```

**Debe incluir:**
- trigger_vacation_requests_updated_at
- trigger_vacation_cycles_updated_at
- trigger_check_vacation_cycle_expiration

### ⬜ 1.9 Verificar Vista
```sql
-- Ejecutar este query
SELECT * FROM vacation_summary LIMIT 5;
```

**Debe ejecutarse sin errores** (puede estar vacía si no hay empleados)

### ⬜ 1.10 Verificar Función SQL
```sql
-- Probar la función
SELECT get_vacation_days_by_years(1) as year_1,
       get_vacation_days_by_years(5) as year_5,
       get_vacation_days_by_years(8) as year_8,
       get_vacation_days_by_years(15) as year_15,
       get_vacation_days_by_years(35) as year_35;
```

**Resultado esperado:**
```
year_1: 12
year_5: 20
year_8: 22
year_15: 24
year_35: 32
```

---

## ✅ FASE 1 COMPLETADA
**Si todos los checks anteriores pasaron, la base de datos está lista.**

---

## FASE 2: VERIFICACIÓN DEL CÓDIGO

### ⬜ 2.1 Verificar Archivo Backend
- [ ] Abrir: `lib/supabase/db-functions.ts`
- [ ] Buscar: `export interface VacationRequest`
- [ ] Buscar: `export interface VacationCycle`
- [ ] Buscar: `export async function getVacationRequests`
- [ ] Buscar: `export async function createVacationRequest`
- [ ] Buscar: `export function calculateVacationDays`

**✅ Todo encontrado = Backend OK**

### ⬜ 2.2 Verificar Archivo Frontend
- [ ] Abrir: `app/oficina/[officeId]/vacaciones/page.tsx`
- [ ] Buscar: `showDiasPorLey`
- [ ] Buscar: `showNewRequest`
- [ ] Buscar: `VACATION_DAYS_BY_LAW`
- [ ] Buscar: `handleCreateRequest`

**✅ Todo encontrado = Frontend OK**

### ⬜ 2.3 Verificar Imports en Frontend
```typescript
// Deben estar presentes:
import { getVacationRequests } from "@/lib/supabase/db-functions"
import { createVacationRequest } from "@/lib/supabase/db-functions"
import { calculateVacationDays } from "@/lib/supabase/db-functions"
import { calculateYearsOfService } from "@/lib/supabase/db-functions"
```

**✅ Todos presentes = Imports OK**

---

## ✅ FASE 2 COMPLETADA
**El código está en su lugar y correctamente estructurado.**

---

## FASE 3: PRUEBAS FUNCIONALES

### ⬜ 3.1 Iniciar Servidor de Desarrollo
```bash
# En la terminal, ejecutar:
npm run dev
# o
pnpm dev
# o
yarn dev
```

- [ ] Servidor inicia sin errores
- [ ] Ver mensaje: "Ready in X ms"
- [ ] URL disponible: http://localhost:3000

### ⬜ 3.2 Navegar a Página de Vacaciones
- [ ] Abrir navegador
- [ ] Ir a: `http://localhost:3000/oficina/[tu-codigo]/vacaciones`
  - Ejemplo: `http://localhost:3000/oficina/cdmx/vacaciones`
- [ ] La página carga correctamente
- [ ] No hay errores en consola del navegador (F12)

### ⬜ 3.3 Verificar Elementos de UI
- [ ] Se ven 4 tarjetas de estadísticas (Pendientes, Aprobadas, En Curso, Completadas)
- [ ] Se ve el campo de búsqueda
- [ ] Se ven los botones: "Días por Ley", "Filtros", "Exportar", "Nueva Solicitud"
- [ ] Se ve la tabla de solicitudes (puede estar vacía)

### ⬜ 3.4 Probar Botón "Días por Ley"
- [ ] Hacer clic en "Días por Ley"
- [ ] Se abre un modal
- [ ] El modal tiene título: "Días de Vacaciones por Ley"
- [ ] Se ve la tabla con años y días:
  - 1 año → 12 días
  - 2 años → 14 días
  - 3 años → 16 días
  - 4 años → 18 días
  - 5 años → 20 días
  - 6-10 años → 22 días
  - 11-15 años → 24 días
  - 16-20 años → 26 días
  - 21-25 años → 28 días
  - 26-30 años → 30 días
  - 31-35 años → 32 días
- [ ] Se ve el mensaje: "Los días de vacaciones están vigentes por 1 año y 6 meses..."
- [ ] El botón "Cerrar" funciona

### ⬜ 3.5 Probar Botón "Nueva Solicitud"
- [ ] Hacer clic en "Nueva Solicitud"
- [ ] Se abre un modal
- [ ] El modal tiene título: "Nueva Solicitud de Vacaciones"
- [ ] Se ven los campos:
  - Dropdown "Empleado" con asterisco rojo (*)
  - Input "Fecha de inicio" con asterisco rojo (*)
  - Input "Fecha de fin" con asterisco rojo (*)
  - Textarea "Motivo (opcional)"
- [ ] Botones "Cancelar" y "Crear Solicitud" presentes

### ⬜ 3.6 Probar Dropdown de Empleados
- [ ] Hacer clic en dropdown "Empleado"
- [ ] Se abre la lista de empleados
- [ ] Cada empleado muestra:
  - Nombre
  - Años de servicio
  - Días por año
  - Ejemplo: "Juan Pérez | 3 años de servicio • 16 días por año"
- [ ] Seleccionar un empleado funciona

**Si no hay empleados:**
- [ ] Debe mostrar: "No hay empleados disponibles"
- [ ] Ir a la sección de Empleados y crear al menos uno

### ⬜ 3.7 Probar Selección de Fechas
- [ ] Seleccionar fecha de inicio
- [ ] El campo se llena correctamente
- [ ] Seleccionar fecha de fin
- [ ] El campo se llena correctamente
- [ ] Aparece mensaje: "Días solicitados: X"
- [ ] El número de días es correcto (fin - inicio + 1)

### ⬜ 3.8 Probar Validaciones
#### Test A: Campos vacíos
- [ ] Dejar campos vacíos
- [ ] Hacer clic en "Crear Solicitud"
- [ ] Aparece toast rojo: "Campos incompletos"

#### Test B: Fecha inválida
- [ ] Seleccionar fecha inicio: 2024-01-20
- [ ] Seleccionar fecha fin: 2024-01-15 (anterior)
- [ ] Hacer clic en "Crear Solicitud"
- [ ] Aparece toast rojo: "Fechas inválidas"

### ⬜ 3.9 Crear Solicitud de Prueba
- [ ] Llenar formulario completo:
  - Empleado: Seleccionar uno
  - Fecha inicio: Fecha válida
  - Fecha fin: Fecha válida (posterior al inicio)
  - Motivo: "Prueba del sistema"
- [ ] Hacer clic en "Crear Solicitud"
- [ ] Aparece toast verde: "Solicitud de X días creada exitosamente"
- [ ] El modal se cierra automáticamente
- [ ] La nueva solicitud aparece en la tabla
- [ ] Los campos del formulario se limpian

### ⬜ 3.10 Verificar Solicitud Creada
- [ ] En la tabla, localizar la solicitud recién creada
- [ ] Verificar que muestra:
  - Nombre del empleado
  - Avatar con iniciales
  - Años de servicio y días por año
  - Fechas formateadas correctamente
  - Badge con días solicitados
  - Badge amarillo "Pendiente"
  - Botones "Ver", "Aprobar", "Rechazar"

### ⬜ 3.11 Verificar Estadísticas
- [ ] Tarjeta "Pendientes" muestra: 1
- [ ] Tarjeta "Aprobadas" muestra: 0
- [ ] Tarjeta "En Curso" muestra: 0
- [ ] Tarjeta "Completadas" muestra: 0

### ⬜ 3.12 Probar Búsqueda
- [ ] Escribir nombre del empleado en buscador
- [ ] La tabla filtra mostrando solo esa solicitud
- [ ] Borrar búsqueda
- [ ] La tabla muestra todas las solicitudes nuevamente

### ⬜ 3.13 Probar Botón "Ver"
- [ ] Hacer clic en botón "Ver"
- [ ] (Actualmente solo es visual, funcionalidad futura)

### ⬜ 3.14 Probar Botón "Aprobar"
- [ ] Hacer clic en botón "Aprobar"
- [ ] El badge cambia de "Pendiente" a "Aprobada"
- [ ] El color cambia de amarillo a verde
- [ ] Los botones "Aprobar" y "Rechazar" desaparecen
- [ ] Estadísticas actualizan: Pendientes -1, Aprobadas +1

### ⬜ 3.15 Crear Otra Solicitud y Rechazar
- [ ] Crear una segunda solicitud
- [ ] Hacer clic en "Rechazar"
- [ ] El badge cambia a "Rechazada" (rojo)
- [ ] Los botones desaparecen
- [ ] Estadísticas actualizan

---

## ✅ FASE 3 COMPLETADA
**Todas las funcionalidades principales están operando correctamente.**

---

## FASE 4: VERIFICACIÓN EN BASE DE DATOS

### ⬜ 4.1 Verificar Datos en vacation_requests
```sql
-- En Supabase SQL Editor
SELECT 
  vr.*,
  e.name as employee_name
FROM vacation_requests vr
JOIN employees e ON vr.employee_id = e.id
ORDER BY vr.created_at DESC
LIMIT 10;
```

**Verificar:**
- [ ] Aparecen las solicitudes creadas en las pruebas
- [ ] Los datos son correctos (fechas, días, status)
- [ ] created_at tiene timestamp válido
- [ ] approved_at se llena cuando status = 'approved'

### ⬜ 4.2 Verificar Triggers de updated_at
```sql
-- Actualizar una solicitud
UPDATE vacation_requests 
SET status = 'in_progress' 
WHERE id = 'tu-request-id';

-- Verificar que updated_at cambió
SELECT id, status, created_at, updated_at 
FROM vacation_requests 
WHERE id = 'tu-request-id';
```

**Verificar:**
- [ ] updated_at es diferente a created_at
- [ ] updated_at es más reciente

### ⬜ 4.3 Probar Función SQL
```sql
-- Probar con diferentes valores
SELECT 
  1 as years,
  get_vacation_days_by_years(1) as days
UNION ALL
SELECT 3, get_vacation_days_by_years(3)
UNION ALL
SELECT 7, get_vacation_days_by_years(7)
UNION ALL
SELECT 12, get_vacation_days_by_years(12)
UNION ALL
SELECT 25, get_vacation_days_by_years(25)
UNION ALL
SELECT 40, get_vacation_days_by_years(40);
```

**Resultado esperado:**
```
1 → 12
3 → 16
7 → 22
12 → 24
25 → 28
40 → 32
```

---

## ✅ FASE 4 COMPLETADA
**Los datos se están guardando correctamente en la base de datos.**

---

## FASE 5: PRUEBAS AVANZADAS (OPCIONAL)

### ⬜ 5.1 Crear Ciclo Vacacional Manual
```sql
INSERT INTO vacation_cycles (
  employee_id,
  cycle_start_date,
  cycle_end_date,
  days_earned,
  days_used,
  days_available,
  years_of_service,
  is_expired
) VALUES (
  'tu-employee-id',
  '2024-01-01',
  '2025-07-01',
  16,
  0,
  16,
  3,
  FALSE
);
```

- [ ] Insert exitoso
- [ ] Ciclo aparece en la tabla

### ⬜ 5.2 Verificar Constraint de Fechas
```sql
-- Esto DEBE fallar
INSERT INTO vacation_requests (
  employee_id,
  office_id,
  start_date,
  end_date,
  days_requested,
  status
) VALUES (
  'tu-employee-id',
  'tu-office-id',
  '2024-01-20',
  '2024-01-15', -- Anterior al inicio
  5,
  'pending'
);
```

**Resultado esperado:**
- [ ] Error: "new row for relation... violates check constraint"
- [ ] ✅ El constraint funciona correctamente

### ⬜ 5.3 Verificar Expiración Automática
```sql
-- Crear ciclo expirado
INSERT INTO vacation_cycles (
  employee_id,
  cycle_start_date,
  cycle_end_date,
  days_earned,
  days_used,
  days_available,
  years_of_service,
  is_expired
) VALUES (
  'tu-employee-id',
  '2020-01-01',
  '2021-07-01', -- Fecha en el pasado
  12,
  0,
  12,
  1,
  FALSE -- Lo ponemos FALSE para probar el trigger
);

-- Ver el resultado
SELECT * FROM vacation_cycles 
WHERE cycle_start_date = '2020-01-01';
```

**Verificar:**
- [ ] is_expired ahora es TRUE
- [ ] ✅ El trigger de expiración funciona

### ⬜ 5.4 Probar Vista vacation_summary
```sql
SELECT * FROM vacation_summary
ORDER BY years_of_service DESC;
```

**Verificar:**
- [ ] Muestra todos los empleados
- [ ] Calcula correctamente:
  - years_of_service
  - total_days_earned
  - total_days_used
  - total_days_available
  - active_cycles
  - pending_requests
  - approved_requests

---

## ✅ FASE 5 COMPLETADA
**Todas las funcionalidades avanzadas operan correctamente.**

---

## 🎉 CHECKLIST FINAL

### Resumen General
- [ ] ✅ Base de datos configurada
- [ ] ✅ Tablas creadas
- [ ] ✅ Índices y triggers funcionando
- [ ] ✅ Código backend implementado
- [ ] ✅ Código frontend implementado
- [ ] ✅ UI completamente funcional
- [ ] ✅ Validaciones operando
- [ ] ✅ Datos guardándose correctamente
- [ ] ✅ Estadísticas actualizándose
- [ ] ✅ Búsqueda funcionando

### Funcionalidades Core
- [ ] ✅ Botón "Días por Ley" con modal de tabla
- [ ] ✅ Botón "Nueva Solicitud" con formulario
- [ ] ✅ Dropdown de empleados con info detallada
- [ ] ✅ Cálculo automático de días
- [ ] ✅ Validación de fechas
- [ ] ✅ Crear solicitud → guarda en DB
- [ ] ✅ Aprobar/Rechazar → actualiza estado
- [ ] ✅ Estadísticas en tiempo real
- [ ] ✅ Búsqueda y filtrado

### Reglas de Negocio
- [ ] ✅ Cálculo correcto por años (12-32 días)
- [ ] ✅ Validación de fechas (fin > inicio)
- [ ] ✅ Estados de solicitud (5 estados)
- [ ] ✅ Soporte para múltiples ciclos
- [ ] ✅ Vigencia de 1.5 años por ciclo

---

## 📊 MÉTRICAS DE ÉXITO

Si todos los checks están marcados:

### ✅ SISTEMA 100% FUNCIONAL Y LISTO PARA PRODUCCIÓN

**Capacidades:**
- ✅ Gestionar solicitudes de vacaciones
- ✅ Calcular días por ley automáticamente
- ✅ Validar fechas y datos
- ✅ Aprobar/rechazar solicitudes
- ✅ Ver estadísticas en tiempo real
- ✅ Buscar y filtrar
- ✅ Guardar todo en base de datos
- ✅ Cumplir con Ley Federal del Trabajo

---

## 🚀 PRÓXIMOS PASOS

Una vez completado este checklist:

1. **Documentar cualquier problema encontrado**
2. **Capacitar al equipo en el uso del sistema**
3. **Definir flujo de aprobación (¿quién aprueba?)**
4. **Considerar implementar mejoras futuras:**
   - Notificaciones por email
   - Calendario visual
   - Reportes en Excel/PDF
   - Ciclos automáticos en aniversarios
   - Dashboard con gráficas

---

## 📞 SOPORTE

**Archivos de Referencia:**
- `INSTRUCCIONES-VACACIONES.md` - Guía completa
- `RESUMEN-VACACIONES.md` - Resumen ejecutivo
- `EJEMPLOS-VACACIONES.md` - Ejemplos de uso
- `supabase-vacaciones-schema.sql` - Schema de DB

**Si algo no funciona:**
1. Revisar consola del navegador (F12)
2. Revisar logs de Supabase
3. Verificar que el SQL se ejecutó completo
4. Verificar conexión a Supabase

---

**Última Actualización:** ${new Date().toLocaleDateString('es-MX', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric' 
})}

**Estado:** 🎯 LISTO PARA VERIFICACIÓN
