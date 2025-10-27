import { OfficeHeader } from "@/components/office-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, PieChart, BarChart } from "lucide-react"
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

export default function ReportsPage({ params }: { params: { officeId: string } }) {
  const office = offices[params.officeId as keyof typeof offices]

  if (!office) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Reportes de {office.name}</h2>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Reporte</CardTitle>
              <CardDescription>Selecciona los parámetros para generar el reporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mes</label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Enero</SelectItem>
                    <SelectItem value="1">Febrero</SelectItem>
                    <SelectItem value="2">Marzo</SelectItem>
                    <SelectItem value="3">Abril</SelectItem>
                    <SelectItem value="4">Mayo</SelectItem>
                    <SelectItem value="5">Junio</SelectItem>
                    <SelectItem value="6">Julio</SelectItem>
                    <SelectItem value="7">Agosto</SelectItem>
                    <SelectItem value="8">Septiembre</SelectItem>
                    <SelectItem value="9">Octubre</SelectItem>
                    <SelectItem value="10">Noviembre</SelectItem>
                    <SelectItem value="11">Diciembre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Select defaultValue="2025">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    <SelectItem value="1">Juan Pérez</SelectItem>
                    <SelectItem value="2">María González</SelectItem>
                    <SelectItem value="3">Carlos Rodríguez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Generar Reporte</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Resumen de asistencia del mes actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span>Total de empleados:</span>
                  <span className="font-bold">5</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span>Días laborables:</span>
                  <span className="font-bold">22</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span>Asistencias registradas:</span>
                  <span className="font-bold">98</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span>Porcentaje de asistencia:</span>
                  <span className="font-bold">89%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="table">
          <TabsList className="mb-4">
            <TabsTrigger value="table">
              <FileText className="h-4 w-4 mr-2" />
              Tabla
            </TabsTrigger>
            <TabsTrigger value="chart">
              <BarChart className="h-4 w-4 mr-2" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="summary">
              <PieChart className="h-4 w-4 mr-2" />
              Resumen
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Reporte de Asistencia</CardTitle>
                <CardDescription>Datos de asistencia para Junio 2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    Selecciona los filtros y genera un reporte para ver los datos en formato de tabla.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Asistencia</CardTitle>
                <CardDescription>Visualización gráfica de la asistencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    Selecciona los filtros y genera un reporte para ver los datos en formato gráfico.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Asistencia</CardTitle>
                <CardDescription>Resumen estadístico de la asistencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4">
                  <p className="text-center text-muted-foreground">
                    Selecciona los filtros y genera un reporte para ver el resumen estadístico.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
