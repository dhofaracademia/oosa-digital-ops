import AppShell from "@/components/app-shell"
import Dashboard from "@/components/dashboard"

export const metadata = {
  title: "OOSA Digital OPS - Flight Operations Center",
  description: "Aeronautical information dashboard for Salalah International Airport - live radar, weather, flight plan validation and NOTAM decoding",
}

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
