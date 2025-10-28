import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth/auth-service'
import { AuthSession, OfficeUser, Office } from '@/lib/types/auth'

interface UseAuthReturn {
  isAuthenticated: boolean
  user: OfficeUser | null
  office: Office | null
  session: AuthSession | null
  isSPOC: boolean
  isRH: boolean
  canModify: boolean
  canView: boolean
  roleLabel: string
  login: (credentials: { office_code: string; password: string; userType: 'spoc' | 'rh' }) => Promise<AuthSession>
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

  const login = async (credentials: { office_code: string; password: string; userType: 'spoc' | 'rh' }) => {
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
    isSPOC: authService.isSPOC(),
    isRH: authService.isRH(),
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
    
    // Permisos de vacaciones - Solo SPOC
    canManageVacations: auth.isSPOC,
    canApproveVacations: auth.isSPOC,
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
    userType: auth.isSPOC ? 'SPOC' : 'RH',
    isReadOnly: auth.isRH
  }
}