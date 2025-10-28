# Configuración de Variables de Entorno para Netlify

## Variables de Entorno Requeridas

Para que el deploy en Netlify funcione correctamente, necesitas configurar las siguientes variables de entorno:

### En Netlify Dashboard:

1. Ve a tu sitio en Netlify
2. Navega a: **Site settings → Build & deploy → Environment variables**
3. Agrega las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

### Cómo obtener los valores de Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings → API**
3. Copia los valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Para desarrollo local:

1. Copia `.env.example` a `.env.local`
2. Llena los valores reales de tu proyecto Supabase

```bash
cp .env.example .env.local
# Edita .env.local con tus valores reales
```

## Notas importantes:

- Las variables `NEXT_PUBLIC_*` son públicas y se incluyen en el bundle del cliente
- Nunca pongas claves secretas en variables `NEXT_PUBLIC_*`
- El archivo `.env.local` NO debe subirse a git (está en .gitignore)