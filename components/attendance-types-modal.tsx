"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  Clock,
  AlertCircle 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { type AttendanceType } from "@/lib/supabase/db-functions"

interface AttendanceTypesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendanceTypes: AttendanceType[]
  onTypesUpdated: () => void
}

interface AttendanceTypeForm {
  id?: string
  code: string
  name: string
  description: string
  color: string
  hours_value: number
  is_paid: boolean
  requires_approval: boolean
  is_system: boolean
  is_active: boolean
}

const DEFAULT_COLORS = [
  '#22c55e', '#ef4444', '#f59e0b', '#6b7280', '#8b5cf6',
  '#06b6d4', '#ec4899', '#94a3b8', '#10b981', '#f97316'
]

export function AttendanceTypesModal({
  open,
  onOpenChange,
  attendanceTypes,
  onTypesUpdated
}: AttendanceTypesModalProps) {
  const { toast } = useToast()
  
  // Estados
  const [editingType, setEditingType] = useState<AttendanceTypeForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const resetForm = () => {
    setEditingType({
      code: '',
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      hours_value: 8.0,
      is_paid: true,
      requires_approval: false,
      is_system: false,
      is_active: true
    })
  }

  const handleEdit = (type: AttendanceType) => {
    setEditingType({
      id: type.id,
      code: type.code || '',
      name: type.name || '',
      description: type.description || '',
      color: type.color || DEFAULT_COLORS[0],
      hours_value: type.hours_value || 8.0,
      is_paid: type.is_paid || false,
      requires_approval: type.requires_approval || false,
      is_system: type.is_system || false,
      is_active: type.is_active !== false
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!editingType) return

    // Validaciones básicas
    if (!editingType.code.trim() || !editingType.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El código y nombre son requeridos",
        variant: "destructive",
      })
      return
    }

    // Validar código único
    const codeExists = attendanceTypes.some(
      type => type.code?.toLowerCase() === editingType.code.toLowerCase() && type.id !== editingType.id
    )
    
    if (codeExists) {
      toast({
        title: "Código duplicado",
        description: "Ya existe un tipo con ese código",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Aquí iría la llamada a la API para guardar
      // await upsertAttendanceType(editingType)
      
      toast({
        title: editingType.id ? "Tipo actualizado" : "Tipo creado",
        description: `El tipo "${editingType.name}" ha sido ${editingType.id ? 'actualizado' : 'creado'} correctamente`,
      })
      
      setShowForm(false)
      setEditingType(null)
      onTypesUpdated()
      
    } catch (error) {
      console.error('Error guardando tipo:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el tipo de asistencia",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type: AttendanceType) => {
    if (type.is_system) {
      toast({
        title: "No se puede eliminar",
        description: "Los tipos del sistema no se pueden eliminar",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Aquí iría la llamada a la API para eliminar
      // await deleteAttendanceType(type.id)
      
      toast({
        title: "Tipo eliminado",
        description: `El tipo "${type.name}" ha sido eliminado`,
      })
      
      onTypesUpdated()
      
    } catch (error) {
      console.error('Error eliminando tipo:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el tipo de asistencia",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gestión de Tipos de Asistencia
          </DialogTitle>
          <DialogDescription>
            Administra los tipos de día de trabajo disponibles para todas las oficinas
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 h-[500px]">
          {/* Lista de tipos existentes */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tipos Existentes</h3>
              <Button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Tipo
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {attendanceTypes.map((type) => (
                  <Card key={type.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: type.color }}
                          >
                            {type.code}
                          </div>
                          <div>
                            <p className="font-medium">{type.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {type.hours_value || 0} horas
                              {type.is_paid && <Badge variant="outline" className="text-xs">Remunerado</Badge>}
                              {type.requires_approval && <Badge variant="outline" className="text-xs">Requiere aprobación</Badge>}
                              {type.is_system && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                            disabled={saving}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!type.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(type)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Formulario de edición */}
          {showForm && editingType && (
            <div className="flex-1 border-l pl-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingType.id ? 'Editar Tipo' : 'Nuevo Tipo'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {/* Código */}
                  <div>
                    <Label htmlFor="code">Código (máx. 10 caracteres)</Label>
                    <Input
                      id="code"
                      value={editingType.code}
                      onChange={(e) => setEditingType({
                        ...editingType,
                        code: e.target.value.toUpperCase().slice(0, 10)
                      })}
                      placeholder="Ej: R, I, LM"
                      maxLength={10}
                    />
                  </div>

                  {/* Nombre */}
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={editingType.name}
                      onChange={(e) => setEditingType({
                        ...editingType,
                        name: e.target.value
                      })}
                      placeholder="Ej: Día Regular"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={editingType.description}
                      onChange={(e) => setEditingType({
                        ...editingType,
                        description: e.target.value
                      })}
                      placeholder="Descripción opcional del tipo"
                      rows={3}
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditingType({
                            ...editingType,
                            color
                          })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            editingType.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Input
                      type="color"
                      value={editingType.color}
                      onChange={(e) => setEditingType({
                        ...editingType,
                        color: e.target.value
                      })}
                      className="w-20 h-8 mt-2"
                    />
                  </div>

                  {/* Horas */}
                  <div>
                    <Label htmlFor="hours">Horas de trabajo</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={editingType.hours_value}
                      onChange={(e) => setEditingType({
                        ...editingType,
                        hours_value: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>

                  {/* Switches */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_paid">Es remunerado</Label>
                      <Switch
                        id="is_paid"
                        checked={editingType.is_paid}
                        onCheckedChange={(checked) => setEditingType({
                          ...editingType,
                          is_paid: checked
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="requires_approval">Requiere aprobación</Label>
                      <Switch
                        id="requires_approval"
                        checked={editingType.requires_approval}
                        onCheckedChange={(checked) => setEditingType({
                          ...editingType,
                          requires_approval: checked
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Activo</Label>
                      <Switch
                        id="is_active"
                        checked={editingType.is_active}
                        onCheckedChange={(checked) => setEditingType({
                          ...editingType,
                          is_active: checked
                        })}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Los cambios afectan a todas las oficinas. Los registros anteriores no se modifican.
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}