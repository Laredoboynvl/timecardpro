import SupabaseConnectionTest from "@/components/supabase-connection-test"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Evitar prerenderizado estático para esta página
export const dynamic = 'force-dynamic'

export default function SupabaseTestPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Prueba de Conexión a Supabase</h1>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-muted-foreground">
          Esta página permite verificar que la conexión a Supabase está configurada correctamente. Una vez validada la
          conexión, podremos proceder a crear las tablas necesarias y migrar los datos.
        </p>
      </div>

      <SupabaseConnectionTest />
    </div>
  )
}
