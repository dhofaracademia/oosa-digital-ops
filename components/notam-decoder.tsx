"use client"

import { useState, useCallback } from "react"
import {
  AlertTriangle,
  Search,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Layers,
  Clipboard,
  ExternalLink,
  Loader2,
} from "lucide-react"
import {
  decodeNotam,
  getNotamCategoryColor,
  SAMPLE_NOTAMS,
  type DecodedNotam,
} from "@/lib/notam-parser"
import { OMAN_AIRPORTS } from "@/lib/aviation-data"

type TabMode = "search" | "decode"

interface SearchResult {
  raw: string
  decoded: DecodedNotam
}

export default function NotamDecoder() {
  const [mode, setMode] = useState<TabMode>("search")

  // Search state
  const [searchIcao, setSearchIcao] = useState("OOSA")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [expandedNotam, setExpandedNotam] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")

  // Decode state
  const [notamText, setNotamText] = useState("")
  const [decoded, setDecoded] = useState<DecodedNotam | null>(null)

  const handleSearch = useCallback(async () => {
    if (!searchIcao.trim()) return
    setSearchLoading(true)
    setSearchError("")
    setSearchResults([])

    try {
      const res = await fetch(
        `/api/notam/search?icao=${encodeURIComponent(searchIcao.toUpperCase().trim())}`
      )
      const data = await res.json()

      if (!res.ok) {
        setSearchError(data.error || "Failed to fetch NOTAMs")
        return
      }

      if (data.notams && Array.isArray(data.notams)) {
        const processed: SearchResult[] = data.notams.map(
          (n: { raw?: string; text?: string; body?: string }) => {
            const rawText = n.raw || n.text || n.body || JSON.stringify(n)
            return { raw: rawText, decoded: decodeNotam(rawText) }
          }
        )
        setSearchResults(processed)
        if (processed.length === 0) {
          setSearchError(`No active NOTAMs found for ${searchIcao.toUpperCase()}`)
        }
      } else if (data.message) {
        setSearchError(data.message)
      }
    } catch {
      setSearchError("Network error. Make sure you have an AVWX_API_KEY set, or use the manual decode tab.")
    } finally {
      setSearchLoading(false)
    }
  }, [searchIcao])

  function handleDecode() {
    if (!notamText.trim()) return
    const result = decodeNotam(notamText)
    setDecoded(result)
  }

  function handleLoadSample(idx: number) {
    const sample = SAMPLE_NOTAMS[idx]
    if (sample) {
      setNotamText(sample.notam)
      setDecoded(null)
      setMode("decode")
    }
  }

  function handleCopyDecoded(text: string) {
    navigator.clipboard.writeText(text)
  }

  const filteredResults =
    filterCategory === "all"
      ? searchResults
      : searchResults.filter((r) => {
          const cat = r.decoded.category || ""
          if (filterCategory === "runway") return cat.includes("QM")
          if (filterCategory === "nav") return cat.includes("QF") || cat.includes("QI")
          if (filterCategory === "airspace") return cat.includes("QR") || cat.includes("QA")
          if (filterCategory === "lighting") return cat.includes("QL")
          if (filterCategory === "procedure") return cat.includes("QP") || cat.includes("QS")
          return true
        })

  const categories = [
    { key: "all", label: "All" },
    { key: "runway", label: "Runway/Movement" },
    { key: "nav", label: "Navigation" },
    { key: "airspace", label: "Airspace" },
    { key: "lighting", label: "Lighting" },
    { key: "procedure", label: "Procedures" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.2)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
            </div>
            NOTAM Search & Decoder
          </h2>
          <p className="text-white/50 mt-1">
            Search active NOTAMs by aerodrome or decode raw NOTAM text
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("search")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "search"
              ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30"
              : "text-white/50 hover:bg-white/5 border border-transparent"
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Search NOTAMs
        </button>
        <button
          onClick={() => setMode("decode")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "decode"
              ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30"
              : "text-white/50 hover:bg-white/5 border border-transparent"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Decode NOTAM
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm text-white/50 mb-2">
                  ICAO Station Code
                </label>
                <input
                  type="text"
                  value={searchIcao}
                  onChange={(e) =>
                    setSearchIcao(e.target.value.toUpperCase().slice(0, 4))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="OOSA"
                  className="aviation-input w-full font-mono text-lg uppercase"
                  maxLength={4}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || searchIcao.length < 4}
                  className="aviation-btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </button>
              </div>
            </div>

            {/* Quick Airport Buttons */}
            <div className="mt-4">
              <p className="text-xs text-white/40 mb-2">Oman Airports:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(OMAN_AIRPORTS).map(([code, info]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setSearchIcao(code)
                      setSearchResults([])
                      setSearchError("")
                    }}
                    className={`px-3 py-1.5 text-xs rounded border transition-all ${
                      searchIcao === code
                        ? "bg-[#ef4444]/20 border-[#ef4444]/30 text-[#ef4444]"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="font-mono font-bold">{code}</span>
                    <span className="hidden sm:inline ml-1.5 text-white/40">
                      {info.city}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {searchError && (
            <div className="glass-card p-4 border border-[#f59e0b]/30 bg-[rgba(245,158,11,0.05)]">
              <p className="text-[#f59e0b] text-sm">{searchError}</p>
              {searchError.includes("AVWX_API_KEY") && (
                <p className="text-white/40 text-xs mt-2">
                  To enable NOTAM search, get a free API key from{" "}
                  <a
                    href="https://avwx.rest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-av-primary hover:underline"
                  >
                    avwx.rest
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>{" "}
                  and set it as AVWX_API_KEY in your environment. You can still
                  use the Decode NOTAM tab to paste and decode raw NOTAM text.
                </p>
              )}
            </div>
          )}

          {/* Category Filter */}
          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs rounded transition-all ${
                    filterCategory === cat.key
                      ? "bg-av-primary/20 text-av-primary border border-av-primary/30"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {cat.label}
                  {cat.key === "all" && (
                    <span className="ml-1.5 text-white/40">
                      ({searchResults.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {filteredResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-white/50">
                {filteredResults.length} NOTAM{filteredResults.length !== 1 ? "s" : ""} found
                for {searchIcao}
              </p>
              {filteredResults.map((result, idx) => {
                const catColor = getNotamCategoryColor(result.decoded.category)
                const isExpanded = expandedNotam === `${idx}`
                return (
                  <div
                    key={idx}
                    className="glass-card overflow-hidden border-l-2"
                    style={{ borderLeftColor: catColor }}
                  >
                    <button
                      onClick={() =>
                        setExpandedNotam(isExpanded ? null : `${idx}`)
                      }
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-bold font-mono"
                              style={{ color: catColor }}
                            >
                              {result.decoded.id || `NOTAM #${idx + 1}`}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${catColor}20`,
                                color: catColor,
                              }}
                            >
                              {result.decoded.typeLabel}
                            </span>
                            {result.decoded.categoryLabel && (
                              <span className="text-xs text-white/40">
                                {result.decoded.categoryLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/70 mt-1 line-clamp-2">
                            {result.decoded.decodedText ||
                              result.decoded.rawText ||
                              result.raw.substring(0, 100)}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                            {result.decoded.validFromFormatted && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {result.decoded.validFromFormatted}
                              </span>
                            )}
                            {result.decoded.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {result.decoded.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-white/40 shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-white/40 shrink-0" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/10 p-4 space-y-4">
                        <NotamDetailView
                          decoded={result.decoded}
                          raw={result.raw}
                          onCopy={handleCopyDecoded}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!searchLoading && searchResults.length === 0 && !searchError && (
            <div className="glass-card p-10 text-center">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">
                Enter an ICAO station code and click Search to find active NOTAMs.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Decode Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {/* Samples */}
            <div className="glass-card p-4">
              <p className="text-sm text-white/50 mb-3">Load sample NOTAM:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_NOTAMS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleLoadSample(i)}
                    className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 transition-all"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <label className="block text-sm text-white/70 mb-2">
                Raw NOTAM Text
              </label>
              <textarea
                value={notamText}
                onChange={(e) => setNotamText(e.target.value)}
                placeholder={"(A1234/26 NOTAMN\nQ) OOMM/QMRLC/IV/NBO/A/000/999/...\nA) OOSA\nB) 2602151200\nC) 2603151600\nD) DAILY 1200-1600\nE) RWY 07/25 CLSD DUE WIP RESURFACING)"}
                className="aviation-input w-full font-mono text-sm min-h-[220px] resize-y"
                spellCheck={false}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={handleDecode} className="aviation-btn flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Decode
                </button>
                <button
                  onClick={() => {
                    setNotamText("")
                    setDecoded(null)
                  }}
                  className="aviation-btn-secondary flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button
                  onClick={() => navigator.clipboard.readText().then(setNotamText)}
                  className="aviation-btn-secondary flex items-center gap-2"
                >
                  <Clipboard className="w-4 h-4" /> Paste
                </button>
              </div>
            </div>
          </div>

          {/* Decoded Output */}
          <div>
            {decoded ? (
              <div className="glass-card p-5 space-y-4">
                <NotamDetailView
                  decoded={decoded}
                  raw={notamText}
                  onCopy={handleCopyDecoded}
                />
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <Layers className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">
                  Paste a raw NOTAM and click Decode to translate it into plain text.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── NOTAM Detail View Component ──────────────────────────────────────────────

function NotamDetailView({
  decoded,
  raw,
  onCopy,
}: {
  decoded: DecodedNotam
  raw: string
  onCopy: (text: string) => void
}) {
  const catColor = getNotamCategoryColor(decoded.category)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono" style={{ color: catColor }}>
            {decoded.id || "NOTAM"}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${catColor}20`, color: catColor }}
          >
            {decoded.typeLabel}
          </span>
        </div>
        <button
          onClick={() => onCopy(decoded.decodedText)}
          className="text-sm text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {decoded.location && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">Location</p>
            <p className="text-sm text-white font-mono">{decoded.location}</p>
          </div>
        )}
        {decoded.qLine?.fir && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">FIR</p>
            <p className="text-sm text-white font-mono">{decoded.qLine.fir}</p>
          </div>
        )}
        {decoded.validFromFormatted && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">Valid From</p>
            <p className="text-sm text-white">{decoded.validFromFormatted}</p>
          </div>
        )}
        {decoded.validToFormatted && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">Valid Until</p>
            <p className="text-sm text-white">{decoded.validToFormatted}</p>
          </div>
        )}
        {decoded.lowerAlt && decoded.lowerAlt !== "000" && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">Lower Limit</p>
            <p className="text-sm text-white font-mono">
              {decoded.lowerAlt === "SFC" ? "Surface" : `FL${decoded.lowerAlt}`}
            </p>
          </div>
        )}
        {decoded.upperAlt && decoded.upperAlt !== "999" && (
          <div className="bg-white/5 rounded p-3">
            <p className="text-xs text-white/40 mb-0.5">Upper Limit</p>
            <p className="text-sm text-white font-mono">FL{decoded.upperAlt}</p>
          </div>
        )}
      </div>

      {decoded.schedule && (
        <div className="bg-white/5 rounded p-3">
          <p className="text-xs text-white/40 mb-0.5">Schedule</p>
          <p className="text-sm text-white font-mono">{decoded.schedule}</p>
        </div>
      )}

      {decoded.categoryLabel && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Category:</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${catColor}20`, color: catColor }}>
            {decoded.categoryLabel}
          </span>
          {decoded.conditionLabel && (
            <span className="text-xs text-white/50">
              - {decoded.conditionLabel}
            </span>
          )}
        </div>
      )}

      {/* Decoded Text */}
      {decoded.decodedText && (
        <div>
          <p className="text-xs text-white/40 mb-1.5">Plain English</p>
          <div className="bg-[rgba(16,185,129,0.05)] border border-[#10b981]/20 rounded-lg p-4">
            <p className="text-sm text-white/90 leading-relaxed">
              {decoded.decodedText}
            </p>
          </div>
        </div>
      )}

      {/* Raw Text */}
      <div>
        <p className="text-xs text-white/40 mb-1.5">Raw NOTAM</p>
        <div className="bg-black/30 rounded-lg p-4">
          <pre className="text-xs text-av-primary font-mono whitespace-pre-wrap break-all">
            {decoded.rawText || raw}
          </pre>
        </div>
      </div>
    </>
  )
}
