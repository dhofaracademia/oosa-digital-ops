// ──────────────────────────────────────────────────────────────────────────────
// OOSA Digital OPS — Full ICAO Flight Plan Validator
// Per ICAO Doc 4444 (PANS-ATM), Annex 2, Oman CAA CAR-172/CAR-175
// ──────────────────────────────────────────────────────────────────────────────

import {
  EQUIPMENT_COM_NAV,
  EQUIPMENT_SSR,
  PBN_CODES,
  WAKE_CATEGORIES,
  FLIGHT_RULES,
  FLIGHT_TYPES,
  PERFORMANCE_CATEGORIES,
  FIELD18_PREFIXES,
  AIRCRAFT_TYPES,
  COMMON_AIRPORTS,
  OMAN_AIRPORTS,
} from "./aviation-data"

// ── Types ───────────────────────────────────────────────────────────────────

export type Severity = "error" | "warning" | "info" | "success"

export interface ValidationResult {
  field: string
  severity: Severity
  message: string
  detail?: string
}

export interface ParsedFPL {
  raw: string
  field3: string // message type
  field7: string // aircraft ID
  field8: string // flight rules + type
  field9: string // number, type, wake
  field10: string // equipment
  field13: string // departure + EOBT
  field15: string // route
  field16: string // destination
  field18: string // other info
  field19?: string // supplementary
}

export interface ParsedField18 {
  [key: string]: string
}

// ── Parser ──────────────────────────────────────────────────────────────────

export function parseFPL(raw: string): ParsedFPL | null {
  const cleaned = raw.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()

  // Match the overall FPL pattern
  const match = cleaned.match(
    /^\(?(FPL)\s*-\s*([A-Z0-9]{2,7})\s*-\s*([IVYZ][SNGMX])\s*\n?\s*-\s*(.+?)\s*-\s*([A-Z]{4}\d{4})\s*\n?\s*-\s*(.+?)\s*-\s*(.+?)\s*\n?\s*-\s*(.*?)(?:\s*-\s*(.*?))?\s*\)?$/i
  )

  if (match) {
    return {
      raw: cleaned,
      field3: match[1],
      field7: match[2],
      field8: match[3],
      field9: match[4].trim(),
      field10: "", // extracted from field9 block
      field13: match[5],
      field15: match[6].trim(),
      field16: match[7].trim(),
      field18: match[8]?.trim() || "",
      field19: match[9]?.trim(),
    }
  }

  // Try a more lenient parse by splitting on hyphens after (FPL
  const dashParts = cleaned
    .replace(/^\(?FPL\s*-?\s*/, "")
    .replace(/\)?\s*$/, "")
    .split(/\s*-\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (dashParts.length >= 6) {
    return {
      raw: cleaned,
      field3: "FPL",
      field7: dashParts[0] || "",
      field8: dashParts[1] || "",
      field9: dashParts[2] || "",
      field10: "",
      field13: dashParts[3] || "",
      field15: dashParts[4] || "",
      field16: dashParts[5] || "",
      field18: dashParts[6] || "",
      field19: dashParts[7],
    }
  }

  return null
}

export function parseField18(text: string): ParsedField18 {
  const result: ParsedField18 = {}
  if (!text) return result

  // Known prefixes sorted longest first to avoid partial matches
  const prefixes = Object.keys(FIELD18_PREFIXES).sort(
    (a, b) => b.length - a.length
  )

  // Find all prefix positions
  const positions: { prefix: string; index: number }[] = []
  for (const prefix of prefixes) {
    let searchFrom = 0
    while (true) {
      const idx = text.indexOf(prefix, searchFrom)
      if (idx === -1) break
      positions.push({ prefix, index: idx })
      searchFrom = idx + prefix.length
    }
  }

  positions.sort((a, b) => a.index - b.index)

  for (let i = 0; i < positions.length; i++) {
    const { prefix, index } = positions[i]
    const valueStart = index + prefix.length
    const valueEnd =
      i + 1 < positions.length ? positions[i + 1].index : text.length
    const value = text.substring(valueStart, valueEnd).trim()
    result[prefix.replace("/", "")] = value
  }

  return result
}

// ── Validators ──────────────────────────────────────────────────────────────

function validateField7(callsign: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!callsign) {
    results.push({ field: "Field 7", severity: "error", message: "Aircraft identification is missing" })
    return results
  }
  if (callsign.length < 2 || callsign.length > 7) {
    results.push({ field: "Field 7", severity: "error", message: `Callsign "${callsign}" must be 2-7 characters`, detail: "ICAO Doc 4444 requires 2-7 alphanumeric characters" })
  }
  if (!/^[A-Z0-9]+$/.test(callsign)) {
    results.push({ field: "Field 7", severity: "error", message: "Callsign must be alphanumeric only" })
  }
  if (results.length === 0) {
    results.push({ field: "Field 7", severity: "success", message: `Aircraft ID: ${callsign}` })
  }
  return results
}

function validateField8(field8: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!field8 || field8.length < 2) {
    results.push({ field: "Field 8", severity: "error", message: "Flight rules and type are missing" })
    return results
  }
  const rules = field8[0]
  const type = field8[1]

  if (!FLIGHT_RULES[rules]) {
    results.push({ field: "Field 8", severity: "error", message: `Invalid flight rules "${rules}"`, detail: "Must be I, V, Y, or Z" })
  } else {
    results.push({ field: "Field 8", severity: "success", message: `Rules: ${FLIGHT_RULES[rules]}` })
  }

  if (!FLIGHT_TYPES[type]) {
    results.push({ field: "Field 8", severity: "error", message: `Invalid flight type "${type}"`, detail: "Must be S, N, G, M, or X" })
  } else {
    results.push({ field: "Field 8", severity: "success", message: `Type: ${FLIGHT_TYPES[type]}` })
  }

  return results
}

function validateField9(field9: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!field9) {
    results.push({ field: "Field 9", severity: "error", message: "Number, type, and wake category are missing" })
    return results
  }

  // Format: number/type/wake e.g. B738/M or 1B738/M
  const match = field9.match(/^(\d{0,2})([A-Z0-9]{2,4})\/([LMHJ])(.*)/)
  if (!match) {
    // Could be in format "type/wake-equipment"
    const altMatch = field9.match(/([A-Z0-9]{2,4})\/([LMHJ])(.*)/)
    if (altMatch) {
      const acType = altMatch[1]
      const wake = altMatch[2]
      const equipmentPart = altMatch[3]

      if (AIRCRAFT_TYPES[acType]) {
        results.push({ field: "Field 9", severity: "success", message: `Type: ${AIRCRAFT_TYPES[acType].name}` })
        if (AIRCRAFT_TYPES[acType].wake !== wake) {
          results.push({ field: "Field 9", severity: "warning", message: `Wake category "${wake}" may not match ${acType} (expected ${AIRCRAFT_TYPES[acType].wake})` })
        }
      } else {
        results.push({ field: "Field 9", severity: "info", message: `Aircraft type: ${acType} (not in common database)` })
      }

      results.push({ field: "Field 9", severity: "success", message: `Wake category: ${WAKE_CATEGORIES[wake]?.label || wake}` })

      // Parse equipment if it's appended (e.g. -SDE2E3FGHIJ1J3J5M1RWY/LB1D1)
      if (equipmentPart && equipmentPart.startsWith("-")) {
        const eqParts = equipmentPart.substring(1).split("/")
        if (eqParts.length >= 1) {
          results.push(...validateField10(eqParts.join("/")))
        }
      }
    } else {
      results.push({ field: "Field 9", severity: "error", message: `Cannot parse type/wake: "${field9}"`, detail: "Expected format: TYPE/WAKE (e.g., B738/M)" })
    }
    return results
  }

  const num = match[1]
  const acType = match[2]
  const wake = match[3]

  if (num && (parseInt(num) < 1 || parseInt(num) > 99)) {
    results.push({ field: "Field 9", severity: "error", message: `Invalid number of aircraft: ${num}` })
  }

  if (AIRCRAFT_TYPES[acType]) {
    results.push({ field: "Field 9", severity: "success", message: `Type: ${AIRCRAFT_TYPES[acType].name}` })
  } else {
    results.push({ field: "Field 9", severity: "info", message: `Type: ${acType} (not in common database)` })
  }

  results.push({ field: "Field 9", severity: "success", message: `Wake: ${WAKE_CATEGORIES[wake]?.label} (${WAKE_CATEGORIES[wake]?.mtow})` })

  return results
}

function validateField10(equipment: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!equipment) {
    results.push({ field: "Field 10", severity: "warning", message: "Equipment field is empty" })
    return results
  }

  const parts = equipment.split("/")
  const comNav = parts[0] || ""
  const ssr = parts[1] || ""

  // Validate COM/NAV codes
  if (comNav === "N") {
    results.push({ field: "Field 10", severity: "info", message: "No COM/NAV equipment" })
  } else if (comNav) {
    const validCodes: string[] = []
    const invalidCodes: string[] = []
    let i = 0
    while (i < comNav.length) {
      // Check for two-char codes first
      const twoChar = comNav.substring(i, i + 2)
      if (EQUIPMENT_COM_NAV[twoChar]) {
        validCodes.push(twoChar)
        i += 2
      } else if (EQUIPMENT_COM_NAV[comNav[i]]) {
        validCodes.push(comNav[i])
        i += 1
      } else {
        invalidCodes.push(comNav[i])
        i += 1
      }
    }
    if (validCodes.length > 0) {
      results.push({ field: "Field 10", severity: "success", message: `COM/NAV: ${validCodes.join(", ")}` })
    }
    if (invalidCodes.length > 0) {
      results.push({ field: "Field 10", severity: "warning", message: `Unknown COM/NAV codes: ${invalidCodes.join(", ")}` })
    }
  }

  // Validate SSR codes
  if (ssr === "N") {
    results.push({ field: "Field 10", severity: "warning", message: "No surveillance equipment declared" })
  } else if (ssr) {
    const validSSR: string[] = []
    const invalidSSR: string[] = []
    let i = 0
    while (i < ssr.length) {
      const twoChar = ssr.substring(i, i + 2)
      if (EQUIPMENT_SSR[twoChar]) {
        validSSR.push(twoChar)
        i += 2
      } else if (EQUIPMENT_SSR[ssr[i]]) {
        validSSR.push(ssr[i])
        i += 1
      } else {
        invalidSSR.push(ssr[i])
        i += 1
      }
    }
    if (validSSR.length > 0) {
      results.push({ field: "Field 10", severity: "success", message: `SSR: ${validSSR.join(", ")}` })
    }
    if (invalidSSR.length > 0) {
      results.push({ field: "Field 10", severity: "warning", message: `Unknown SSR codes: ${invalidSSR.join(", ")}` })
    }
  }

  return results
}

function validateField13(field13: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!field13 || field13.length < 8) {
    results.push({ field: "Field 13", severity: "error", message: "Departure aerodrome and EOBT are missing", detail: "Format: ICAO code (4 chars) + EOBT (4 digits HHMM)" })
    return results
  }

  const depIcao = field13.substring(0, 4).toUpperCase()
  const eobt = field13.substring(4, 8)

  // Validate ICAO code
  if (!/^[A-Z]{4}$/.test(depIcao)) {
    results.push({ field: "Field 13", severity: "error", message: `Invalid departure ICAO: "${depIcao}"` })
  } else {
    const name = COMMON_AIRPORTS[depIcao]
    results.push({ field: "Field 13", severity: "success", message: `Departure: ${depIcao}${name ? ` (${name})` : ""}` })
  }

  // Validate EOBT
  if (!/^\d{4}$/.test(eobt)) {
    results.push({ field: "Field 13", severity: "error", message: `Invalid EOBT: "${eobt}"`, detail: "Must be 4 digits HHMM" })
  } else {
    const hours = parseInt(eobt.substring(0, 2))
    const minutes = parseInt(eobt.substring(2, 4))
    if (hours > 23 || minutes > 59) {
      results.push({ field: "Field 13", severity: "error", message: `Invalid EOBT time: ${eobt}` })
    } else {
      results.push({ field: "Field 13", severity: "success", message: `EOBT: ${eobt}Z` })
    }
  }

  // Oman-specific: 60-min filing requirement (CAR-172)
  if (OMAN_AIRPORTS[depIcao]) {
    results.push({
      field: "Field 13",
      severity: "info",
      message: "Oman CAR-172: FPL must be filed at least 60 minutes before EOBT for IFR flights in Muscat FIR",
    })
  }

  return results
}

function validateField15(field15: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!field15) {
    results.push({ field: "Field 15", severity: "error", message: "Route information is missing" })
    return results
  }

  // Parse speed and level
  const speedMatch = field15.match(/^([NMK]\d{3,4})(F\d{3}|S\d{4}|A\d{3}|VFR)\s+(.*)/)
  if (!speedMatch) {
    // Try simpler parse
    const simpleMatch = field15.match(/^([NMK]\d{3,4})\s*(F\d{3}|S\d{4}|A\d{3}|VFR)\s+(.*)/)
    if (simpleMatch) {
      results.push({ field: "Field 15", severity: "success", message: `Speed: ${simpleMatch[1]}` })
      results.push({ field: "Field 15", severity: "success", message: `Level: ${simpleMatch[2]}` })
      validateRoute(simpleMatch[3], results)
    } else {
      results.push({ field: "Field 15", severity: "warning", message: "Could not parse speed/level prefix", detail: `Raw: ${field15.substring(0, 30)}...` })
      validateRoute(field15, results)
    }
    return results
  }

  const speed = speedMatch[1]
  const level = speedMatch[2]
  const route = speedMatch[3]

  // Speed validation
  if (speed.startsWith("N")) {
    const kts = parseInt(speed.substring(1))
    if (kts < 50 || kts > 999) {
      results.push({ field: "Field 15", severity: "warning", message: `Unusual speed: ${speed} (${kts} knots)` })
    } else {
      results.push({ field: "Field 15", severity: "success", message: `Speed: ${kts} knots TAS` })
    }
  } else if (speed.startsWith("M")) {
    const mach = parseInt(speed.substring(1)) / 100
    results.push({ field: "Field 15", severity: "success", message: `Speed: Mach ${mach.toFixed(2)}` })
  } else if (speed.startsWith("K")) {
    results.push({ field: "Field 15", severity: "success", message: `Speed: ${parseInt(speed.substring(1))} km/h` })
  }

  // Level validation
  if (level.startsWith("F")) {
    const fl = parseInt(level.substring(1))
    results.push({ field: "Field 15", severity: "success", message: `Level: FL${fl} (${(fl * 100).toLocaleString()} ft)` })
    if (fl > 600) {
      results.push({ field: "Field 15", severity: "warning", message: `FL${fl} is unusually high` })
    }
  } else if (level.startsWith("A")) {
    const alt = parseInt(level.substring(1)) * 100
    results.push({ field: "Field 15", severity: "success", message: `Altitude: ${alt.toLocaleString()} ft` })
  } else if (level.startsWith("S")) {
    results.push({ field: "Field 15", severity: "success", message: `Standard metric: ${level}` })
  } else if (level === "VFR") {
    results.push({ field: "Field 15", severity: "success", message: "Level: VFR" })
  }

  validateRoute(route, results)
  return results
}

function validateRoute(route: string, results: ValidationResult[]) {
  if (!route) return
  const segments = route.trim().split(/\s+/)
  let hasDCT = false
  let hasAirway = false

  for (const seg of segments) {
    if (seg === "DCT") {
      hasDCT = true
    } else if (/^[A-Z]{1,2}\d{1,4}$/.test(seg)) {
      hasAirway = true
    }
  }

  if (hasDCT) results.push({ field: "Field 15", severity: "info", message: "Route includes direct (DCT) segments" })
  if (hasAirway) results.push({ field: "Field 15", severity: "info", message: "Route includes airway segments" })
  results.push({ field: "Field 15", severity: "success", message: `Route: ${segments.length} segments` })
}

function validateField16(field16: string): ValidationResult[] {
  const results: ValidationResult[] = []
  if (!field16 || field16.length < 8) {
    results.push({ field: "Field 16", severity: "error", message: "Destination and EET are missing", detail: "Format: ICAO code + 4-digit EET + optional alternates" })
    return results
  }

  const destIcao = field16.substring(0, 4).toUpperCase()
  const eet = field16.substring(4, 8)

  if (!/^[A-Z]{4}$/.test(destIcao)) {
    results.push({ field: "Field 16", severity: "error", message: `Invalid destination ICAO: "${destIcao}"` })
  } else {
    const name = COMMON_AIRPORTS[destIcao]
    results.push({ field: "Field 16", severity: "success", message: `Destination: ${destIcao}${name ? ` (${name})` : ""}` })
  }

  if (!/^\d{4}$/.test(eet)) {
    results.push({ field: "Field 16", severity: "error", message: `Invalid EET: "${eet}"` })
  } else {
    const hours = parseInt(eet.substring(0, 2))
    const mins = parseInt(eet.substring(2, 4))
    results.push({ field: "Field 16", severity: "success", message: `Total EET: ${hours}h ${mins}m` })
  }

  // Alternates (each 4-char ICAO)
  const remaining = field16.substring(8).trim()
  if (remaining) {
    const alternates = remaining.match(/[A-Z]{4}/g) || []
    for (const alt of alternates) {
      const name = COMMON_AIRPORTS[alt]
      results.push({ field: "Field 16", severity: "success", message: `Alternate: ${alt}${name ? ` (${name})` : ""}` })
    }
  }

  return results
}

function validateField18Parsed(
  field18: ParsedField18,
  field8: string,
  field10: string
): ValidationResult[] {
  const results: ValidationResult[] = []

  if (Object.keys(field18).length === 0) {
    results.push({ field: "Field 18", severity: "warning", message: "Field 18 is empty" })
    return results
  }

  // Validate each known prefix
  for (const [key, value] of Object.entries(field18)) {
    const prefixKey = key + "/"
    const prefixInfo = FIELD18_PREFIXES[prefixKey]
    if (prefixInfo) {
      results.push({ field: "Field 18", severity: "success", message: `${prefixInfo.name}: ${value}` })
    } else {
      results.push({ field: "Field 18", severity: "warning", message: `Unknown prefix: ${key}/` })
    }
  }

  // Validate PBN codes
  if (field18.PBN) {
    const pbnStr = field18.PBN.trim()
    const codes = pbnStr.match(/[A-Z]\d/g) || []
    const invalid = codes.filter((c) => !PBN_CODES[c])
    if (invalid.length > 0) {
      results.push({ field: "Field 18", severity: "warning", message: `Unknown PBN codes: ${invalid.join(", ")}` })
    }
    const valid = codes.filter((c) => PBN_CODES[c])
    if (valid.length > 0) {
      results.push({ field: "Field 18", severity: "info", message: `PBN capabilities: ${valid.map((c) => `${c} (${PBN_CODES[c]})`).join(", ")}` })
    }
  }

  // Validate DOF format
  if (field18.DOF) {
    if (!/^\d{6}$/.test(field18.DOF)) {
      results.push({ field: "Field 18", severity: "error", message: `Invalid DOF format: "${field18.DOF}"`, detail: "Must be YYMMDD (e.g., 260215)" })
    }
  }

  // Validate PER
  if (field18.PER) {
    if (!PERFORMANCE_CATEGORIES[field18.PER]) {
      results.push({ field: "Field 18", severity: "error", message: `Invalid performance category: "${field18.PER}"`, detail: "Must be A, B, C, D, or E" })
    }
  }

  // ── Cross-field validations ───────────────────────────────────────────────

  const rules = field8?.[0] || ""

  // IFR + no equipment
  if (rules === "I" && field10.split("/")[0] === "N") {
    results.push({ field: "Cross-check", severity: "error", message: "IFR flight rules but no COM/NAV equipment (Field 10 = N)" })
  }

  // R in Field 10 requires PBN/ in Field 18
  if (field10.includes("R") && !field18.PBN) {
    results.push({ field: "Cross-check", severity: "error", message: "Field 10 includes R (PBN approved) but Field 18 has no PBN/ entry", detail: "ICAO Doc 4444: If R is filed in Field 10, PBN/ must appear in Field 18" })
  }

  // Z in Field 10 requires COM/ NAV/ DAT/ in Field 18
  if (field10.includes("Z") && !field18.COM && !field18.NAV && !field18.DAT) {
    results.push({ field: "Cross-check", severity: "error", message: "Field 10 includes Z but Field 18 has no COM/, NAV/, or DAT/", detail: "ICAO Doc 4444: Z requires specification in Field 18" })
  }

  // Mandatory fields for Oman
  if (!field18.REG) {
    results.push({ field: "Field 18", severity: "warning", message: "REG/ (registration) is recommended for Oman FIR operations" })
  }
  if (!field18.DOF) {
    results.push({ field: "Field 18", severity: "warning", message: "DOF/ (date of flight) is recommended" })
  }

  // Muscat FIR PBN mandatory
  if (rules === "I" && !field18.PBN) {
    results.push({ field: "Field 18", severity: "warning", message: "Oman CAR-175: PBN/ is recommended for IFR flights in Muscat FIR" })
  }

  return results
}

// ── Main Validation Function ────────────────────────────────────────────────

export function validateFPL(raw: string): {
  parsed: ParsedFPL | null
  field18Parsed: ParsedField18
  results: ValidationResult[]
  summary: { errors: number; warnings: number; info: number; success: number }
} {
  const results: ValidationResult[] = []

  const parsed = parseFPL(raw)
  if (!parsed) {
    results.push({
      field: "Format",
      severity: "error",
      message: "Could not parse FPL message",
      detail:
        "Expected format: (FPL-CALLSIGN-RULESTYPE-EQUIPMENT-DEPARTURE-ROUTE-DESTINATION-OTHER INFO)",
    })
    return {
      parsed: null,
      field18Parsed: {},
      results,
      summary: { errors: 1, warnings: 0, info: 0, success: 0 },
    }
  }

  results.push({ field: "Format", severity: "success", message: "FPL message parsed successfully" })

  // Validate each field
  results.push(...validateField7(parsed.field7))
  results.push(...validateField8(parsed.field8))
  results.push(...validateField9(parsed.field9))
  results.push(...validateField13(parsed.field13))
  results.push(...validateField15(parsed.field15))
  results.push(...validateField16(parsed.field16))

  // Parse and validate Field 18
  const field18Parsed = parseField18(parsed.field18)
  results.push(...validateField18Parsed(field18Parsed, parsed.field8, parsed.field10 || parsed.field9))

  // CADAS readiness
  const errors = results.filter((r) => r.severity === "error").length
  if (errors === 0) {
    results.push({ field: "CADAS-ATS", severity: "success", message: "Flight plan appears ready for CADAS-ATS entry" })
  } else {
    results.push({ field: "CADAS-ATS", severity: "error", message: `${errors} error(s) must be resolved before filing in CADAS-ATS` })
  }

  const summary = {
    errors: results.filter((r) => r.severity === "error").length,
    warnings: results.filter((r) => r.severity === "warning").length,
    info: results.filter((r) => r.severity === "info").length,
    success: results.filter((r) => r.severity === "success").length,
  }

  return { parsed, field18Parsed, results, summary }
}

// ── Field 18 Only Validator (for quick validation) ──────────────────────────

export function validateField18Only(text: string): ValidationResult[] {
  const parsed = parseField18(text)
  return validateField18Parsed(parsed, "", "")
}

// ── Sample Flight Plans ─────────────────────────────────────────────────────

export const SAMPLE_FLIGHT_PLANS = [
  {
    name: "OMA123 - Dubai to Salalah",
    fpl: "(FPL-OMA123-IS\n-B738/M-SDE2E3FGHIJ1J3J5M1RWY/LB1D1\n-OMDB1200\n-N0450F360 DCT RASKI UT169 GABKO DCT\n-OOSA0145 OOMS\n-PBN/A1B1C1D1L1 NAV/GBAS COM/TCAS DAT/SV SUR/260B DOF/260215 REG/A4OEE EET/OOMM0045 SEL/ABCD OPR/OMA PER/C ALTN/OOMS RMK/TCAS EQUIPPED)",
  },
  {
    name: "SalamAir 456 - Salalah to Muscat",
    fpl: "(FPL-OMS456-IS\n-A20N/M-SDE2E3FGHIJ1J3J5M1RWXY/LB1B2D1\n-OOSA0800\n-N0440F380 DCT RASKI UT169 GABKO DCT\n-OOMS0130\n-PBN/A1B2C2D2S1S2 NAV/SBAS COM/TCAS DAT/SV SUR/260B DOF/260215 REG/A4OSA EET/OOMM0030 OPR/OMS PER/C)",
  },
  {
    name: "Air Arabia 789 - Sharjah to Salalah",
    fpl: "(FPL-ABY789-IS\n-A320/M-SDE2E3FGHIJ1J3J5M1RWY/LB1D1\n-OMSJ1400\n-N0420F340 DCT\n-OOSA0200 OOMS\n-PBN/A1B2 NAV/SBAS COM/TCAS DOF/260215 REG/A6AEE EET/OOMM0100 OPR/ABY PER/C ALTN/OOMS)",
  },
]
