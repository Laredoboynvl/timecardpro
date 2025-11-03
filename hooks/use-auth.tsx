'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { authService } from '@/lib/auth/auth-service'
import { AuthSession, OfficeUser, Office } from '@/lib/types/auth'

interface AuthContextType {
  session: AuthSession | null
  user: OfficeUser | null
  office: Office | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { office_code: string; password: string; userType?: 'spoc' | 'rh' | 'employee' }) => Promise<void>
  logout: () => void
  renewSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Cargar sesión inicial
    const currentSession = authService.getCurrentSession()
    setSession(currentSession)
    setIsLoading(false)

    // Configurar renovación automática de sesión cada 30 minutos
    const renewalInterval = setInterval(() => {
      if (authService.isAuthenticated()) {
        authService.renewSession()
        const renewedSession = authService.getCurrentSession()
        // Solo actualizar si la sesión cambió para evitar re-renders innecesarios
        setSession(prevSession => {
          if (JSON.stringify(prevSession) !== JSON.stringify(renewedSession)) {
            return renewedSession
          }
          return prevSession
        })
      }
    }, 30 * 60 * 1000) // 30 minutos

    return () => clearInterval(renewalInterval)
  }, [])

  const login = useCallback(async (credentials: { office_code: string; password: string; userType?: 'spoc' | 'rh' | 'employee' }) => {
    try {
      setIsLoading(true)
      const newSession = await authService.login({
        office_code: credentials.office_code,
        password: credentials.password,
        userType: credentials.userType || 'spoc' // default to spoc if not provided
      })
      setSession(newSession)
    } catch (error) {
      setSession(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = () => {
    authService.logout()
    setSession(null)
  }

  const renewSession = () => {
    authService.renewSession()
    setSession(authService.getCurrentSession())
  }

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    office: session?.office || null,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    renewSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}