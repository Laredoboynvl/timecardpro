// Utilidades para manejo de empleados con validaciones y conversión a mayúsculas

/**
 * Convierte un texto a mayúsculas y elimina espacios extra
 */
export function normalizeText(text: string): string {
  return text.toUpperCase().trim().replace(/\s+/g, ' ')
}

/**
 * Genera un número de empleado único para una oficina
 */
export function generateEmployeeNumber(officeCode: string, existingEmployees: any[]): string {
  const baseNumber = existingEmployees.length + 1
  let counter = baseNumber
  let proposedNumber = `${officeCode.toUpperCase()}-${String(counter).padStart(4, "0")}`
  
  // Verificar que el número no esté en uso
  while (existingEmployees.some(emp => emp.employee_code === proposedNumber || emp.employee_number === proposedNumber)) {
    counter++
    proposedNumber = `${officeCode.toUpperCase()}-${String(counter).padStart(4, "0")}`
  }
  
  return proposedNumber
}

/**
 * Valida si un nombre completo ya existe en la lista de empleados
 */
export function validateUniqueEmployeeName(
  fullName: string, 
  existingEmployees: any[], 
  excludeId?: string
): { isValid: boolean; error?: string } {
  const normalizedName = normalizeText(fullName)
  
  if (!normalizedName || normalizedName.length < 2) {
    return {
      isValid: false,
      error: "El nombre debe tener al menos 2 caracteres"
    }
  }
  
  const duplicateEmployee = existingEmployees.find(emp => {
    if (excludeId && emp.id === excludeId) return false
    const existingFullName = normalizeText(`${emp.first_name} ${emp.last_name}`)
    return existingFullName === normalizedName
  })
  
  if (duplicateEmployee) {
    return {
      isValid: false,
      error: `Ya existe un empleado con el nombre "${normalizedName}" en esta oficina`
    }
  }
  
  return { isValid: true }
}

/**
 * Separa un nombre completo en nombre y apellido
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const normalizedName = normalizeText(fullName)
  const nameParts = normalizedName.split(' ')
  
  return {
    firstName: nameParts[0] || normalizedName,
    lastName: nameParts.slice(1).join(' ') || ''
  }
}

/**
 * Valida los datos de un empleado antes de guardar
 */
export function validateEmployeeData(
  data: any,
  existingEmployees: any[],
  excludeId?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validar nombre
  const nameValidation = validateUniqueEmployeeName(data.name, existingEmployees, excludeId)
  if (!nameValidation.isValid && nameValidation.error) {
    errors.push(nameValidation.error)
  }
  
  // Validar posición
  if (!data.position || normalizeText(data.position).length < 2) {
    errors.push("La posición debe tener al menos 2 caracteres")
  }
  
  // Validar fecha de contratación
  if (data.hire_date) {
    const hireDate = new Date(data.hire_date)
    const today = new Date()
    
    if (hireDate > today) {
      errors.push("La fecha de contratación no puede ser futura")
    }
    
    const minDate = new Date('1950-01-01')
    if (hireDate < minDate) {
      errors.push("La fecha de contratación no puede ser anterior a 1950")
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}