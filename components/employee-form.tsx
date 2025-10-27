"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Plus, X, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Puestos disponibles
const POSITIONS = [
  { value: "analista", label: "Analista" },
  { value: "supervisor", label: "Supervisor" },
  { value: "team_leader", label: "Team Leader" },
  { value: "spoc", label: "SPOC" },
  { value: "rh", label: "RH" },
] as const

export interface EmployeeFormData {
  name: string
  employee_number: string
  hire_date: Date | undefined
  position: string
  comments?: string
}

interface EmployeeFormProps {
  officeCode: string
  officeName: string
  onSubmit: (data: EmployeeFormData) => void
  onCancel?: () => void
  isLoading?: boolean
  initialData?: EmployeeFormData
  submitLabel?: string
}

export function EmployeeForm({ 
  officeCode, 
  officeName, 
  onSubmit, 
  onCancel, 
  isLoading,
  initialData,
  submitLabel = "Agregar Empleado"
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>(
    initialData || {
      name: "",
      employee_number: "",
      hire_date: undefined,
      position: "",
      comments: "",
    }
  )

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "El nombre completo es requerido"
    }

    if (!formData.position || formData.position.trim().length === 0) {
      newErrors.position = "El puesto es requerido"
    }

    if (!formData.employee_number || formData.employee_number.trim().length === 0) {
      newErrors.employee_number = "El número de empleado es requerido"
    }

    if (!formData.hire_date) {
      newErrors.hire_date = "La fecha de ingreso es requerida"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      // NO agregar tag al nombre, solo enviarlo como está
      onSubmit({
        ...formData,
      })
    }
  }

  const handleReset = () => {
    setFormData({
      name: "",
      employee_number: "",
      hire_date: undefined,
      position: "",
      comments: "",
    })
    setErrors({})
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Empleado
        </CardTitle>
        <CardDescription>
          Captura la información del nuevo empleado para <strong>{officeName}</strong>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Nombre Completo */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Juan Pérez González"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                setErrors({ ...errors, name: "" })
              }}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Número de Empleado */}
          <div className="space-y-2">
            <Label htmlFor="employee_number">
              Número de Empleado <span className="text-destructive">*</span>
            </Label>
            <Input
              id="employee_number"
              placeholder={`Ej: ${officeCode.toUpperCase()}-0001`}
              value={formData.employee_number}
              onChange={(e) => {
                setFormData({ ...formData, employee_number: e.target.value })
                setErrors({ ...errors, employee_number: "" })
              }}
              className={errors.employee_number ? "border-destructive" : ""}
            />
            {errors.employee_number && (
              <p className="text-sm text-destructive">{errors.employee_number}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Debe ser único en esta oficina
            </p>
          </div>

          {/* Puesto */}
          <div className="space-y-2">
            <Label htmlFor="position">
              Puesto <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.position}
              onValueChange={(value) => {
                setFormData({ ...formData, position: value })
                setErrors({ ...errors, position: "" })
              }}
            >
              <SelectTrigger className={errors.position ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecciona un puesto" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.position && <p className="text-sm text-destructive">{errors.position}</p>}
          </div>

          {/* Fecha de Ingreso */}
          <div className="space-y-2">
            <Label>
              Fecha de Ingreso <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.hire_date && "text-muted-foreground",
                    errors.hire_date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.hire_date ? (
                    format(formData.hire_date, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.hire_date}
                  onSelect={(date) => {
                    setFormData({ ...formData, hire_date: date })
                    setErrors({ ...errors, hire_date: "" })
                  }}
                  initialFocus
                  locale={es}
                  disabled={(date) => date > new Date()}
                  defaultMonth={formData.hire_date || new Date(new Date().getFullYear() - 5, 0, 1)}
                  captionLayout="dropdown-buttons"
                  fromYear={1990}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
            {errors.hire_date && <p className="text-sm text-destructive">{errors.hire_date}</p>}
            <p className="text-xs text-muted-foreground">
              Usa los selectores de mes y año para navegar rápidamente a fechas antiguas
            </p>
          </div>

          {/* Comentarios */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea
              id="comments"
              placeholder="Información adicional sobre el empleado (opcional)"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Este empleado solo será visible en la oficina de {officeName}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
              Limpiar
            </Button>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
