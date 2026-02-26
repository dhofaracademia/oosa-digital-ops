"use client"

import { useState } from "react"
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Shield,
} from "lucide-react"
import {
  validateFPL,
  validateField18Only,
  SAMPLE_FLIGHT_PLANS,
  type ValidationResult,
  type Severity,
  type ParsedFPL,
  type ParsedField18,
} from "@/lib/fpl-validator"
import {
  EQUIPMENT_COM_NAV,
  EQUIPMENT_SSR,
  PBN_CODES,
  WAKE_CATEGORIES,
  FIELD18_PREFIXES,
} from "@/lib/aviation-data"

const severityConfig: Record<
  Severity,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  error: { icon: XCircle, color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Error" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Warning" },
  info: { icon: Info, color: "#0c9ce4", bg: "rgba(12,156,228,0.1)", label: "Info" },
  success: { icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "OK" },
}

type TabMode = "full" | "field18"

export default function FlightPlanValidator() {
  const [mode, setMode] = useState<TabMode>("full")
  const [fplText, setFplText] = useState("")
  const [field18Text, setField18Text] = useState("")
  const [results, setResults] = useState<ValidationResult[]>([])
  const [parsed, setParsed] = useState<ParsedFPL | null>(null)
  const [field18Parsed, setField18Parsed] = useState<ParsedField18>({})
  const [summary, setSummary] = useState<{
    errors: number
    warnings: number
    info: number
    success: number
  } | null>(null)
  const [showReference, setShowReference] = useState(false)
  const [refTab, setRefTab] = useState<"equipment" | "pbn" | "ssr" | "field18">("equipment")

  function handleValidateFull() {
    if (!fplText.trim()) return
    const validation = validateFPL(fplText)
    setResults(validation.results)
    setParsed(validation.parsed)
    setField18Parsed(validation.field18Parsed)
    setSummary(validation.summary)
  }

  function handleValidateField18() {
    if (!field18Text.trim()) return
    const res = validateField18Only(field18Text)
    setResults(res)
    setParsed(null)
    setField18Parsed({})
    const s = {
      errors: res.filter((r) => r.severity === "error").length,
      warnings: res.filter((r) => r.severity === "warning").length,
      info: res.filter((r) => r.severity === "info").length,
      success: res.filter((r) => r.severity === "success").length,
    }
    setSummary(s)
  }

  function handleReset() {
    setFplText("")
    setField18Text("")
    setResults([])
    setParsed(null)
    setField18Parsed({})
    setSummary(null)
  }

  function handleLoadSample(idx: number) {
    const sample = SAMPLE_FLIGHT_PLANS[idx]
    if (sample) {
      setFplText(sample.fpl)
      setResults([])
      setParsed(null)
      setSummary(null)
      setMode("full")
    }
  }

  function handleCopyResults() {
    const text = results
      .map((r) => `[${r.severity.toUpperCase()}] ${r.field}: ${r.message}`)
      .join("\n")
    navigator.clipboard.writeText(text)
  }

  const groupedResults = results.reduce<Record<string, ValidationResult[]>>(
    (acc, r) => {
      if (!acc[r.field]) acc[r.field] = []
      acc[r.field].push(r)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(245,158,11,0.2)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#f59e0b]" />
            </div>
            Flight Plan Validator
          </h2>
          <p className="text-white/50 mt-1">
            ICAO Doc 4444 / Oman CAA CAR-172 / CADAS-ATS pre-check
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("full")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "full"
              ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
              : "text-white/50 hover:bg-white/5 border border-transparent"
          }`}
        >
          Full FPL Validation
        </button>
        <button
          onClick={() => setMode("field18")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "field18"
              ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
              : "text-white/50 hover:bg-white/5 border border-transparent"
          }`}
        >
          Field 18 Only
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          {mode === "full" ? (
            <>
              {/* Samples */}
              <div className="glass-card p-4">
                <p className="text-sm text-white/50 mb-3">Load sample flight plan:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_FLIGHT_PLANS.map((s, i) => (
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

              {/* FPL Input */}
              <div className="glass-card p-5">
                <label className="block text-sm text-white/70 mb-2">
                  Complete ICAO FPL Message
                </label>
                <textarea
                  value={fplText}
                  onChange={(e) => setFplText(e.target.value)}
                  placeholder={"(FPL-CALLSIGN-IS\n-B738/M-SDEGHIJ1J3M1RWY/LB1D1\n-OOSA1200\n-N0450F360 DCT ...\n-OMDB0145 OOMS\n-PBN/A1B2 DOF/260215 ...)"}
                  className="aviation-input w-full font-mono text-sm min-h-[200px] resize-y"
                  spellCheck={false}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={handleValidateFull} className="aviation-btn flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Validate
                  </button>
                  <button onClick={handleReset} className="aviation-btn-secondary flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  <button
                    onClick={() => navigator.clipboard.readText().then(setFplText)}
                    className="aviation-btn-secondary flex items-center gap-2"
                  >
                    <Clipboard className="w-4 h-4" /> Paste
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-5">
              <label className="block text-sm text-white/70 mb-2">
                Field 18 - Other Information
              </label>
              <textarea
                value={field18Text}
                onChange={(e) => setField18Text(e.target.value)}
                placeholder="PBN/A1B1C1D1L1 NAV/GBAS COM/TCAS DAT/SV SUR/260B DOF/260215 REG/A4OEE EET/OOMM0045 SEL/ABCD OPR/OMA PER/C"
                className="aviation-input w-full font-mono text-sm min-h-[150px] resize-y"
                spellCheck={false}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={handleValidateField18} className="aviation-btn flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Validate Field 18
                </button>
                <button onClick={handleReset} className="aviation-btn-secondary flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          )}

          {/* Parsed Breakdown */}
          {parsed && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white/70 mb-3">
                Parsed Fields
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Field 3 - Message Type", value: parsed.field3 },
                  { label: "Field 7 - Aircraft ID", value: parsed.field7 },
                  { label: "Field 8 - Rules/Type", value: parsed.field8 },
                  { label: "Field 9 - Type/Wake", value: parsed.field9 },
                  { label: "Field 13 - Departure/EOBT", value: parsed.field13 },
                  { label: "Field 15 - Route", value: parsed.field15 },
                  { label: "Field 16 - Destination", value: parsed.field16 },
                  { label: "Field 18 - Other Info", value: parsed.field18 },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-2 bg-white/5 rounded"
                  >
                    <span className="text-xs text-white/40 min-w-[160px] shrink-0">
                      {f.label}
                    </span>
                    <span className="text-sm text-av-primary font-mono break-all">
                      {f.value || "(empty)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Summary */}
          {summary && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Validation Summary
                </h3>
                <button
                  onClick={handleCopyResults}
                  className="text-sm text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              {/* CADAS Readiness */}
              <div
                className={`p-4 rounded-lg border mb-4 ${
                  summary.errors === 0
                    ? "bg-[rgba(16,185,129,0.1)] border-[#10b981]/30"
                    : "bg-[rgba(239,68,68,0.1)] border-[#ef4444]/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {summary.errors === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#ef4444]" />
                  )}
                  <div>
                    <p
                      className={`font-semibold ${
                        summary.errors === 0 ? "text-[#10b981]" : "text-[#ef4444]"
                      }`}
                    >
                      {summary.errors === 0
                        ? "Ready for CADAS-ATS"
                        : "Not Ready for CADAS-ATS"}
                    </p>
                    <p className="text-sm text-white/50 mt-0.5">
                      {summary.errors} errors, {summary.warnings} warnings,{" "}
                      {summary.info} notes, {summary.success} passed
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {(
                  [
                    { key: "errors", label: "Errors", color: "#ef4444" },
                    { key: "warnings", label: "Warn", color: "#f59e0b" },
                    { key: "info", label: "Info", color: "#0c9ce4" },
                    { key: "success", label: "Passed", color: "#10b981" },
                  ] as const
                ).map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <p className="text-2xl font-bold font-mono" style={{ color }}>
                      {summary[key]}
                    </p>
                    <p className="text-xs text-white/40">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {Object.keys(groupedResults).length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white/70 mb-3">
                Detailed Results
              </h3>
              <div className="space-y-3">
                {Object.entries(groupedResults).map(([field, items]) => {
                  const worstSeverity = items.reduce<Severity>(
                    (worst, item) => {
                      const order: Severity[] = [
                        "success",
                        "info",
                        "warning",
                        "error",
                      ]
                      return order.indexOf(item.severity) >
                        order.indexOf(worst)
                        ? item.severity
                        : worst
                    },
                    "success"
                  )
                  const cfg = severityConfig[worstSeverity]
                  return (
                    <div
                      key={field}
                      className="rounded-lg border border-white/10 overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <cfg.icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                        <span className="text-sm font-semibold text-white">
                          {field}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full ml-auto"
                          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                        >
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {items.map((item, i) => {
                          const ic = severityConfig[item.severity]
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <ic.icon
                                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                style={{ color: ic.color }}
                              />
                              <div>
                                <p className="text-white/80">{item.message}</p>
                                {item.detail && (
                                  <p className="text-white/40 text-xs mt-0.5">
                                    {item.detail}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && (
            <div className="glass-card p-10 text-center">
              <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">
                Enter a flight plan message and click Validate to check for
                errors before CADAS-ATS filing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reference Panel */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowReference(!showReference)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Info className="w-4 h-4" /> ICAO Reference Tables
          </span>
          {showReference ? (
            <ChevronDown className="w-5 h-5 text-white/50" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/50" />
          )}
        </button>
        {showReference && (
          <div className="border-t border-white/10">
            {/* Ref Tabs */}
            <div className="flex gap-1 p-3 border-b border-white/10 overflow-x-auto">
              {(
                [
                  { key: "equipment", label: "COM/NAV Codes" },
                  { key: "ssr", label: "SSR Codes" },
                  { key: "pbn", label: "PBN Designators" },
                  { key: "field18", label: "Field 18 Prefixes" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRefTab(key)}
                  className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-all ${
                    refTab === key
                      ? "bg-av-primary/20 text-av-primary"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {refTab === "equipment" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {Object.entries(EQUIPMENT_COM_NAV).map(([code, desc]) => (
                    <div
                      key={code}
                      className="flex items-start gap-2 p-2 bg-white/5 rounded text-xs"
                    >
                      <span className="text-av-primary font-mono font-bold min-w-[24px]">
                        {code}
                      </span>
                      <span className="text-white/70">{desc}</span>
                    </div>
                  ))}
                </div>
              )}
              {refTab === "ssr" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {Object.entries(EQUIPMENT_SSR).map(([code, desc]) => (
                    <div
                      key={code}
                      className="flex items-start gap-2 p-2 bg-white/5 rounded text-xs"
                    >
                      <span className="text-av-primary font-mono font-bold min-w-[24px]">
                        {code}
                      </span>
                      <span className="text-white/70">{desc}</span>
                    </div>
                  ))}
                </div>
              )}
              {refTab === "pbn" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {Object.entries(PBN_CODES).map(([code, desc]) => (
                    <div
                      key={code}
                      className="flex items-start gap-2 p-2 bg-white/5 rounded text-xs"
                    >
                      <span className="text-[#f59e0b] font-mono font-bold min-w-[24px]">
                        {code}
                      </span>
                      <span className="text-white/70">{desc}</span>
                    </div>
                  ))}
                </div>
              )}
              {refTab === "field18" && (
                <div className="space-y-1.5">
                  {Object.entries(FIELD18_PREFIXES).map(([prefix, info]) => (
                    <div
                      key={prefix}
                      className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-2 bg-white/5 rounded text-xs"
                    >
                      <span className="text-[#f59e0b] font-mono font-bold min-w-[50px]">
                        {prefix}
                      </span>
                      <div className="flex-1">
                        <span className="text-white/80 font-medium">
                          {info.name}
                        </span>
                        {info.mandatory && (
                          <span className="text-[#ef4444] text-[10px] ml-2">
                            MANDATORY
                          </span>
                        )}
                        <p className="text-white/40">{info.description}</p>
                        <p className="text-white/30 font-mono mt-0.5">
                          e.g. {info.example}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
