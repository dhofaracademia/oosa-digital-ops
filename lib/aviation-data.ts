// ──────────────────────────────────────────────────────────────────────────────
// OOSA Digital OPS — Aviation Reference Data
// ICAO Doc 4444, Annex 2, Annex 10, Annex 15 & Oman CAA CAR-172/CAR-175
// ──────────────────────────────────────────────────────────────────────────────

// ── Oman & GCC Airports ─────────────────────────────────────────────────────

export const OMAN_AIRPORTS: Record<string, { name: string; city: string }> = {
  OOSA: { name: "Salalah International Airport", city: "Salalah" },
  OOMS: { name: "Muscat International Airport", city: "Muscat" },
  OOFD: { name: "Fahud Airport", city: "Fahud" },
  OOKB: { name: "Khasab Airport", city: "Khasab" },
  OOBK: { name: "Sohar Airport", city: "Sohar" },
  OOMA: { name: "Musandam Airport", city: "Musandam" },
  OODQ: { name: "Duqm International Airport", city: "Duqm" },
  OORQ: { name: "Ras Al Hadd Airport", city: "Ras Al Hadd" },
}

export const GCC_AIRPORTS: Record<string, { name: string; city: string }> = {
  OMDB: { name: "Dubai International Airport", city: "Dubai" },
  OMDW: { name: "Al Maktoum International Airport", city: "Dubai" },
  OMAD: { name: "Abu Dhabi International Airport", city: "Abu Dhabi" },
  OMSJ: { name: "Sharjah International Airport", city: "Sharjah" },
  OMAA: { name: "Al Ain International Airport", city: "Al Ain" },
  OTHH: { name: "Hamad International Airport", city: "Doha" },
  OBBI: { name: "Bahrain International Airport", city: "Bahrain" },
  OEJN: { name: "King Abdulaziz Intl Airport", city: "Jeddah" },
  OERK: { name: "King Khalid International Airport", city: "Riyadh" },
  OEMA: { name: "Prince Mohammed Intl Airport", city: "Madinah" },
  OKBK: { name: "Kuwait International Airport", city: "Kuwait" },
}

export const COMMON_AIRPORTS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(OMAN_AIRPORTS).map(([k, v]) => [k, v.name])),
  ...Object.fromEntries(Object.entries(GCC_AIRPORTS).map(([k, v]) => [k, v.name])),
  EGLL: "London Heathrow",
  LFPG: "Paris CDG",
  EDDF: "Frankfurt",
  VABB: "Mumbai",
  VIDP: "Delhi",
  VECC: "Kolkata",
  OPKC: "Karachi",
  HECA: "Cairo",
  HSSS: "Khartoum",
  HAAB: "Addis Ababa",
  HTDA: "Dar es Salaam",
  FAOR: "Johannesburg",
}

// ── ICAO Equipment Codes (Field 10a — COM/NAV) ──────────────────────────────

export const EQUIPMENT_COM_NAV: Record<string, string> = {
  N: "No COM/NAV/approach equipment",
  S: "Standard (VHF RTF, VOR, ILS)",
  A: "GBAS landing system",
  B: "LPV (APV with SBAS)",
  C: "LORAN C",
  D: "DME",
  E1: "FMC WPR ACARS",
  E2: "D-FIS ACARS",
  E3: "PDC ACARS",
  F: "ADF",
  G: "GNSS",
  H: "HF RTF",
  I: "Inertial navigation",
  J1: "CPDLC ATN VDL Mode 2",
  J2: "CPDLC FANS 1/A HFDL",
  J3: "CPDLC FANS 1/A VDL Mode A",
  J4: "CPDLC FANS 1/A VDL Mode 2",
  J5: "CPDLC FANS 1/A SATCOM (INMARSAT)",
  J6: "CPDLC FANS 1/A SATCOM (MTSAT)",
  J7: "CPDLC FANS 1/A SATCOM (Iridium)",
  K: "MLS",
  L: "ILS",
  M1: "ATC RTF SATCOM (INMARSAT)",
  M2: "ATC RTF SATCOM (MTSAT)",
  M3: "ATC RTF SATCOM (Iridium)",
  O: "VOR",
  P1: "CPDLC RCP 400",
  P2: "CPDLC RCP 240",
  P3: "SATVOICE RCP 400",
  R: "PBN approved",
  T: "TACAN",
  U: "UHF RTF",
  V: "VHF RTF",
  W: "RVSM approved",
  X: "MNPS approved",
  Y: "VHF with 8.33 kHz spacing",
  Z: "Other equipment (specify in Field 18)",
}

// ── SSR Equipment Codes (Field 10b — Surveillance) ──────────────────────────

export const EQUIPMENT_SSR: Record<string, string> = {
  N: "Nil surveillance equipment",
  A: "Transponder Mode A (4 digits, no altitude)",
  C: "Transponder Mode A+C",
  E: "Transponder Mode S (aircraft ID + pressure altitude)",
  H: "Transponder Mode S (aircraft ID + pressure altitude + enhanced surveillance)",
  I: "Transponder Mode S (aircraft ID, no pressure altitude)",
  L: "Transponder Mode S (aircraft ID + pressure altitude + enhanced surveillance + ADS-B)",
  P: "Transponder Mode S (pressure altitude, no aircraft ID)",
  S: "Transponder Mode S (both aircraft ID + pressure altitude)",
  X: "Transponder Mode S (no aircraft ID, no pressure altitude)",
  B1: "ADS-B with dedicated 1090 MHz out",
  B2: "ADS-B with dedicated 1090 MHz in/out",
  U1: "ADS-B out (UAT)",
  U2: "ADS-B in/out (UAT)",
  V1: "ADS-B out (VDL Mode 4)",
  V2: "ADS-B in/out (VDL Mode 4)",
  D1: "ADS-C (FANS 1/A)",
}

// ── PBN Designators ─────────────────────────────────────────────────────────

export const PBN_CODES: Record<string, string> = {
  A1: "RNAV 10 (RNP 10)",
  B1: "RNAV 5 (all sensors)",
  B2: "RNAV 5 (GNSS)",
  B3: "RNAV 5 (DME/DME)",
  B4: "RNAV 5 (VOR/DME)",
  B5: "RNAV 5 (INS or IRS)",
  B6: "RNAV 5 (LORAN C)",
  C1: "RNAV 2 (all sensors)",
  C2: "RNAV 2 (GNSS)",
  C3: "RNAV 2 (DME/DME)",
  C4: "RNAV 2 (DME/DME/IRU)",
  D1: "RNAV 1 (all sensors)",
  D2: "RNAV 1 (GNSS)",
  D3: "RNAV 1 (DME/DME)",
  D4: "RNAV 1 (DME/DME/IRU)",
  L1: "RNP 4",
  O1: "Basic RNP 1 (all sensors)",
  O2: "Basic RNP 1 (GNSS)",
  O3: "Basic RNP 1 (DME/DME)",
  O4: "Basic RNP 1 (DME/DME/IRU)",
  S1: "RNP APCH",
  S2: "RNP APCH with BARO-VNAV",
  T1: "RNP AR APCH (RF required)",
  T2: "RNP AR APCH (RF not required)",
}

// ── Wake Turbulence Categories ──────────────────────────────────────────────

export const WAKE_CATEGORIES: Record<string, { label: string; mtow: string }> = {
  L: { label: "Light", mtow: "< 7,000 kg" },
  M: { label: "Medium", mtow: "7,000 - 136,000 kg" },
  H: { label: "Heavy", mtow: "> 136,000 kg" },
  J: { label: "Super", mtow: "A380 / AN-225" },
}

// ── Flight Rules ────────────────────────────────────────────────────────────

export const FLIGHT_RULES: Record<string, string> = {
  I: "IFR (Instrument Flight Rules)",
  V: "VFR (Visual Flight Rules)",
  Y: "IFR first, then VFR",
  Z: "VFR first, then IFR",
}

export const FLIGHT_TYPES: Record<string, string> = {
  S: "Scheduled air service",
  N: "Non-scheduled air service",
  G: "General aviation",
  M: "Military",
  X: "Other",
}

// ── Performance Categories ──────────────────────────────────────────────────

export const PERFORMANCE_CATEGORIES: Record<string, string> = {
  A: "< 91 kt approach speed",
  B: "91-120 kt approach speed",
  C: "121-140 kt approach speed",
  D: "141-165 kt approach speed",
  E: "> 166 kt approach speed",
}

// ── Field 18 Prefixes ───────────────────────────────────────────────────────

export const FIELD18_PREFIXES: Record<
  string,
  { name: string; description: string; example: string; mandatory?: boolean }
> = {
  "STS/": { name: "Status", description: "Special handling status", example: "STS/ATFMX" },
  "PBN/": { name: "PBN Capability", description: "Performance Based Navigation designators", example: "PBN/A1B2C1D1", mandatory: true },
  "NAV/": { name: "Navigation Equipment", description: "Supplementary navigation detail", example: "NAV/GBAS SBAS" },
  "COM/": { name: "Communication", description: "Additional COM equipment", example: "COM/TCAS CPDLC" },
  "DAT/": { name: "Data Link", description: "Data link capability", example: "DAT/SV" },
  "SUR/": { name: "Surveillance", description: "Surveillance equipment codes", example: "SUR/260B RSP180" },
  "DEP/": { name: "Departure", description: "Departure aerodrome if ZZZZ in Field 13", example: "DEP/OMDB" },
  "DEST/": { name: "Destination", description: "Destination aerodrome if ZZZZ in Field 16", example: "DEST/OOSA" },
  "DOF/": { name: "Date of Flight", description: "YYMMDD format (mandatory)", example: "DOF/260215", mandatory: true },
  "REG/": { name: "Registration", description: "Aircraft registration mark (mandatory)", example: "REG/A4OEE", mandatory: true },
  "EET/": { name: "Elapsed Time", description: "FIR boundary crossing estimates", example: "EET/OOMM0045 OMAE0120" },
  "SEL/": { name: "SELCAL", description: "SELCAL code", example: "SEL/ABCD" },
  "TYP/": { name: "Type", description: "Aircraft type if ZZZZ in Field 9", example: "TYP/B738" },
  "CODE/": { name: "Aircraft Address", description: "24-bit ICAO aircraft address (hex)", example: "CODE/A1B2C3" },
  "DLE/": { name: "Delay", description: "Delay en-route point and duration", example: "DLE/INS0030" },
  "OPR/": { name: "Operator", description: "Aircraft operator ICAO designator or name", example: "OPR/OMA" },
  "ORGN/": { name: "Originator", description: "Message originator 8-char AFTN address", example: "ORGN/OOMSZPZX" },
  "PER/": { name: "Performance", description: "Aircraft performance category A-E", example: "PER/C" },
  "ALTN/": { name: "Alternate", description: "Alternate aerodrome name if ZZZZ", example: "ALTN/OOMS" },
  "RALT/": { name: "En-route Alternate", description: "En-route alternate aerodromes", example: "RALT/OOMS" },
  "TALT/": { name: "Takeoff Alternate", description: "Takeoff alternate aerodrome", example: "TALT/OOBK" },
  "RIF/": { name: "Revised Route", description: "Route to revised destination", example: "RIF/DT OOMS" },
  "RVR/": { name: "RVR", description: "RVR requirement in metres", example: "RVR/200" },
  "RMK/": { name: "Remarks", description: "Free text remarks", example: "RMK/CHARTER FLIGHT" },
}

// ── Common ICAO Aircraft Type Designators ───────────────────────────────────

export const AIRCRAFT_TYPES: Record<string, { name: string; wake: string }> = {
  A20N: { name: "Airbus A320neo", wake: "M" },
  A21N: { name: "Airbus A321neo", wake: "M" },
  A318: { name: "Airbus A318", wake: "M" },
  A319: { name: "Airbus A319", wake: "M" },
  A320: { name: "Airbus A320", wake: "M" },
  A321: { name: "Airbus A321", wake: "M" },
  A332: { name: "Airbus A330-200", wake: "H" },
  A333: { name: "Airbus A330-300", wake: "H" },
  A339: { name: "Airbus A330-900neo", wake: "H" },
  A340: { name: "Airbus A340", wake: "H" },
  A359: { name: "Airbus A350-900", wake: "H" },
  A35K: { name: "Airbus A350-1000", wake: "H" },
  A380: { name: "Airbus A380", wake: "J" },
  A388: { name: "Airbus A380-800", wake: "J" },
  B733: { name: "Boeing 737-300", wake: "M" },
  B734: { name: "Boeing 737-400", wake: "M" },
  B735: { name: "Boeing 737-500", wake: "M" },
  B738: { name: "Boeing 737-800", wake: "M" },
  B739: { name: "Boeing 737-900", wake: "M" },
  B37M: { name: "Boeing 737 MAX 8", wake: "M" },
  B38M: { name: "Boeing 737 MAX 8-200", wake: "M" },
  B39M: { name: "Boeing 737 MAX 9", wake: "M" },
  B744: { name: "Boeing 747-400", wake: "H" },
  B748: { name: "Boeing 747-8", wake: "H" },
  B763: { name: "Boeing 767-300", wake: "H" },
  B772: { name: "Boeing 777-200", wake: "H" },
  B773: { name: "Boeing 777-300", wake: "H" },
  B77L: { name: "Boeing 777-200LR", wake: "H" },
  B77W: { name: "Boeing 777-300ER", wake: "H" },
  B788: { name: "Boeing 787-8", wake: "H" },
  B789: { name: "Boeing 787-9", wake: "H" },
  B78X: { name: "Boeing 787-10", wake: "H" },
  E170: { name: "Embraer 170", wake: "M" },
  E190: { name: "Embraer 190", wake: "M" },
  E195: { name: "Embraer 195", wake: "M" },
  AT72: { name: "ATR 72", wake: "M" },
  AT75: { name: "ATR 72-500", wake: "M" },
  AT76: { name: "ATR 72-600", wake: "M" },
  DH8D: { name: "Dash 8 Q400", wake: "M" },
  CRJ7: { name: "CRJ-700", wake: "M" },
  CRJ9: { name: "CRJ-900", wake: "M" },
  C172: { name: "Cessna 172", wake: "L" },
  C208: { name: "Cessna 208 Caravan", wake: "L" },
  AN25: { name: "Antonov An-225 Mriya", wake: "J" },
}

// ── STS (Special Status) Values ─────────────────────────────────────────────

export const STS_VALUES: Record<string, string> = {
  ALTRV: "Altitude reservation",
  ATFMX: "ATFM exempted",
  FFR: "Fire fighting",
  FLTCK: "Flight check",
  HAZMAT: "Hazardous material",
  HEAD: "Head of State",
  HOSP: "Medical flight",
  HUM: "Humanitarian",
  MARSA: "Military assumes responsibility for separation",
  MEDEVAC: "Medical evacuation",
  NONRVSM: "Non-RVSM",
  SAR: "Search and rescue",
  STATE: "State aircraft",
}

// ── NOTAM Q-Code Subject ────────────────────────────────────────────────────

export const QCODE_SUBJECT: Record<string, string> = {
  A: "Aerodrome",
  C: "En-route ATS communication facility or service",
  F: "En-route navigation facility or service",
  I: "Instrument approach procedure",
  L: "Lighting facility",
  M: "Movement and landing area",
  N: "Other area navigation information",
  O: "Obstacle (other than navigation warning)",
  P: "Air traffic procedures",
  R: "Airspace restriction",
  S: "ATS route",
  W: "Navigation warning",
  X: "Other",
}

export const QCODE_CONDITION: Record<string, string> = {
  A: "Available/Operational/Activated/Open",
  C: "Closed/Withdrawn",
  H: "Temporarily restricted/Hazard exists",
  K: "Returned to service",
  L: "Limitation",
  O: "Operational",
  P: "Partially available",
  R: "Replacement available",
  S: "Suppressed",
  U: "Unserviceable",
  W: "Wholly unavailable",
}
