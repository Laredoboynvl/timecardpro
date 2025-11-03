'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Building, 
  Users, 
  Calendar, 
  CalendarDays,
  LogOut, 
  Settings, 
  BarChart3,
  Clock,
  UserCheck,
  FileText,
  ChevronRight,
  Trash2,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { OFFICES } from "@/lib/types/auth"
import { useToast } from "@/hooks/use-toast"
import { deleteAllEmployeesByOffice, deleteAllVacationRequestsByOffice, getEmployeesByOfficeClient, getHolidays } from "@/lib/supabase/db-functions"

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const { user, office, isAuthenticated, isLoading, logout } = useAuth()
  const { toast } = useToast()

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showConfigSection, setShowConfigSection] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingVacations, setIsDeletingVacations] = useState(false)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [nextHoliday, setNextHoliday] = useState<{
    name: string;
    date: string;
    daysUntil: string;
  } | null>(null)
  const [totalVacationDays, setTotalVacationDays] = useState(0)
  
  // Estados para audit log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditCurrentPage, setAuditCurrentPage] = useState(1)
  const [auditItemsPerPage, setAuditItemsPerPage] = useState(10)
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false)

  // Tipo para audit log
  interface AuditLog {
    id: string
    user_name: string
    office_id: string // UUID como string
    action: string
    details: string | null
    entity_type: string | null
    entity_id: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }
  


  // Obtener información de la oficina de la URL
  const officeCodeFromUrl = (params.office as string)?.toUpperCase()
  const officeInfo = OFFICES.find(o => o.code === officeCodeFromUrl)

  // Actualizar el tiempo cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Cargar datos estadísticos
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!office) return

      try {
        console.log('📊 Cargando datos para oficina:', { id: office.id, code: office.code, name: office.name })
        
        // Obtener número de empleados activos - usar office.code en lugar de office.id
        const employees = await getEmployeesByOfficeClient(office.code)
        console.log(`👥 Empleados encontrados: ${employees.length}`)
        setEmployeeCount(employees.length)


        // Obtener próximo día festivo - buscar en año actual y próximo si es necesario
        const holidays = await getHolidays(office.code)
        console.log(`🎄 Días festivos encontrados: ${holidays.length}`)
        
        const today = new Date()
        const currentYear = today.getFullYear()
        
        // Crear lista de días festivos con información completa para año actual y próximo
        const allHolidaysWithInfo: Array<{
          name: string;
          date: Date;
          originalHoliday: any;
        }> = []
        
        // Agregar días festivos de este año
        holidays.forEach(h => {
          const holidayDate = new Date(h.holiday_date)
          allHolidaysWithInfo.push({
            name: h.name,
            date: holidayDate,
            originalHoliday: h
          })
        })
        
        // Agregar días festivos del próximo año (proyectando los mismos días)
        holidays.forEach(h => {
          const originalDate = new Date(h.holiday_date)
          const nextYearDate = new Date(currentYear + 1, originalDate.getMonth(), originalDate.getDate())
          // Cambiar el nombre para indicar que es del próximo año
          const nextYearName = h.name.replace(/\d{4}/, (currentYear + 1).toString())
          allHolidaysWithInfo.push({
            name: nextYearName,
            date: nextYearDate,
            originalHoliday: h
          })
        })
        
        // Filtrar solo fechas futuras y ordenar
        const upcomingHolidays = allHolidaysWithInfo
          .filter(holiday => {
            const dateOnly = new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate())
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            return dateOnly >= todayOnly
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        if (upcomingHolidays.length > 0) {
          const nextHolidayInfo = upcomingHolidays[0]
          const daysDiff = Math.ceil((nextHolidayInfo.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          // Formatear la fecha
          const holidayDateStr = nextHolidayInfo.date.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })
          
          // Formatear días hasta el evento
          let daysUntilStr: string
          if (daysDiff === 0) {
            daysUntilStr = 'Hoy'
          } else if (daysDiff === 1) {
            daysUntilStr = 'Mañana'
          } else if (daysDiff <= 30) {
            daysUntilStr = `en ${daysDiff} días`
          } else if (daysDiff <= 365) {
            const months = Math.floor(daysDiff / 30)
            daysUntilStr = `en ${months} mes${months > 1 ? 'es' : ''}`
          } else {
            daysUntilStr = 'próximo año'
          }
          
          console.log(`📅 Próximo día festivo: ${nextHolidayInfo.name} - ${holidayDateStr} (${daysUntilStr})`)
          
          setNextHoliday({
            name: nextHolidayInfo.name,
            date: holidayDateStr,
            daysUntil: daysUntilStr
          })
        } else {
          setNextHoliday({
            name: 'Sin días festivos',
            date: 'No configurados',
            daysUntil: ''
          })
        }

        // Calcular total de días de vacaciones en el sistema
        // Esto sería útil como estadística general
        const totalDays = employees.length * 12 // Promedio básico
        setTotalVacationDays(totalDays)

      } catch (error) {
        console.error('Error cargando datos del dashboard:', error)
        // Establecer valores por defecto en caso de error
        setEmployeeCount(0)
        setNextHoliday({
          name: 'Error',
          date: 'No disponible',
          daysUntil: ''
        })
        setTotalVacationDays(0)
      }
    }

    loadDashboardData()
  }, [office])

  // Verificación de autenticación y redirección
  useEffect(() => {
    // Si está cargando, no hacer nada
    if (isLoading) return

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated) {
      router.replace('/')
      return
    }

    // Si está autenticado pero la oficina no coincide, redirigir a la oficina correcta
    if (office && officeCodeFromUrl && office.code.toUpperCase() !== officeCodeFromUrl.toUpperCase()) {
      router.replace(`/dashboard/${office.code.toLowerCase()}`)
      return
    }
  }, [isAuthenticated, isLoading, office, officeCodeFromUrl, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleDeleteAllEmployees = async () => {
    if (!office) return
    
    setIsDeleting(true)
    try {
      console.log('🗑️ Eliminando empleados para oficina:', { id: office.id, code: office.code, name: office.name })
      const result = await deleteAllEmployeesByOffice(office.id)
      
      if (result.success) {
        toast({
          title: "Empleados eliminados",
          description: `Se eliminaron exitosamente ${result.deletedCount} empleado${result.deletedCount !== 1 ? 's' : ''} de la oficina ${office.name}`,
        })
        setShowConfigSection(false)
      } else {
        toast({
          title: "Error al eliminar empleados",
          description: result.error || "Ocurrió un error desconocido",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar los empleados",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAllVacations = async () => {
    if (!office) return
    
    setIsDeletingVacations(true)
    try {
      console.log('🗑️ Eliminando vacaciones para oficina:', { id: office.id, code: office.code, name: office.name })
      const result = await deleteAllVacationRequestsByOffice(office.id)
      
      if (result.success) {
        toast({
          title: "Vacaciones eliminadas",
          description: `Se eliminaron exitosamente ${result.deletedCount} solicitud${result.deletedCount !== 1 ? 'es' : ''} de vacaciones de la oficina ${office.name}`,
        })
        if (result.deletedCount === 0) {
          toast({
            title: "Sin registros",
            description: "No se encontraron solicitudes de vacaciones para eliminar",
          })
        }
      } else {
        toast({
          title: "Error al eliminar vacaciones",
          description: result.error || "Ocurrió un error desconocido",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar las solicitudes de vacaciones",
        variant: "destructive"
      })
    } finally {
      setIsDeletingVacations(false)
    }
  }

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (se redirigirá)
  if (!isAuthenticated || !user || !office) {
    return null
  }

  const menuItems = [
    {
      title: 'Gestión de Asistencia',
      description: 'Controlar la asistencia diaria de empleados',
      icon: Calendar,
      href: `/oficina/${office.code}/asistencia`,
      color: 'bg-blue-500',
      available: true,
      isLink: true
    },
    {
      title: 'Empleados',
      description: 'Ver y gestionar empleados de la oficina',
      icon: Users,
      href: `/oficina/${office.code}/empleados`,
      color: 'bg-green-500',
      available: true,
      isLink: true
    },
    {
      title: 'Vacaciones',
      description: 'Gestionar solicitudes y períodos de vacaciones',
      icon: Calendar,
      href: `/oficina/${office.code}/vacaciones`,
      color: 'bg-teal-500',
      available: true,
      isLink: true
    },
    {
      title: 'Calendario Consolidado',
      description: 'Vista unificada de vacaciones y días festivos',
      icon: CalendarDays,
      href: `/oficina/${office.code}/calendario-vacaciones`,
      color: 'bg-cyan-500',
      available: true,
      isLink: true
    },
    {
      title: 'Reportes',
      description: 'Generar reportes de asistencia y estadísticas',
      icon: BarChart3,
      href: `/oficina/${office.code}/reportes`,
      color: 'bg-purple-500',
      available: true,
      isLink: true
    },
    {
      title: 'Días Laborables',
      description: 'Configurar horarios y días de trabajo',
      icon: Clock,
      href: `/oficina/${office.code}/horarios`,
      color: 'bg-orange-500',
      available: true, // Siempre disponible para SPOC y RH
      isLink: true
    },
    {
      title: 'Configuración',
      description: 'Ajustes de la oficina y gestión de datos',
      icon: Settings,
      color: 'bg-gray-500',
      available: true, // Siempre disponible para SPOC y RH
      isLink: false,
      onClick: () => setShowConfigSection(true)
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header azul marino */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <svg width="36" height="24" viewBox="0 0 48 32" className="rounded shadow-sm">
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
                  <circle cx="2.4" cy="2" r="0.6"/>
                  <circle cx="7.2" cy="2" r="0.6"/>
                  <circle cx="12" cy="2" r="0.6"/>
                  <circle cx="16.8" cy="2" r="0.6"/>
                  <circle cx="4.8" cy="4" r="0.6"/>
                  <circle cx="9.6" cy="4" r="0.6"/>
                  <circle cx="14.4" cy="4" r="0.6"/>
                  <circle cx="2.4" cy="6" r="0.6"/>
                  <circle cx="7.2" cy="6" r="0.6"/>
                  <circle cx="12" cy="6" r="0.6"/>
                  <circle cx="16.8" cy="6" r="0.6"/>
                  <circle cx="4.8" cy="8" r="0.6"/>
                  <circle cx="9.6" cy="8" r="0.6"/>
                  <circle cx="14.4" cy="8" r="0.6"/>
                  <circle cx="2.4" cy="10" r="0.6"/>
                  <circle cx="7.2" cy="10" r="0.6"/>
                  <circle cx="12" cy="10" r="0.6"/>
                  <circle cx="16.8" cy="10" r="0.6"/>
                  <circle cx="4.8" cy="12" r="0.6"/>
                  <circle cx="9.6" cy="12" r="0.6"/>
                  <circle cx="14.4" cy="12" r="0.6"/>
                  <circle cx="2.4" cy="14" r="0.6"/>
                  <circle cx="7.2" cy="14" r="0.6"/>
                  <circle cx="12" cy="14" r="0.6"/>
                  <circle cx="16.8" cy="14" r="0.6"/>
                </g>
              </svg>
              <div>
                <h1 className="text-2xl font-bold">Bienvenido, Administrador {office.name}</h1>
                <p className="text-blue-200">
                  {officeInfo?.city} • {office.code} • {currentTime.toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <div className="text-2xl font-bold">
                  {currentTime.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employeeCount}</p>
                  <p className="text-sm text-muted-foreground">Empleados Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Próximo Día Feriado</p>
                  <p className="text-lg font-bold">{nextHoliday?.name || 'Cargando...'}</p>
                  <p className="text-sm text-muted-foreground mb-1">{nextHoliday?.date || ''}</p>
                  <p className="text-xs text-blue-600 font-medium">{nextHoliday?.daysUntil || ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalVacationDays}</p>
                  <p className="text-sm text-muted-foreground">Días Vacaciones Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu de Acciones */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Panel de Control</CardTitle>
            <CardDescription>
              Selecciona una opción para gestionar tu oficina
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems
                .filter(item => item.available)
                .map((item, index) => {
                  const CardComponent = (
                    <Card className="h-full transition-all hover:shadow-md hover:border-blue-500 hover:-translate-y-1 cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center`}>
                            <item.icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  )

                  if (item.isLink && item.href) {
                    return (
                      <Link key={index} href={item.href}>
                        {CardComponent}
                      </Link>
                    )
                  } else {
                    return (
                      <div key={index} onClick={item.onClick}>
                        {CardComponent}
                      </div>
                    )
                  }
                })}
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-8">
          <Card className="bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Información de la Oficina
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p><strong>Código:</strong> {office.code}</p>
                    <p><strong>Ubicación:</strong> {officeInfo?.city}</p>
                    <p><strong>Tu rol:</strong> {user.role === 'admin' ? 'Administrador' : 
                       user.role === 'manager' ? 'Gerente' : 'Supervisor'}</p>
                    {user.last_login && (
                      <p><strong>Último acceso:</strong> {new Date(user.last_login).toLocaleString('es-MX')}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de Configuración */}
      {/* Sección de Configuración Expandible */}
      {showConfigSection && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigSection(false)}
                >
                  ← Volver al Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Configuración de {office.name}
                  </h1>
                  <p className="text-muted-foreground">
                    Gestiona la configuración y datos de tu oficina
                  </p>
                </div>
              </div>
            </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
              <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
              <TabsTrigger value="auditlog">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Información de la Oficina</h4>
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <span className="text-sm font-medium">{office.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre:</span>
                    <span className="text-sm font-medium">{office.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ubicación:</span>
                    <span className="text-sm font-medium">{officeInfo?.city || 'No especificada'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tu Información</h4>
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre:</span>
                    <span className="text-sm font-medium">{user.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Rol:</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Administrador' : 
                       user.role === 'manager' ? 'Gerente' : 'Supervisor'}
                    </Badge>
                  </div>
                  {user.last_login && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Último acceso:</span>
                      <span className="text-sm font-medium">
                        {new Date(user.last_login).toLocaleString('es-MX')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limpieza" className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Limpieza de Datos</h4>
                <p className="text-sm text-muted-foreground">
                  Herramientas para gestionar y limpiar los datos de tu oficina.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">Eliminar Todos los Empleados</h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elimina todos los empleados y sus datos asociados.
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="mt-3"
                        onClick={handleDeleteAllEmployees}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar Empleados
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">Eliminar Solicitudes de Vacaciones</h5>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elimina todas las solicitudes de vacaciones registradas.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={handleDeleteAllVacations}
                        disabled={isDeletingVacations}
                      >
                        {isDeletingVacations ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 mr-2" />
                            Eliminar Vacaciones
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="avanzado" className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configuración Avanzada</h4>
                <p className="text-sm text-muted-foreground">
                  Opciones avanzadas para administradores del sistema.
                </p>
              </div>

              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Las funciones avanzadas estarán disponibles en futuras actualizaciones.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3 opacity-50">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="text-sm font-medium">Respaldo de Datos</div>
                      <div className="text-xs text-muted-foreground">Exportar datos de la oficina</div>
                    </div>
                    <Button size="sm" disabled>Próximamente</Button>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="text-sm font-medium">Configurar Notificaciones</div>
                      <div className="text-xs text-muted-foreground">Alertas y recordatorios</div>
                    </div>
                    <Button size="sm" disabled>Próximamente</Button>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="text-sm font-medium">Integración API</div>
                      <div className="text-xs text-muted-foreground">Conectar con sistemas externos</div>
                    </div>
                    <Button size="sm" disabled>Próximamente</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Nueva pestaña de Audit Log */}
            <TabsContent value="auditlog" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Registro de Actividades</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mostrar:</span>
                    <select 
                      value={auditItemsPerPage} 
                      onChange={(e) => {
                        setAuditItemsPerPage(Number(e.target.value))
                        setAuditCurrentPage(1)
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={10}>10 por página</option>
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                    </select>
                  </div>
                </div>
                
                <div className="border rounded-lg">
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>Sistema de Audit Log en desarrollo</p>
                    <p className="text-xs">Esta funcionalidad estará disponible próximamente</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      )}


    </div>
  )
}