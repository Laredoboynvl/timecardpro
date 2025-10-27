// Mapeo entre los IDs del frontend y los UUIDs reales de la base de datos
export const OFFICE_ID_MAPPING: Record<string, string> = {
  // Tijuana
  'tij-001': '04c1d337-0ae1-4f41-a992-8faf8cbe6bc0',
  'TIJ': '04c1d337-0ae1-4f41-a992-8faf8cbe6bc0',
  'tij': '04c1d337-0ae1-4f41-a992-8faf8cbe6bc0',
  
  // Nuevo Laredo
  'nla-001': '75486d8b-9789-42e2-92ec-9a1fc5c57530',
  'NLA': '75486d8b-9789-42e2-92ec-9a1fc5c57530',
  'nla': '75486d8b-9789-42e2-92ec-9a1fc5c57530',
  
  // Ciudad Juárez
  'cju-001': 'aebbc546-1ad3-4aca-ab84-a9e134c0e57d',
  'CJU': 'aebbc546-1ad3-4aca-ab84-a9e134c0e57d',
  'cju': 'aebbc546-1ad3-4aca-ab84-a9e134c0e57d',
  
  // Nogales
  'nog-001': '2187c969-453d-42d4-af5b-fbb1aead8073',
  'NOG': '2187c969-453d-42d4-af5b-fbb1aead8073',
  'nog': '2187c969-453d-42d4-af5b-fbb1aead8073',
  
  // Monterrey
  'mty-001': 'bd8c77c9-f1dc-417f-8887-a1dda337c961',
  'MTY': 'bd8c77c9-f1dc-417f-8887-a1dda337c961',
  'mty': 'bd8c77c9-f1dc-417f-8887-a1dda337c961',
  
  // Matamoros
  'mat-001': '9f035a31-6f1f-4a57-8692-f53ed9b60be3',
  'MAT': '9f035a31-6f1f-4a57-8692-f53ed9b60be3',
  'mat': '9f035a31-6f1f-4a57-8692-f53ed9b60be3',
  
  // Hermosillo
  'hmo-001': '61df9636-53f4-49d3-b523-598770558449',
  'HMO': '61df9636-53f4-49d3-b523-598770558449',
  'hmo': '61df9636-53f4-49d3-b523-598770558449',
  
  // Guadalajara
  'gdl-001': '1c8bc13c-21f3-46e3-afd4-ed60e8b08a15',
  'GDL': '1c8bc13c-21f3-46e3-afd4-ed60e8b08a15',
  'gdl': '1c8bc13c-21f3-46e3-afd4-ed60e8b08a15',
  
  // Ciudad de México
  'cdm-001': '5590d3c7-6ef3-4db8-87f8-478c61023c9d',
  'CDM': '5590d3c7-6ef3-4db8-87f8-478c61023c9d',
  'cdm': '5590d3c7-6ef3-4db8-87f8-478c61023c9d',
  
  // Mérida
  'mer-001': 'df54fbd7-1233-49bd-af61-0181a3db9a66',
  'MER': 'df54fbd7-1233-49bd-af61-0181a3db9a66',
  'mer': 'df54fbd7-1233-49bd-af61-0181a3db9a66',
}

/**
 * Convierte un office ID del frontend al UUID de la base de datos
 */
export function mapOfficeIdToUUID(frontendOfficeId: string): string {
  // Normalizar el ID a minúsculas para buscar
  const normalizedId = frontendOfficeId.toLowerCase()
  
  // Buscar primero con el ID exacto
  let uuid = OFFICE_ID_MAPPING[frontendOfficeId]
  
  // Si no se encuentra, buscar con el ID normalizado
  if (!uuid) {
    uuid = OFFICE_ID_MAPPING[normalizedId]
  }
  
  // Si aún no se encuentra, buscar por cualquier variante conocida
  if (!uuid) {
    const normalizedId = frontendOfficeId.toLowerCase()
    
    // Mapeo adicional por nombres completos o variantes
    const additionalMappings: Record<string, string> = {
      'tijuana': 'tij-001',
      'nuevo laredo': 'nla-001',
      'ciudad juarez': 'cju-001',
      'juarez': 'cju-001',
      'nogales': 'nog-001',
      'monterrey': 'mty-001',
      'matamoros': 'mat-001',
      'hermosillo': 'hmo-001',
      'guadalajara': 'gdl-001',
      'ciudad de mexico': 'cdm-001',
      'cdmx': 'cdm-001',
      'mexico': 'cdm-001',
      'merida': 'mer-001',
    }
    
    const mappedId = additionalMappings[normalizedId]
    if (mappedId) {
      uuid = OFFICE_ID_MAPPING[mappedId]
    }
  }
  
  if (!uuid) {
    console.warn(`No se encontró mapeo para office ID: ${frontendOfficeId}`)
    return frontendOfficeId // Fallback al ID original
  }
  
  console.log(`📍 Office mapping: ${frontendOfficeId} → ${uuid}`)
  return uuid
}

/**
 * Convierte un UUID de la base de datos al office ID del frontend  
 */
export function mapUUIDToOfficeId(uuid: string): string {
  const officeId = Object.entries(OFFICE_ID_MAPPING).find(([_, value]) => value === uuid)?.[0]
  if (!officeId) {
    console.warn(`No se encontró mapeo para UUID: ${uuid}`)
    return uuid // Fallback al UUID original
  }
  return officeId
}