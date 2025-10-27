# 🚀 Sistema de Control de Asistencia - Login Simplificado

Sistema de control de asistencia con **acceso simplificado por dropdown**. Una sola página de login para todas las oficinas con datos completamente independientes.

## 🎯 **Características del Sistema Simplificado**

### ✅ **Login Ultra Rápido**
- **Una sola página de login** (`/login`)
- **Dropdown con todas las oficinas**
- **Solo contraseña** (sin usuario)
- **Contraseña única:** `admin123` para todas las oficinas

### 🏢 **10 Oficinas Preconfiguradas**
| Código | Oficina | Ubicación |
|--------|---------|-----------|
| **TIJ** | Tijuana | Tijuana, BC |
| **CJU** | Ciudad Juárez | Ciudad Juárez, CHIH |
| **NLA** | Nuevo Laredo | Nuevo Laredo, TAMPS |
| **NOG** | Nogales | Nogales, SON |
| **MTY** | Monterrey | Monterrey, NL |
| **MAT** | Matamoros | Matamoros, TAMPS |
| **HMO** | Hermosillo | Hermosillo, SON |
| **GDL** | Guadalajara | Guadalajara, JAL |
| **CDM** | Ciudad de México | CDMX |
| **MER** | Mérida | Mérida, YUC |

## 🔄 **Flujo de Usuario Simplificado**

```
Página Principal (/) 
    ↓
[Clic en "Acceso al Sistema"]
    ↓
Login (/login)
    ↓ 
[Seleccionar Oficina + Contraseña]
    ↓
Dashboard (/dashboard/[oficina])
    ↓
Sistema de Asistencia (/oficina/[CODIGO])
```

## 🚀 **Instalación y Configuración**

### 1. **Instalar Dependencias**
```bash
npm install --legacy-peer-deps
```

### 2. **Configurar Variables de Entorno**
Archivo `.env.local`:
```env
# Supabase (opcional para demo)
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
SUPABASE_URL=tu_url_aqui
SUPABASE_ANON_KEY=tu_key_aqui

# JWT Secret
JWT_SECRET=tu_jwt_secret_seguro
NEXTAUTH_SECRET=tu_clave_secreta_segura

NODE_ENV=development
```

### 3. **Ejecutar la Aplicación**
```bash
npm run dev
```

**Aplicación disponible en:** `http://localhost:3001`

## 🔐 **Sistema de Autenticación**

### **Acceso Rápido**
1. **Ir a:** `http://localhost:3001`
2. **Hacer clic en:** "Acceso al Sistema"  
3. **Seleccionar oficina** del dropdown
4. **Contraseña:** `admin123`
5. **¡Listo!** 🎉

### **Características de Seguridad**
- ✅ Sesión con **expiración de 8 horas**
- ✅ **Datos completamente separados** por oficina
- ✅ **Autenticación local** (no requiere base de datos para demo)
- ✅ **Almacenamiento seguro** en localStorage

## 📱 **Estructura de Páginas**

```
/                     # Página principal
/login               # Login único con dropdown  
/dashboard/[oficina] # Dashboard post-login
/oficina/[CODIGO]    # Sistema de asistencia
```

## 💡 **Ventajas del Sistema Simplificado**

### ⚡ **Super Rápido**
- Sin necesidad de recordar usuarios
- Dropdown visual con todas las oficinas
- Un solo campo de contraseña

### 🛡️ **Seguro y Separado** 
- Datos independientes por oficina
- Sesiones con expiración automática
- No hay cruzamiento de información

### 🎨 **Interfaz Intuitiva**
- Diseño moderno con Tailwind CSS
- Animaciones suaves
- Responsive para móviles
- Temas claro/oscuro

### 🔧 **Fácil Mantenimiento**
- Código limpio y organizado
- TypeScript para mejor desarrollo
- Hooks reutilizables
- Componentes modulares

## 🎮 **Cómo Usar**

### **1. Acceso Inicial**
```
http://localhost:3001 → Clic en "Acceso al Sistema"
```

### **2. Seleccionar Oficina**
```
Dropdown → Seleccionar oficina (ej: Tijuana)
```

### **3. Ingresar Contraseña**
```
Contraseña: admin123
```

### **4. Trabajar con el Sistema**
```
Dashboard → Gestión de Asistencia → ¡Listo!
```

## 🔨 **Personalización**

### **Cambiar la Contraseña**
Editar en: `lib/auth/auth-service.ts`
```typescript
const validPassword = 'tu_nueva_contraseña'
```

### **Agregar Más Oficinas**
Editar en: `lib/types/auth.ts`
```typescript
export const OFFICES = [
  // ... oficinas existentes
  { code: 'NUE', name: 'Nueva Oficina', city: 'Nueva Ciudad' }
]
```

### **Cambiar Tiempo de Sesión**
Editar en: `lib/auth/auth-service.ts`
```typescript
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 horas
```

## 📊 **Datos de Demostración**

El sistema incluye:
- ✅ **Datos de prueba** para cada oficina
- ✅ **Empleados de ejemplo** 
- ✅ **Tipos de asistencia** preconfigurados
- ✅ **Interfaz completamente funcional**

## 🌟 **Próximas Mejoras**

- [ ] Integración con base de datos real
- [ ] Múltiples roles de usuario
- [ ] Contraseñas individuales por oficina
- [ ] Sistema de recuperación de contraseña
- [ ] Auditoría de accesos
- [ ] Notificaciones push

## ⚡ **Demo Rápido**

1. **Abre:** `http://localhost:3001`
2. **Clic:** "Acceso al Sistema"
3. **Selecciona:** Cualquier oficina 
4. **Contraseña:** `admin123`
5. **¡Explora el sistema completo!** 🚀

---

**Sistema Timecard Pro** - Acceso Simplificado y Datos Independientes por Oficina