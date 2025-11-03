import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth/auth-service'
import { AuthSession, OfficeUser, Office } from '@/lib/types/auth'

interface UseAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: OfficeUser | null
  office: Office | null
  session: AuthSession | null
  isSPOC: boolean
  isRH: boolean
  isEmployee: boolean
  canModify: boolean
  canView: boolean
  roleLabel: string
  login: (credentials: { office_code: string; password: string; userType: 'spoc' | 'rh' | 'employee' }) => Promise<AuthSession>
  logout: () => void
  renewSession: () => void
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Función para cargar la sesión
    const loadSession = () => {
      try {
        const currentSession = authService.getCurrentSession()
        setSession(currentSession)
        setIsAuthenticated(currentSession !== null)
      } catch (error) {
        console.error('Error al cargar sesión:', error)
        setSession(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Cargar sesión inicial solo en el cliente
    if (typeof window !== 'undefined') {
      loadSession()
    } else {
      setIsLoading(false)
    }

    // Configurar listener para cambios de sesión (opcional)
    const checkSession = () => {
      if (typeof window !== 'undefined') {
        const currentSession = authService.getCurrentSession()
        setSession(currentSession)
        setIsAuthenticated(currentSession !== null)
      }
    }

    // Verificar sesión cada minuto
    const interval = setInterval(checkSession, 60000)

    return () => clearInterval(interval)
  }, [])

  const login = async (credentials: { office_code: string; password: string; userType: 'spoc' | 'rh' | 'employee' }) => {
    try {
      const newSession = await authService.login(credentials)
      setSession(newSession)
      setIsAuthenticated(true)
      return newSession
    } catch (error) {
      setSession(null)
      setIsAuthenticated(false)
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setSession(null)
    setIsAuthenticated(false)
  }

  const renewSession = () => {
    authService.renewSession()
    const currentSession = authService.getCurrentSession()
    setSession(currentSession)
  }

  return {
    isAuthenticated,
    isLoading,
    user: session?.user || null,
    office: session?.office || null,
    session,
    isSPOC: authService.isSPOC(),
    isRH: authService.isRH(),
    isEmployee: authService.isEmployee(),
    canModify: authService.canModify(),
    canView: authService.canView(),
    roleLabel: authService.getRoleLabel(),
    login,
    logout,
    renewSession
  }
}

// Hook para verificar permisos específicos
export function usePermissions() {
  const auth = useAuth()

  return {
    // Permisos de empleados - Solo SPOC
    canCreateEmployee: auth.isSPOC,
    canEditEmployee: auth.isSPOC,
    canDeleteEmployee: auth.isSPOC,
    
    // Permisos de asistencia - Solo SPOC
    canMarkAttendance: auth.isSPOC,
    canEditAttendance: auth.isSPOC,
    canDeleteAttendance: auth.isSPOC,
    
    // Permisos de vacaciones - Solo SPOC para gestión
    canManageVacations: auth.isSPOC,
    canCreateVacations: auth.isSPOC,
    canDeleteVacations: auth.isSPOC,
    
    // Permisos de visualización - Ambos
    canViewReports: auth.canView,
    canExportData: auth.canView,
    canViewEmployees: auth.canView,
    canViewAttendance: auth.canView,
    canViewVacations: auth.canView,
    canDownloadData: auth.canView,
    
    // Información de usuario
    userType: auth.isSPOC ? 'SPOC' : auth.isRH ? 'RH' : 'EMPLOYEE',
    isReadOnly: auth.isRH,
    isEmployee: auth.isEmployee,
    canRequestVacations: auth.isEmployee,
    canApproveVacations: auth.isSPOC
  }
}