"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building, ChevronLeft } from "lucide-react"
import { useState, useEffect } from "react"
import type { Office } from "@/lib/supabase/db-functions"

interface OfficeHeaderProps {
  office: Office
}

export function OfficeHeader({ office }: OfficeHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null)

  useEffect(() => {
    // Set the initial date/time after hydration
    setCurrentDateTime(new Date())
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])
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

        {/* Indicador de estado del sistema */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Sistema Activo</span>
          </div>
          <div className="text-right">
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
