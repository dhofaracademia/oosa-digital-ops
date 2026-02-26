"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plane, Cloud, Radar, FileText, AlertTriangle,
  Wind, Eye, Thermometer, Droplets, ArrowRight, Activity,
} from "lucide-react"

interface WeatherData {
  metar: string; windDir: number; windSpeed: number;
  visibility: number; temperature: number; dewpoint: number;
  qnh: number; clouds: string
}
interface FlightStats { active: number; arriving: number; departing: number }

export default function Dashboard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [flights, setFlights] = useState<FlightStats>({ active: 0, arriving: 0, departing: 0 })

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather?station=OOSA&type=metar")
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        if (arr.length > 0) {
          const m = arr[0]
          const visRaw = m.visib ?? m.visibility_statute_mi ?? 0
          const visMi = visRaw > 100 ? parseFloat((visRaw / 1609.34).toFixed(1)) : visRaw
          setWeather({
            metar: m.rawOb || m.raw_text || "",
            windDir: m.wdir ?? m.wind_dir_degrees ?? 0,
            windSpeed: m.wspd ?? m.wind_speed_kt ?? 0,
            visibility: visMi,
            temperature: m.temp ?? m.temp_c ?? 0,
            dewpoint: m.dewp ?? m.dewpoint_c ?? 0,
            qnh: m.altim ? Math.round(m.altim) : m.altim_in_hg ? Math.round(m.altim_in_hg * 33.8639) : 0,
            clouds: m.cover ?? m.sky_condition?.[0]?.sky_cover ?? "CLR",
          })
        }
      } catch {
        setWeather({
          metar: "METAR OOSA -- data currently unavailable",
          windDir: 0, windSpeed: 0, visibility: 0,
          temperature: 0, dewpoint: 0, qnh: 0, clouds: "CLR",
        })
      }
    }
    fetchWeather()
    const id = setInterval(fetchWeather, 300_000)
    return () => clearInterval(id)
  }, [])

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights")
      const data = await res.json()
      if (data.aircraft) {
        setFlights({
          active: data.aircraft.length,
          arriving: data.aircraft.filter((a: { altitude: number }) => a.altitude > 0 && a.altitude < 5000).length,
          departing: data.aircraft.filter((a: { altitude: number }) => a.altitude > 5000 && a.altitude < 15000).length,
        })
      }
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    fetchFlights()
    const id = setInterval(fetchFlights, 30_000)
    return () => clearInterval(id)
  }, [fetchFlights])

  const quickStats = [
    {
      id: "flights", label: "Active Flights",
      value: flights.active,
      subtext: `${flights.arriving} arriving / ${flights.departing} departing`,
      icon: Plane, color: "#0c9ce4", href: "/radar",
    },
    {
      id: "weather", label: "Wind Conditions",
      value: weather ? `${weather.windDir}deg/${weather.windSpeed}kt` : "--",
      subtext: weather ? `Vis: ${weather.visibility}mi  |  QNH: ${weather.qnh}hPa` : "Loading...",
      icon: Wind, color: "#10b981", href: "/weather",
    },
  ]

  const modules = [
    { id: "radar", title: "Live Flight Radar", description: "Real-time ADS-B tracking within 150km of OOSA", icon: Radar, color: "#0c9ce4", status: "Live", href: "/radar" },
    { id: "weather", title: "Weather Station", description: "METAR, TAF, and meteorological data", icon: Cloud, color: "#10b981", status: "Updated", href: "/weather" },
    { id: "fpl", title: "Flight Plan Validator", description: "Full ICAO FPL validation for CADAS-ATS", icon: FileText, color: "#f59e0b", status: "Ready", href: "/fpl" },
    { id: "notam", title: "NOTAM Search & Decoder", description: "Search and decode ICAO NOTAMs", icon: AlertTriangle, color: "#ef4444", status: "Ready", href: "/notam" },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="radar-pulse w-full h-full" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-av-success" />
            <span className="text-sm text-av-success font-medium">All Systems Operational</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Flight Operations Center</h2>
          <p className="text-white/60 max-w-2xl">
            Real-time flight tracking, weather monitoring, and flight plan validation for{" "}
            <span className="text-av-primary font-medium">Salalah International Airport (OOSA/SLL)</span>
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickStats.map((stat) => (
          <Link key={stat.id} href={stat.href} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white font-mono">{stat.value}</p>
                <p className="text-white/40 text-sm mt-1">{stat.subtext}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-av-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View Details</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Module Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-av-primary rounded-full" /> Operations Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <Link key={mod.id} href={mod.href} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: mod.color }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}20` }}>
                  <mod.icon className="w-5 h-5" style={{ color: mod.color }} />
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${mod.color}20`, color: mod.color }}>{mod.status}</span>
              </div>
              <h4 className="text-white font-semibold mb-1">{mod.title}</h4>
              <p className="text-white/50 text-sm">{mod.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: mod.color }}>
                <span>Open</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Weather Summary */}
      {weather && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-av-primary" /> Current Conditions
            </h3>
            <Link href="/weather" className="text-sm text-av-primary hover:underline">
              Full Report <ArrowRight className="w-3.5 h-3.5 inline" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4" />Wind</div>
              <p className="text-xl font-bold text-white font-mono">{weather.windDir}deg/{weather.windSpeed}kt</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4" />Visibility</div>
              <p className="text-xl font-bold text-white font-mono">{weather.visibility} mi</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4" />Temp</div>
              <p className="text-xl font-bold text-white font-mono">{weather.temperature}C</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4" />QNH</div>
              <p className="text-xl font-bold text-white font-mono">{weather.qnh} hPa</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-black/30 rounded-lg">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-sm text-av-primary font-mono">{weather.metar}</p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {["OpenSky API", "NOAA Weather", "Systems"].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-av-success rounded-full animate-pulse" />
                <span className="text-sm text-white/70">{s}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-white/40">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="text-center text-xs text-white/30 py-4">
        <p>NOT FOR OPERATIONAL USE - FOR EDUCATIONAL AND DEMONSTRATION PURPOSES ONLY</p>
        <p className="mt-1">All data should be verified with official sources before use in flight operations</p>
      </div>
    </div>
  )
}
