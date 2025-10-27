"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar, Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  getHolidays, 
  createHoliday, 
  updateHoliday, 
  deleteHoliday, 
  createBulkHolidays,
  type Holiday 
} from "@/lib/supabase/db-functions"
import { BulkHolidayUpload, type BulkHolidayData } from "./bulk-holiday-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HolidayManagerProps {
  officeId: string
  officeName: string
  isOpen: boolean
  onClose: () => void
  onHolidayChange?: () => void // Para notificar cambios al componente padre
}

export function HolidayManager({
  officeId,
  officeName,
  isOpen,
  onClose,
  onHolidayChange
}: HolidayManagerProps) {
  const { toast } = useToast()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [activeTab, setActiveTab] = useState("calendar")
  
  // Formulario
  const [formData, setFormData] = useState({
    name: "",
    holiday_date: "",
    description: ""
  })
  
  // Calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Estados para la lista completa
  const [searchTerm, setSearchTerm] = useState("")
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    description: ''
  })

  // Filtrar días festivos para la lista
  const filteredHolidays = holidays.filter(holiday =>
    holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holiday.holiday_date.includes(searchTerm) ||
    (holiday.description && holiday.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())

  useEffect(() => {
    if (isOpen && officeId) {
      loadHolidays()
    }
  }, [isOpen, officeId])

  const loadHolidays = async () => {
    setIsLoading(true)
    try {
      const data = await getHolidays(officeId)
      setHolidays(data)
    } catch (error) {
      console.error("Error loading holidays:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los días festivos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.holiday_date) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa el nombre y la fecha del día festivo",
        variant: "destructive"
      })
      return
    }

    // Validar que la fecha no sea pasada
    const selectedDate = new Date(formData.holiday_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      toast({
        title: "Fecha inválida",
        description: "No se puede crear un día festivo con fecha pasada",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      if (editingHoliday) {
        // Actualizar día festivo existente
        await updateHoliday(editingHoliday.id!, formData)
        toast({
          title: "Día festivo actualizado",
          description: `${formData.name} ha sido actualizado correctamente`
        })
      } else {
        // Crear nuevo día festivo
        await createHoliday({
          office_id: officeId,
          ...formData
        })
        toast({
          title: "Día festivo creado",
          description: `${formData.name} ha sido agregado a los días festivos`
        })
      }

      await loadHolidays()
      resetForm()
      onHolidayChange?.() // Notificar al componente padre
    } catch (error) {
      console.error("Error saving holiday:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el día festivo",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", holiday_date: "", description: "" })
    setShowAddForm(false)
    setEditingHoliday(null)
  }

  const handleDeleteHoliday = async (holidayId: string | undefined) => {
    if (!holidayId) return
    
    if (!window.confirm("¿Estás seguro de que deseas eliminar este día festivo?")) {
      return
    }

    setIsLoading(true)
    try {
      const success = await deleteHoliday(holidayId)
      if (success) {
        toast({
          title: "Éxito",
          description: "Día festivo eliminado correctamente"
        })
        await loadHolidays()
        onHolidayChange?.()
      }
    } catch (error) {
      console.error("Error deleting holiday:", error)
      toast({
        title: "Error", 
        description: "No se pudo eliminar el día festivo",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!editingHoliday?.id || !editForm.name.trim() || !editForm.date) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const updatedHoliday = await updateHoliday(editingHoliday.id, {
        name: editForm.name.trim(),
        holiday_date: editForm.date,
        description: editForm.description.trim() || undefined
      })

      if (updatedHoliday) {
        toast({
          title: "Éxito",
          description: "Día festivo actualizado correctamente"
        })
        setShowEditForm(false)
        setEditingHoliday(null)
        setEditForm({ name: '', date: '', description: '' })
        await loadHolidays()
        onHolidayChange?.()
      }
    } catch (error) {
      console.error("Error updating holiday:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el día festivo",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkUpload = async (bulkHolidays: BulkHolidayData[]) => {
    if (!bulkHolidays.length) return

    setIsLoading(true)
    try {
      console.log(`📤 Iniciando carga masiva de ${bulkHolidays.length} días festivos`)
      
      // Convertir BulkHolidayData a formato Holiday
      const holidaysToCreate = bulkHolidays.map(holiday => ({
        name: holiday.name,
        holiday_date: holiday.holiday_date.toString().split('T')[0], // Asegurar formato YYYY-MM-DD
        description: holiday.description
      }))

      const result = await createBulkHolidays(officeId, holidaysToCreate)

      // Mostrar resultados detallados
      let message = ""
      let variant: "default" | "destructive" = "default"

      if (result.created > 0) {
        message += `✅ ${result.created} día(s) festivo(s) creado(s) exitosamente. `
      }

      if (result.duplicates.length > 0) {
        message += `⚠️ ${result.duplicates.length} día(s) ya existían y fueron omitidos. `
      }

      if (result.errors.length > 0) {
        message += `❌ ${result.errors.length} error(es) encontrado(s). `
        variant = "destructive"
      }

      if (result.success) {
        toast({
          title: "Carga masiva completada",
          description: message.trim(),
          variant: variant
        })

        // Mostrar detalles si hay duplicados o errores
        if (result.duplicates.length > 0 || result.errors.length > 0) {
          console.log("📋 Detalles de la carga masiva:")
          if (result.duplicates.length > 0) {
            console.log("⚠️ Duplicados:", result.duplicates)
          }
          if (result.errors.length > 0) {
            console.log("❌ Errores:", result.errors)
          }
        }

        // Recargar datos y cambiar a vista de calendario
        await loadHolidays()
        setActiveTab("calendar")
        onHolidayChange?.() // Notificar al componente padre

      } else {
        throw new Error(result.errors.join(", ") || "Error desconocido en la carga masiva")
      }

    } catch (error) {
      console.error("Error en carga masiva:", error)
      toast({
        title: "Error en carga masiva",
        description: error instanceof Error ? error.message : "No se pudo completar la carga masiva",
        variant: "destructive"
      })
      throw error // Re-lanzar para que BulkHolidayUpload lo maneje
    } finally {
      setIsLoading(false)
    }
  }

  // Funciones del calendario
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Lunes = 0, Domingo = 6
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  const isDateHoliday = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return holidays.some(holiday => holiday.holiday_date === dateStr)
  }

  const getHolidayForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return holidays.find(holiday => holiday.holiday_date === dateStr)
  }

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const existingHoliday = getHolidayForDate(date)
    
    if (existingHoliday) {
      // Si ya es día festivo, editarlo usando el nuevo formulario de edición
      setEditingHoliday(existingHoliday)
      setEditForm({
        name: existingHoliday.name,
        date: existingHoliday.holiday_date,
        description: existingHoliday.description || ""
      })
      setShowEditForm(true)
    } else {
      // Crear nuevo día festivo para esta fecha
      setFormData({
        name: "",
        holiday_date: dateStr,
        description: ""
      })
      setShowAddForm(true)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-500" />
            Días Festivos - {officeName}
          </DialogTitle>
          <DialogDescription>
            Gestiona los días festivos de la oficina. Los días marcados no podrán ser tomados como vacaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Navegación por pestañas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Días Festivos ({holidays.length})
                </h3>
                <TabsList>
                  <TabsTrigger value="calendar" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendario
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Lista Completa
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Carga Masiva
                  </TabsTrigger>
                </TabsList>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                disabled={isLoading}
                variant={activeTab === "bulk" ? "outline" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Individual
              </Button>
            </div>

            {/* Contenido del calendario y lista */}
            <TabsContent value="calendar" className="space-y-6 mt-0">
              <div className="text-sm text-muted-foreground">
                Haz clic en una fecha del calendario para agregar o editar un día festivo
              </div>

              {/* Calendario */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Calendario de Días Festivos</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-sm min-w-[150px] text-center">
                      {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  {/* Encabezados de días */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                      <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Días del mes */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Espacios vacíos para los días antes del primer día del mes */}
                    {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                      <div key={`empty-${i}`} className="h-10"></div>
                    ))}
                    
                    {/* Días del mes */}
                    {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                      const day = i + 1
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                      const isHoliday = isDateHoliday(date)
                      const holiday = getHolidayForDate(date)
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                      
                      let buttonClass = 'h-10 w-full p-1 text-sm cursor-pointer transition-colors '
                      
                      if (isHoliday) {
                        buttonClass += 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 rounded font-medium'
                      } else {
                        buttonClass += 'hover:bg-muted rounded'
                      }
                      
                      if (isPast) {
                        buttonClass += ' opacity-50'
                      }
                      
                      return (
                        <div
                          key={day}
                          className={buttonClass}
                          onClick={() => handleDateClick(date)}
                          title={
                            isHoliday 
                              ? `${holiday?.name} - Clic para editar`
                              : 'Clic para agregar día festivo'
                          }
                        >
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="text-xs">{day}</span>
                            {isHoliday && (
                              <div className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                      <span>Día festivo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-muted"></div>
                      <span>Día normal</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Contenido de lista completa */}
            <TabsContent value="list" className="space-y-4 mt-0">
              <div className="text-sm text-muted-foreground">
                Lista completa de todos los días festivos registrados para esta oficina
              </div>

              {/* Filtros y controles de la lista */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="search-holidays" className="text-sm font-medium">
                    Buscar:
                  </Label>
                  <input
                    id="search-holidays"
                    type="text"
                    placeholder="Buscar por nombre o fecha..."
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {filteredHolidays.length} días festivos
                </div>
              </div>

              {/* Tabla de días festivos */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Fecha</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">Descripción</TableHead>
                      <TableHead className="w-[100px] text-center">Estado</TableHead>
                      <TableHead className="w-[100px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHolidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No se encontraron días festivos que coincidan con la búsqueda' : 'No hay días festivos registrados'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHolidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full" />
                              {new Date(holiday.holiday_date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {holiday.name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {holiday.description || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={holiday.is_active ? "default" : "secondary"}
                              className={holiday.is_active ? "bg-green-100 text-green-800" : ""}
                            >
                              {holiday.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingHoliday(holiday)
                                  setEditForm({
                                    name: holiday.name,
                                    date: holiday.holiday_date,
                                    description: holiday.description || ''
                                  })
                                  setShowEditForm(true)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteHoliday(holiday.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Estadísticas adicionales */}
              {holidays.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {holidays.filter(h => h.is_active).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Días Activos</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {holidays.filter(h => !h.is_active).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Días Inactivos</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {holidays.filter(h => 
                        h.is_active && new Date(h.holiday_date) >= new Date()
                      ).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Próximos</div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Contenido de carga masiva */}
            <TabsContent value="bulk" className="mt-0">
              <BulkHolidayUpload
                officeCode={officeId}
                officeName={officeName}
                onConfirm={handleBulkUpload}
                onClose={() => setActiveTab("calendar")}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal para agregar/editar día festivo */}
      <Dialog open={showAddForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Editar Día Festivo" : "Nuevo Día Festivo"}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday 
                ? "Modifica los datos del día festivo"
                : "Agrega un nuevo día festivo para la oficina"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre del día festivo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: Día de la Independencia"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descripción adicional del día festivo..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Guardando..." : (editingHoliday ? "Actualizar" : "Crear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulario de edición */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Día Festivo</DialogTitle>
            <DialogDescription>
              Modifica los detalles del día festivo seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Ej: Día de la Independencia"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-date">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción (opcional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Descripción adicional del día festivo..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditForm(false)
                setEditingHoliday(null)
                setEditForm({ name: '', date: '', description: '' })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}