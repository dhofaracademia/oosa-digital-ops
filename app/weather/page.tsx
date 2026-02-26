import AppShell from "@/components/app-shell"
import WeatherStation from "@/components/weather-station"

export const metadata = {
  title: "Weather Station - OOSA Digital OPS",
  description: "Live METAR and TAF data for Salalah International Airport and other ICAO stations",
}

export default function WeatherPage() {
  return (
    <AppShell>
      <WeatherStation />
    </AppShell>
  )
}
