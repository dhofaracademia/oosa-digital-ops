"use client"

import { useState, useEffect, useRef } from "react"
import {
  Cloud, Wind, Eye, Thermometer, Droplets, Gauge, RefreshCw,
  Sun, CloudRain, CloudFog, Calendar, ChevronDown, ChevronUp, Search,
  BarChart3,
} from "lucide-react"

/* ── Types ──────────────────────────────────────────────── */
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

interface WeatherHistory {
  times: string[];
  temperature: number[];
  windSpeed: number[];
  humidity: number[];
}

function parseVisibility(raw: string | number | undefined): number {
  if (!raw) return 0
  const n = typeof raw === "number" ? raw : parseFloat(String(raw))
  return n > 100 ? parseFloat((n / 1609.34).toFixed(1)) : n
}

const OMAN_STATIONS = [
  { icao: "OOSA", name: "Salalah", lat: 17.0389, lon: 54.0914 },
  { icao: "OOMS", name: "Muscat", lat: 23.5933, lon: 58.2844 },
  { icao: "OODQ", name: "Duqm", lat: 19.5019, lon: 57.6342 },
  { icao: "OOKB", name: "Khasab", lat: 26.1709, lon: 56.2406 },
]

const NOAA_BASE = "https://aviationweather.gov/api/data"
const CORS_PROXY = "https://api.allorigins.win/raw?url="

/* ── Canvas Chart Component ─────────────────────────────── */
function MiniChart({ data, labels, color, title, unit, height = 160 }: {
  data: number[]; labels: string[]; color: string; title: string; unit: string; height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const pad = { top: 28, right: 12, bottom: 32, left: 44 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const yMin = min - range * 0.1
    const yMax = max + range * 0.1
    const yRange = yMax - yMin

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '11px monospace'
    ctx.fillText(title, pad.left, 16)

    // Current value
    const lastVal = data[data.length - 1]
    ctx.fillStyle = color
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${lastVal.toFixed(1)}${unit}`, w - pad.right, 16)
    ctx.textAlign = 'left'

    // Grid lines
    const gridCount = 4
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px monospace'
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.top + ch - (i / gridCount) * ch
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
      const val = yMin + (i / gridCount) * yRange
      ctx.fillText(val.toFixed(val > 100 ? 0 : 1), 2, y + 3)
    }

    // X-axis labels (every 6 hours)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    const step = Math.max(1, Math.floor(data.length / 8))
    for (let i = 0; i < data.length; i += step) {
      const x = pad.left + (i / (data.length - 1)) * cw
      ctx.fillText(labels[i] || '', x, h - 6)
    }
    ctx.textAlign = 'left'

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch)
    grad.addColorStop(0, color + '30')
    grad.addColorStop(1, color + '05')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + ch)
    data.forEach((v, i) => {
      const x = pad.left + (i / (data.length - 1)) * cw
      const y = pad.top + ch - ((v - yMin) / yRange) * ch
      if (i === 0) ctx.lineTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(pad.left + cw, pad.top + ch)
    ctx.closePath()
    ctx.fill()

    // Line
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = pad.left + (i / (data.length - 1)) * cw
      const y = pad.top + ch - ((v - yMin) / yRange) * ch
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Current dot
    const lastX = pad.left + cw
    const lastY = pad.top + ch - ((lastVal - yMin) / yRange) * ch
    ctx.beginPath()
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#101c22'
    ctx.lineWidth = 2
    ctx.stroke()

  }, [data, labels, color, title, unit])

  return (
    <div className="bg-white/5 rounded-lg p-3">
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  )
}

export default function WeatherStation() {
  const [station, setStation] = useState("OOSA")
  const [stationInput, setStationInput] = useState("")
  const [metar, setMetar] = useState<METARData | null>(null)
  const [taf, setTaf] = useState<TAFData | null>(null)
  const [history, setHistory] = useState<WeatherHistory | null>(null)
  const [loading, setLoading] = useState({ metar: true, taf: true })
  const [expandedTaf, setExpandedTaf] = useState(false)

  /* ── Fetch METAR/TAF with CORS fallback ────────────────── */
  const fetchWeather = async (icao: string) => {
    setLoading({ metar: true, taf: true })

    // METAR
    try {
      let data: unknown[] = []
      const metarUrl = `${NOAA_BASE}/metar?ids=${encodeURIComponent(icao)}&format=json&hours=3`
      try {
        const res = await fetch(metarUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) })
        data = await res.json()
      } catch {
        // CORS fallback
        const res = await fetch(`${CORS_PROXY}${encodeURIComponent(metarUrl)}`, { signal: AbortSignal.timeout(10000) })
        data = await res.json()
      }
      if (Array.isArray(data) && data.length > 0) {
        const m = data[0] as Record<string, unknown>
        const clouds: Array<{ cover: string; base: number }> = []
        ;["cover", "cover2", "cover3", "cover4"].forEach((k, i) => {
          const cover = (m[k] || m[`sky${i + 1}`]) as string
          const base = (m[`base${i > 0 ? i + 1 : ""}`] || m[`skyBase${i + 1}`] || m.base) as number
          if (cover && cover !== "CLR" && cover !== "SKC")
            clouds.push({ cover, base: base || 0 })
        })
        const wxRaw: string = (m.wxString || m.wx_string || "") as string
        setMetar({
          raw: (m.rawOb || m.raw_text || "") as string,
          station: (m.icaoId || m.station_id || icao) as string,
          time: (m.reportTime || m.observation_time || new Date().toISOString()) as string,
          windDir: (m.wdir ?? m.wind_dir_degrees ?? 0) as number,
          windSpeed: (m.wspd ?? m.wind_speed_kt ?? 0) as number,
          windGust: (m.wgst ?? m.wind_gust_kt ?? null) as number | null,
          visibility: parseVisibility((m.visib ?? m.visibility_statute_mi) as string | number),
          clouds,
          temperature: (m.temp ?? m.temp_c ?? 0) as number,
          dewpoint: (m.dewp ?? m.dewpoint_c ?? 0) as number,
          qnh: m.altim ? Math.round(m.altim as number) : m.altim_in_hg ? Math.round((m.altim_in_hg as number) * 33.8639) : 0,
          weather: wxRaw ? wxRaw.split(" ").filter(Boolean) : [],
          category: ((m.fltcat || m.flight_category || "VFR") as string).toUpperCase(),
        })
      } else {
        setMetar(null)
      }
    } catch {
      setMetar(null)
    } finally {
      setLoading(p => ({ ...p, metar: false }))
    }

    // TAF
    try {
      let data: unknown[] = []
      const tafUrl = `${NOAA_BASE}/taf?ids=${encodeURIComponent(icao)}&format=json&time=valid`
      try {
        const res = await fetch(tafUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) })
        data = await res.json()
      } catch {
        const res = await fetch(`${CORS_PROXY}${encodeURIComponent(tafUrl)}`, { signal: AbortSignal.timeout(10000) })
        data = await res.json()
      }
      if (Array.isArray(data) && data.length > 0) {
        const t = data[0] as Record<string, unknown>
        const timeline: TAFPeriod[] = ((t.fcsts || t.forecast || []) as Record<string, unknown>[]).map((f) => {
          const type: TAFPeriod["type"] =
            f.changeIndicator === "TEMPO" ? "tempo" :
            f.changeIndicator === "BECMG" ? "becmg" :
            (f.changeIndicator as string)?.startsWith?.("PROB") ? "prob" : "base"
          const from = (f.timeFrom || f.fcst_time_from || "") as string
          const to = (f.timeTo || f.fcst_time_to || "") as string
          const fmt = (s: string) => s ? s.toString().substring(11, 16) : ""
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
            visibility: parseVisibility((f.visib ?? f.visibility_statute_mi) as number),
            clouds: layers.join(" ") || "SKC",
            weather: (f.wxString || f.wx_string || "") as string,
            type,
          }
        })
        setTaf({
          raw: (t.rawTAF || t.raw_text || "") as string,
          station: (t.icaoId || t.station_id || icao) as string,
          issueTime: (t.issueTime || t.issue_time || new Date().toISOString()) as string,
          validFrom: (t.validTimeFrom || t.valid_time_from || new Date().toISOString()) as string,
          validTo: (t.validTimeTo || t.valid_time_to || new Date(Date.now() + 86400000).toISOString()) as string,
          timeline,
        })
      } else {
        setTaf(null)
      }
    } catch {
      setTaf(null)
    } finally {
      setLoading(p => ({ ...p, taf: false }))
    }
  }

  /* ── Fetch 48h weather history from Open-Meteo ────────── */
  const fetchHistory = async (icao: string) => {
    const st = OMAN_STATIONS.find(s => s.icao === icao)
    const lat = st?.lat || 17.0389
    const lon = st?.lon || 54.0914
    try {
      const end = new Date()
      const start = new Date(end.getTime() - 48 * 3600 * 1000)
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,relative_humidity_2m&start_date=${fmt(start)}&end_date=${fmt(end)}&timezone=auto`
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      if (data.hourly) {
        const times = (data.hourly.time as string[]).map((t: string) => {
          const d = new Date(t)
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        })
        setHistory({
          times,
          temperature: data.hourly.temperature_2m || [],
          windSpeed: data.hourly.wind_speed_10m || [],
          humidity: data.hourly.relative_humidity_2m || [],
        })
      }
    } catch {
      setHistory(null)
    }
  }

  useEffect(() => {
    fetchWeather(station)
    fetchHistory(station)
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
    if (cover === "SKC" || cover === "CLR") return <Sun className="w-5 h-5 text-[#f59e0b]" />
    if (cover === "OVC") return <CloudFog className="w-5 h-5 text-white/70" />
    return <Cloud className="w-5 h-5 text-white/70" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-6 h-6 text-[#10b981]" /> Weather Station
          </h2>
          <p className="text-white/50 text-sm mt-1">METAR, TAF &amp; Weather History</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg p-1">
            {OMAN_STATIONS.map(s => (
              <button key={s.icao} onClick={() => setStation(s.icao)}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${station===s.icao?'bg-[#10b981]/20 text-[#10b981]':'text-white/50 hover:text-white'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={stationInput}
              onChange={e => setStationInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && searchStation()}
              placeholder="ICAO..."
              maxLength={4}
              className="w-24 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-[#10b981]"
            />
            <button onClick={searchStation} className="p-2 bg-[#10b981]/20 text-[#10b981] rounded-lg hover:bg-[#10b981]/30">
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
              <Gauge className="w-5 h-5 text-[#0c9ce4]" /> METAR \u2014 {metar.station}
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
            <p className="text-[#0c9ce4] font-mono text-sm break-all">{metar.raw}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4" />Wind</div>
              <p className="text-xl font-bold text-white font-mono">{metar.windDir}\u00b0/{metar.windSpeed}kt</p>
              {metar.windGust && <p className="text-sm text-[#f59e0b]">Gusts {metar.windGust}kt</p>}
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4" />Visibility</div>
              <p className="text-xl font-bold text-white font-mono">{metar.visibility >= 6.2 ? "10km+" : `${metar.visibility}mi`}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4" />Temperature</div>
              <p className="text-xl font-bold text-white font-mono">{metar.temperature}\u00b0C</p>
              <p className="text-sm text-white/50">DP: {metar.dewpoint}\u00b0C</p>
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
                  <span key={i} className="px-3 py-1 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full text-sm">{decodeWx(wx)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading.metar && !metar && (
        <div className="glass-card p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[#0c9ce4] animate-spin mr-3" />
          <span className="text-white/50">Fetching METAR for {station}\u2026</span>
        </div>
      )}

      {/* ── Weather History Charts ────────────────────────── */}
      {history && history.temperature.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0c9ce4]" /> 48-Hour Weather History
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniChart
              data={history.temperature}
              labels={history.times}
              color="#ef4444"
              title="Temperature"
              unit="\u00b0C"
            />
            <MiniChart
              data={history.windSpeed}
              labels={history.times}
              color="#0c9ce4"
              title="Wind Speed"
              unit=" km/h"
            />
            <MiniChart
              data={history.humidity}
              labels={history.times}
              color="#10b981"
              title="Humidity"
              unit="%"
            />
          </div>
          <p className="text-xs text-white/30 mt-3 text-center">
            Data: Open-Meteo API \u2014 Hourly observations for {OMAN_STATIONS.find(s => s.icao === station)?.name || station}
          </p>
        </div>
      )}

      {/* TAF */}
      {taf && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#10b981]" /> TAF \u2014 Forecast
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                Valid: {new Date(taf.validFrom).toLocaleDateString()} \u2014 {new Date(taf.validTo).toLocaleDateString()}
              </span>
              <button onClick={() => setExpandedTaf(e => !e)} className="p-1 hover:bg-white/10 rounded transition-colors">
                {expandedTaf ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
              </button>
            </div>
          </div>
          {expandedTaf && (
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-white/50 mb-1">Raw TAF</p>
              <p className="text-[#10b981] font-mono text-sm whitespace-pre-wrap break-all">{taf.raw}</p>
            </div>
          )}
          {taf.timeline.length > 0 ? (
            <div className="space-y-3">
              {taf.timeline.map((p, i) => (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                  p.type === "tempo" ? "bg-[#f59e0b]/10 border border-[#f59e0b]/30" :
                  p.type === "becmg" ? "bg-[#0c9ce4]/10 border border-[#0c9ce4]/30" :
                  p.type === "prob" ? "bg-[#8b5cf6]/10 border border-[#8b5cf6]/30" : "bg-white/5"
                }`}>
                  <div className="w-20 shrink-0">
                    <p className="text-sm font-bold text-white font-mono">{p.time}</p>
                    {p.type !== "base" && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.type === "tempo" ? "bg-[#f59e0b]/20 text-[#f59e0b]" :
                        p.type === "becmg" ? "bg-[#0c9ce4]/20 text-[#0c9ce4]" :
                        "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                      }`}>{p.type.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.windDir}\u00b0/{p.windSpeed}kt</span></div>
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.visibility >= 6.2 ? "10km+" : `${p.visibility}mi`}</span></div>
                    <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-white/40" /><span className="text-sm text-white font-mono">{p.clouds}</span></div>
                    {p.weather && <div className="flex items-center gap-2"><CloudRain className="w-4 h-4 text-[#f59e0b]" /><span className="text-sm text-[#f59e0b]">{decodeWx(p.weather)}</span></div>}
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
        <p>Data: NOAA Aviation Weather Center + Open-Meteo \u2014 Updates every 5 min \u2014 NOT FOR OPERATIONAL USE</p>
      </div>
    </div>
  )
}
