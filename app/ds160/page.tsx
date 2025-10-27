"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  FileText, 
  Globe, 
  Building,
  User,
  MapPin,
  Calendar,
  Briefcase
} from "lucide-react"
import { DS160FormData } from "@/lib/types/ds160"
import { 
  CONSULATES, 
  CAS_OFFICES, 
  COUNTRIES, 
  PURPOSE_OF_TRIP,
  filterCASOfficesByConsulate 
} from "@/lib/types/ds160/options"

// Form sections configuration

// Secciones del formulario
const FORM_SECTIONS = [
  { id: 'personal', title: 'Información Personal', icon: User },
  { id: 'location', title: 'Consulado y CAS', icon: Building },
  { id: 'address', title: 'Dirección', icon: MapPin },
  { id: 'contact', title: 'Contacto', icon: Globe },
  { id: 'travel', title: 'Información del Viaje', icon: Calendar },
  { id: 'work', title: 'Información Laboral', icon: Briefcase }
]

export default function DS160FormPage() {
  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState<DS160FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    otherNames: '',
    dateOfBirth: '',
    cityOfBirth: '',
    countryOfBirth: '',
    nationality: '',
    consulate: '',
    casOffice: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
    purposeOfTrip: '',
    intendedDateOfArrival: '',
    intendedLengthOfStay: '',
    currentOccupation: '',
    currentEmployer: '',
    employerAddress: ''
  })

  const updateFormData = (field: keyof DS160FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextSection = () => {
    if (currentSection < FORM_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const progress = ((currentSection + 1) / FORM_SECTIONS.length) * 100

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling - no background colors */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Información Personal</h3>
        <p className="text-sm text-muted-foreground">
          Proporciona tu información personal tal como aparece en tu pasaporte
        </p>
      </div>

      {/* Names Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Nombres Completos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="firstName">Nombre(s) *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              placeholder="Ingresa tu(s) nombre(s)"
            />
          </div>
          <div>
            <Label htmlFor="middleName">Segundo Nombre</Label>
            <Input
              id="middleName"
              value={formData.middleName}
              onChange={(e) => updateFormData('middleName', e.target.value)}
              placeholder="Segundo nombre (opcional)"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lastName">Apellido(s) *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              placeholder="Ingresa tu(s) apellido(s)"
            />
          </div>
          <div>
            <Label htmlFor="otherNames">Otros Nombres</Label>
            <Input
              id="otherNames"
              value={formData.otherNames}
              onChange={(e) => updateFormData('otherNames', e.target.value)}
              placeholder="Nombres anteriores, alias, etc."
            />
          </div>
        </div>
      </div>

      {/* Birth Information Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          Información de Nacimiento
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Fecha de Nacimiento *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cityOfBirth">Ciudad de Nacimiento *</Label>
            <Input
              id="cityOfBirth"
              value={formData.cityOfBirth}
              onChange={(e) => updateFormData('cityOfBirth', e.target.value)}
              placeholder="Ciudad donde naciste"
            />
          </div>
          <div>
            <Label htmlFor="countryOfBirth">País de Nacimiento *</Label>
            <Select value={formData.countryOfBirth} onValueChange={(value) => updateFormData('countryOfBirth', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona país" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Nationality Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-600" />
          Nacionalidad
        </h4>
        <div className="max-w-md">
          <Label htmlFor="nationality">Nacionalidad *</Label>
          <Select value={formData.nationality} onValueChange={(value) => updateFormData('nationality', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona nacionalidad" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  // Filtered CAS offices based on selected consulate
  const availableCASOffices = useMemo(() => {
    return formData.consulate ? filterCASOfficesByConsulate(formData.consulate) : CAS_OFFICES
  }, [formData.consulate])

  const handleConsulateChange = (value: string) => {
    updateFormData('consulate', value)
    // Clear CAS office selection when consulate changes
    updateFormData('casOffice', '')
  }

  const renderLocationInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling - no background colors */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Ubicaciones de Cita y Entrega</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona el consulado para tu entrevista y la oficina CAS para la entrega de documentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consulate Section - Converted to dropdown */}
        <div className="border rounded-lg p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium">Consulado o Embajada</h4>
            </div>
            <div>
              <Label htmlFor="consulate">Consulado donde aplicarás *</Label>
              <Select value={formData.consulate} onValueChange={handleConsulateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona el consulado" />
                </SelectTrigger>
                <SelectContent>
                  {CONSULATES.map((consulate) => (
                    <SelectItem key={consulate.value} value={consulate.value}>
                      {consulate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Lugar donde tendrás tu entrevista consular
              </p>
            </div>
          </div>
        </div>

        {/* CAS Office Section - Converted to dropdown */}
        <div className="border rounded-lg p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <h4 className="font-medium">Centro de Atención CAS</h4>
            </div>
            <div>
              <Label htmlFor="casOffice">Oficina CAS *</Label>
              <Select 
                value={formData.casOffice} 
                onValueChange={(value) => updateFormData('casOffice', value)}
                disabled={!formData.consulate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    formData.consulate 
                      ? "Selecciona la oficina CAS" 
                      : "Primero selecciona un consulado"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableCASOffices.map((office) => (
                    <SelectItem key={office.value} value={office.value}>
                      {office.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Centro donde recogerás tu pasaporte procesado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Information panel with uniform styling */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Información Importante
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• El consulado debe corresponder a tu jurisdicción de residencia</li>
          <li>• Las oficinas CAS están filtradas por región según tu consulado seleccionado</li>
          <li>• Verifica horarios y disponibilidad antes de programar citas</li>
          <li>• Ambas ubicaciones deben estar operativas en las fechas de tu proceso</li>
        </ul>
      </div>
    </div>
  )

  const renderAddressInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Dirección de Residencia</h3>
        <p className="text-sm text-muted-foreground">
          Proporciona tu dirección actual de residencia
        </p>
      </div>

      {/* Address Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-600" />
          Dirección Completa
        </h4>
        <div>
          <Label htmlFor="address">Dirección Completa *</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => updateFormData('address', e.target.value)}
            placeholder="Calle, número, colonia, delegación..."
            rows={3}
          />
        </div>
      </div>

      {/* Location Details Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          Detalles de Ubicación
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="city">Ciudad *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateFormData('city', e.target.value)}
              placeholder="Ciudad de residencia"
            />
          </div>
          <div>
            <Label htmlFor="state">Estado/Provincia *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateFormData('state', e.target.value)}
              placeholder="Estado o provincia"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="zipCode">Código Postal *</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => updateFormData('zipCode', e.target.value)}
              placeholder="Código postal"
            />
          </div>
          <div>
            <Label htmlFor="country">País *</Label>
            <Select value={formData.country} onValueChange={(value) => updateFormData('country', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona país" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContactInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Información de Contacto</h3>
        <p className="text-sm text-muted-foreground">
          Proporciona tus datos de contacto actualizados
        </p>
      </div>

      {/* Contact Details Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-600" />
          Datos de Contacto
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              placeholder="+52 55 1234 5678"
            />
          </div>
          <div>
            <Label htmlFor="email">Correo Electrónico *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="tu.email@ejemplo.com"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderTravelInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Información del Viaje</h3>
        <p className="text-sm text-muted-foreground">
          Detalles sobre tu viaje planeado a Estados Unidos
        </p>
      </div>

      {/* Purpose Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-600" />
          Propósito del Viaje
        </h4>
        <div>
          <Label htmlFor="purposeOfTrip">Propósito del Viaje *</Label>
          <Select value={formData.purposeOfTrip} onValueChange={(value) => updateFormData('purposeOfTrip', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el propósito" />
            </SelectTrigger>
            <SelectContent>
              {PURPOSE_OF_TRIP.map((purpose) => (
                <SelectItem key={purpose.value} value={purpose.value}>
                  {purpose.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Travel Dates Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Fechas del Viaje
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="intendedDateOfArrival">Fecha Planeada de Llegada</Label>
            <Input
              id="intendedDateOfArrival"
              type="date"
              value={formData.intendedDateOfArrival}
              onChange={(e) => updateFormData('intendedDateOfArrival', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="intendedLengthOfStay">Duración Planeada de Estadía</Label>
            <Input
              id="intendedLengthOfStay"
              value={formData.intendedLengthOfStay}
              onChange={(e) => updateFormData('intendedLengthOfStay', e.target.value)}
              placeholder="ej: 2 semanas, 1 mes"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderWorkInfo = () => (
    <div className="space-y-6">
      {/* Header with uniform styling */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Información Laboral</h3>
        <p className="text-sm text-muted-foreground">
          Detalles sobre tu situación laboral actual
        </p>
      </div>

      {/* Employment Section */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-teal-600" />
          Empleo Actual
        </h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentOccupation">Ocupación Actual *</Label>
            <Input
              id="currentOccupation"
              value={formData.currentOccupation}
              onChange={(e) => updateFormData('currentOccupation', e.target.value)}
              placeholder="Tu ocupación o trabajo actual"
            />
          </div>

          <div>
            <Label htmlFor="currentEmployer">Empleador Actual</Label>
            <Input
              id="currentEmployer"
              value={formData.currentEmployer}
              onChange={(e) => updateFormData('currentEmployer', e.target.value)}
              placeholder="Nombre de tu empleador o empresa"
            />
          </div>

          <div>
            <Label htmlFor="employerAddress">Dirección del Empleador</Label>
            <Textarea
              id="employerAddress"
              value={formData.employerAddress}
              onChange={(e) => updateFormData('employerAddress', e.target.value)}
              placeholder="Dirección completa de tu lugar de trabajo"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: return renderPersonalInfo()
      case 1: return renderLocationInfo()
      case 2: return renderAddressInfo()
      case 3: return renderContactInfo()
      case 4: return renderTravelInfo()
      case 5: return renderWorkInfo()
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Formulario DS-160</h1>
              <p className="text-muted-foreground">Solicitud de Visa de No Inmigrante</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso del Formulario</span>
              <span>{Math.round(progress)}% Completado</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mt-4">
            {FORM_SECTIONS.map((section, index) => {
              const Icon = section.icon
              return (
                <Button
                  key={section.id}
                  variant={index === currentSection ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentSection(index)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {section.title}
                  {index < currentSection && (
                    <Badge variant="secondary" className="ml-1 px-1">✓</Badge>
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(FORM_SECTIONS[currentSection].icon, { className: "h-5 w-5" })}
              {FORM_SECTIONS[currentSection].title}
            </CardTitle>
            <CardDescription>
              Sección {currentSection + 1} de {FORM_SECTIONS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderCurrentSection()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevSection}
            disabled={currentSection === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar Borrador
          </Button>

          {currentSection === FORM_SECTIONS.length - 1 ? (
            <Button className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Completar Formulario
            </Button>
          ) : (
            <Button onClick={nextSection} className="flex items-center gap-2">
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}