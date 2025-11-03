'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Calendar, 
  ArrowLeft, 
  Plus, 
  CalendarDays, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  AlertTriangle,
  User
} from "lucide-react"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OFFICES } from "@/lib/types/auth"
import { useAuth } from "@/lib/hooks/useAuth"

interface VacationRequest {
  id: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  submittedDate: string
  responseDate?: string
  comments?: string
}

export default function EmpleadoVacacionesPage() {
  const params = useParams()
  const router = useRouter()
  const { user, office, isEmployee, isAuthenticated } = useAuth()
  const officeCode = Array.isArray(params.officeCode) ? params.officeCode[0] : params.officeCode

  // Estados
  const [isMounted, setIsMounted] = useState(false)
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Datos de ejemplo - En producción vendrían de la base de datos
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    {
      id: '1',
      startDate: '2025-12-20',
      endDate: '2025-12-24',
      days: 5,
      reason: 'Vacaciones familiares navideñas',
      status: 'pending',
      submittedDate: '2025-10-15',
    },
    {
      id: '2',
      startDate: '2025-11-15',
      endDate: '2025-11-19',
      days: 5,
      reason: 'Descanso personal',
      status: 'approved',
      submittedDate: '2025-09-20',
      responseDate: '2025-09-22',
    },
    {
      id: '3',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      days: 5,
      reason: 'Año nuevo',
      status: 'rejected',
      submittedDate: '2024-12-01',
      responseDate: '2024-12-03',
      comments: 'Fechas no disponibles por alta demanda'
    }
  ])

  const availableDays = 9 // Días disponibles del empleado

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (!isAuthenticated || !isEmployee) {
      router.push('/')
    }
  }, [isAuthenticated, isEmployee, router, isMounted])

  const officeInfo = OFFICES.find(o => o.code.toLowerCase() === officeCode?.toLowerCase())

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const timeDiff = endDate.getTime() - startDate.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
  }

  const requestedDays = calculateDays(selectedStartDate, selectedEndDate)

  const handleSubmitRequest = async () => {
    if (!selectedStartDate || !selectedEndDate || !reason.trim()) {
      alert('Por favor completa todos los campos')
      return
    }

    if (requestedDays > availableDays) {
      alert('No tienes suficientes días disponibles')
      return
    }

    setIsSubmitting(true)

    try {
      // Simular envío a la base de datos
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newRequest: VacationRequest = {
        id: Date.now().toString(),
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        days: requestedDays,
        reason: reason.trim(),
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
      }

      setVacationRequests(prev => [newRequest, ...prev])
      
      // Limpiar formulario
      setSelectedStartDate('')
      setSelectedEndDate('')
      setReason('')
      setIsRequestModalOpen(false)
      
      alert('Solicitud enviada exitosamente')
    } catch (error) {
      alert('Error al enviar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: VacationRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprobada</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push(`/empleado/${officeCode}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-600" />
              <h1 className="text-xl font-semibold">Mis Vacaciones</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Días Disponibles</CardTitle>
                <div className="text-2xl font-bold text-green-600">{availableDays}</div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Solicitudes Pendientes</CardTitle>
                <div className="text-2xl font-bold text-yellow-600">
                  {vacationRequests.filter(r => r.status === 'pending').length}
                </div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Solicitudes Aprobadas</CardTitle>
                <div className="text-2xl font-bold text-blue-600">
                  {vacationRequests.filter(r => r.status === 'approved').length}
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Botón Nueva Solicitud */}
          <Card>
            <CardHeader>
              <CardTitle>Solicitar Vacaciones</CardTitle>
              <CardDescription>
                Crea una nueva solicitud de vacaciones que será revisada por tu supervisor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsRequestModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Solicitudes */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Solicitudes</CardTitle>
              <CardDescription>
                Todas tus solicitudes de vacaciones y su estado actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vacationRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </h3>
                          <Badge variant="outline">{request.days} días</Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{request.reason}</p>
                        <p className="text-xs text-gray-500">
                          Solicitado el {formatDate(request.submittedDate)}
                        </p>
                        {request.responseDate && (
                          <p className="text-xs text-gray-500">
                            Respondido el {formatDate(request.responseDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {request.comments && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm">
                          <strong>Comentarios:</strong> {request.comments}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {vacationRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No tienes solicitudes de vacaciones</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal Nueva Solicitud */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Vacaciones</DialogTitle>
            <DialogDescription>
              Completa los datos para solicitar tus días de vacaciones
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Fecha de inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Fecha de fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                />
              </div>
            </div>
            
            {requestedDays > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>{requestedDays} días</strong> solicitados
                  {requestedDays > availableDays && (
                    <span className="text-red-600 ml-2">
                      (Excede tus días disponibles: {availableDays})
                    </span>
                  )}
                </span>
              </div>
            )}
            
            <div>
              <Label htmlFor="reason">Motivo de la solicitud</Label>
              <Textarea
                id="reason"
                placeholder="Describe brevemente el motivo de tu solicitud..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRequestModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitRequest}
              disabled={isSubmitting || requestedDays > availableDays || !selectedStartDate || !selectedEndDate || !reason.trim()}
            >
              {isSubmitting ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}