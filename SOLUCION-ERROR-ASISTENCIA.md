# Solución: Error al guardar registro de asistencia

## Problema Identificado
El error `Error: Error al guardar registro de asistencia: {}` ocurre porque las **tablas de asistencia no están creadas** en tu base de datos de Supabase.

## Diagnóstico Automático
El sistema ahora incluye un diagnóstico automático que aparecerá cuando accedas a `/oficina/[codigo]/asistencia` si las tablas no están configuradas.

## Soluciones

### Opción 1: Script Automático (RECOMENDADO)
1. **Ve a tu dashboard de Supabase**
   - Abre https://supabase.com
   - Selecciona tu proyecto

2. **Accede al SQL Editor**
   - En el menú lateral, busca "SQL Editor"
   - Haz clic en "New query"

3. **Ejecuta el script automático**
   - Copia TODO el contenido del archivo `setup-attendance-complete.sql`
   - Pégalo en el editor SQL
   - Haz clic en **"Run"** o presiona **Ctrl+Enter**

4. **Verifica los resultados**
   - El script mostrará mensajes de confirmación
   - Al final verás una tabla con el estado de las tablas
   - Deberías ver los tipos de asistencia configurados

### Opción 2: Script Original
Si prefieres usar el script original:
- Ejecuta el contenido completo de `05-create-attendance-tables.sql`

## Verificación Post-Instalación

### 1. Verificar en Supabase Dashboard
Ve a **Table Editor** y confirma que existen estas tablas:
- ✅ `attendance_types` - Tipos de asistencia (R, I, LM, etc.)
- ✅ `attendance_records` - Registros diarios de asistencia
- ✅ `monthly_attendance_comments` - Comentarios mensuales

### 2. Verificar en la Aplicación
1. Recarga la página de asistencia
2. Deberías ver el calendario de asistencia normal
3. Prueba marcar un día - NO debería mostrar errores

### 3. Tipos de Asistencia Incluidos
El script crea automáticamente estos tipos:
- **R** - Día Regular (8 horas)
- **I** - Incapacidad (0 horas)
- **LM** - Licencia Médica (0 horas) 
- **ANR** - Ausencia No Remunerada (0 horas)
- **AA** - Ausencia Administrativa (8 horas)
- **V** - Vacaciones (8 horas)
- **F** - Día Festivo (8 horas)
- **D** - Descanso (0 horas)

## Características del Sistema de Asistencia

### Funcionalidades Implementadas
✅ **Selección múltiple por arrastre** - Arrastra el cursor para marcar varios días
✅ **Tipos de asistencia personalizables** - Crea y edita tipos desde la interfaz
✅ **Cálculo automático de horas** - Cada tipo tiene un valor de horas asignado
✅ **Integración con vacaciones** - Días de vacaciones se marcan automáticamente
✅ **Resumen mensual** - Estadísticas y detalles por empleado
✅ **Comentarios mensuales** - Notas generales y por empleado
✅ **Sistema de permisos** - Control de acceso con Row Level Security

### Cómo Usar el Sistema
1. **Seleccionar tipo**: Usa el dropdown en el header para elegir un tipo de asistencia
2. **Marcar días individuales**: Haz clic en cualquier círculo del calendario
3. **Selección múltiple**: Mantén presionado y arrastra para marcar varios días
4. **Ver detalles**: Usa los botones "Ver Detalles del Mes" en cada empleado
5. **Agregar comentarios**: Botón "Comentarios" para notas mensuales
6. **Gestionar tipos**: Botón "Gestionar Tipos" para crear/editar tipos de asistencia

## Solución de Problemas Comunes

### Error de Foreign Key
Si ves errores de foreign key, verifica que:
- La tabla `employees` existe y tiene registros
- Los IDs de empleados son válidos UUIDs

### Error de Permisos
Si hay errores de permisos:
- Verifica que Row Level Security esté configurado
- Las políticas permiten SELECT, INSERT, UPDATE, DELETE

### Problemas de Rendimiento
- Los índices están incluidos en el script
- Para grandes volúmenes, considera optimizaciones adicionales

## Contacto
Si continúas teniendo problemas después de ejecutar el script, verifica:
1. Los logs de la consola del navegador
2. Los logs del SQL Editor en Supabase
3. Que tu usuario tenga permisos de administrador en Supabase