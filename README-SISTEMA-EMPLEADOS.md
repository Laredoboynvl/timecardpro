# Sistema de Gestión de Empleados - Actualización

## 📋 Resumen de Cambios

Se ha implementado un sistema completo de captura manual de empleados con las siguientes mejoras:

### ✨ Nuevas Características

1. **Formulario de Captura Mejorado**
   - Nombre completo del empleado
   - Número de empleado (autogenerado si no se especifica)
   - Fecha de ingreso con calendario visual
   - Campo de comentarios para notas adicionales
   - Etiqueta automática de oficina en el nombre

2. **Separación de Datos por Oficina**
   - Cada empleado se vincula automáticamente a su oficina
   - Tag automático agregado al nombre (ej: "Luis Acuña NLA")
   - Los empleados solo son visibles en su oficina respectiva
   - Almacenamiento separado por código de oficina

3. **Interfaz Mejorada**
   - Vista de lista con detalles completos
   - Búsqueda en tiempo real
   - Visualización de años de servicio
   - Badges con código de oficina
   - Sistema de pestañas (Lista / Nuevo Empleado)

## 🗄️ Cambios en la Base de Datos

### Archivo: `supabase-employees-update.sql`

```sql
-- Nuevos campos agregados a la tabla employees:
- employee_number: VARCHAR(50) - Número único por empleado
- hire_date: DATE - Fecha de ingreso
- employee_comments: TEXT - Comentarios adicionales
- office_tag: VARCHAR(10) - Tag de la oficina (TIJ, NLA, etc.)

-- Funcionalidades automáticas:
- Generación de números de empleado: TIJ-0001, NLA-0002, etc.
- Tag automático agregado al nombre
- Índices para búsquedas optimizadas
- Trigger para agregar metadata automáticamente
```

### Formato de Número de Empleado

```
[CÓDIGO_OFICINA]-[NÚMERO_SECUENCIAL]

Ejemplos:
- TIJ-0001 (Tijuana, empleado 1)
- NLA-0023 (Nuevo Laredo, empleado 23)
- MTY-0145 (Monterrey, empleado 145)
```

## 📁 Archivos Creados/Modificados

### 1. Nuevos Componentes

#### `components/employee-form.tsx`
Formulario completo de captura con:
- Validación de campos requeridos
- Calendario para fecha de ingreso
- Generación automática de número de empleado
- Tag automático de oficina
- Área de comentarios

**Props:**
```typescript
{
  officeCode: string      // Código de la oficina (TIJ, NLA, etc.)
  officeName: string      // Nombre completo de la oficina
  onSubmit: (data: EmployeeFormData) => void
  onCancel?: () => void
  isLoading?: boolean
}
```

### 2. Componentes Actualizados

#### `components/employee-list.tsx`
Mejoras:
- Tarjetas expandidas con más información
- Mostrar número de empleado con icono
- Fecha de ingreso y años de servicio
- Comentarios del empleado
- Badge con tag de oficina

#### `app/oficina/[officeId]/empleados/page.tsx`
Características:
- Sistema de pestañas (Lista / Nuevo)
- Búsqueda en tiempo real
- Almacenamiento en localStorage por oficina
- Contador de empleados
- Estados vacíos mejorados

### 3. Tipos Actualizados

#### `lib/types/auth.ts`
```typescript
export interface Office {
  id: string
  name: string
  code: string
  city?: string
  country?: string
  // ... otros campos
}

export const OFFICES: Office[] = [
  { 
    id: 'tij-001', 
    code: 'TIJ', 
    name: 'Tijuana', 
    city: 'Tijuana, BC', 
    country: 'México' 
  },
  // ... 9 oficinas más
]
```

### 4. Dashboard Actualizado

#### `app/dashboard/[office]/page.tsx`
Cambios en los nombres de botones:
- ~~"Lista de Empleados"~~ → **"Empleados"**
- ~~"Horarios"~~ → **"Días Laborables"**

## 💾 Almacenamiento de Datos

### LocalStorage

Los empleados se guardan en localStorage con la siguiente estructura:

```javascript
// Clave: employees_[CÓDIGO_OFICINA]
// Ejemplo: employees_TIJ

[
  {
    id: "uuid-v4",
    name: "Luis Acuña NLA",           // Incluye tag de oficina
    position: "Operador",
    employee_number: "NLA-0001",
    hire_date: "2024-01-15",
    employee_comments: "Turno matutino",
    office_tag: "NLA"
  },
  // ... más empleados
]
```

### Separación por Oficina

Cada oficina tiene su propio almacenamiento independiente:

```
localStorage:
  ├── employees_TIJ  (Empleados de Tijuana)
  ├── employees_NLA  (Empleados de Nuevo Laredo)
  ├── employees_MTY  (Empleados de Monterrey)
  └── ... (8 oficinas más)
```

## 🎨 Características de UI/UX

### 1. Formulario de Empleados
- ✅ Validación en tiempo real
- ✅ Mensajes de error claros
- ✅ Calendario visual para fechas
- ✅ Botón "Limpiar" para resetear
- ✅ Indicador de carga durante guardado
- ✅ Auto-focus en campos importantes

### 2. Lista de Empleados
- ✅ Tarjetas con diseño moderno
- ✅ Avatar con iniciales
- ✅ Badges coloridos para oficinas
- ✅ Iconos informativos (📱 teléfono, 📅 calendario, 💬 comentarios)
- ✅ Cálculo automático de antigüedad
- ✅ Hover effects y transiciones suaves

### 3. Búsqueda
- ✅ Búsqueda instantánea sin delay
- ✅ Filtra por: nombre, puesto, número de empleado
- ✅ Case-insensitive
- ✅ Estado vacío cuando no hay resultados

## 🔍 Ejemplos de Uso

### Agregar un Empleado

1. Click en pestaña "Nuevo Empleado"
2. Llenar campos requeridos:
   - Nombre completo: "Luis Acuña"
   - Puesto: "Operador"
   - Fecha de ingreso: Seleccionar del calendario
3. (Opcional) Agregar comentarios
4. Click en "Guardar Empleado"

**Resultado:**
```
Nombre guardado: "Luis Acuña NLA"
Número generado: "NLA-0001"
Tag agregado: "NLA"
```

### Buscar Empleados

En el campo de búsqueda, escribir cualquiera de:
- "Luis" → Encuentra por nombre
- "Operador" → Encuentra por puesto
- "NLA-0001" → Encuentra por número de empleado

## 📊 Datos Mostrados por Empleado

### Vista de Lista
```
┌─────────────────────────────────────────┐
│ [LA] Luis Acuña NLA            [NLA]    │
│      Operador                            │
│                                          │
│ # NLA-0001                               │
│ 📅 15 de enero, 2024 (8 meses)          │
│                                          │
│ 💬 Turno matutino, experiencia previa   │
│                                          │
│                          [✏️ Editar] [🗑️] │
└─────────────────────────────────────────┘
```

## 🚀 Próximos Pasos

Para implementar en producción:

1. **Ejecutar en Supabase:**
   ```bash
   # En el dashboard de Supabase, SQL Editor
   # Ejecutar el archivo: supabase-employees-update.sql
   ```

2. **Conectar con Supabase:**
   - Actualizar `.env.local` con credenciales válidas
   - Modificar `lib/supabase/db-functions.ts` para usar Supabase real
   - Eliminar código de demo/localStorage

3. **Migración de Datos:**
   - Exportar datos de localStorage
   - Importar a Supabase usando funciones de la API

## 🔐 Seguridad

### Políticas RLS (Row Level Security)

Agregar en Supabase:

```sql
-- Los empleados solo son visibles para su oficina
CREATE POLICY "Usuarios solo ven empleados de su oficina"
ON employees FOR SELECT
USING (office_id = auth.jwt() -> 'office_id');

-- Solo administradores pueden modificar empleados
CREATE POLICY "Solo admins pueden modificar empleados"
ON employees FOR ALL
USING (auth.jwt() -> 'role' = 'admin');
```

## 📝 Notas Técnicas

### Compatibilidad
- ✅ Next.js 15.2.4
- ✅ React 19
- ✅ TypeScript
- ✅ date-fns para manejo de fechas
- ✅ Responsive design (mobile-first)

### Rendimiento
- LocalStorage para prototipo (migrar a Supabase)
- Búsqueda optimizada con filtrado en cliente
- Lazy loading preparado para listas largas
- Índices en BD para consultas rápidas

### Accesibilidad
- ✅ Labels apropiados
- ✅ Indicadores visuales de campos requeridos
- ✅ Mensajes de error descriptivos
- ✅ Navegación por teclado
- ✅ ARIA labels donde corresponde

## 🐛 Solución de Problemas

### Empleado no aparece después de guardar
- Verificar que estás en la oficina correcta
- Revisar console.log para errores
- Verificar localStorage en DevTools

### Tag no se agrega al nombre
- El tag se agrega automáticamente al guardar
- Si ya existe en el nombre, no se duplica

### Número de empleado duplicado
- Se genera secuencialmente por oficina
- Si usas número manual, asegurar unicidad

## 📞 Soporte

Para preguntas o problemas:
1. Revisar console del navegador (F12)
2. Verificar estructura de datos en localStorage
3. Confirmar que la oficina está correctamente configurada

---

**Última actualización:** 15 de octubre de 2025
**Versión:** 1.0.0
