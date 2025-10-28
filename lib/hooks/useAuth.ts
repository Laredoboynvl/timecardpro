import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth/auth-service'
import { AuthSession, OfficeUser, Office } from '@/lib/types/auth'

interface UseAuthReturn {
  isAuthenticated: boolean
  user: OfficeUser | null
  office: Office | null
  session: AuthSession | null
  isAdmin: boolean
  isViewer: boolean
  canModify: boolean
  canView: boolean
  roleLabel: string
  login: (credentials: { office_code: string; password: string }) => Promise<AuthSession>
  logout: () => void
  renewSession: () => void
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Cargar sesión inicial
    const currentSession = authService.getCurrentSession()
    setSession(currentSession)
    setIsAuthenticated(currentSession !== null)

    // Configurar listener para cambios de sesión (opcional)
    const checkSession = () => {
      const currentSession = authService.getCurrentSession()
      setSession(currentSession)
      setIsAuthenticated(currentSession !== null)
    }

    // Verificar sesión cada minuto
    const interval = setInterval(checkSession, 60000)

    return () => clearInterval(interval)
  }, [])

  const login = async (credentials: { office_code: string; password: string }) => {
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
    user: session?.user || null,
    office: session?.office || null,
    session,
    isAdmin: authService.isAdmin(),
    isViewer: authService.isViewer(),
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
    canCreateEmployee: auth.canModify,
    canEditEmployee: auth.canModify,
    canDeleteEmployee: auth.canModify,
    canMarkAttendance: auth.canModify,
    canEditAttendance: auth.canModify,
    canDeleteAttendance: auth.canModify,
    canManageVacations: auth.canModify,
    canApproveVacations: auth.canModify,
    canViewReports: auth.canView,
    canExportData: auth.canView,
    canViewEmployees: auth.canView,
    canViewAttendance: auth.canView,
    canViewVacations: auth.canView
  }
}