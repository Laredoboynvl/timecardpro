'use client'

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Plus, Trash2, CalendarDays, AlertTriangle } from "lucide-react"
import { OFFICES } from "@/lib/types/auth"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday
} from "@/lib/supabase/db-functions"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function DiasLaboralesPage() {
  const params = useParams()
  const { toast } = useToast()
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null)
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    holiday_date: '',
    description: ''
  })

  useEffect(() => {
    if (office) {
      loadHolidays()
    }
  }, [office])

  const loadHolidays = async () => {
    if (!office) return
    
    setIsLoading(true)
    try {
      const data = await getHolidays(office.id)
      // Ordenar por fecha
      const sortedData = data.sort((a, b) => 
        parseLocalDate(a.holiday_date).getTime() - parseLocalDate(b.holiday_date).getTime()
      )
      setHolidays(sortedData)
    } catch (error) {
      console.error('Error loading holidays:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los días festivos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!office) return
    
    if (!newHoliday.name || !newHoliday.holiday_date) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      await createHoliday({
        office_id: office.id,
        name: newHoliday.name,
        holiday_date: newHoliday.holiday_date,
        description: newHoliday.description,
        is_active: true
      })

      toast({
        title: "Día festivo agregado",
        description: `${newHoliday.name} ha sido agregado correctamente`
      })

      setShowAddDialog(false)
      setNewHoliday({ name: '', holiday_date: '', description: '' })
      await loadHolidays()
    } catch (error) {
      console.error('Error adding holiday:', error)
      toast({
        title: "Error",
        description: "No se pudo agregar el día festivo",
        variant: "destructive"
      })
    }
  }

  const handleDeleteHoliday = async () => {
    if (!holidayToDelete) return

    try {
      await deleteHoliday(holidayToDelete.id!)
      
      toast({
        title: "Día festivo eliminado",
        description: `${holidayToDelete.name} ha sido eliminado correctamente`
      })

      setShowDeleteDialog(false)
      setHolidayToDelete(null)
      await loadHolidays()
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el día festivo",
        variant: "destructive"
      })
    }
  }

  if (!office) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Oficina no encontrada</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Días Laborables</h2>
              <p className="text-muted-foreground">Gestiona los días festivos de {office.name}</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Día Festivo
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Días Festivos</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{holidays.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Días Festivos Este Año</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {holidays.filter(h => new Date(h.holiday_date).getFullYear() === new Date().getFullYear()).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Próximos 30 Días</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {holidays.filter(h => {
                  const date = parseLocalDate(h.holiday_date)
                  const now = new Date()
                  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                  return date >= now && date <= in30Days
                }).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Lista de días festivos */}
        <Card>
          <CardHeader>
            <CardTitle>Días Festivos Registrados</CardTitle>
            <CardDescription>Lista de días no laborables para esta oficina</CardDescription>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No hay días festivos registrados</h3>
                <p className="text-muted-foreground mb-4">
                  Agrega los días festivos para esta oficina
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Día Festivo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día de la Semana</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => {
                    const date = parseLocalDate(holiday.holiday_date)
                    const dayOfWeek = date.toLocaleDateString('es-ES', { weekday: 'long' })
                    const isPast = date < new Date()
                    
                    return (
                      <TableRow key={holiday.id}>
                        <TableCell className="font-medium">{holiday.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {date.toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                            {isPast && <Badge variant="secondary" className="text-xs">Pasado</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{dayOfWeek}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {holiday.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setHolidayToDelete(holiday)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog para agregar día festivo */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Día Festivo</DialogTitle>
            <DialogDescription>
              Registra un nuevo día no laborable para {office.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Día Festivo *</Label>
              <Input
                id="name"
                placeholder="Ej: Año Nuevo, Día de la Independencia"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={newHoliday.holiday_date}
                onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Información adicional sobre este día festivo"
                value={newHoliday.description}
                onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddHoliday}>
              Agregar Día Festivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este día festivo?
            </DialogDescription>
          </DialogHeader>
          {holidayToDelete && (
            <div className="py-4">
              <p className="font-medium">{holidayToDelete.name}</p>
              <p className="text-sm text-muted-foreground">
                {parseLocalDate(holidayToDelete.holiday_date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              {holidayToDelete.description && (
                <p className="text-sm text-muted-foreground mt-2">{holidayToDelete.description}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteHoliday}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
