# Calendario de Descansos de Supervisores 2026

## Sistema Implementado

Se ha implementado un **calendario fijo** de descansos de supervisores para todos los sábados de 2026. El sistema identifica automáticamente qué supervisores deben descansar cada sábado basándose en este calendario predefinido.

## Supervisores en el Sistema

El calendario incluye 4 supervisores:
- Vanessa
- Jose Angel
- Maria
- Viridiana

## Calendario de Descansos por Mes

### ENERO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 03/01/2026 | Vanessa, Jose Angel |
| 2 | 10/01/2026 | Maria, Viridiana |
| 3 | 17/01/2026 | Vanessa, Jose Angel |
| 4 | 24/01/2026 | Maria, Viridiana |
| 5 | 31/01/2026 | Vanessa, Jose Angel |

### FEBRERO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 07/02/2026 | Vanessa, Maria |
| 2 | 14/02/2026 | Jose Angel, Viridiana |
| 3 | 21/02/2026 | Vanessa, Maria |
| 4 | 28/02/2026 | Jose Angel, Viridiana |

### MARZO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 07/03/2026 | Vanessa, Viridiana |
| 2 | 14/03/2026 | Jose Angel, Maria |
| 3 | 21/03/2026 | Vanessa, Viridiana |
| 4 | 28/03/2026 | Jose Angel, Maria |

### ABRIL 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 04/04/2026 | Vanessa, Jose Angel |
| 2 | 11/04/2026 | Maria, Viridiana |
| 3 | 18/04/2026 | Vanessa, Jose Angel |
| 4 | 25/04/2026 | Maria, Viridiana |

### MAYO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 02/05/2026 | Vanessa, Maria |
| 2 | 09/05/2026 | Jose Angel, Viridiana |
| 3 | 16/05/2026 | Vanessa, Maria |
| 4 | 23/05/2026 | Jose Angel, Viridiana |
| 5 | 30/05/2026 | Vanessa, Maria |

### JUNIO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 06/06/2026 | Vanessa, Viridiana |
| 2 | 13/06/2026 | Jose Angel, Maria |
| 3 | 20/06/2026 | Vanessa, Viridiana |
| 4 | 27/06/2026 | Jose Angel, Maria |

### JULIO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 04/07/2026 | Vanessa, Jose Angel |
| 2 | 11/07/2026 | Maria, Viridiana |
| 3 | 18/07/2026 | Vanessa, Jose Angel |
| 4 | 25/07/2026 | Maria, Viridiana |

### AGOSTO 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 01/08/2026 | Vanessa, Maria |
| 2 | 08/08/2026 | Jose Angel, Viridiana |
| 3 | 15/08/2026 | Vanessa, Maria |
| 4 | 22/08/2026 | Jose Angel, Viridiana |
| 5 | 29/08/2026 | Vanessa, Maria |

### SEPTIEMBRE 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 05/09/2026 | Vanessa, Viridiana |
| 2 | 12/09/2026 | Jose Angel, Maria |
| 3 | 19/09/2026 | Vanessa, Viridiana |
| 4 | 26/09/2026 | Jose Angel, Maria |

### OCTUBRE 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 03/10/2026 | Vanessa, Jose Angel |
| 2 | 10/10/2026 | Maria, Viridiana |
| 3 | 17/10/2026 | Vanessa, Jose Angel |
| 4 | 24/10/2026 | Maria, Viridiana |
| 5 | 31/10/2026 | Vanessa, Jose Angel |

### NOVIEMBRE 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 07/11/2026 | Vanessa, Maria |
| 2 | 14/11/2026 | Jose Angel, Viridiana |
| 3 | 21/11/2026 | Vanessa, Maria |
| 4 | 28/11/2026 | Jose Angel, Viridiana |

### DICIEMBRE 2026
| Semana | Fecha Sábado | Supervisores que Descansan |
|--------|--------------|----------------------------|
| 1 | 05/12/2026 | Vanessa, Viridiana |
| 2 | 12/12/2026 | Jose Angel, Maria |
| 3 | 19/12/2026 | Vanessa, Viridiana |
| 4 | 26/12/2026 | Jose Angel, Maria |

## Cómo Funciona

1. **Identificación Automática**: El sistema busca en la base de datos empleados cuyos nombres coincidan con los supervisores del calendario (ignorando acentos y mayúsculas).

2. **Marcado de Descansos**: Los supervisores identificados son automáticamente marcados como "DESCANSO" el sábado correspondiente.

3. **Exclusión de Asignaciones**: Los supervisores que descansan **NO** serán asignados a ninguna unidad operativa el sábado (ni CAS, ni Consulado, ni Pick & Pack).

4. **Sistema de Respaldo**: Si no se encuentran coincidencias en el calendario fijo, el sistema utiliza el método anterior de equipos alternados (Team A / Team B).

## Rotación Semanal de Supervisores

### ✅ Funcionalidad Implementada (Automática)

El sistema ahora implementa **rotación automática completa** de supervisores:

#### Cómo Funciona

**Semana Actual**:
1. El usuario asigna supervisores normalmente a sus puestos
2. Al **generar el rol**, el sistema guarda automáticamente:
   - Quién fue asignado como **Supervisor de Consulado**
   - Fecha de la semana
   - Datos del supervisor

**Semana Siguiente**:
1. Al abrir el generador para la nueva semana, el sistema:
   - **Detecta automáticamente** al supervisor de Consulado anterior
   - Lo **asigna automáticamente** a **Supervisor CAS**
   - Le **configura el horario de apertura** (primer horario disponible)
   - Muestra notificación de éxito: "🔄 Rotación Automática Aplicada"

2. En el modal de puestos aparece un **indicador verde**:
   > 🔄 Rotación Automática Activa
   > 
   > [Nombre] fue automáticamente asignado a Supervisor CAS con horario de apertura porque trabajó en Consulado la semana anterior.

#### Características

✅ **Completamente automática** - No requiere intervención manual  
✅ **Persistente** - Guarda datos entre sesiones  
✅ **Validación inteligente** - Verifica que el supervisor siga activo  
✅ **Notificaciones claras** - Informa al usuario de cada acción  
✅ **Indicador visual** - Alert verde en el modal de puestos  
✅ **Horario garantizado** - Siempre asigna el primer horario (apertura)

### Ejemplo de Flujo Completo

**Semana 1 (06/01/2026 - 12/01/2026)**:
- Usuario asigna: Maria → Supervisor Consulado
- Usuario genera el rol
- Sistema guarda automáticamente: "Maria estuvo en Consulado"

**Semana 2 (13/01/2026 - 19/01/2026)**:
- Usuario abre generador de rol
- ✨ **Sistema automático**:
  - Asigna Maria → Supervisor CAS
  - Configura horario: 06:00 - 14:30 (primer horario)
  - Muestra notificación de éxito
- Usuario ve alerta verde confirmando la rotación
- Usuario asigna otro supervisor a Consulado (ej: Jose Angel)
- Usuario genera el rol
- Sistema guarda: "Jose Angel estuvo en Consulado"

**Semana 3 (20/01/2026 - 26/01/2026)**:
- Usuario abre generador de rol
- ✨ **Sistema automático**:
  - Asigna Jose Angel → Supervisor CAS (horario apertura)
  - Muestra notificación
- Y así continúa la rotación automáticamente

### Almacenamiento de Datos

**Storage Key**: `role-consulate-supervisor-rotation-{officeId}`

**Estructura guardada**:
```json
{
  "weekStartDate": "2026-01-06",
  "supervisorId": "uuid-del-supervisor",
  "supervisorName": "Maria Pérez",
  "savedAt": "2026-01-12T15:30:00.000Z"
}
```

### Configuración Técnica

El sistema realiza las siguientes acciones automáticamente:

1. **Asignación del puesto**:
   - Remueve al supervisor de `CONSULATE_SUPERVISOR` (si estaba ahí)
   - Lo agrega al inicio del array `CAS_SUPERVISOR` (prioridad)

2. **Configuración del horario**:
   - Configura `weeklySchedulePlan.CAS.supervisors` con índice `0`
   - El índice 0 apunta al primer horario en `scheduleMatrix.CAS.supervisors`
   - Resultado: El supervisor obtiene el horario más temprano (apertura)

3. **Validaciones**:
   - Verifica que el supervisor esté activo
   - Confirma que no sea la misma semana
   - Valida que el supervisor exista en la base de datos

### Desactivar la Rotación Automática

Si por alguna razón necesitas desactivar la rotación automática:

1. Abre las herramientas de desarrollador (F12)
2. Ve a `Application` → `Local Storage`
3. Busca la key: `role-consulate-supervisor-rotation-{officeId}`
4. Elimínala

### Implementación Manual (Respaldo)

Si deseas anular la rotación automática de una semana específica:

1. El sistema habrá asignado automáticamente al supervisor
2. Simplemente **reasigna manualmente** los supervisores como desees
3. Al generar el rol, se guardará la nueva configuración

## Notas Importantes

- ✅ El calendario está configurado para **todo el año 2026**
- ✅ Los nombres de supervisores se normalizan (sin acentos, mayúsculas/minúsculas)
- ✅ Si un supervisor tiene vacaciones, el sistema respeta las vacaciones sobre el calendario
- ⚠️ Para años posteriores a 2026, será necesario agregar un nuevo calendario
- 🔄 La rotación automática de supervisores Consulado→CAS está pendiente de implementación

## Actualizaciones Futuras

Para extender este sistema a otros años:
1. Agregar una nueva constante `SUPERVISOR_SATURDAY_REST_CALENDAR_2027`
2. Modificar la función `getSupervisorRestNamesForSaturday` para detectar el año
3. Seleccionar el calendario correspondiente según la fecha

---

**Fecha de Implementación**: 5 de enero de 2026  
**Archivo Principal**: `app/oficina/[officeId]/generador-rol/page.tsx`
