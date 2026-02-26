import AppShell from "@/components/app-shell"
import FlightRadar from "@/components/flight-radar"

export const metadata = {
  title: "Live Flight Radar - OOSA Digital OPS",
  description: "Real-time ADS-B flight tracking around Salalah International Airport via OpenSky Network",
}

export default function RadarPage() {
  return (
    <AppShell>
      <FlightRadar />
    </AppShell>
  )
}
