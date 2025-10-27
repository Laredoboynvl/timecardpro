import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Plus, Trash2 } from "lucide-react"
import { notFound } from "next/navigation"

// Actualizar el objeto de oficinas para reflejar los centros de atención a solicitantes en México

// Reemplazar el objeto de oficinas con:
const offices = {
  tijuana: { id: "tijuana", name: "Tijuana" },
  nogales: { id: "nogales", name: "Nogales" },
  "ciudad-juarez": { id: "ciudad-juarez", name: "Ciudad Juárez" },
  monterrey: { id: "monterrey", name: "Monterrey" },
  "nuevo-laredo": { id: "nuevo-laredo", name: "Nuevo Laredo" },
  matamoros: { id: "matamoros", name: "Matamoros" },
  hermosillo: { id: "hermosillo", name: "Hermosillo" },
  guadalajara: { id: "guadalajara", name: "Guadalajara" },
  cdmx: { id: "cdmx", name: "CDMX" },
  merida: { id: "merida", name: "Mérida" },
}

// Datos de ejemplo para horarios
const schedules = [
  {
    id: "1",
    name: "Horario Regular",
    startTime: "09:00",
    endTime: "18:00",
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  },
  {
    id: "2",
    name: "Medio Tiempo",
    startTime: "09:00",
    endTime: "13:00",
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  },
  { id: "3", name: "Fin de Semana", startTime: "10:00", endTime: "15:00", days: ["Sábado", "Domingo"] },
]

export default function SchedulesPage({ params }: { params: { officeId: string } }) {
  const office = offices[params.officeId as keyof typeof offices]

  if (!office) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Horarios de Trabajo</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Horario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Horarios Disponibles</CardTitle>
            <CardDescription>Estos horarios son comunes para todas las oficinas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Hora de Entrada</TableHead>
                  <TableHead>Hora de Salida</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>{schedule.startTime}</TableCell>
                    <TableCell>{schedule.endTime}</TableCell>
                    <TableCell>{schedule.days.join(", ")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Asignación de Horarios</CardTitle>
              <CardDescription>Asigna horarios a los empleados de esta oficina</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Selecciona un empleado y asígnale un horario de trabajo.</p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Asignar Horario
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
