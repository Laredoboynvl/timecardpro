// Types for DS-160 Form
export interface DS160FormData {
  // Personal Information
  firstName: string
  middleName: string
  lastName: string
  otherNames: string
  dateOfBirth: string
  cityOfBirth: string
  countryOfBirth: string
  nationality: string
  
  // Consulate and CAS Information
  consulate: string
  casOffice: string
  
  // Address Information
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  
  // Contact Information
  phone: string
  email: string
  
  // Travel Information
  purposeOfTrip: string
  intendedDateOfArrival: string
  intendedLengthOfStay: string
  
  // Work Information
  currentOccupation: string
  currentEmployer: string
  employerAddress: string
}

export interface DS160StepProgress {
  id: string
  formId: string
  stepName: string
  completed: boolean
  createdAt: string
}

export interface DS160FormLog {
  id: string
  formId: string
  action: string
  details: string
  userId: string
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

// Form validation types
export interface DS160ValidationError {
  field: keyof DS160FormData
  message: string
}

export interface DS160FormSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  fields: (keyof DS160FormData)[]
  required: (keyof DS160FormData)[]
}

// Dropdown options
export interface DropdownOption {
  value: string
  label: string
}

// Form status
export type DS160FormStatus = 'draft' | 'in_progress' | 'completed' | 'submitted'

// Form submission
export interface DS160FormSubmission {
  formData: DS160FormData
  status: DS160FormStatus
  lastModified: string
  completionPercentage: number
}