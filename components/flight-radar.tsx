"use client"

import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

const FlightRadarInner = dynamic(
  () => import("@/components/flight-radar-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] glass-card">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-av-primary animate-spin" />
          <span className="text-white/60 text-sm">Loading flight radar...</span>
        </div>
      </div>
    ),
  }
)

export default function FlightRadar() {
  return <FlightRadarInner />
}
