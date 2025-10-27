import { OfficeDashboard } from "@/components/office-dashboard"
import { OfficeHeader } from "@/components/office-header"
import { getOfficeByCode, getEmployeesByOffice } from "@/lib/supabase/db-functions"
import { notFound } from "next/navigation"

export default async function OfficePage({ params }: { params: { officeId: string } }) {
  // Obtener la oficina desde la base de datos
  const office = await getOfficeByCode(params.officeId)

  if (!office) {
    notFound()
  }

  // Obtener los empleados de esta oficina
  const employees = await getEmployeesByOffice(office.id)

  return (
    <div className="min-h-screen flex flex-col">
      <OfficeHeader office={office} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <OfficeDashboard officeId={office.id} officeName={office.name} initialEmployees={employees} />
      </main>
    </div>
  )
}
