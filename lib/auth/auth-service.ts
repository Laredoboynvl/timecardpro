import { createClientSupabaseClient } from '@/lib/supabase/client'
import { LoginCredentials, AuthSession, OfficeUser, Office, OFFICES } from '@/lib/types/auth'

const AUTH_STORAGE_KEY = 'timecard_auth_session'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 horas en milisegundos

export class AuthService {
  private static instance: AuthService
  private currentSession: AuthSession | null = null

  private constructor() {
    this.loadSessionFromStorage()
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Autenticar usuario con credenciales de oficina (solo contraseña)
   */
  public async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      // Contraseñas y roles
      const adminPassword = 'csramexico2025'  // Acceso completo
      const readOnlyPassword = 'csrarh2025'   // Solo lectura
      
      let userRole = ''
      let userName = ''
      
      if (credentials.password === adminPassword) {
        userRole = 'admin'
        userName = 'Administrador'
      } else if (credentials.password === readOnlyPassword) {
        userRole = 'viewer'
        userName = 'Visualizador'
      } else {
        throw new Error('Contraseña incorrecta')
      }

      // Buscar información de la oficina
      const selectedOffice = OFFICES.find(office => office.code === credentials.office_code)
      
      if (!selectedOffice) {
        throw new Error('Oficina no encontrada')
      }

      // Crear sesión simulada
      const session: AuthSession = {
        user: {
          id: `user-${credentials.office_code}-${Date.now()}`,
          office_id: `office-${credentials.office_code}`,
          username: userRole,
          role: userRole,
          full_name: `${userName} ${selectedOffice.name}`,
          last_login: new Date().toISOString()
        },
        office: {
          id: `office-${credentials.office_code}`,
          name: selectedOffice.name,
          code: credentials.office_code
        },
        expires_at: Date.now() + SESSION_DURATION
      }

      // Guardar sesión
      this.currentSession = session
      this.saveSessionToStorage()

      return session
    } catch (error) {
      console.error('Error en login:', error)
      throw error instanceof Error ? error : new Error('Error desconocido durante el login')
    }
  }

  /**
   * Cerrar sesión
   */
  public logout(): void {
    this.currentSession = null
    this.clearSessionFromStorage()
  }

  /**
   * Obtener sesión actual
   */
  public getCurrentSession(): AuthSession | null {
    if (!this.currentSession) {
      return null
    }

    // Verificar si la sesión ha expirado
    if (Date.now() > this.currentSession.expires_at) {
      this.logout()
      return null
    }

    return this.currentSession
  }

  /**
   * Verificar si el usuario está autenticado
   */
  public isAuthenticated(): boolean {
    return this.getCurrentSession() !== null
  }

  /**
   * Obtener usuario actual
   */
  public getCurrentUser(): OfficeUser | null {
    const session = this.getCurrentSession()
    return session ? session.user : null
  }

  /**
   * Obtener oficina actual
   */
  public getCurrentOffice(): Office | null {
    const session = this.getCurrentSession()
    return session ? session.office : null
  }

  /**
   * Renovar sesión (extender expiración)
   */
  public renewSession(): void {
    if (this.currentSession) {
      this.currentSession.expires_at = Date.now() + SESSION_DURATION
      this.saveSessionToStorage()
    }
  }

  /**
   * Verificar permisos de rol
   */
  public hasRole(role: string): boolean {
    const user = this.getCurrentUser()
    return user ? user.role === role : false
  }

  /**
   * Verificar si es admin
   */
  public isAdmin(): boolean {
    return this.hasRole('admin')
  }

  /**
   * Verificar si es manager
   */
  public isManager(): boolean {
    return this.hasRole('manager') || this.hasRole('admin')
  }

  /**
   * Verificar si es usuario de solo lectura
   */
  public isViewer(): boolean {
    return this.hasRole('viewer')
  }

  /**
   * Verificar si puede modificar datos (crear, actualizar, eliminar)
   */
  public canModify(): boolean {
    return this.hasRole('admin') || this.hasRole('manager')
  }

  /**
   * Verificar si puede solo visualizar datos (descargar, ver)
   */
  public canView(): boolean {
    return this.isAuthenticated() // Cualquier usuario autenticado puede ver
  }

  /**
   * Obtener etiqueta del rol para mostrar en la UI
   */
  public getRoleLabel(): string {
    const user = this.getCurrentUser()
    if (!user) return ''
    
    switch (user.role) {
      case 'admin':
        return 'Administrador'
      case 'manager':
        return 'Gerente'
      case 'viewer':
        return 'Solo Lectura'
      default:
        return 'Usuario'
    }
  }

  /**
   * Guardar sesión en localStorage
   */
  private saveSessionToStorage(): void {
    if (typeof window !== 'undefined' && this.currentSession) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentSession))
      } catch (error) {
        console.error('Error al guardar sesión:', error)
      }
    }
  }

  /**
   * Cargar sesión desde localStorage
   */
  private loadSessionFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY)
        if (stored) {
          const session: AuthSession = JSON.parse(stored)
          
          // Verificar si la sesión no ha expirado
          if (Date.now() < session.expires_at) {
            this.currentSession = session
          } else {
            // Limpiar sesión expirada
            this.clearSessionFromStorage()
          }
        }
      } catch (error) {
        console.error('Error al cargar sesión:', error)
        this.clearSessionFromStorage()
      }
    }
  }

  /**
   * Limpiar sesión de localStorage
   */
  private clearSessionFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } catch (error) {
        console.error('Error al limpiar sesión:', error)
      }
    }
  }
}

// Exportar instancia singleton
export const authService = AuthService.getInstance()