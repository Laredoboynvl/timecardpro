import { createClientSupabaseClient } from '@/lib/supabase/client'
import { LoginCredentials, AuthSession, OfficeUser, Office, OFFICES } from '@/lib/types/auth'

const AUTH_STORAGE_KEY = 'timecard_auth_session'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 horas en milisegundos

export class AuthService {
  private static instance: AuthService
  private currentSession: AuthSession | null = null
  private hasLoaded: boolean = false

  private constructor() {
    // No cargar sesión en constructor para evitar problemas SSR
    // La sesión se carga la primera vez que se accede
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Autenticar usuario con credenciales de oficina (contraseña + tipo de usuario)
   */
  public async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      // Contraseña unificada para todos los usuarios
      const validPassword = 'admin123'
      
      if (credentials.password !== validPassword) {
        throw new Error('Contraseña incorrecta')
      }

      // Verificar tipo de usuario seleccionado
      let userRole = ''
      let userName = ''
      
      if (credentials.userType === 'spoc') {
        userRole = 'spoc'
        userName = 'SPOC'
      } else if (credentials.userType === 'rh') {
        userRole = 'rh'
        userName = 'Recursos Humanos'
      } else if (credentials.userType === 'employee') {
        userRole = 'employee'
        userName = 'Empleado'
      } else {
        throw new Error('Tipo de usuario no válido')
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
   * Inicializar sesión de forma diferida
   */
  private initializeSession(): void {
    if (!this.hasLoaded) {
      this.loadSessionFromStorage()
      this.hasLoaded = true
    }
  }

  /**
   * Obtener sesión actual del usuario
   */
  public getCurrentSession(): AuthSession | null {
    this.initializeSession()
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
   * Verificar si es SPOC (acceso completo)
   */
  public isSPOC(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si es Recursos Humanos (solo lectura)
   */
  public isRH(): boolean {
    return this.hasRole('rh')
  }

  /**
   * Verificar si es Empleado
   */
  public isEmployee(): boolean {
    return this.hasRole('employee')
  }

  /**
   * Verificar si puede modificar datos (crear, actualizar, eliminar)
   */
  public canModify(): boolean {
    return this.hasRole('spoc') // Solo SPOC puede modificar
  }

  /**
   * Verificar si puede solicitar vacaciones
   */
  public canRequestVacations(): boolean {
    return this.hasRole('employee')
  }

  /**
   * Verificar si puede aprobar vacaciones
   */
  public canApproveVacations(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede solo visualizar datos (descargar, ver)
   */
  public canView(): boolean {
    return this.isAuthenticated() // Cualquier usuario autenticado puede ver
  }

  /**
   * Verificar si puede crear empleados
   */
  public canCreateEmployee(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede editar empleados
   */
  public canEditEmployee(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede eliminar empleados
   */
  public canDeleteEmployee(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede manejar asistencias (marcar, editar)
   */
  public canManageAttendance(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede gestionar vacaciones
   */
  public canManageVacations(): boolean {
    return this.hasRole('spoc')
  }

  /**
   * Verificar si puede exportar/descargar datos
   */
  public canExportData(): boolean {
    return this.isAuthenticated() // Ambos pueden exportar
  }

  /**
   * Obtener etiqueta del rol para mostrar en la UI
   */
  public getRoleLabel(): string {
    const user = this.getCurrentUser()
    if (!user) return ''
    
    switch (user.role) {
      case 'spoc':
        return 'SPOC'
      case 'rh':
        return 'Recursos Humanos'
      case 'employee':
        return 'Empleado'
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
    // No cargar nada en el servidor para evitar problemas de hidratación
    if (typeof window === 'undefined') {
      return
    }
    
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