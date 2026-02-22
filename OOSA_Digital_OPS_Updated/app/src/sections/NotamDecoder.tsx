import { useState } from 'react';
import { 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  Info, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Clock
} from 'lucide-react';

interface DecodedNotam {
  id: string;
  series: string;
  number: string;
  year: string;
  type: string;
  location: string;
  validFrom: string;
  validTo: string;
  schedule: string;
  text: string;
  decodedText: string;
  category: string;
}

const NOTAM_ABBREVIATIONS: Record<string, string> = {
  // Locations
  'RWY': 'Runway',
  'TWY': 'Taxiway',
  'APRON': 'Apron',
  'AD': 'Aerodrome',
  'AERODROME': 'Aerodrome',
  'SFC': 'Surface',
  'GND': 'Ground',
  
  // Status
  'CLSD': 'Closed',
  'OPEN': 'Open',
  'AVBL': 'Available',
  'NOT AVBL': 'Not Available',
  'U/S': 'Unserviceable',
  
  // Work/Reasons
  'WIP': 'Work in Progress',
  'MAINT': 'Maintenance',
  'CONSTR': 'Construction',
  'REPAIR': 'Repair',
  'INSPECTION': 'Inspection',
  
  // Conditions
  'DUE': 'Due to',
  'CAUSED BY': 'Caused by',
  'AS A RESULT OF': 'As a result of',
  
  // Time
  'HR': 'Hours',
  'DAILY': 'Daily',
  'PERM': 'Permanent',
  'TEMPO': 'Temporary',
  
  // Lighting
  'LGT': 'Lighting',
  'LGTD': 'Lighted',
  'UNLGTD': 'Unlighted',
  
  // Navigation
  'NAV': 'Navigation',
  'ILS': 'ILS',
  'VOR': 'VOR',
  'NDB': 'NDB',
  'DME': 'DME',
  'GP': 'Glide Path',
  'LOC': 'Localizer',
  
  // Obstacles
  'OBST': 'Obstacle',
  'CRANE': 'Crane',
  'BLDG': 'Building',
  'ANT': 'Antenna',
  'TOWER': 'Tower',
  
  // Other
  'CTN': 'Caution',
  'ADZ': 'Advise',
  'REQ': 'Request',
  'AUTH': 'Authorized',
  'PROHIBITED': 'Prohibited',
  'RESTRICTED': 'Restricted',
  'DANGER': 'Danger Area',
  'PROH': 'Prohibited Area',
  'RSTR': 'Restricted Area',
  'CTA': 'Control Area',
  'TMA': 'Terminal Control Area',
  'CTR': 'Control Zone',
  'FIR': 'Flight Information Region',
  'UTA': 'Upper Control Area',
  'OCA': 'Oceanic Control Area',
  'ATS': 'Air Traffic Services',
  'ATC': 'Air Traffic Control',
  'TWR': 'Tower',
  'APP': 'Approach',
  'ACC': 'Area Control Centre',
  'FIS': 'Flight Information Service',
  'AFIS': 'Aerodrome Flight Information Service',
  'MET': 'Meteorological',
  'SIGMET': 'Significant Meteorological Information',
  'AIRMET': 'Airmen Meteorological Information',
  'NOTAM': 'Notice to Airmen',
  'ASHTAM': 'Ash Cloud Information',
  'SNOWTAM': 'Snow Information',
  'BIRDTAM': 'Bird Hazard Information',
  'Trigger NOTAM': 'Trigger Notice to Airmen',
};

const SAMPLE_NOTAMS = [
  {
    name: 'Runway Closure',
    notam: '(C1234/24 NOTAMN\nQ) OOMM/QWELW/IV/NBO/W/000/999/1703N05405E005\nA) OOSA\nB) 2402151200\nC) 2403151600\nD) 1200-1600\nE) RWY 07/25 CLSD DUE WIP)'
  },
  {
    name: 'ILS Unserviceable',
    notam: '(A0456/24 NOTAMN\nQ) OOMM/QILAS/I/NBO/A/000/999/1703N05405E005\nA) OOSA\nB) 2402010000\nC) 2402292359\nE) ILS RWY 07 U/S DUE MAINT)'
  },
  {
    name: 'Taxiway Restriction',
    notam: '(B0789/24 NOTAMN\nQ) OOMM/QMXAK/IV/NBO/A/000/999/1703N05405E005\nA) OOSA\nB) 2402100600\nC) 2402101800\nE) TWY A CLSD DUE CONSTR)'
  }
];

export default function NotamDecoder() {
  const [rawNotam, setRawNotam] = useState('');
  const [decodedNotam, setDecodedNotam] = useState<DecodedNotam | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [copied, setCopied] = useState(false);

  const decodeNotam = () => {
    setIsDecoding(true);
    
    // Parse NOTAM
    const lines = rawNotam.trim().split('\n');
    let parsed: Partial<DecodedNotam> = {};
    
    lines.forEach(line => {
      line = line.trim();
      
      // Identifier line
      if (line.startsWith('(') && line.includes('NOTAM')) {
        const match = line.match(/\(([A-Z])(\d+)\/(\d+)\s+(NOTAM\w+)\)/);
        if (match) {
          parsed.series = match[1];
          parsed.number = match[2];
          parsed.year = match[3];
          parsed.type = match[4];
          parsed.id = `${match[1]}${match[2]}/${match[3]}`;
        }
      }
      
      // Q) Line - Qualifier
      else if (line.startsWith('Q)')) {
        const qLine = line.substring(2).trim();
        const parts = qLine.split('/');
        if (parts.length >= 2) {
          parsed.category = parts[1];
        }
      }
      
      // A) Line - Location
      else if (line.startsWith('A)')) {
        parsed.location = line.substring(2).trim();
      }
      
      // B) Line - Valid From
      else if (line.startsWith('B)')) {
        const dateStr = line.substring(2).trim();
        parsed.validFrom = formatNotamDate(dateStr);
      }
      
      // C) Line - Valid To
      else if (line.startsWith('C)')) {
        const dateStr = line.substring(2).trim();
        parsed.validTo = formatNotamDate(dateStr);
      }
      
      // D) Line - Schedule
      else if (line.startsWith('D)')) {
        parsed.schedule = line.substring(2).trim();
      }
      
      // E) Line - Text
      else if (line.startsWith('E)')) {
        parsed.text = line.substring(2).trim();
        parsed.decodedText = decodeNotamText(parsed.text);
      }
    });
    
    setDecodedNotam(parsed as DecodedNotam);
    setIsDecoding(false);
  };

  const formatNotamDate = (dateStr: string): string => {
    if (dateStr === 'PERM') return 'Permanent';
    if (dateStr.length === 10) {
      const year = dateStr.substring(0, 2);
      const month = dateStr.substring(2, 4);
      const day = dateStr.substring(4, 6);
      const hour = dateStr.substring(6, 8);
      const min = dateStr.substring(8, 10);
      return `20${year}-${month}-${day} ${hour}:${min} UTC`;
    }
    return dateStr;
  };

  const decodeNotamText = (text: string): string => {
    let decoded = text;
    
    // Replace abbreviations
    Object.entries(NOTAM_ABBREVIATIONS).forEach(([abbr, full]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      decoded = decoded.replace(regex, full);
    });
    
    return decoded;
  };

  const loadSample = (sample: typeof SAMPLE_NOTAMS[0]) => {
    setRawNotam(sample.notam);
    setDecodedNotam(null);
  };

  const clearAll = () => {
    setRawNotam('');
    setDecodedNotam(null);
  };

  const copyDecoded = () => {
    if (decodedNotam?.decodedText) {
      navigator.clipboard.writeText(decodedNotam.decodedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return '#0c9ce4';
    if (category.includes('QW')) return '#ef4444'; // Warning
    if (category.includes('QI')) return '#f59e0b'; // Instrument
    if (category.includes('QM')) return '#8b5cf6'; // Movement
    if (category.includes('QA')) return '#10b981'; // Aerodrome
    return '#0c9ce4';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
          NOTAM Decoder
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Convert raw ICAO NOTAM text into structured, readable intelligence
        </p>
      </div>

      {/* Sample NOTAMs */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sample NOTAMs</h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_NOTAMS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => loadSample(sample)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors text-left"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#ef4444]/20 text-[#ef4444] flex items-center justify-center text-sm font-bold">E</span>
            Raw NOTAM
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
            <button
              onClick={decodeNotam}
              disabled={!rawNotam.trim() || isDecoding}
              className="flex items-center gap-2 px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span className="text-sm">Decode</span>
            </button>
          </div>
        </div>

        <textarea
          value={rawNotam}
          onChange={(e) => setRawNotam(e.target.value)}
          placeholder="Paste raw NOTAM text here...&#10;(C1234/24 NOTAMN&#10;Q) OOMM/QWELW/IV/NBO/W/000/999/...&#10;A) OOSA&#10;B) 2402151200&#10;C) 2403151600&#10;E) RWY 07/25 CLSD DUE WIP)"
          className="w-full h-48 bg-black/30 border border-white/20 rounded-lg p-4 text-white mono text-sm placeholder:text-white/30 focus:outline-none focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444] resize-none"
        />

        <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
          <Info className="w-4 h-4" />
          <span>NOTAM should include identifier (Q, A, B, C, D, E lines)</span>
        </div>
      </div>

      {/* Decoded Output */}
      {decodedNotam && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#10b981]" />
              Decoded NOTAM
            </h3>
            <button
              onClick={copyDecoded}
              className="flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* NOTAM Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">NOTAM ID</p>
              <p className="text-lg font-bold text-white mono">{decodedNotam.id}</p>
              <p className="text-xs text-white/40">{decodedNotam.type}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Location</p>
              <p className="text-lg font-bold text-white mono">{decodedNotam.location}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Valid From</p>
              <p className="text-sm font-bold text-white">{decodedNotam.validFrom}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Valid To</p>
              <p className="text-sm font-bold text-white">{decodedNotam.validTo}</p>
            </div>
          </div>

          {/* Schedule */}
          {decodedNotam.schedule && (
            <div className="mb-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm text-[#f59e0b]">Schedule: {decodedNotam.schedule}</span>
              </div>
            </div>
          )}

          {/* Raw Text */}
          <div className="mb-4">
            <p className="text-xs text-white/50 mb-2">Raw Text</p>
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-white/70 mono text-sm">{decodedNotam.text}</p>
            </div>
          </div>

          {/* Decoded Text */}
          <div>
            <p className="text-xs text-white/50 mb-2">Decoded Text</p>
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-4">
              <p className="text-white text-lg leading-relaxed">{decodedNotam.decodedText}</p>
            </div>
          </div>

          {/* Category Badge */}
          {decodedNotam.category && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-white/50">Category:</span>
              <span 
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ 
                  backgroundColor: `${getCategoryColor(decodedNotam.category)}20`,
                  color: getCategoryColor(decodedNotam.category)
                }}
              >
                {decodedNotam.category}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Abbreviations Reference */}
      <div className="glass-card p-5">
        <button
          onClick={() => setShowReference(!showReference)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-[#0c9ce4]" />
            NOTAM Abbreviations Reference
          </h3>
          {showReference ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
        </button>

        {showReference && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(NOTAM_ABBREVIATIONS).map(([abbr, full]) => (
              <div key={abbr} className="p-2 bg-white/5 rounded-lg">
                <span className="font-mono font-bold text-[#0c9ce4] text-sm">{abbr}</span>
                <span className="text-white/70 text-sm ml-2">{full}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOTAM Structure Guide */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-white mb-4">NOTAM Structure</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#ef4444]/20 text-[#ef4444] flex items-center justify-center text-sm font-bold shrink-0">ID</span>
            <div>
              <p className="text-white font-medium">(A1234/24 NOTAMN)</p>
              <p className="text-white/50 text-sm">Series, Number, Year, Type (N=New, R=Replace, C=Cancel)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#0c9ce4]/20 text-[#0c9ce4] flex items-center justify-center text-sm font-bold shrink-0">Q)</span>
            <div>
              <p className="text-white font-medium">Qualifier Line</p>
              <p className="text-white/50 text-sm">FIR, Subject, Condition, Traffic, Purpose, Scope, Coordinates, Radius</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#10b981]/20 text-[#10b981] flex items-center justify-center text-sm font-bold shrink-0">A)</span>
            <div>
              <p className="text-white font-medium">Affected Location</p>
              <p className="text-white/50 text-sm">ICAO location indicator (e.g., OOSA, OMDB)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#f59e0b]/20 text-[#f59e0b] flex items-center justify-center text-sm font-bold shrink-0">B)</span>
            <div>
              <p className="text-white font-medium">Validity Start</p>
              <p className="text-white/50 text-sm">Date-time group (YYMMDDHHMM)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center text-sm font-bold shrink-0">C)</span>
            <div>
              <p className="text-white font-medium">Validity End</p>
              <p className="text-white/50 text-sm">Date-time group or PERM for permanent</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#ec4899]/20 text-[#ec4899] flex items-center justify-center text-sm font-bold shrink-0">D)</span>
            <div>
              <p className="text-white font-medium">Schedule (Optional)</p>
              <p className="text-white/50 text-sm">Daily active hours (e.g., 1200-1600)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg">
            <span className="w-8 h-8 rounded bg-[#06b6d4]/20 text-[#06b6d4] flex items-center justify-center text-sm font-bold shrink-0">E)</span>
            <div>
              <p className="text-white font-medium">Plain Language Text</p>
              <p className="text-white/50 text-sm">Description of the condition using ICAO abbreviations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-white/30">
        <p>FOR TRAINING AND REFERENCE PURPOSES ONLY</p>
        <p className="mt-1">Always verify NOTAMs with official Oman CAA AIS systems</p>
      </div>
    </div>
  );
}
