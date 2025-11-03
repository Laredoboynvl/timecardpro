"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building, ChevronLeft } from "lucide-react"
import { useState, useEffect } from "react"
import type { Office } from "@/lib/supabase/db-functions"
import { useAuth } from "@/lib/hooks/useAuth"

interface OfficeHeaderProps {
  office: Office
}

export function OfficeHeader({ office }: OfficeHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { isSPOC, isRH, isEmployee } = useAuth()

  useEffect(() => {
    // Set mounted state and initial date/time after hydration
    setIsMounted(true)
    setCurrentDateTime(new Date())
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Determinar el tipo de usuario y su estilo
  const getUserTypeInfo = () => {
    if (!isMounted) return null // Evitar hydration mismatch
    
    if (isSPOC) {
      return { label: 'SPOC', bgColor: 'bg-green-100', textColor: 'text-green-800' }
    } else if (isRH) {
      return { label: 'Recursos Humanos', bgColor: 'bg-blue-100', textColor: 'text-blue-800' }
    } else if (isEmployee) {
      return { label: 'Empleado', bgColor: 'bg-purple-100', textColor: 'text-purple-800' }
    }
    return null
  }

  const userTypeInfo = getUserTypeInfo()

  return (
    <header className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-sm">
      <div className="container mx-auto py-6 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{office.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Centro de Atención • {office.country}
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de fecha y tipo de usuario */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            {/* Tipo de usuario discreto arriba de la fecha */}
            {userTypeInfo && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                {userTypeInfo.label}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentDateTime ? currentDateTime.toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }) : ""}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {currentDateTime ? currentDateTime.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              }) : ""}
            </p>
          </div>
        </div>

        {/* Botones de navegación ocultos por solicitud del usuario */}
      </div>
    </header>
  )
}
