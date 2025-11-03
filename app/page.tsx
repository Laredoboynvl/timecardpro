'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Lock, LogIn, Eye, EyeOff, MapPin, User, Building } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const router = useRouter()
  const { login, isAuthenticated, session, isLoading, user, office } = useAuth()

  const [selectedOffice, setSelectedOffice] = useState('')
  const [userType, setUserType] = useState<'spoc' | 'rh' | 'employee'>('spoc')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)

  // Redirigir si ya está autenticado - solo una vez
  useEffect(() => {
    if (!isLoading && isAuthenticated && session && !hasRedirected) {
      setHasRedirected(true)
      const officeCode = session.office?.code?.toLowerCase() || 'tij'
      
      // Redirigir según el tipo de usuario
      if (session.user.role === 'employee') {
        router.replace(`/empleado/${officeCode}`)
      } else {
        router.replace(`/dashboard/${officeCode}`)
      }
    }
  }, [isAuthenticated, router, session, isLoading, hasRedirected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!selectedOffice) {
        throw new Error('Por favor selecciona una oficina')
      }

      if (!password.trim()) {
        throw new Error('Por favor ingresa la contraseña')
      }

      await login({
        office_code: selectedOffice,
        password: password.trim(),
        userType: userType
      })

      // La redirección se maneja en el useEffect cuando cambia isAuthenticated
    } catch (err) {
      console.error('Error en login:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'Error desconocido. Por favor intenta nuevamente.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }



  // Obtener información de la oficina seleccionada
  const officeInfo = selectedOffice ? OFFICES.find(o => o.code === selectedOffice) : null

  // Mostrar pantalla de carga mientras se inicializa
  if (isLoading || (isAuthenticated && session)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            {isAuthenticated ? 'Redirigiendo...' : 'Inicializando sistema...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header azul marino */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <svg width="48" height="32" viewBox="0 0 48 32" className="rounded shadow-sm">
              {/* Franjas rojas y blancas */}
              <rect width="48" height="32" fill="#B22234"/>
              <rect y="2.46" width="48" height="2.46" fill="white"/>
              <rect y="7.38" width="48" height="2.46" fill="white"/>
              <rect y="12.3" width="48" height="2.46" fill="white"/>
              <rect y="17.22" width="48" height="2.46" fill="white"/>
              <rect y="22.14" width="48" height="2.46" fill="white"/>
              <rect y="27.06" width="48" height="2.46" fill="white"/>
              
              {/* Campo azul */}
              <rect width="19.2" height="17.22" fill="#3C3B6E"/>
              
              {/* Estrellas simplificadas */}
              <g fill="white">
                <circle cx="2.4" cy="2" r="0.8"/>
                <circle cx="7.2" cy="2" r="0.8"/>
                <circle cx="12" cy="2" r="0.8"/>
                <circle cx="16.8" cy="2" r="0.8"/>
                <circle cx="4.8" cy="4" r="0.8"/>
                <circle cx="9.6" cy="4" r="0.8"/>
                <circle cx="14.4" cy="4" r="0.8"/>
                <circle cx="2.4" cy="6" r="0.8"/>
                <circle cx="7.2" cy="6" r="0.8"/>
                <circle cx="12" cy="6" r="0.8"/>
                <circle cx="16.8" cy="6" r="0.8"/>
                <circle cx="4.8" cy="8" r="0.8"/>
                <circle cx="9.6" cy="8" r="0.8"/>
                <circle cx="14.4" cy="8" r="0.8"/>
                <circle cx="2.4" cy="10" r="0.8"/>
                <circle cx="7.2" cy="10" r="0.8"/>
                <circle cx="12" cy="10" r="0.8"/>
                <circle cx="16.8" cy="10" r="0.8"/>
                <circle cx="4.8" cy="12" r="0.8"/>
                <circle cx="9.6" cy="12" r="0.8"/>
                <circle cx="14.4" cy="12" r="0.8"/>
                <circle cx="2.4" cy="14" r="0.8"/>
                <circle cx="7.2" cy="14" r="0.8"/>
                <circle cx="12" cy="14" r="0.8"/>
                <circle cx="16.8" cy="14" r="0.8"/>
              </g>
            </svg>
            <h1 className="text-3xl font-bold">Sistema de Control de Asistencia</h1>
          </div>
          <p className="text-blue-200">Selecciona tu oficina e ingresa la contraseña</p>
        </div>
      </div>

      <div className="container mx-auto py-10 px-4">
        {/* Card de login */}
        <div className="max-w-lg mx-auto">
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-2xl font-bold">
                Iniciar Sesión
              </CardTitle>
              <CardDescription>
                Acceso rápido al sistema de asistencia
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Selector de tipo de usuario */}
                <div className="space-y-2">
                  <Label htmlFor="userType" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Tipo de Usuario
                  </Label>
                  <Select value={userType} onValueChange={(value: 'spoc' | 'rh' | 'employee') => setUserType(value)} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona tu tipo de usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spoc">
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <Lock className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">SPOC</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="rh">
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Recursos Humanos</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="employee">
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Empleado</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de oficina */}
                <div className="space-y-2">
                  <Label htmlFor="office" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Oficina
                  </Label>
                  <Select value={selectedOffice} onValueChange={setSelectedOffice} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona tu oficina" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFICES.map((office) => (
                        <SelectItem key={office.code} value={office.code}>
                          <div className="flex items-center gap-3 py-1">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{office.name}</div>
                              <div className="text-xs text-muted-foreground">{office.city}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo de contraseña */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa la contraseña"
                      required
                      disabled={isSubmitting}
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Mensaje de error */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Botón de login */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting || !selectedOffice || !password.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Footer informativo */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sistema de Control de Asistencia - Acceso Directo
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Cada oficina maneja sus datos de forma independiente y segura
          </p>
        </div>
      </div>
    </div>
  )
}
