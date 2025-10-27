import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, RotateCcw, Calendar, User, Building, Hash } from 'lucide-react'
import type { ExEmployee } from "@/lib/supabase/db-functions"

interface ExEmployeeListProps {
  officeId: string
  onBack: () => void
}

export function ExEmployeeList({ officeId, onBack }: ExEmployeeListProps) {
  const [exEmployees, setExEmployees] = useState<ExEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedExEmployee, setSelectedExEmployee] = useState<ExEmployee | null>(null)

  const loadExEmployees = async () => {
    try {
      setLoading(true)
      const { getExEmployees } = await import("@/lib/supabase/db-functions")
      const data = await getExEmployees(officeId)
      setExEmployees(data)
    } catch (error) {
      console.error("Error cargando ex-empleados:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExEmployees()
  }, [officeId])

  const handleRestore = async (exEmployee: ExEmployee) => {
    setSelectedExEmployee(exEmployee)
    setRestoreDialogOpen(true)
  }

  const confirmRestore = async () => {
    if (!selectedExEmployee) return

    try {
      const { restoreExEmployee } = await import("@/lib/supabase/db-functions")
      const success = await restoreExEmployee(selectedExEmployee.id)
      
      if (success) {
        setRestoreDialogOpen(false)
        setSelectedExEmployee(null)
        await loadExEmployees() // Recargar lista
        console.log("Ex-empleado restaurado exitosamente")
      } else {
        console.error("Error al restaurar ex-empleado")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Empleados
          </Button>
          <h2 className="text-2xl font-bold">Ex-Empleados</h2>
        </div>
        <div className="text-center py-8">Cargando ex-empleados...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Empleados
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Ex-Empleados</h2>
            <p className="text-muted-foreground">
              Empleados que han sido removidos del sistema ({exEmployees.length} registros)
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Lista de Ex-Empleados */}
      {exEmployees.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay ex-empleados</h3>
              <p className="text-muted-foreground">
                No se han encontrado registros de ex-empleados para esta oficina.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exEmployees.map((exEmployee) => (
            <Card key={exEmployee.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{exEmployee.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {exEmployee.employee_code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Terminado: {formatDate(exEmployee.termination_date)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Ex-empleado</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(exEmployee)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Contratación</Label>
                    <p className="font-medium">{formatDate(exEmployee.hire_date)}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Terminación</Label>
                    <p className="font-medium">{formatDate(exEmployee.termination_date)}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Razón de Terminación</Label>
                    <p className="font-medium">{exEmployee.termination_reason || 'Sin especificar'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmación para Restaurar */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Ex-Empleado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres restaurar a <strong>{selectedExEmployee?.full_name}</strong>?
              <br />
              <br />
              Esto convertirá al ex-empleado en un empleado activo nuevamente con una nueva fecha de contratación.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmRestore}
              className="bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmar Restauración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}