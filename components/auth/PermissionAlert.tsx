'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Eye, Shield, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PermissionAlertProps {
  className?: string
}

export function PermissionAlert({ className = '' }: PermissionAlertProps) {
  const { isViewer, roleLabel, user } = useAuth()

  if (!isViewer) {
    return null
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <Eye className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600" />
        <span className="text-amber-800">
          <strong>Modo Solo Lectura:</strong> Conectado como {roleLabel}. 
          Puedes visualizar y descargar datos, pero no modificar información.
        </span>
      </AlertDescription>
    </Alert>
  )
}

interface UserInfoProps {
  className?: string
}

export function UserInfo({ className = '' }: UserInfoProps) {
  const { user, roleLabel, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <User className="h-4 w-4" />
      <span>{user.full_name}</span>
      <span className="text-xs bg-muted px-2 py-1 rounded">
        {roleLabel}
      </span>
    </div>
  )
}