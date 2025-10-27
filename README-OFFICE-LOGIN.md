# Sistema de Control de Asistencia - Timecard Pro

Sistema de control de asistencia con **login independiente por oficina**. Cada oficina maneja sus propios datos de empleados y asistencia de forma completamente separada.

## 🏢 Oficinas Disponibles

El sistema incluye 10 oficinas mexicanas preconfiguradas:

1. **Tijuana** (TIJ) - Tijuana, BC
2. **Ciudad Juárez** (CJU) - Ciudad Juárez, CHIH
3. **Nuevo Laredo** (NLA) - Nuevo Laredo, TAMPS
4. **Nogales** (NOG) - Nogales, SON
5. **Monterrey** (MTY) - Monterrey, NL
6. **Matamoros** (MAT) - Matamoros, TAMPS
7. **Hermosillo** (HMO) - Hermosillo, SON
8. **Guadalajara** (GDL) - Guadalajara, JAL
9. **Ciudad de México** (CDM) - CDMX
10. **Mérida** (MER) - Mérida, YUC

## 🚀 Configuración Inicial

### 1. Clonar el repositorio
```bash
git clone [url-del-repositorio]
cd timecard-pro
```

### 2. Instalar dependencias
```bash
npm install --legacy-peer-deps
```

### 3. Configurar variables de entorno
Crear/actualizar el archivo `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# JWT Secret
JWT_SECRET=tu_jwt_secret_muy_seguro
NEXTAUTH_SECRET=tu_clave_secreta_muy_segura

# Environment
NODE_ENV=development
```

### 4. Configurar la base de datos en Supabase

#### Paso 1: Ejecutar el esquema principal
En el SQL Editor de Supabase, ejecuta el contenido del archivo:
```
supabase-schema.sql
```

#### Paso 2: Ejecutar la actualización para login por oficina
Después del esquema principal, ejecuta:
```
supabase-office-login-update.sql
```

### 5. Ejecutar la aplicación
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🔐 Sistema de Autenticación

### Credenciales por Defecto
- **Usuario:** `admin`
- **Contraseña:** `admin123`

Estas credenciales funcionan para **TODAS las oficinas**.

### Flujo de Autenticación
1. **Selección de Oficina** (`/`) - Página principal con lista de oficinas
2. **Login Individual** (`/login/[oficina]`) - Login específico por oficina
3. **Dashboard** (`/dashboard/[oficina]`) - Panel de control post-autenticación
4. **Gestión de Asistencia** (`/oficina/[codigo]`) - Sistema principal de asistencia

### Separación de Datos
- Cada oficina tiene su propia base de usuarios
- Los datos de empleados están completamente separados
- Las asistencias son independientes por oficina
- Los reportes y configuraciones son específicos por oficina

## 📱 Estructura de la Aplicación

```
/                           # Selección de oficinas
/login/[oficina]           # Login individual (ej: /login/tij)
/dashboard/[oficina]       # Dashboard post-login (ej: /dashboard/tij)
/oficina/[codigo]          # Sistema de asistencia (ej: /oficina/TIJ)
/oficina/[codigo]/empleados # Gestión de empleados
/oficina/[codigo]/reportes  # Reportes de asistencia
/oficina/[codigo]/horarios  # Configuración de horarios (solo admin)
```

## 🛠️ Funcionalidades Principales

### ✅ Implementado
- **Login independiente por oficina**
- **Gestión de empleados por oficina**
- **Sistema de asistencia con calendario interactivo**
- **Múltiples tipos de día** (Regular, Vacaciones, Enfermedad, etc.)
- **Días inhábiles configurables**
- **Exportación a PDF/HTML**
- **Sistema de notas por empleado**
- **Carga masiva de empleados via CSV**
- **Bloqueo/desbloqueo de meses**
- **Roles de usuario** (Admin, Manager, Supervisor)

### 🔧 Configuración Adicional

#### Crear usuarios adicionales
```sql
INSERT INTO office_users (office_id, username, password_hash, role, full_name, email)
VALUES (
  (SELECT id FROM offices WHERE code = 'TIJ'),
  'supervisor1',
  crypt('password123', gen_salt('bf')),
  'supervisor',
  'Supervisor Tijuana',
  'supervisor@tijuana.com'
);
```

#### Cambiar contraseñas
```sql
UPDATE office_users 
SET password_hash = crypt('nueva_contraseña', gen_salt('bf'))
WHERE username = 'admin' AND office_id = (SELECT id FROM offices WHERE code = 'TIJ');
```

## 🔒 Seguridad

- **Contraseñas encriptadas** con bcrypt
- **Sesiones con expiración** (8 horas por defecto)
- **Row Level Security (RLS)** habilitado en Supabase
- **Separación completa de datos por oficina**
- **Validación de roles y permisos**

## 📊 Base de Datos

### Tablas Principales
- `offices` - Información de oficinas
- `office_users` - Usuarios por oficina (login)
- `employees` - Empleados por oficina
- `attendance` - Registros de asistencia
- `work_schedules` - Horarios de trabajo
- `non_working_days` - Días inhábiles
- `employee_notes` - Notas de empleados

### Funciones de Base de Datos
- `verify_office_credentials()` - Verificación de login
- `update_last_login()` - Actualización de último acceso
- `get_office_dashboard_data()` - Datos del dashboard

## 🚧 Próximos Desarrollos

- [ ] Integración con sistemas de nómina
- [ ] Reportes avanzados con gráficos
- [ ] Notificaciones push
- [ ] App móvil
- [ ] Integración con relojes checadores
- [ ] Backup automático de datos

## 📞 Soporte

Para soporte técnico o configuración adicional, contacta al equipo de desarrollo.

---

**Timecard Pro** - Sistema de Control de Asistencia con Separación por Oficina