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
import { Badge } from "@/components/ui/badge"
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Edit2, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { Textarea } from "@/components/ui/textarea"

export interface BulkHolidayData {
  name: string
  holiday_date: string | Date
  description?: string
  row?: number
}

interface BulkHolidayUploadProps {
  officeCode: string
  officeName: string
  onConfirm: (holidays: BulkHolidayData[]) => Promise<void>
  onClose?: () => void
}

export function BulkHolidayUpload({ officeCode, officeName, onConfirm, onClose }: BulkHolidayUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [holidays, setHolidays] = useState<BulkHolidayData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const { toast } = useToast()

  // Función para descargar la plantilla Excel
  const downloadTemplate = () => {
    // Crear datos de ejemplo con días festivos comunes de México
    const templateData = [
      {
        "Nombre del Día Festivo": "Año Nuevo",
        "Fecha (DD/MM/YYYY)": "01/01/2024",
        "Descripción (Opcional)": "Día de Año Nuevo"
      },
      {
        "Nombre del Día Festivo": "Día de la Constitución",
        "Fecha (DD/MM/YYYY)": "05/02/2024",
        "Descripción (Opcional)": "Día de la Constitución Mexicana"
      },
      {
        "Nombre del Día Festivo": "Natalicio de Benito Juárez",
        "Fecha (DD/MM/YYYY)": "18/03/2024",
        "Descripción (Opcional)": "Natalicio de Benito Juárez"
      },
      {
        "Nombre del Día Festivo": "Día del Trabajador",
        "Fecha (DD/MM/YYYY)": "01/05/2024",
        "Descripción (Opcional)": "Día Internacional del Trabajador"
      },
      {
        "Nombre del Día Festivo": "Independencia de México",
        "Fecha (DD/MM/YYYY)": "16/09/2024",
        "Descripción (Opcional)": "Día de la Independencia de México"
      },
      {
        "Nombre del Día Festivo": "Revolución Mexicana",
        "Fecha (DD/MM/YYYY)": "18/11/2024",
        "Descripción (Opcional)": "Aniversario de la Revolución Mexicana"
      },
      {
        "Nombre del Día Festivo": "Navidad",
        "Fecha (DD/MM/YYYY)": "25/12/2024",
        "Descripción (Opcional)": "Día de Navidad"
      }
    ]

    // Crear libro de trabajo
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Días Festivos")

    // Configurar ancho de columnas
    ws["!cols"] = [
      { wch: 25 }, // Nombre del Día Festivo
      { wch: 20 }, // Fecha
      { wch: 35 }, // Descripción
    ]

    // Agregar comentario en la primera celda
    const cellA1 = ws["A1"]
    if (!cellA1.c) cellA1.c = []
    cellA1.c.push({
      a: "Sistema",
      t: `Plantilla para cargar días festivos masivamente en ${officeName}. Completa los datos y sube el archivo.`
    })

    // Descargar archivo
    XLSX.writeFile(wb, `plantilla-dias-festivos-${officeCode.toLowerCase()}.xlsx`)
    
    toast({
      title: "Plantilla descargada",
      description: "Completa los datos y vuelve a subir el archivo para cargar los días festivos masivamente"
    })
  }

  const processFile = async (file: File) => {
    try {
      setIsProcessing(true)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const newHolidays: BulkHolidayData[] = []
      const newErrors: string[] = []

      console.log("📊 Procesando archivo de días festivos con", data.length, "filas")

      // Procesar filas (omitir la primera que es el encabezado)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0 || !row[0]) continue

        const rowNumber = i + 1
        console.log(`📋 Procesando fila ${rowNumber}:`, row)

        // Extraer datos de la fila
        const name = String(row[0] || "").trim()
        const dateStr = String(row[1] || "").trim()
        const description = String(row[2] || "").trim()

        // Validar nombre requerido
        if (!name) {
          newErrors.push(`Fila ${rowNumber}: El nombre del día festivo es requerido`)
          continue
        }

        // Validar y convertir fecha
        if (!dateStr) {
          newErrors.push(`Fila ${rowNumber}: La fecha es requerida`)
          continue
        }

        let parsedDate: Date
        try {
          // Intentar parsear diferentes formatos de fecha
          if (dateStr.includes("/")) {
            // Formato DD/MM/YYYY o MM/DD/YYYY
            const [part1, part2, part3] = dateStr.split("/")
            // Asumir DD/MM/YYYY (formato más común en México)
            parsedDate = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
          } else if (dateStr.includes("-")) {
            // Formato YYYY-MM-DD o DD-MM-YYYY
            if (dateStr.length === 10 && dateStr.charAt(4) === '-') {
              // YYYY-MM-DD
              parsedDate = new Date(dateStr)
            } else {
              // DD-MM-YYYY
              const [part1, part2, part3] = dateStr.split("-")
              parsedDate = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
            }
          } else if (typeof row[1] === 'number') {
            // Fecha de Excel (número serial)
            parsedDate = new Date((row[1] - 25569) * 86400 * 1000)
          } else {
            throw new Error("Formato de fecha no reconocido")
          }

          // Validar que la fecha sea válida
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Fecha inválida")
          }

          // Validar que no sea una fecha muy antigua o muy futura
          const currentYear = new Date().getFullYear()
          const dateYear = parsedDate.getFullYear()
          if (dateYear < currentYear - 1 || dateYear > currentYear + 5) {
            throw new Error(`Año ${dateYear} fuera del rango válido (${currentYear-1} - ${currentYear+5})`)
          }

        } catch (error) {
          newErrors.push(`Fila ${rowNumber}: Formato de fecha inválido "${dateStr}". Use DD/MM/YYYY`)
          continue
        }

        // Crear objeto de día festivo
        const holiday: BulkHolidayData = {
          name: name,
          holiday_date: parsedDate.toISOString().split('T')[0], // YYYY-MM-DD
          description: description || undefined,
          row: rowNumber
        }

        newHolidays.push(holiday)
        console.log(`✅ Día festivo procesado: ${holiday.name} - ${holiday.holiday_date}`)
      }

      console.log(`📈 Procesamiento completado: ${newHolidays.length} días festivos, ${newErrors.length} errores`)

      if (newHolidays.length === 0 && newErrors.length === 0) {
        newErrors.push("El archivo no contiene datos válidos. Revisa el formato.")
      }

      setHolidays(newHolidays)
      setErrors(newErrors)
      setShowPreview(true)

      if (newErrors.length > 0) {
        toast({
          title: "Archivo procesado con errores",
          description: `Se encontraron ${newErrors.length} error(es). Revisa los detalles abajo.`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Archivo procesado exitosamente",
          description: `Se cargaron ${newHolidays.length} día(s) festivo(s). Revisa y confirma la información.`
        })
      }

    } catch (error) {
      console.error("Error procesando archivo:", error)
      setErrors([`Error procesando el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`])
      toast({
        title: "Error procesando archivo",
        description: "Verifica que el archivo tenga el formato correcto y vuelve a intentarlo",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validar tipo de archivo
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls')) {
      toast({
        title: "Formato de archivo inválido",
        description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
        variant: "destructive"
      })
      return
    }

    setFile(selectedFile)
    setShowPreview(false)
    setHolidays([])
    setErrors([])
    processFile(selectedFile)
  }

  const handleConfirm = async () => {
    if (holidays.length === 0) return

    try {
      setIsProcessing(true)
      await onConfirm(holidays)
      
      // Limpiar estado después de la confirmación exitosa
      setFile(null)
      setHolidays([])
      setErrors([])
      setShowPreview(false)
      
      // Resetear el input de archivo
      const fileInput = document.getElementById('holiday-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error("Error confirmando días festivos:", error)
      // El error ya se maneja en el componente padre
    } finally {
      setIsProcessing(false)
    }
  }

  const updateHoliday = (index: number, field: keyof BulkHolidayData, value: string) => {
    const updatedHolidays = [...holidays]
    if (field === 'holiday_date') {
      updatedHolidays[index] = { ...updatedHolidays[index], [field]: value }
    } else {
      updatedHolidays[index] = { ...updatedHolidays[index], [field]: value }
    }
    setHolidays(updatedHolidays)
  }

  const removeHoliday = (index: number) => {
    const updatedHolidays = holidays.filter((_, i) => i !== index)
    setHolidays(updatedHolidays)
  }

  const reset = () => {
    setFile(null)
    setHolidays([])
    setErrors([])
    setShowPreview(false)
    
    // Resetear el input de archivo
    const fileInput = document.getElementById('holiday-file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold">Carga Masiva de Días Festivos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Descarga la plantilla, completa los datos y sube el archivo para cargar múltiples días festivos
        </p>
      </div>

      {/* Paso 1: Descargar plantilla */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">1</Badge>
          <h3 className="font-medium">Descargar Plantilla Excel</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={downloadTemplate} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla - {officeName}
          </Button>
        </div>
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            La plantilla incluye ejemplos de días festivos comunes de México. 
            Puedes modificar, agregar o eliminar filas según tus necesidades.
          </AlertDescription>
        </Alert>
      </div>

      {/* Paso 2: Subir archivo */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">2</Badge>
          <h3 className="font-medium">Subir Archivo Completado</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="holiday-file-input">Seleccionar archivo Excel</Label>
          <Input
            id="holiday-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Archivo seleccionado: {file.name}</span>
          </div>
        )}
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Se encontraron {errors.length} error(es):</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Vista previa */}
      {showPreview && holidays.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">3</Badge>
              <h3 className="font-medium">Vista Previa - {holidays.length} Día(s) Festivo(s)</h3>
            </div>
            <Button onClick={reset} variant="ghost" size="sm">
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={holiday.name}
                        onChange={(e) => updateHoliday(index, 'name', e.target.value)}
                        placeholder="Nombre del día festivo"
                        className="min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={holiday.holiday_date.toString().split('T')[0]}
                        onChange={(e) => updateHoliday(index, 'holiday_date', e.target.value)}
                        className="min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={holiday.description || ''}
                        onChange={(e) => updateHoliday(index, 'description', e.target.value)}
                        placeholder="Descripción opcional"
                        rows={1}
                        className="min-w-[200px] resize-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHoliday(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Revisa los datos y haz las correcciones necesarias. Los días festivos se marcarán automáticamente 
              en el calendario y no podrán ser seleccionados como vacaciones.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={holidays.length === 0 || isProcessing}
        >
          {isProcessing ? "Procesando..." : `Cargar ${holidays.length} Día(s) Festivo(s)`}
        </Button>
      </div>
    </div>
  )
}