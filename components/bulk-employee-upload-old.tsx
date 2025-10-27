"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Edit2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"

export interface BulkEmployeeData {
  employee_number: string
  name: string
  hire_date: string | Date
  position?: string
  row?: number
}

interface BulkEmployeeUploadProps {
  officeCode: string
  officeName: string
  onConfirm: (employees: BulkEmployeeData[]) => Promise<void>
  onClose?: () => void
}

const POSITIONS = [
  { value: "analista", label: "Analista" },
  { value: "supervisor", label: "Supervisor" },
  { value: "spoc", label: "SPOC" },
]

export function BulkEmployeeUpload({ officeCode, officeName, onConfirm, onClose }: BulkEmployeeUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [employees, setEmployees] = useState<BulkEmployeeData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const { toast } = useToast()

  // Función para descargar la plantilla Excel
  const downloadTemplate = () => {
    // Crear datos de ejemplo
    const templateData = [
      {
        "Número de Empleado": `${officeCode.toUpperCase()}-0001`,
        "Nombre Completo": "Juan Pérez González",
        "Fecha de Ingreso (DD/MM/YYYY)": "15/03/2020",
      },
      {
        "Número de Empleado": `${officeCode.toUpperCase()}-0002`,
        "Nombre Completo": "María López Martínez",
        "Fecha de Ingreso (DD/MM/YYYY)": "20/06/2019",
      },
      {
        "Número de Empleado": `${officeCode.toUpperCase()}-0003`,
        "Nombre Completo": "Carlos Rodríguez Silva",
        "Fecha de Ingreso (DD/MM/YYYY)": "10/01/2021",
      },
    ]

    // Crear libro de trabajo
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Empleados")

    // Configurar ancho de columnas
    ws["!cols"] = [
      { wch: 20 }, // Número de Empleado
      { wch: 25 }, // Nombre Completo
      { wch: 20 }, // Fecha de Ingreso
    ]

    // Descargar archivo
    XLSX.writeFile(wb, `plantilla-empleados-${officeCode.toLowerCase()}.xlsx`)
  }

  const processFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const newEmployees: BulkEmployeeData[] = []
      const newErrors: string[] = []

      // Procesar filas (omitir la primera que es el encabezado)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0 || !row[0]) continue

        const employeeNumber = row[0]?.toString().trim()
        const name = row[1]?.toString().trim()
        const hireDateStr = row[2]?.toString().trim()

        if (!employeeNumber || !name || !hireDateStr) {
          newErrors.push(`Fila ${i + 1}: Faltan datos requeridos (número, nombre o fecha)`)
          continue
        }

        // Parsear fecha
        let hireDate: Date
        try {
          // Intentar parsear fecha en formato DD/MM/YYYY
          const [day, month, year] = hireDateStr.split("/")
          if (day && month && year) {
            hireDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            hireDate = new Date(hireDateStr)
          }
          
          if (isNaN(hireDate.getTime())) {
            throw new Error("Fecha inválida")
          }
        } catch {
          newErrors.push(`Fila ${i + 1}: Fecha de ingreso inválida: "${hireDateStr}"`)
          continue
        }

        newEmployees.push({
          employee_number: employeeNumber,
          name,
          hire_date: hireDate,
          position: "analista",
          row: i + 1,
        })
      }

      setEmployees(newEmployees)
      setErrors(newErrors)
      setShowPreview(true)

      if (newEmployees.length === 0) {
        toast({
          title: "Sin empleados válidos",
          description: "No se encontraron empleados válidos en el archivo",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error al procesar archivo",
        description: "No se pudo leer el archivo Excel",
        variant: "destructive",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const updateEmployee = (index: number, field: keyof BulkEmployeeData, value: any) => {
    const updatedEmployees = [...employees]
    updatedEmployees[index] = { ...updatedEmployees[index], [field]: value }
    setEmployees(updatedEmployees)
  }

  const removeEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    if (employees.length === 0) return

    setIsProcessing(true)
    try {
      await onConfirm(employees)
      
      // Limpiar estado
      setFile(null)
      setEmployees([])
      setShowPreview(false)
      setErrors([])
      
      // Llamar a onClose si existe
      if (onClose) {
        onClose()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error durante la importación",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (date: Date | string): string => {
    if (typeof date === "string") {
      date = new Date(date)
    }
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Carga Masiva de Empleados - {officeName}
          </h3>
          <p className="text-muted-foreground mt-2">
            Descarga la plantilla, llénala con los datos de tus empleados y súbela para importar múltiples empleados a la vez
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Volver a Lista
        </Button>
      </div>

      <div className="space-y-6">
        {/* Paso 1: Descargar plantilla */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Paso 1: Descargar Plantilla</Label>
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla Excel
          </Button>
          <p className="text-sm text-muted-foreground">
            Descarga la plantilla, ábrela en Excel/Google Sheets y llena los datos de tus empleados.
          </p>
        </div>

        {/* Paso 2: Subir archivo */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Paso 2: Subir Archivo Completado</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Selecciona tu archivo Excel completado
              </p>
            </div>
          </div>
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Se encontraron {errors.length} error(es):</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Vista previa */}
        {showPreview && employees.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Paso 3: Vista Previa y Confirmación</Label>
              <Badge variant="secondary">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {employees.length} empleado(s) listo(s)
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Empleado</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Fecha de Ingreso</TableHead>
                    <TableHead className="w-[80px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{emp.employee_number}</TableCell>
                      <TableCell>
                        <Input
                          value={emp.name}
                          onChange={(e) => updateEmployee(index, "name", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={emp.position}
                          onValueChange={(value) => updateEmployee(index, "position", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITIONS.map((position) => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={
                            emp.hire_date instanceof Date
                              ? emp.hire_date.toISOString().split("T")[0]
                              : new Date(emp.hire_date).toISOString().split("T")[0]
                          }
                          onChange={(e) => updateEmployee(index, "hire_date", new Date(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmployee(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </Button>
        {showPreview && employees.length > 0 && (
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? "Guardando..." : `Confirmar e Importar ${employees.length} Empleado(s)`}
          </Button>
        )}
      </div>
    </div>
  )
}