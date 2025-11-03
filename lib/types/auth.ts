// Tipos para el sistema de autenticación por oficina
export interface Office {
  id: string
  name: string
  code: string
  city?: string
  country?: string
  address?: string
  timezone?: string
}

export interface OfficeUser {
  id: string
  office_id: string
  username: string
  role: string
  full_name: string
  email?: string
  last_login?: string
}

export interface LoginCredentials {
  office_code: string
  password: string
  userType: 'spoc' | 'rh' | 'employee'
}

export interface AuthSession {
  user: OfficeUser
  office: Office
  expires_at: number
}

// Configuración de oficinas disponibles
export const OFFICES: Office[] = [
  { id: 'tij-001', code: 'TIJ', name: 'Tijuana', city: 'Tijuana, BC', country: 'México' },
  { id: 'cju-001', code: 'CJU', name: 'Ciudad Juárez', city: 'Ciudad Juárez, CHIH', country: 'México' },
  { id: 'nla-001', code: 'NLA', name: 'Nuevo Laredo', city: 'Nuevo Laredo, TAMPS', country: 'México' },
  { id: 'nog-001', code: 'NOG', name: 'Nogales', city: 'Nogales, SON', country: 'México' },
  { id: 'mty-001', code: 'MTY', name: 'Monterrey', city: 'Monterrey, NL', country: 'México' },
  { id: 'mat-001', code: 'MAT', name: 'Matamoros', city: 'Matamoros, TAMPS', country: 'México' },
  { id: 'hmo-001', code: 'HMO', name: 'Hermosillo', city: 'Hermosillo, SON', country: 'México' },
  { id: 'gdl-001', code: 'GDL', name: 'Guadalajara', city: 'Guadalajara, JAL', country: 'México' },
  { id: 'cdm-001', code: 'CDM', name: 'Ciudad de México', city: 'CDMX', country: 'México' },
  { id: 'mer-001', code: 'MER', name: 'Mérida', city: 'Mérida, YUC', country: 'México' }
]