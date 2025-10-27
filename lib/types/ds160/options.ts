import { DropdownOption } from "@/lib/types/ds160"

// Consulate options - comprehensive list for Mexico
export const CONSULATES: DropdownOption[] = [
  { value: "ciudad-juarez", label: "Consulado General de Ciudad Juárez" },
  { value: "guadalajara", label: "Consulado General de Guadalajara" },
  { value: "hermosillo", label: "Consulado General de Hermosillo" },
  { value: "matamoros", label: "Consulado General de Matamoros" },
  { value: "merida", label: "Consulado General de Mérida" },
  { value: "monterrey", label: "Consulado General de Monterrey" },
  { value: "nogales", label: "Consulado General de Nogales" },
  { value: "nuevo-laredo", label: "Consulado General de Nuevo Laredo" },
  { value: "tijuana", label: "Consulado General de Tijuana" },
  { value: "mexico-city", label: "Embajada de Estados Unidos - Ciudad de México" }
]

// CAS Office options - Customer Application Support Centers
export const CAS_OFFICES: DropdownOption[] = [
  // Mexico City Region
  { value: "cas-cdmx-centro", label: "CAS - Ciudad de México Centro" },
  { value: "cas-cdmx-satelite", label: "CAS - Ciudad de México Satélite" },
  { value: "cas-cdmx-sur", label: "CAS - Ciudad de México Sur" },
  
  // Guadalajara Region
  { value: "cas-guadalajara", label: "CAS - Guadalajara" },
  { value: "cas-zapopan", label: "CAS - Zapopan" },
  
  // Monterrey Region
  { value: "cas-monterrey", label: "CAS - Monterrey" },
  { value: "cas-san-pedro", label: "CAS - San Pedro Garza García" },
  
  // Tijuana Region
  { value: "cas-tijuana", label: "CAS - Tijuana" },
  { value: "cas-ensenada", label: "CAS - Ensenada" },
  
  // Ciudad Juárez Region
  { value: "cas-ciudad-juarez", label: "CAS - Ciudad Juárez" },
  { value: "cas-el-paso", label: "CAS - El Paso (Frontera)" },
  
  // Other Major Cities
  { value: "cas-hermosillo", label: "CAS - Hermosillo" },
  { value: "cas-mexicali", label: "CAS - Mexicali" },
  { value: "cas-matamoros", label: "CAS - Matamoros" },
  { value: "cas-reynosa", label: "CAS - Reynosa" },
  { value: "cas-merida", label: "CAS - Mérida" },
  { value: "cas-cancun", label: "CAS - Cancún" },
  { value: "cas-nogales", label: "CAS - Nogales" },
  { value: "cas-nuevo-laredo", label: "CAS - Nuevo Laredo" },
  { value: "cas-acapulco", label: "CAS - Acapulco" },
  { value: "cas-puerto-vallarta", label: "CAS - Puerto Vallarta" },
  { value: "cas-leon", label: "CAS - León" },
  { value: "cas-puebla", label: "CAS - Puebla" },
  { value: "cas-veracruz", label: "CAS - Veracruz" }
]

// Countries for birth and nationality
export const COUNTRIES: DropdownOption[] = [
  { value: "mexico", label: "México" },
  { value: "usa", label: "Estados Unidos" },
  { value: "canada", label: "Canadá" },
  { value: "guatemala", label: "Guatemala" },
  { value: "belize", label: "Belice" },
  { value: "honduras", label: "Honduras" },
  { value: "el-salvador", label: "El Salvador" },
  { value: "nicaragua", label: "Nicaragua" },
  { value: "costa-rica", label: "Costa Rica" },
  { value: "panama", label: "Panamá" },
  { value: "colombia", label: "Colombia" },
  { value: "venezuela", label: "Venezuela" },
  { value: "ecuador", label: "Ecuador" },
  { value: "peru", label: "Perú" },
  { value: "bolivia", label: "Bolivia" },
  { value: "chile", label: "Chile" },
  { value: "argentina", label: "Argentina" },
  { value: "uruguay", label: "Uruguay" },
  { value: "paraguay", label: "Paraguay" },
  { value: "brazil", label: "Brasil" },
  { value: "other", label: "Otro (especificar)" }
]

// Mexican states for address information
export const MEXICAN_STATES: DropdownOption[] = [
  { value: "aguascalientes", label: "Aguascalientes" },
  { value: "baja-california", label: "Baja California" },
  { value: "baja-california-sur", label: "Baja California Sur" },
  { value: "campeche", label: "Campeche" },
  { value: "chiapas", label: "Chiapas" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "coahuila", label: "Coahuila" },
  { value: "colima", label: "Colima" },
  { value: "cdmx", label: "Ciudad de México" },
  { value: "durango", label: "Durango" },
  { value: "guanajuato", label: "Guanajuato" },
  { value: "guerrero", label: "Guerrero" },
  { value: "hidalgo", label: "Hidalgo" },
  { value: "jalisco", label: "Jalisco" },
  { value: "mexico", label: "Estado de México" },
  { value: "michoacan", label: "Michoacán" },
  { value: "morelos", label: "Morelos" },
  { value: "nayarit", label: "Nayarit" },
  { value: "nuevo-leon", label: "Nuevo León" },
  { value: "oaxaca", label: "Oaxaca" },
  { value: "puebla", label: "Puebla" },
  { value: "queretaro", label: "Querétaro" },
  { value: "quintana-roo", label: "Quintana Roo" },
  { value: "san-luis-potosi", label: "San Luis Potosí" },
  { value: "sinaloa", label: "Sinaloa" },
  { value: "sonora", label: "Sonora" },
  { value: "tabasco", label: "Tabasco" },
  { value: "tamaulipas", label: "Tamaulipas" },
  { value: "tlaxcala", label: "Tlaxcala" },
  { value: "veracruz", label: "Veracruz" },
  { value: "yucatan", label: "Yucatán" },
  { value: "zacatecas", label: "Zacatecas" }
]

// Purpose of trip options
export const PURPOSE_OF_TRIP: DropdownOption[] = [
  { value: "business", label: "Negocios (B-1)" },
  { value: "tourism", label: "Turismo (B-2)" },
  { value: "business-tourism", label: "Negocios/Turismo (B-1/B-2)" },
  { value: "transit", label: "Tránsito (C-1)" },
  { value: "crew", label: "Tripulación (C-1/D)" },
  { value: "student-f1", label: "Estudiante Académico (F-1)" },
  { value: "student-m1", label: "Estudiante Vocacional (M-1)" },
  { value: "exchange", label: "Visitante de Intercambio (J-1)" },
  { value: "work-h1b", label: "Trabajador Especializado (H-1B)" },
  { value: "work-h2a", label: "Trabajador Agrícola (H-2A)" },
  { value: "work-h2b", label: "Trabajador Temporal (H-2B)" },
  { value: "work-l1", label: "Transferencia Intracompañía (L-1)" },
  { value: "work-o1", label: "Habilidad Extraordinaria (O-1)" },
  { value: "investor", label: "Inversionista (E-1/E-2)" },
  { value: "religious", label: "Trabajador Religioso (R-1)" },
  { value: "diplomatic", label: "Diplomático (A-1/A-2)" },
  { value: "official", label: "Oficial Gobierno (G-1 a G-5)" },
  { value: "nato", label: "OTAN (NATO-1 a NATO-7)" },
  { value: "media", label: "Medios de Comunicación (I)" },
  { value: "other", label: "Otro (especificar)" }
]

// Length of stay options
export const LENGTH_OF_STAY: DropdownOption[] = [
  { value: "1-week", label: "1 semana" },
  { value: "2-weeks", label: "2 semanas" },
  { value: "1-month", label: "1 mes" },
  { value: "2-months", label: "2 meses" },
  { value: "3-months", label: "3 meses" },
  { value: "6-months", label: "6 meses" },
  { value: "1-year", label: "1 año" },
  { value: "2-years", label: "2 años" },
  { value: "3-years", label: "3 años" },
  { value: "indefinite", label: "Indefinido" },
  { value: "other", label: "Otro (especificar)" }
]

// Occupation categories
export const OCCUPATIONS: DropdownOption[] = [
  { value: "executive", label: "Ejecutivo/Alta Gerencia" },
  { value: "manager", label: "Gerente/Supervisor" },
  { value: "professional", label: "Profesional/Técnico" },
  { value: "sales", label: "Ventas" },
  { value: "administrative", label: "Administrativo" },
  { value: "service", label: "Servicios" },
  { value: "agriculture", label: "Agricultura/Ganadería" },
  { value: "construction", label: "Construcción" },
  { value: "manufacturing", label: "Manufactura" },
  { value: "transportation", label: "Transporte" },
  { value: "education", label: "Educación" },
  { value: "healthcare", label: "Salud" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finanzas" },
  { value: "technology", label: "Tecnología/IT" },
  { value: "arts", label: "Artes/Entretenimiento" },
  { value: "media", label: "Medios de Comunicación" },
  { value: "government", label: "Gobierno" },
  { value: "military", label: "Militar" },
  { value: "retired", label: "Jubilado/Pensionado" },
  { value: "student", label: "Estudiante" },
  { value: "unemployed", label: "Desempleado" },
  { value: "homemaker", label: "Ama/o de Casa" },
  { value: "self-employed", label: "Trabajador Independiente" },
  { value: "other", label: "Otro (especificar)" }
]

// Utility functions for dropdowns
export const getConsulateByValue = (value: string): DropdownOption | undefined => {
  return CONSULATES.find(consulate => consulate.value === value)
}

export const getCASOfficeByValue = (value: string): DropdownOption | undefined => {
  return CAS_OFFICES.find(office => office.value === value)
}

export const getCountryByValue = (value: string): DropdownOption | undefined => {
  return COUNTRIES.find(country => country.value === value)
}

// Filter CAS offices by region/consulate for better UX
export const filterCASOfficesByConsulate = (consulateValue: string): DropdownOption[] => {
  const regionMappings: Record<string, string[]> = {
    'ciudad-juarez': ['cas-ciudad-juarez', 'cas-el-paso'],
    'guadalajara': ['cas-guadalajara', 'cas-zapopan', 'cas-puerto-vallarta', 'cas-leon'],
    'hermosillo': ['cas-hermosillo', 'cas-mexicali'],
    'matamoros': ['cas-matamoros', 'cas-reynosa'],
    'merida': ['cas-merida', 'cas-cancun'],
    'monterrey': ['cas-monterrey', 'cas-san-pedro'],
    'nogales': ['cas-nogales'],
    'nuevo-laredo': ['cas-nuevo-laredo'],
    'tijuana': ['cas-tijuana', 'cas-ensenada'],
    'mexico-city': ['cas-cdmx-centro', 'cas-cdmx-satelite', 'cas-cdmx-sur', 'cas-puebla', 'cas-veracruz', 'cas-acapulco']
  }
  
  const validOffices = regionMappings[consulateValue] || []
  return CAS_OFFICES.filter(office => 
    validOffices.length === 0 || validOffices.includes(office.value)
  )
}