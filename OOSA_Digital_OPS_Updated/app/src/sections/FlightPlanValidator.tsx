import { useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Play,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ValidationResult {
  type: 'success' | 'warning' | 'error';
  field: string;
  message: string;
}

interface Field18Field {
  prefix: string;
  name: string;
  description: string;
  example: string;
}

const VALID_FIELD18_PREFIXES: Field18Field[] = [
  { prefix: 'STS/', name: 'Status', description: 'Special status (ATFMX, ALTRV, etc.)', example: 'STS/ATFMX' },
  { prefix: 'PBN/', name: 'PBN Capability', description: 'Performance Based Navigation', example: 'PBN/A1B2B3' },
  { prefix: 'NAV/', name: 'Navigation Equipment', description: 'Additional navigation equipment', example: 'NAV/GBAS SBAS' },
  { prefix: 'COM/', name: 'Communication', description: 'Communication equipment', example: 'COM/TCAS CPDLC' },
  { prefix: 'DAT/', name: 'Data Link', description: 'Data link capability', example: 'DAT/VPN SATCOM' },
  { prefix: 'SUR/', name: 'Surveillance', description: 'Surveillance equipment', example: 'SUR/260B 270B' },
  { prefix: 'DEP/', name: 'Departure', description: 'Departure aerodrome', example: 'DEP/OMDB' },
  { prefix: 'DEST/', name: 'Destination', description: 'Destination aerodrome', example: 'DEST/OOSA' },
  { prefix: 'DOF/', name: 'Date of Flight', description: 'YYMMDD format', example: 'DOF/240215' },
  { prefix: 'REG/', name: 'Registration', description: 'Aircraft registration', example: 'REG/A4OEE' },
  { prefix: 'EET/', name: 'Elapsed Time', description: 'Estimated elapsed time', example: 'EET/00:45' },
  { prefix: 'SEL/', name: 'SELCAL', description: 'SELCAL code', example: 'SEL/ABCD' },
  { prefix: 'TYP/', name: 'Type', description: 'Type of aircraft', example: 'TYP/B738' },
  { prefix: 'CODE/', name: 'SSR Code', description: 'SSR mode and code', example: 'CODE/738' },
  { prefix: 'DLE/', name: 'Delay', description: 'Delay en-route', example: 'DLE/0030' },
  { prefix: 'OPR/', name: 'Operator', description: 'Aircraft operator', example: 'OPR/OMAN AIR' },
  { prefix: 'ORGN/', name: 'Origin', description: 'Message origin', example: 'ORGN/OOMSZZZX' },
  { prefix: 'PER/', name: 'Performance', description: 'Performance category', example: 'PER/C' },
  { prefix: 'ALTN/', name: 'Alternate', description: 'Alternate aerodrome', example: 'ALTN/OOMS' },
  { prefix: 'RALT/', name: 'En-route Alternate', description: 'En-route alternate', example: 'RALT/OOMS' },
  { prefix: 'TALT/', name: 'Takeoff Alternate', description: 'Takeoff alternate', example: 'TALT/OOMA' },
  { prefix: 'RIF/', name: 'Revised Destination', description: 'Route to revised destination', example: 'RIF/OOSA' },
  { prefix: 'RVR/', name: 'RVR', description: 'Runway visual range', example: 'RVR/550' },
  { prefix: 'RMK/', name: 'Remarks', description: 'Free text remarks', example: 'RMK/TEST FLIGHT' }
];

const SAMPLE_FLIGHT_PLANS = [
  {
    name: 'OMA123 - OMDB to OOSA',
    fpl: '(FPL-OMA123-IS\n-B738/M-SDE2E3FGHIJ1J3J5M1RWY/LB1D1\n-OMDB1200\n-N0450F360 DCT\n-OOSA0100 OOMS\n-PBN/A1B1C1D1L1 NAV/GBAS COM/TCAS DAT/VPN SUR/260B\n-DEP/OMDB DEST/OOSA DOF/240215 REG/A4OEE EET/01:00 SEL/ABCD\n-OPR/OMAN AIR PER/C ALTN/OOMS RALT/OOMS TYP/B738 CODE/738)',
    field18: 'STS/ATFMX PBN/A1B1C1D1L1 NAV/GBAS COM/TCAS DAT/VPN SUR/260B DEP/OMDB DEST/OOSA DOF/240215 REG/A4OEE EET/01:00 SEL/ABCD OPR/OMAN AIR PER/C ALTN/OOMS RALT/OOMS TYP/B738 CODE/738'
  },
  {
    name: 'ABY456 - OOSA to MCT',
    fpl: '(FPL-ABY456-IS\n-A320/M-SDE2E3FGHIJ1J3J5M1RWY/LB1D1\n-OOSA1400\n-N0420F340 DCT\n-MCT0130\n-PBN/A1B2 NAV/SBAS COM/TCAS\n-DEP/OOSA DEST/OMSB DOF/240215 REG/A6AEE EET/01:30\n-OPR/AIR ARABIA PER/C ALTN/OMSJ)',
    field18: 'PBN/A1B2 NAV/SBAS COM/TCAS DEP/OOSA DEST/OMSB DOF/240215 REG/A6AEE EET/01:30 OPR/AIR ARABIA PER/C ALTN/OMSJ'
  }
];

export default function FlightPlanValidator() {
  const [field18, setField18] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [parsedFields, setParsedFields] = useState<Array<{ prefix: string; value: string }>>([]);

  const validateField18 = () => {
    setIsValidating(true);
    const newResults: ValidationResult[] = [];
    const newParsedFields: Array<{ prefix: string; value: string }> = [];

    // Split by spaces to get individual fields
    const fields = field18.trim().split(/\s+/);
    
    fields.forEach(field => {
      const slashIndex = field.indexOf('/');
      if (slashIndex === -1) {
        newResults.push({
          type: 'error',
          field: field,
          message: 'Missing separator "/"'
        });
        return;
      }

      const prefix = field.substring(0, slashIndex + 1);
      const value = field.substring(slashIndex + 1);

      const validField = VALID_FIELD18_PREFIXES.find(f => f.prefix === prefix);
      
      if (!validField) {
        newResults.push({
          type: 'warning',
          field: prefix,
          message: `Unknown prefix: ${prefix}`
        });
      } else {
        newResults.push({
          type: 'success',
          field: prefix,
          message: `${validField.name}: ${value}`
        });
        newParsedFields.push({ prefix: validField.name, value });
      }
    });

    // Check for common issues
    if (!field18.includes('DEP/')) {
      newResults.push({
        type: 'warning',
        field: 'DEP/',
        message: 'DEP/ field is recommended'
      });
    }
    if (!field18.includes('DEST/')) {
      newResults.push({
        type: 'warning',
        field: 'DEST/',
        message: 'DEST/ field is recommended'
      });
    }
    if (!field18.includes('DOF/')) {
      newResults.push({
        type: 'warning',
        field: 'DOF/',
        message: 'DOF/ (Date of Flight) is recommended'
      });
    }

    setResults(newResults);
    setParsedFields(newParsedFields);
    setIsValidating(false);
  };

  const loadSample = (sample: typeof SAMPLE_FLIGHT_PLANS[0]) => {
    setField18(sample.field18);
    setResults([]);
    setParsedFields([]);
  };

  const clearAll = () => {
    setField18('');
    setResults([]);
    setParsedFields([]);
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-[#10b981]" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />;
      case 'error': return <XCircle className="w-4 h-4 text-[#ef4444]" />;
      default: return null;
    }
  };

  const getStatusBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-[#10b981]/10 border-[#10b981]/30';
      case 'warning': return 'bg-[#f59e0b]/10 border-[#f59e0b]/30';
      case 'error': return 'bg-[#ef4444]/10 border-[#ef4444]/30';
      default: return 'bg-white/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#f59e0b]" />
          Flight Plan Validator
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Validate ICAO Field 18 format for GCC/Oman CAA compliance
        </p>
      </div>

      {/* Sample Flight Plans */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sample Flight Plans</h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_FLIGHT_PLANS.map((sample, idx) => (
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
            <span className="w-6 h-6 rounded bg-[#f59e0b]/20 text-[#f59e0b] flex items-center justify-center text-sm font-bold">18</span>
            Field 18 Input
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
              onClick={validateField18}
              disabled={!field18.trim() || isValidating}
              className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b] text-white rounded-lg hover:bg-[#e0900b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span className="text-sm">Validate</span>
            </button>
          </div>
        </div>

        <textarea
          value={field18}
          onChange={(e) => setField18(e.target.value)}
          placeholder="Enter Field 18 data (e.g., PBN/A1B2 NAV/GBAS COM/TCAS DEP/OMDB DEST/OOSA DOF/240215 REG/A4OEE...)"
          className="w-full h-32 bg-black/30 border border-white/20 rounded-lg p-4 text-white mono text-sm placeholder:text-white/30 focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] resize-none"
        />

        <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
          <Info className="w-4 h-4" />
          <span>Separate fields with spaces. Each field should be in PREFIX/VALUE format.</span>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#10b981]" />
            Validation Results
          </h3>

          <div className="space-y-2">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusBg(result.type)}`}
              >
                {getStatusIcon(result.type)}
                <div className="flex-1">
                  <span className="font-mono font-bold text-sm">{result.field}</span>
                  <span className="text-white/70 text-sm ml-2">{result.message}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 flex items-center gap-4 p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10b981]" />
              <span className="text-sm text-white">
                {results.filter(r => r.type === 'success').length} Valid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-sm text-white">
                {results.filter(r => r.type === 'warning').length} Warnings
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-[#ef4444]" />
              <span className="text-sm text-white">
                {results.filter(r => r.type === 'error').length} Errors
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Fields */}
      {parsedFields.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Parsed Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsedFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xs text-white/50 w-24">{field.prefix}</span>
                <span className="text-sm text-white mono">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Reference */}
      <div className="glass-card p-5">
        <button
          onClick={() => setShowReference(!showReference)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-[#0c9ce4]" />
            Field 18 Reference
          </h3>
          {showReference ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
        </button>

        {showReference && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {VALID_FIELD18_PREFIXES.map((field) => (
              <div key={field.prefix} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-[#0c9ce4]">{field.prefix}</span>
                  <span className="text-xs text-white/50">{field.name}</span>
                </div>
                <p className="text-xs text-white/40">{field.description}</p>
                <p className="text-xs text-[#10b981] mono mt-1">{field.example}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ICAO Format Guide */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-white mb-4">ICAO Flight Plan Format</h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-white/50 mb-1">Complete FPL Message Structure</p>
            <code className="text-[#0c9ce4] mono text-xs block whitespace-pre-wrap">
{`(FPL-CALLSIGN-FlightRulesType
-EquipmentAndCapabilities
-DepartureAerodromeTime
-CruisingSpeedLevelRoute
-DestinationAerodromeETEAlternate
-OtherInformation
-SupplementaryInformation)`}
            </code>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 7 - Callsign</p>
              <p className="text-white/50 text-xs">Aircraft identification (e.g., OMA123, ABD456)</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 8 - Flight Rules</p>
              <p className="text-white/50 text-xs">I (IFR), V (VFR), Y (IFR/VFR), Z (VFR/IFR)</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 10 - Equipment</p>
              <p className="text-white/50 text-xs">Navigation, communication, and surveillance equipment</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 13 - Departure</p>
              <p className="text-white/50 text-xs">Departure aerodrome and estimated off-block time</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 15 - Route</p>
              <p className="text-white/50 text-xs">Cruising speed, level, and route details</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-1">Field 16 - Destination</p>
              <p className="text-white/50 text-xs">Destination, total EET, and alternate aerodromes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-white/30">
        <p>FOR TRAINING AND VALIDATION PURPOSES ONLY</p>
        <p className="mt-1">Always verify flight plans with official Oman CAA systems before filing</p>
      </div>
    </div>
  );
}
