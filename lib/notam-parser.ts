// ──────────────────────────────────────────────────────────────────────────────
// OOSA Digital OPS — NOTAM Parser & Decoder Engine
// Per ICAO Annex 15 and Doc 8126
// ──────────────────────────────────────────────────────────────────────────────

import { QCODE_SUBJECT, QCODE_CONDITION } from "./aviation-data"

// ── Types ───────────────────────────────────────────────────────────────────

export interface DecodedNotam {
  id: string
  series: string
  number: string
  year: string
  type: string // NOTAMN, NOTAMR, NOTAMC
  typeLabel: string
  qLine: {
    fir: string
    qCode: string
    traffic: string
    purpose: string
    scope: string
    lowerAlt: string
    upperAlt: string
    coordinates: string
  } | null
  location: string
  validFrom: string
  validFromFormatted: string
  validTo: string
  validToFormatted: string
  schedule: string
  rawText: string
  decodedText: string
  lowerAlt: string
  upperAlt: string
  category: string
  categoryLabel: string
  conditionLabel: string
}

// ── Abbreviation Dictionary (200+ entries) ──────────────────────────────────

const ABBREVIATIONS: Record<string, string> = {
  // Facilities & Locations
  AD: "Aerodrome", AERODROME: "Aerodrome", RWY: "Runway", TWY: "Taxiway",
  APRON: "Apron", APN: "Apron", THR: "Threshold", TDZ: "Touchdown Zone",
  DTHR: "Displaced Threshold", SFC: "Surface", GND: "Ground",
  ACFT: "Aircraft", AP: "Airport", HP: "Heliport",

  // Status / Conditions
  CLSD: "Closed", OPN: "Open", OPEN: "Open", AVBL: "Available",
  "NOT AVBL": "Not Available", "U/S": "Unserviceable", UNSERVICEABLE: "Unserviceable",
  SKED: "Scheduled", UNSKED: "Unscheduled",

  // Work / Actions
  WIP: "Work in Progress", MAINT: "Maintenance", CONSTR: "Construction",
  REPAIR: "Repair", INSP: "Inspection", INSPECTION: "Inspection",
  OPER: "Operational", OPS: "Operations", PROC: "Procedure",

  // Reasons
  DUE: "Due to", "DUE TO": "Due to",

  // Time
  HR: "Hours", HRS: "Hours", H24: "24 Hours / Continuous",
  DAILY: "Daily", PERM: "Permanent", TEMPO: "Temporary",
  TIL: "Until", UFN: "Until Further Notice", WEF: "With Effect From",
  BTN: "Between", FM: "From", EST: "Estimated",
  SR: "Sunrise", SS: "Sunset",

  // Lighting
  LGT: "Lighting", LGTD: "Lighted", UNLGTD: "Unlighted",
  ALS: "Approach Lighting System", PAPI: "PAPI", VASI: "VASI",
  ABN: "Aerodrome Beacon", REIL: "Runway End Identifier Lights",
  TDZ: "Touchdown Zone", CL: "Centreline",

  // Navigation Aids
  NAV: "Navigation", NAVAID: "Navigation Aid",
  ILS: "ILS (Instrument Landing System)", "ILS/DME": "ILS with DME",
  VOR: "VOR", "VOR/DME": "VOR with DME", NDB: "NDB",
  DME: "DME (Distance Measuring Equipment)", GP: "Glide Path",
  LOC: "Localizer", TACAN: "TACAN", GNSS: "GNSS",
  RNAV: "Area Navigation", RNP: "Required Navigation Performance",
  PBN: "Performance Based Navigation",

  // Communication
  COM: "Communication", FREQ: "Frequency", RTF: "Radiotelephony",
  VHF: "VHF", UHF: "UHF", HF: "HF",
  ATIS: "ATIS", VOLMET: "VOLMET", ACARS: "ACARS",
  CPDLC: "CPDLC", SELCAL: "SELCAL", SATCOM: "Satellite Communication",
  CTAF: "Common Traffic Advisory Frequency",

  // Obstacles
  OBST: "Obstacle", CRANE: "Crane", BLDG: "Building",
  ANT: "Antenna", TOWER: "Tower", POLE: "Pole",
  STACK: "Chimney/Stack", MAST: "Mast", ELEV: "Elevation",
  HGT: "Height", AGL: "Above Ground Level", AMSL: "Above Mean Sea Level",

  // Cautions / Warnings
  CTN: "Caution", ADZ: "Advise", REQ: "Required",
  AUTH: "Authorized", PROHIBITED: "Prohibited", PROH: "Prohibited",
  RESTRICTED: "Restricted", RSTR: "Restricted",
  DANGER: "Danger", HAZ: "Hazard", BIRD: "Bird",
  WILDLIFE: "Wildlife", FOD: "Foreign Object Debris",

  // Airspace
  CTA: "Control Area", TMA: "Terminal Control Area",
  CTR: "Control Zone", FIR: "Flight Information Region",
  UIR: "Upper Information Region", UTA: "Upper Control Area",
  OCA: "Oceanic Control Area", ATZ: "Aerodrome Traffic Zone",
  ADIZ: "Air Defense Identification Zone",
  P: "Prohibited Area", R: "Restricted Area", D: "Danger Area",
  TRA: "Temporary Reserved Area", TSA: "Temporary Segregated Area",

  // ATS
  ATS: "Air Traffic Services", ATC: "Air Traffic Control",
  TWR: "Tower", APP: "Approach", ACC: "Area Control Centre",
  FIS: "Flight Information Service", AFIS: "Aerodrome Flight Information Service",
  ARR: "Arrival", DEP: "Departure", APCH: "Approach",
  SID: "Standard Instrument Departure", STAR: "Standard Arrival Route",
  IAP: "Instrument Approach Procedure", MAP: "Missed Approach Procedure",
  HOLD: "Holding", RVSM: "RVSM",

  // Meteorological
  MET: "Meteorological", METAR: "METAR", TAF: "TAF",
  SIGMET: "Significant Meteorological Information",
  AIRMET: "Airmen Meteorological Information",
  CB: "Cumulonimbus", TS: "Thunderstorm", FG: "Fog",
  ICE: "Ice/Icing", TURB: "Turbulence", WIND: "Wind",
  VIS: "Visibility", RVR: "Runway Visual Range",

  // NOTAM Types
  NOTAM: "Notice to Air Missions", NOTAMN: "New NOTAM",
  NOTAMR: "Replacement NOTAM", NOTAMC: "Cancellation NOTAM",
  ASHTAM: "Volcanic Ash NOTAM", SNOWTAM: "Snow Condition NOTAM",
  BIRDTAM: "Bird Activity NOTAM",

  // Runway surface
  ASPH: "Asphalt", CONC: "Concrete", GRS: "Grass",
  WET: "Wet", DRY: "Dry", SNOW: "Snow covered",
  ICY: "Icy", GRVL: "Gravel", BRKG: "Braking",

  // Direction
  N: "North", S: "South", E: "East", W: "West",
  NE: "Northeast", NW: "Northwest", SE: "Southeast", SW: "Southwest",

  // Units
  FT: "Feet", M: "Metres", KT: "Knots", KM: "Kilometres",
  NM: "Nautical Miles", FL: "Flight Level",
  QNH: "QNH (Altimeter Setting)",

  // Miscellaneous
  TFC: "Traffic", PAX: "Passengers", CRW: "Crew",
  EMERG: "Emergency", SAR: "Search and Rescue",
  MIL: "Military", CIV: "Civil",
  PPR: "Prior Permission Required", PN: "Prior Notice",
  ABV: "Above", BLW: "Below", BTN: "Between",
  VIC: "Vicinity", BCST: "Broadcast", MON: "Monitor",
  OAT: "Outside Air Temperature",
  MAX: "Maximum", MIN: "Minimum",
  PSN: "Position", COORD: "Coordinates",
  ACAS: "Airborne Collision Avoidance System",
  TCAS: "Traffic Collision Avoidance System",
  EFF: "Effective", POSS: "Possible", EXPT: "Expect",
}

// ── Parser ──────────────────────────────────────────────────────────────────

export function decodeNotam(raw: string): DecodedNotam {
  const lines = raw.trim().split("\n").map((l) => l.trim())
  const result: Partial<DecodedNotam> = {
    id: "",
    series: "",
    number: "",
    year: "",
    type: "",
    typeLabel: "",
    qLine: null,
    location: "",
    validFrom: "",
    validFromFormatted: "",
    validTo: "",
    validToFormatted: "",
    schedule: "",
    rawText: "",
    decodedText: "",
    lowerAlt: "",
    upperAlt: "",
    category: "",
    categoryLabel: "",
    conditionLabel: "",
  }

  let currentSection = ""
  let eText = ""

  for (const line of lines) {
    // ID line: (A1234/24 NOTAMN)
    const idMatch = line.match(
      /\(?([A-Z])(\d{4})\/(\d{2})\s+(NOTAM[NRC])/
    )
    if (idMatch) {
      result.series = idMatch[1]
      result.number = idMatch[2]
      result.year = idMatch[3]
      result.type = idMatch[4]
      result.id = `${idMatch[1]}${idMatch[2]}/${idMatch[3]}`
      result.typeLabel =
        idMatch[4] === "NOTAMN"
          ? "New NOTAM"
          : idMatch[4] === "NOTAMR"
          ? "Replacement NOTAM"
          : "Cancellation NOTAM"
      continue
    }

    // Q) line
    if (line.startsWith("Q)")) {
      const qRaw = line.substring(2).trim()
      const parts = qRaw.split("/")
      if (parts.length >= 8) {
        const qCode = parts[1] || ""
        const subjectCode = qCode.length >= 4 ? qCode[2] : ""
        const conditionCode = qCode.length >= 5 ? qCode[4] : ""

        result.qLine = {
          fir: parts[0].trim(),
          qCode,
          traffic: parts[2] || "",
          purpose: parts[3] || "",
          scope: parts[4] || "",
          lowerAlt: parts[5] || "000",
          upperAlt: parts[6] || "999",
          coordinates: parts[7] || "",
        }
        result.category = qCode
        result.categoryLabel = QCODE_SUBJECT[subjectCode] || qCode
        result.conditionLabel = QCODE_CONDITION[conditionCode] || ""
        result.lowerAlt = parts[5] || "000"
        result.upperAlt = parts[6] || "999"
      }
      continue
    }

    // A) line
    if (line.startsWith("A)")) {
      result.location = line.substring(2).trim()
      currentSection = "A"
      continue
    }

    // B) line
    if (line.startsWith("B)")) {
      result.validFrom = line.substring(2).trim()
      result.validFromFormatted = formatNotamDate(result.validFrom)
      currentSection = "B"
      continue
    }

    // C) line
    if (line.startsWith("C)")) {
      result.validTo = line.substring(2).trim()
      result.validToFormatted = formatNotamDate(result.validTo)
      currentSection = "C"
      continue
    }

    // D) line
    if (line.startsWith("D)")) {
      result.schedule = line.substring(2).trim()
      currentSection = "D"
      continue
    }

    // E) line
    if (line.startsWith("E)")) {
      eText = line.substring(2).trim()
      currentSection = "E"
      continue
    }

    // F) line
    if (line.startsWith("F)")) {
      result.lowerAlt = line.substring(2).trim()
      currentSection = "F"
      continue
    }

    // G) line
    if (line.startsWith("G)")) {
      result.upperAlt = line.substring(2).trim()
      currentSection = "G"
      continue
    }

    // Continuation of current section
    if (currentSection === "E" && !line.match(/^[A-G]\)/) && !line.endsWith(")")) {
      eText += " " + line
    }
  }

  // Clean up E text (remove trailing parenthesis)
  eText = eText.replace(/\)\s*$/, "").trim()
  result.rawText = eText
  result.decodedText = decodeNotamText(eText)

  return result as DecodedNotam
}

function formatNotamDate(dateStr: string): string {
  if (!dateStr) return ""
  if (dateStr.toUpperCase() === "PERM") return "Permanent"
  if (dateStr.toUpperCase() === "UFN") return "Until Further Notice"
  if (dateStr.toUpperCase() === "EST") return "Estimated"

  // Format: YYMMDDHHMM
  if (dateStr.length >= 10) {
    const year = dateStr.substring(0, 2)
    const month = dateStr.substring(2, 4)
    const day = dateStr.substring(4, 6)
    const hour = dateStr.substring(6, 8)
    const min = dateStr.substring(8, 10)

    const monthNames = [
      "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    const m = parseInt(month)
    return `${day} ${monthNames[m] || month} 20${year} ${hour}:${min} UTC`
  }

  return dateStr
}

function decodeNotamText(text: string): string {
  let decoded = text

  // Replace abbreviations (longer ones first to avoid partial matches)
  const sorted = Object.entries(ABBREVIATIONS).sort(
    (a, b) => b[0].length - a[0].length
  )

  for (const [abbr, full] of sorted) {
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, "g")
    decoded = decoded.replace(regex, full)
  }

  // Decode runway numbers
  decoded = decoded.replace(
    /\bRWY\s+(\d{2}[LRC]?)\s*\/\s*(\d{2}[LRC]?)\b/gi,
    "Runway $1/$2"
  )
  decoded = decoded.replace(/\bRWY\s+(\d{2}[LRC]?)\b/gi, "Runway $1")

  // Clean up double spaces
  decoded = decoded.replace(/\s+/g, " ").trim()

  return decoded
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ── Category Color Helper ───────────────────────────────────────────────────

export function getNotamCategoryColor(qCode: string): string {
  if (!qCode) return "#0c9ce4"
  // Second letter group indicates subject
  if (qCode.includes("QW") || qCode.includes("QR")) return "#ef4444" // Warning/Restriction
  if (qCode.includes("QI") || qCode.includes("QF")) return "#f59e0b" // Instrument/Facility
  if (qCode.includes("QM") || qCode.includes("QL")) return "#8b5cf6" // Movement/Lighting
  if (qCode.includes("QA") || qCode.includes("QO")) return "#10b981" // Aerodrome/Obstacle
  if (qCode.includes("QP") || qCode.includes("QS")) return "#06b6d4" // Procedures/Routes
  return "#0c9ce4"
}

// ── Sample NOTAMs ───────────────────────────────────────────────────────────

export const SAMPLE_NOTAMS = [
  {
    name: "Runway Closure - OOSA",
    notam:
      "(C1234/26 NOTAMN\nQ) OOMM/QMRLC/IV/NBO/A/000/999/1703N05405E005\nA) OOSA\nB) 2602151200\nC) 2603151600\nD) DAILY 1200-1600\nE) RWY 07/25 CLSD DUE WIP RESURFACING)",
  },
  {
    name: "ILS Unserviceable - OOSA",
    notam:
      "(A0456/26 NOTAMN\nQ) OOMM/QILAS/I/NBO/A/000/999/1703N05405E005\nA) OOSA\nB) 2602010000\nC) 2602282359\nE) ILS RWY 07 U/S DUE MAINT)",
  },
  {
    name: "Taxiway Restriction - OOSA",
    notam:
      "(B0789/26 NOTAMN\nQ) OOMM/QMXLC/IV/NBO/A/000/999/1703N05405E005\nA) OOSA\nB) 2602100600\nC) 2602101800\nE) TWY A CLSD BTN TWY B AND APRON 1 DUE CONSTR)",
  },
  {
    name: "Airspace Restriction",
    notam:
      "(D0321/26 NOTAMN\nQ) OOMM/QRRCA/IV/BO/W/000/150/1703N05405E020\nA) OOMM\nB) 2602200600\nC) 2602201800\nE) TEMPO RESTRICTED AREA ESTABLISHED WI 20NM RADIUS OF OOSA AD SFC TO FL150 DUE MIL EXERCISE\nF) SFC\nG) FL150)",
  },
]
