import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/oficina', '/settings']

// La página principal ahora es el login, así que no hay rutas de auth separadas

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Ya no hay rutas de autenticación separadas, la página principal es el login

  // Para rutas protegidas, verificamos la autenticación en el cliente
  // Este middleware solo maneja redirecciones básicas
  
  // Si es la raíz y hay una oficina en la URL, redirigir apropiadamente
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Para rutas protegidas, dejamos que el cliente maneje la lógica
  // ya que necesitamos acceso al localStorage para verificar la sesión
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}