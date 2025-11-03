"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, AlertTriangle, Calendar, Hash, MessageSquare } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { EmployeeForm, EmployeeFormData } from "./employee-form"

// Función helper para parsear fechas sin problemas de UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

interface Employee {
  id: string
  name: string
  position: string
  employee_number?: string
  hire_date?: Date | string
  employee_comments?: string
  office_tag?: string
}

interface EmployeeListProps {
  employees: Employee[]
  onDeleteEmployee?: (employeeId: string) => void
  onEditEmployee?: (employeeId: string, data: EmployeeFormData) => void
  officeCode?: string
  officeName?: string
}

export function EmployeeList({ 
  employees, 
  onDeleteEmployee, 
  onEditEmployee,
  officeCode = "",
  officeName = ""
}: EmployeeListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [secondConfirmDialogOpen, setSecondConfirmDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null)
  const { toast } = useToast()

  // Función para obtener iniciales del nombre
  const getInitials = (name: string) => {
    if (!name) return "??"

    return name
      .split(" ")
      .map((part) => part[0] || "")
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (employee: Employee) => {
    setEmployeeToEdit(employee)
    setEditDialogOpen(true)
  }

  const confirmDelete = () => {
    // Primera confirmación: cerrar primer diálogo y abrir segundo
    setDeleteDialogOpen(false)
    setSecondConfirmDialogOpen(true)
  }

  const finalConfirmDelete = () => {
    if (employeeToDelete && onDeleteEmployee) {
      onDeleteEmployee(employeeToDelete.id)
      toast({
        title: "Empleado eliminado",
        description: `${employeeToDelete.name} ha sido removido del sistema. Sus datos de vacaciones han sido eliminados, pero el historial de asistencia se mantiene.`,
      })
    }
    setSecondConfirmDialogOpen(false)
    setEmployeeToDelete(null)
  }

  const cancelSecondConfirm = () => {
    setSecondConfirmDialogOpen(false)
    setEmployeeToDelete(null)
  }

  const handleEditSubmit = (data: EmployeeFormData) => {
    if (employeeToEdit && onEditEmployee) {
      onEditEmployee(employeeToEdit.id, data)
      setEditDialogOpen(false)
      setEmployeeToEdit(null)
    }
  }

  const formatHireDate = (date: Date | string | undefined) => {
    if (!date) return null
    try {
      let dateObj: Date
      if (typeof date === "string") {
        // Parsear fecha localmente sin UTC
        dateObj = parseLocalDate(date)
      } else {
        dateObj = date
      }
      return format(dateObj, "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return null
    }
  }

  const calculateYearsOfService = (hireDate: Date | string | undefined) => {
    if (!hireDate) return null
    try {
      let dateObj: Date
      if (typeof hireDate === "string") {
        // Parsear fecha localmente sin UTC
        dateObj = parseLocalDate(hireDate)
      } else {
        dateObj = hireDate
      }
      
      const today = new Date()
      let years = today.getFullYear() - dateObj.getFullYear()
      const monthDiff = today.getMonth() - dateObj.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
        years--
      }
      
      if (years < 1) {
        const months = Math.max(0, monthDiff + (years < 0 ? 12 : 0))
        return months <= 0 ? "Menos de 1 mes" : `${months} ${months === 1 ? "mes" : "meses"}`
      }
      return `${years} ${years === 1 ? "año" : "años"}`
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg">{getInitials(employee.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg">{employee.name}</p>
                    {employee.office_tag && (
                      <Badge variant="secondary" className="text-xs">
                        {employee.office_tag.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {employee.employee_number && (
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Hash className="h-4 w-4" />
                      <span>No. {employee.employee_number}</span>
                    </div>
                  )}
                  {employee.hire_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatHireDate(employee.hire_date)}
                        {calculateYearsOfService(employee.hire_date) && (
                          <span className="ml-1 text-xs">
                            ({calculateYearsOfService(employee.hire_date)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {employee.employee_comments && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{employee.employee_comments}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(employee)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(employee)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {employees.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No hay empleados registrados</div>
      )}

      {/* Diálogo de confirmación para eliminar empleado - PRIMERA CONFIRMACIÓN */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas eliminar a {employeeToDelete?.name}?</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Esta acción moverá al empleado a <strong>Ex-Empleados</strong> y realizará los siguientes cambios:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm font-semibold text-red-800 mb-2">Se eliminará permanentemente:</p>
              <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                <li>Todas sus solicitudes de vacaciones (pendientes y aprobadas)</li>
                <li>Todos sus ciclos de vacaciones</li>
                <li>Acceso al sistema</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-800 mb-2">Se mantendrá:</p>
              <ul className="list-disc pl-5 text-sm text-green-700 space-y-1">
                <li>Historial de asistencia completo</li>
                <li>Registro en Ex-Empleados</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEGUNDA CONFIRMACIÓN - Más estricta */}
      <Dialog open={secondConfirmDialogOpen} onOpenChange={setSecondConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              ¡ADVERTENCIA FINAL!
            </DialogTitle>
            <DialogDescription className="text-base">
              Estás a punto de eliminar permanentemente a <strong className="text-red-600">{employeeToDelete?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4">
              <p className="text-sm font-bold text-red-900 mb-2">⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER</p>
              <p className="text-sm text-red-800">
                Se eliminarán TODAS las solicitudes de vacaciones y ciclos del empleado. 
                El empleado no podrá iniciar sesión y será movido a Ex-Empleados.
              </p>
            </div>
            <p className="text-sm text-center font-semibold">
              ¿Confirmas que deseas proceder con la eliminación definitiva?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelSecondConfirm} className="flex-1">
              No, Cancelar
            </Button>
            <Button variant="destructive" onClick={finalConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-700">
              Sí, Eliminar Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición de empleado */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Actualiza la información de {employeeToEdit?.name}
            </DialogDescription>
          </DialogHeader>
          {employeeToEdit && (
            <EmployeeForm
              officeCode={officeCode}
              officeName={officeName}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditDialogOpen(false)}
              initialData={{
                name: employeeToEdit.name,
                position: employeeToEdit.position,
                employee_number: employeeToEdit.employee_number || "",
                hire_date: employeeToEdit.hire_date 
                  ? typeof employeeToEdit.hire_date === 'string' 
                    ? parseLocalDate(employeeToEdit.hire_date)
                    : employeeToEdit.hire_date
                  : undefined,
                comments: employeeToEdit.employee_comments,
              }}
              submitLabel="Actualizar Empleado"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
