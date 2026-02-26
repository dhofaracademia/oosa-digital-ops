import AppShell from "@/components/app-shell"
import FlightPlanValidator from "@/components/flight-plan-validator"

export const metadata = {
  title: "Flight Plan Validator - OOSA Digital OPS",
  description: "ICAO FPL validation engine for CADAS-ATS pre-check per Doc 4444 and Oman CAA CAR-172",
}

export default function FPLPage() {
  return (
    <AppShell>
      <FlightPlanValidator />
    </AppShell>
  )
}
