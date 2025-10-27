"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { OfficeHeader } from "@/components/office-header"
import { EmployeeList } from "@/components/employee-list"
import { EmployeeForm, EmployeeFormData } from "@/components/employee-form"
import { BulkEmployeeUpload, BulkEmployeeData } from "@/components/bulk-employee-upload"
import { ExEmployeeList } from "@/components/ex-employee-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Users, UserPlus, Upload, UserMinus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OFFICES } from "@/lib/types/auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { Employee } from "@/lib/supabase/db-functions"
import { getEmployeesByOfficeClient, addEmployee } from "@/lib/supabase/db-functions"
import { mapOfficeIdToUUID } from "@/lib/utils/office-mapping"
import { 
  normalizeText, 
  validateEmployeeData, 
  splitFullName, 
  generateEmployeeNumber 
} from "@/lib/utils/employee-validation"

export default function EmployeesPage() {
  const params = useParams()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("list")
  const [showExEmployees, setShowExEmployees] = useState(false)
  const { toast } = useToast()

  // Obtener officeId de los parámetros
  const officeId = typeof params.officeId === 'string' ? params.officeId : params.officeId?.[0] || ''
  
  // Encontrar la oficina actual
  const office = OFFICES.find((o) => o.code.toLowerCase() === officeId.toLowerCase())

  useEffect(() => {
    if (office) {
      loadEmployees()
    }
  }, [office])

  useEffect(() => {
    // Filtrar empleados basado en el término de búsqueda
    if (searchTerm.trim() === "") {
      setFilteredEmployees(employees)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(term) ||
          emp.position.toLowerCase().includes(term) ||
          emp.employee_number?.toLowerCase().includes(term)
      )
      setFilteredEmployees(filtered)
    }
  }, [searchTerm, employees])

  const loadEmployees = async () => {
    if (!office) return

    setIsLoading(true)

    try {
      console.log(`🔍 Loading employees for office: ${office.id}`)
      
      // 🏢 USAR FUNCIÓN ESPECÍFICA PARA CARGAR EMPLEADOS POR OFICINA
      const data = await getEmployeesByOfficeClient(office.id)
      
      console.log(`✅ Loaded ${data?.length || 0} employees for office ${office.code}`)
      setEmployees(data || [])
      setFilteredEmployees(data || [])
      
      // También guardar en localStorage como respaldo
      const storageKey = `employees_${office.code}`
      localStorage.setItem(storageKey, JSON.stringify(data || []))
      
    } catch (error) {
      console.error("Error loading employees:", error)
      
      // Mostrar mensaje específico basado en el tipo de error
      if (error instanceof Error) {
        if (error.message?.includes('invalid input syntax for type uuid')) {
          toast({
            title: "Error de Configuración",
            description: `La oficina ${office.code} no está configurada correctamente en la base de datos.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error de Conexión",
            description: `No se pudo cargar empleados: ${error.message}`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Error Inesperado",
          description: "Ocurrió un error al cargar los empleados. Usando datos locales.",
          variant: "destructive",
        })
      }
      
      // Fallback a localStorage en caso de error
      const storageKey = `employees_${office.code}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedEmployees = JSON.parse(stored)
        setEmployees(parsedEmployees)
        setFilteredEmployees(parsedEmployees)
      } else {
        setEmployees([])
        setFilteredEmployees([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmployee = async (data: EmployeeFormData) => {
    if (!office) return

    setIsLoading(true)

    try {
      // 🔤 NORMALIZAR Y VALIDAR DATOS
      const normalizedName = normalizeText(data.name)
      const normalizedPosition = normalizeText(data.position)
      
      console.log(`👤 Agregando empleado: ${normalizedName}`)
      
      // ✅ VALIDAR DATOS COMPLETOS
      const validation = validateEmployeeData(
        { ...data, name: normalizedName, position: normalizedPosition }, 
        employees
      )
      
      if (!validation.isValid) {
        toast({
          title: "Error de Validación",
          description: validation.errors.join('. '),
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      
      // 🔢 GENERAR NÚMERO DE EMPLEADO ÚNICO
      const employeeNumber = data.employee_number || generateEmployeeNumber(office.code, employees)

      // 📅 FORMATEAR FECHA - Evitar problemas UTC
      const hireDateFormatted = data.hire_date ? 
        (data.hire_date instanceof Date ? 
          `${data.hire_date.getFullYear()}-${String(data.hire_date.getMonth() + 1).padStart(2, '0')}-${String(data.hire_date.getDate()).padStart(2, '0')}` : 
          data.hire_date) : 
        undefined

      const realOfficeId = mapOfficeIdToUUID(office.id)
      
      // 🔧 SEPARAR NOMBRE Y APELLIDO
      const { firstName, lastName } = splitFullName(normalizedName)
      
      const newEmployeeData = {
        office_id: realOfficeId,
        first_name: firstName,
        last_name: lastName,
        employee_code: employeeNumber.toUpperCase(),
        position: normalizedPosition,
        department: 'GENERAL',
        hire_date: hireDateFormatted,
        email: undefined,
        phone: undefined, 
        address: undefined,
        is_active: true
      }

      console.log(`💾 Datos del empleado a guardar:`, newEmployeeData)

      // 🚀 GUARDAR EN BASE DE DATOS
      const savedEmployee = await addEmployee(newEmployeeData)

      if (savedEmployee) {
        console.log(`✅ Empleado guardado exitosamente: ${savedEmployee.id}`)
        
        // Recargar la lista de empleados
        await loadEmployees()
        
        toast({
          title: "✅ Empleado Agregado",
          description: `${normalizedName} ha sido agregado exitosamente.`,
        })
        
        // Cambiar a la pestaña de lista
        setActiveTab("list")
      }
    } catch (error) {
      console.error("Error adding employee:", error)
      
      if (error instanceof Error) {
        toast({
          title: "Error al Agregar Empleado",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo agregar el empleado.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!office) return

    try {
      console.log(`🗑️  Moviendo empleado ${employeeId} a ex-empleados...`)
      
      // Usar la nueva función que mueve a ex-empleados
      const { moveEmployeeToExEmployees } = await import("@/lib/supabase/db-functions")
      const success = await moveEmployeeToExEmployees(employeeId, "Eliminado por el usuario")

      if (success) {
        // Actualizar el estado local eliminando el empleado
        const updatedEmployees = employees.filter((emp) => emp.id !== employeeId)
        setEmployees(updatedEmployees)
        setFilteredEmployees(updatedEmployees)
        
        toast({
          title: "Empleado movido a ex-empleados",
          description: "El empleado ha sido removido del sistema pero se mantiene el registro histórico.",
        })
        
        // También actualizar localStorage
        const storageKey = `employees_${office.code}`
        localStorage.setItem(storageKey, JSON.stringify(updatedEmployees))
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el empleado. Por favor intenta de nuevo.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error eliminando empleado:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el empleado.",
        variant: "destructive",
      })
    }
  }

  const handleBulkUpload = async (bulkEmployees: BulkEmployeeData[]) => {
    if (!office) return

    setIsLoading(true)
    const supabase = createClientSupabaseClient()

    try {
      console.log(`📤 Iniciando carga masiva de ${bulkEmployees.length} empleados para ${office.name}`)
      const newEmployees: Employee[] = []

      // Procesar cada empleado de la carga masiva
      for (const bulkEmp of bulkEmployees) {
        console.log(`👤 Procesando empleado: ${bulkEmp.name}`)
        
        // Formatear fecha para Supabase (YYYY-MM-DD) - Evitar problemas UTC
        const hireDateFormatted =
          bulkEmp.hire_date instanceof Date
            ? `${bulkEmp.hire_date.getFullYear()}-${String(bulkEmp.hire_date.getMonth() + 1).padStart(2, '0')}-${String(bulkEmp.hire_date.getDate()).padStart(2, '0')}`
            : (typeof bulkEmp.hire_date === 'string' ? bulkEmp.hire_date : 
               (() => { const d = new Date(bulkEmp.hire_date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })())

        const realOfficeId = mapOfficeIdToUUID(office.id)
        
        // Extraer código de oficina para office_code
        const officeCode = office.code.toUpperCase()
        
        const newEmployeeData = {
          office_id: realOfficeId,
          first_name: bulkEmp.name.split(' ')[0] || bulkEmp.name,
          last_name: bulkEmp.name.split(' ').slice(1).join(' ') || '',
          employee_code: bulkEmp.employee_number,
          position: bulkEmp.position || "analista",
          department: 'General',
          hire_date: hireDateFormatted,
          email: null, // Cambiar de '' a null para evitar duplicados
          phone: null, // Cambiar de '' a null 
          address: null, // Cambiar de '' a null
        }

        console.log(`💾 Datos del empleado a guardar:`, newEmployeeData)

        // Intentar guardar en Supabase
        console.log(`🚀 Intentando guardar en Supabase...`)
        const { data: savedEmployee, error } = await supabase
          .from("employees")
          .insert(newEmployeeData)
          .select()
          .single()

        if (error) {
          console.error("❌ ERROR CRÍTICO AL GUARDAR EN SUPABASE:")
          console.error("   Mensaje:", error.message)
          console.error("   Detalles:", error.details)
          console.error("   Hint:", error.hint)
          console.error("   Código:", error.code)
          console.error("   Datos que causaron error:", JSON.stringify(newEmployeeData, null, 2))

          // Fallback a localStorage si Supabase falla
          const newEmployee: Employee = {
            id: crypto.randomUUID(),
            office_id: office.id,
            name: bulkEmp.name, // Para localStorage mantenemos el campo completo
            position: bulkEmp.position || "analista",
            employee_number: bulkEmp.employee_number,
            hire_date: bulkEmp.hire_date,
            active: true,
          }

          newEmployees.push(newEmployee)
          console.log(`💿 Guardado en localStorage como fallback`)
        } else {
          console.log(`✅ Empleado guardado exitosamente en Supabase:`, savedEmployee)
          newEmployees.push(savedEmployee)
        }
      }

      // Actualizar estado
      const updatedEmployees = [...employees, ...newEmployees]
      setEmployees(updatedEmployees)
      setFilteredEmployees(updatedEmployees)

      // Guardar en localStorage como respaldo
      const storageKey = `employees_${office.code}`
      localStorage.setItem(storageKey, JSON.stringify(updatedEmployees))

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${newEmployees.length} empleado(s) correctamente`,
      })

      // Volver a la pestaña de lista
      setActiveTab("list")
    } catch (error) {
      console.error("Error during bulk upload:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error durante la importación",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditEmployee = async (employeeId: string, data: EmployeeFormData) => {
    if (!office) return

    setIsLoading(true)
    const supabase = createClientSupabaseClient()

    try {
      // Formatear fecha para Supabase (YYYY-MM-DD) - Evitar problemas UTC
      const hireDateFormatted = data.hire_date
        ? data.hire_date instanceof Date
          ? `${data.hire_date.getFullYear()}-${String(data.hire_date.getMonth() + 1).padStart(2, '0')}-${String(data.hire_date.getDate()).padStart(2, '0')}`
          : data.hire_date
        : null

      const updatedEmployeeData = {
        first_name: data.name.split(' ')[0] || data.name,
        last_name: data.name.split(' ').slice(1).join(' ') || '',
        employee_code: data.employee_number,
        position: data.position,
        hire_date: hireDateFormatted,
        updated_at: new Date().toISOString(),
      }

      // Intentar actualizar en Supabase
      const { data: updatedEmployee, error } = await supabase
        .from("employees")
        .update(updatedEmployeeData)
        .eq("id", employeeId)
        .select()
        .single()

      if (error) {
        console.error("Error updating in Supabase, using localStorage:", error)

        // Fallback a localStorage si Supabase falla
        const storageKey = `employees_${office.code}`
        const updatedEmployees = employees.map((emp) =>
          emp.id === employeeId ? { ...emp, ...data, hire_date: data.hire_date, employee_comments: data.comments } : emp
        )
        localStorage.setItem(storageKey, JSON.stringify(updatedEmployees))

        setEmployees(updatedEmployees)
        setFilteredEmployees(updatedEmployees)
      } else {
        // Actualizar con datos de Supabase
        const updatedEmployees = employees.map((emp) => (emp.id === employeeId ? updatedEmployee : emp))
        setEmployees(updatedEmployees)
        setFilteredEmployees(updatedEmployees)
      }

      toast({
        title: "Empleado actualizado",
        description: `${data.name} ha sido actualizado exitosamente`,
      })
    } catch (error) {
      console.error("Error updating employee:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el empleado. Por favor intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!office) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Oficina no encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        {showExEmployees ? (
          <ExEmployeeList 
            officeId={officeId}
            onBack={() => setShowExEmployees(false)}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Empleados de {office.name}</h2>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowExEmployees(true)}
                  className="gap-2"
                >
                  <UserMinus className="h-4 w-4" />
                  Ex-Empleados
                </Button>
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <Users className="h-4 w-4" />
                    Lista ({employees.length})
                  </TabsTrigger>
                  <TabsTrigger value="add" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Nuevo Empleado
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Carga Masiva
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

          <TabsContent value="list" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, puesto o número de empleado..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredEmployees.length > 0 ? (
              <EmployeeList 
                employees={filteredEmployees} 
                onDeleteEmployee={handleDeleteEmployee}
                onEditEmployee={handleEditEmployee}
                officeCode={office.code}
                officeName={office.name}
              />
            ) : employees.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No hay empleados registrados</p>
                <p className="text-muted-foreground mb-4">Comienza agregando tu primer empleado</p>
                <Button onClick={() => setActiveTab("add")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Empleado
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No se encontraron resultados</p>
                <p className="text-muted-foreground">
                  No hay empleados que coincidan con &quot;{searchTerm}&quot;
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add">
            <EmployeeForm
              officeCode={office.code}
              officeName={office.name}
              onSubmit={handleAddEmployee}
              onCancel={() => setActiveTab("list")}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkEmployeeUpload
              officeCode={office.code}
              officeName={office.name}
              onConfirm={handleBulkUpload}
              onClose={() => setActiveTab("list")}
            />
          </TabsContent>
        </Tabs>
        )}
      </main>
    </div>
  )
}
