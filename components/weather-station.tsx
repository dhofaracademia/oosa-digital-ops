"use client"

import { useState, useEffect } from "react"
import {
  Cloud, Wind, Eye, Thermometer, Droplets, Gauge, RefreshCw,
  Sun, CloudRain, CloudFog, Calendar, ChevronDown, ChevronUp, Search,
} from "lucide-react"

interface METARData {
  raw: string; station: string; time: string;
  windDir: number; windSpeed: number; windGust: number | null;
  visibility: number; clouds: Array<{ cover: string; base: number }>;
  temperature: number; dewpoint: number; qnh: number;
  weather: string[]; category: string
}

interface TAFPeriod {
  time: string; windDir: number; windSpeed: number;
  visibility: number; clouds: string; weather: string;
  type: "base" | "tempo" | "becmg" | "prob"
}

interface TAFData {
  raw: string; station: string; issueTime: string;
  validFrom: string; validTo: string; timeline: TAFPeriod[]
}

function parseVisibility(raw: string | number | undefined): number {
  if (!raw) return 0
  const n = typeof raw === "number" ? raw : parseFloat(String(raw))
  return n > 100 ? parseFloat((n / 1609.34).toFixed(1)) : n
}

const OMAN_STATIONS = [
  { icao: "OOSA", name: "Salalah" },
  { icao: "OOMS", name: "Muscat" },
  { icao: "OODQ", name: "Duqm" },
  { icao: "OOKB", name: "Khasab" },
]

export default function WeatherStation() {
  const [station, setStation] = useState("OOSA")
  const [stationInput, setStationInput] = useState("")
  const [metar, setMetar] = useState<METARData | null>(null)
  const [taf, setTaf] = useState<TAFData | null>(null)
  const [loading, setLoading] = useState({ metar: true, taf: true })
  const [expandedTaf, setExpandedTaf] = useState(false)

  const fetchWeather = async (icao: string) => {
    setLoading({ metar: true, taf: true })

    try {
      const res = await fetch(`/api/weather?station=${icao}&type=metar`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const m = data[0]
        const clouds: Array<{ cover: string; base: number }> = []
        ;["cover", "cover2", "cover3", "cover4"].forEach((k, i) => {
          const cover = m[k] || m[`sky${i + 1}`]
          const base = m[`base${i > 0 ? i + 1 : ""}`] || m[`skyBase${i + 1}`] || m.base
          if (cover && cover !== "CLR" && cover !== "SKC")
            clouds.push({ cover, base: base || 0 })
        })
        const wxRaw: string = m.wxString || m.wx_string || ""
        setMetar({
          raw: m.rawOb || m.raw_text || "",
          station: m.icaoId || m.station_id || icao,
          time: m.reportTime || m.observation_time || new Date().toISOString(),
          windDir: m.wdir ?? m.wind_dir_degrees ?? 0,
          windSpeed: m.wspd ?? m.wind_speed_kt ?? 0,
          windGust: m.wgst ?? m.wind_gust_kt ?? null,
          visibility: parseVisibility(m.visib ?? m.visibility_statute_mi),
          clouds,
          temperature: m.temp ?? m.temp_c ?? 0,
          dewpoint: m.dewp ?? m.dewpoint_c ?? 0,
          qnh: m.altim ? Math.round(m.altim) : m.altim_in_hg ? Math.round(m.altim_in_hg * 33.8639) : 0,
          weather: wxRaw ? wxRaw.split(" ").filter(Boolean) : [],
          category: (m.fltcat || m.flight_category || "VFR").toUpperCase(),
        })
      } else {
        setMetar(null)
      }
    } catch {
      setMetar(null)
    } finally {
      setLoading((p) => ({ ...p, metar: false }))
    }

    try {
      const res = await fetch(`/api/weather?station=${icao}&type=taf`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const t = data[0]
        const timeline: TAFPeriod[] = (t.fcsts || t.forecast || []).map((f: Record<string, unknown>) => {
          const type: TAFPeriod["type"] =
            f.changeIndicator === "TEMPO" ? "tempo" :
            f.changeIndicator === "BECMG" ? "becmg" :
            (f.changeIndicator as string)?.startsWith?.("PROB") ? "prob" : "base"
          const from = (f.timeFrom || f.fcst_time_from || "") as string
          const to = (f.timeTo || f.fcst_time_to || "") as string
          const fmt = (s: string) => (s ? s.toString().substring(11, 16) : "")
          const layers: string[] = []
          ;["cover", "cover2", "cover3"].forEach((k, i) => {
            const c = f[k] as string
            const b = f[`base${i > 0 ? i + 1 : ""}`] as number
            if (c && c !== "CLR" && c !== "SKC")
              layers.push(`${c}${b ? Math.round(b / 100) : ""}`)
          })
          return {
            time: `${fmt(from)}-${fmt(to)}`,
            windDir: (f.wdir ?? f.wind_dir_degrees ?? 0) as number,
            windSpeed: (f.wspd ?? f.wind_speed_kt ?? 0) as number,
            visibility: parseVisibility(f.visib as number ?? f.visibility_statute_mi as number),
            clouds: layers.join(" ") || "SKC",
            weather: (f.wxString || f.wx_string || "") as string,
            type,
          }
        })
        setTaf({
          raw: t.rawTAF || t.raw_text || "",
          station: t.icaoId || t.station_id || icao,
          issueTime: t.issueTime || t.issue_time || new Date().toISOString(),
          validFrom: t.validTimeFrom || t.valid_time_from || new Date().toISOString(),
          validTo: t.validTimeTo || t.valid_time_to || new Date(Date.now() + 86400000).toISOString(),
          timeline,
        })
      } else {
        setTaf(null)
      }
    } catch {
      setTaf(null)
    } finally {
      setLoading((p) => ({ ...p, taf: false }))
    }
  }

  useEffect(() => {
    fetchWeather(station)
    const id = setInterval(() => fetchWeather(station), 300_000)
    return () => clearInterval(id)
  }, [station])

  const searchStation = () => {
    const s = stationInput.trim().toUpperCase()
    if (/^[A-Z]{4}$/.test(s)) {
      setStation(s)
      setStationInput("")
    }
  }

  const getCatColor = (cat: string) =>
    ({ VFR: "#10b981", MVFR: "#f59e0b", IFR: "#ef4444", LIFR: "#8b5cf6" })[cat] || "#10b981"

  const decodeWx = (code: string) =>
    ({
      RA: "Rain", DZ: "Drizzle", SN: "Snow", SG: "Snow Grains",
      IC: "Ice Crystals", PL: "Ice Pellets", GR: "Hail",
      GS: "Small Hail", BR: "Mist", FG: "Fog", FU: "Smoke",
      VA: "Volcanic Ash", DU: "Dust", SA: "Sand", HZ: "Haze",
      PO: "Dust Whirls", SQ: "Squalls", FC: "Funnel Cloud",
      SS: "Sandstorm", DS: "Duststorm", TS: "Thunderstorm",
    })[code] || code

  const getCloudIcon = (cover: string) => {
    if (cover === "SKC" || cover === "CLR") return <Sun className="w-5 h-5 text-av-warning" />
    if (cover === "OVC") return <CloudFog className="w-5 h-5 text-white/70" />
    return <Cloud className="w-5 h-5 text-white/70" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-6 h-6 text-av-primary" /> Weather Station
          </h2>
          <p className="text-white/50 text-sm mt-1">Live METAR & TAF -- NOAA Aviation Weather Center</p>
        </div>
        <button onClick={() => fetchWeather(station)} disabled={loading.metar || loading.taf}
          className="flex items-center gap-2 px-4 py-2 bg-av-primary/20 text-av-primary rounded-lg hover:bg-av-primary/30 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading.metar || loading.taf ? "animate-spin" : ""}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Station Selector */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {OMAN_STATIONS.map((s) => (
              <button key={s.icao} onClick={() => setStation(s.icao)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${station === s.icao ? "bg-av-primary/20 text-av-primary border border-av-primary/30" : "bg-white/5 text-white/70 hover:bg-white/10 border border-transparent"}`}>
                {s.icao} <span className="text-white/40 ml-1">{s.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stationInput}
              onChange={(e) => setStationInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && searchStation()}
              placeholder="ICAO code..."
              maxLength={4}
              className="w-32 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-av-primary"
            />
            <button onClick={searchStation} className="p-2 bg-av-primary/20 text-av-primary rounded-lg hover:bg-av-primary/30">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* METAR */}
      {metar && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-av-primary" /> METAR -- {metar.station}
            </h3>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: `${getCatColor(metar.category)}20`, color: getCatColor(metar.category) }}>
                {metar.category}
              </span>
              <span className="text-xs text-white/40">{new Date(metar.time).toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-av-primary font-mono text-sm break-all">{metar.raw}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4" />Wind</div>
              <p className="text-xl font-bold text-white font-mono">{metar.windDir}deg/{metar.windSpeed}kt</p>
              {metar.windGust && <p className="text-sm text-av-warning">Gusts {metar.windGust}kt</p>}
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4" />Visibility</div>
              <p className="text-xl font-bold text-white font-mono">{metar.visibility >= 6.2 ? "10km+" : `${metar.visibility}mi`}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4" />Temperature</div>
              <p className="text-xl font-bold text-white font-mono">{metar.temperature}C</p>
              <p className="text-sm text-white/50">DP: {metar.dewpoint}C</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4" />QNH</div>
              <p className="text-xl font-bold text-white font-mono">{metar.qnh} hPa</p>
            </div>
          </div>
          {metar.clouds.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/50 mb-2">Cloud Layers</p>
              <div className="flex flex-wrap gap-2">
                {metar.clouds.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                    {getCloudIcon(c.cover)}
                    <span className="text-sm text-white">{c.cover}{c.base ? ` @ ${c.base.toLocaleString()}ft` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {metar.weather.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/50 mb-2">Weather Phenomena</p>
              <div className="flex flex-wrap gap-2">
                {metar.weather.map((wx, i) => (
                  <span key={i} className="px-3 py-1 bg-av-warning/20 text-av-warning rounded-full text-sm">{decodeWx(wx)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading.metar && !metar && (
        <div className="glass-card p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-av-primary animate-spin mr-3" />
          <span className="text-white/50">Fetching METAR for {station}...</span>
        </div>
      )}

      {/* TAF */}
      {taf && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-av-success" /> TAF -- Forecast
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                Valid: {new Date(taf.validFrom).toLocaleDateString()} -- {new Date(taf.validTo).toLocaleDateString()}
              </span>
              <button onClick={() => setExpandedTaf((e) => !e)} className="p-1 hover:bg-white/10 rounded transition-colors">
                {expandedTaf ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
              </button>
            </div>
          </div>
          {expandedTaf && (
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-white/50 mb-1">Raw TAF</p>
              <p className="text-av-success font-mono text-sm whitespace-pre-wrap break-all">{taf.raw}</p>
            </div>
          )}
          {taf.timeline.length > 0 ? (
            <div className="space-y-3">
              {taf.timeline.map((p, i) => (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                  p.type === "tempo" ? "bg-av-warning/10 border border-av-warning/30" :
                  p.type === "becmg" ? "bg-av-primary/10 border border-av-primary/30" :
                  p.type === "prob" ? "bg-[#8b5cf6]/10 border border-[#8b5cf6]/30" : "bg-white/5"
                }`}>
                  <div className="w-20 shrink-0">
                    <p className="text-sm font-bold text-white font-mono">{p.time}</p>
                    {p.type !== "base" && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.type === "tempo" ? "bg-av-warning/20 text-av-warning" :
                        p.type === "becmg" ? "bg-av-primary/20 text-av-primary" :
                        "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                      }`}>{p.type.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.windDir}deg/{p.windSpeed}kt</span></div>
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.visibility >= 6.2 ? "10km+" : `${p.visibility}mi`}</span></div>
                    <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.clouds}</span></div>
                    {p.weather && <div className="flex items-center gap-2"><CloudRain className="w-4 h-4 text-av-warning" /><span className="text-sm text-av-warning">{decodeWx(p.weather)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-white/40"><p>TAF not currently available for {station}</p></div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Flight Categories</h4>
        <div className="flex flex-wrap gap-4">
          {[
            { cat: "VFR", color: "#10b981", desc: "Vis > 5mi, Ceiling > 3000ft" },
            { cat: "MVFR", color: "#f59e0b", desc: "3-5mi vis, 1000-3000ft" },
            { cat: "IFR", color: "#ef4444", desc: "1-3mi vis, 500-1000ft" },
            { cat: "LIFR", color: "#8b5cf6", desc: "< 1mi vis, < 500ft" },
          ].map(({ cat, color, desc }) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-white">{cat}</span>
              <span className="text-xs text-white/50">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-white/30">
        <p>Data: NOAA Aviation Weather Center API - Updates every 5 min - NOT FOR OPERATIONAL USE</p>
      </div>
    </div>
  )
}
