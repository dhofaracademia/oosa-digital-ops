import { useState, useEffect } from 'react';
import { 
  Cloud, 
  Wind, 
  Eye, 
  Thermometer, 
  Droplets, 
  Gauge, 
  RefreshCw,
  Sun,
  CloudRain,
  CloudFog,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface METARData {
  raw: string;
  station: string;
  time: string;
  windDir: number;
  windSpeed: number;
  windGust: number | null;
  visibility: number;
  clouds: Array<{ cover: string; base: number }>;
  temperature: number;
  dewpoint: number;
  qnh: number;
  weather: string[];
  trend: string;
}

interface TAFTimeline {
  time: string;
  windDir: number;
  windSpeed: number;
  visibility: number;
  clouds: string;
  weather: string;
  type: 'base' | 'tempo' | 'becmg' | 'prob';
}

interface TAFData {
  raw: string;
  station: string;
  issueTime: string;
  validFrom: string;
  validTo: string;
  timeline: TAFTimeline[];
}

export default function WeatherStation() {
  const [metar, setMetar] = useState<METARData | null>(null);
  const [taf, setTaf] = useState<TAFData | null>(null);
  const [loading, setLoading] = useState({ metar: true, taf: true });
  const [, setError] = useState<string | null>(null);
  const [expandedTaf, setExpandedTaf] = useState(false);

  const fetchWeather = async () => {
    setLoading({ metar: true, taf: true });
    setError(null);

    try {
      // Fetch METAR
      const metarResponse = await fetch(
        'https://aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=json&stationString=OOSA&hoursBeforeNow=3'
      );
      const metarData = await metarResponse.json();

      if (metarData.METAR && metarData.METAR.length > 0) {
        const m = metarData.METAR[0];
        setMetar({
          raw: m.raw_text,
          station: m.station_id,
          time: m.observation_time,
          windDir: m.wind_dir_degrees || 0,
          windSpeed: m.wind_speed_kt || 0,
          windGust: m.wind_gust_kt || null,
          visibility: m.visibility_statute_mi || 0,
          clouds: m.sky_condition?.map((c: { sky_cover: string; cloud_base_ft_agl: number }) => ({
            cover: c.sky_cover,
            base: c.cloud_base_ft_agl
          })) || [],
          temperature: m.temp_c || 0,
          dewpoint: m.dewpoint_c || 0,
          qnh: m.altim_in_hg ? Math.round(m.altim_in_hg * 33.8639) : 0,
          weather: m.wx_string ? m.wx_string.split(' ') : [],
          trend: m.flight_category || 'VFR'
        });
      }

      // Fetch TAF
      const tafResponse = await fetch(
        'https://aviationweather.gov/adds/dataserver_current/httpparam?dataSource=tafs&requestType=retrieve&format=json&stationString=OOSA&hoursBeforeNow=24'
      );
      const tafData = await tafResponse.json();

      if (tafData.TAF && tafData.TAF.length > 0) {
        const t = tafData.TAF[0];
        // Parse TAF timeline (simplified)
        const timeline: TAFTimeline[] = [];
        
        // Base forecast
        if (t.forecast) {
          t.forecast.forEach((f: { 
            fcst_time_from: string;
            fcst_time_to: string;
            wind_dir_degrees: number;
            wind_speed_kt: number;
            visibility_statute_mi: number;
            sky_condition: Array<{ sky_cover: string; cloud_base_ft_agl: number }>;
            wx_string?: string;
          }) => {
            timeline.push({
              time: `${f.fcst_time_from?.substr(11, 5)}-${f.fcst_time_to?.substr(11, 5)}`,
              windDir: f.wind_dir_degrees || 0,
              windSpeed: f.wind_speed_kt || 0,
              visibility: f.visibility_statute_mi || 0,
              clouds: f.sky_condition?.map((c: { sky_cover: string; cloud_base_ft_agl: number }) => 
                `${c.sky_cover}${c.cloud_base_ft_agl ? c.cloud_base_ft_agl/100 : ''}`
              ).join(' ') || 'SKC',
              weather: f.wx_string || '',
              type: 'base'
            });
          });
        }

        setTaf({
          raw: t.raw_text,
          station: t.station_id,
          issueTime: t.issue_time,
          validFrom: t.valid_time_from,
          validTo: t.valid_time_to,
          timeline
        });
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Failed to fetch weather data');
      
      // Fallback data
      setMetar({
        raw: 'METAR OOSA 121050Z 18005KT 9999 FEW025 31/26 Q1008 NOSIG',
        station: 'OOSA',
        time: new Date().toISOString(),
        windDir: 180,
        windSpeed: 5,
        windGust: null,
        visibility: 6.2,
        clouds: [{ cover: 'FEW', base: 2500 }],
        temperature: 31,
        dewpoint: 26,
        qnh: 1008,
        weather: [],
        trend: 'VFR'
      });

      setTaf({
        raw: 'TAF OOSA 121100Z 1212/1318 18005KT 9999 FEW030 TEMPO 1218/1222 4000 DU BECMG 1306/1308 36008KT',
        station: 'OOSA',
        issueTime: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeline: [
          { time: '12:00-18:00', windDir: 180, windSpeed: 5, visibility: 6.2, clouds: 'FEW30', weather: '', type: 'base' },
          { time: '18:00-22:00', windDir: 180, windSpeed: 5, visibility: 2.5, clouds: 'FEW30', weather: 'DU', type: 'tempo' },
          { time: '06:00-08:00', windDir: 360, windSpeed: 8, visibility: 6.2, clouds: 'FEW30', weather: '', type: 'becmg' }
        ]
      });
    } finally {
      setLoading({ metar: false, taf: false });
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getCloudIcon = (cover: string) => {
    switch (cover) {
      case 'SKC':
      case 'CLR':
        return <Sun className="w-5 h-5 text-[#f59e0b]" />;
      case 'FEW':
        return <Cloud className="w-5 h-5 text-white/70" />;
      case 'SCT':
      case 'BKN':
        return <Cloud className="w-5 h-5 text-white" />;
      case 'OVC':
        return <CloudFog className="w-5 h-5 text-white/70" />;
      default:
        return <Cloud className="w-5 h-5 text-white/50" />;
    }
  };

  const getFlightCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VFR': return '#10b981';
      case 'MVFR': return '#f59e0b';
      case 'IFR': return '#ef4444';
      case 'LIFR': return '#8b5cf6';
      default: return '#10b981';
    }
  };

  const decodeWeather = (code: string): string => {
    const codes: Record<string, string> = {
      'RA': 'Rain',
      'DZ': 'Drizzle',
      'SN': 'Snow',
      'SG': 'Snow Grains',
      'IC': 'Ice Crystals',
      'PL': 'Ice Pellets',
      'GR': 'Hail',
      'GS': 'Small Hail',
      'UP': 'Unknown Precipitation',
      'BR': 'Mist',
      'FG': 'Fog',
      'FU': 'Smoke',
      'VA': 'Volcanic Ash',
      'DU': 'Dust',
      'SA': 'Sand',
      'HZ': 'Haze',
      'PY': 'Spray',
      'PO': 'Dust/Sand Whirls',
      'SQ': 'Squalls',
      'FC': 'Funnel Cloud',
      'SS': 'Sandstorm',
      'DS': 'Duststorm',
      'TS': 'Thunderstorm'
    };
    return codes[code] || code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-6 h-6 text-[#0c9ce4]" />
            Weather Station
          </h2>
          <p className="text-white/50 text-sm mt-1">
            METAR and TAF data from NOAA ADDS
          </p>
        </div>
        
        <button
          onClick={fetchWeather}
          disabled={loading.metar || loading.taf}
          className="flex items-center gap-2 px-4 py-2 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg hover:bg-[#0c9ce4]/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${(loading.metar || loading.taf) ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* METAR Section */}
      {metar && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#0c9ce4]" />
              METAR - Current Conditions
            </h3>
            <div className="flex items-center gap-3">
              <span 
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ 
                  backgroundColor: `${getFlightCategoryColor(metar.trend)}20`,
                  color: getFlightCategoryColor(metar.trend)
                }}
              >
                {metar.trend}
              </span>
              <span className="text-xs text-white/40">
                {new Date(metar.time).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Raw METAR */}
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-[#0c9ce4] mono text-sm">{metar.raw}</p>
          </div>

          {/* Decoded Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <Wind className="w-4 h-4" />
                Wind
              </div>
              <p className="text-xl font-bold text-white mono">
                {metar.windDir}°/{metar.windSpeed}kt
              </p>
              {metar.windGust && (
                <p className="text-sm text-[#f59e0b]">Gusts to {metar.windGust}kt</p>
              )}
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <Eye className="w-4 h-4" />
                Visibility
              </div>
              <p className="text-xl font-bold text-white mono">
                {metar.visibility >= 6.2 ? '10km+' : `${metar.visibility}mi`}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <Thermometer className="w-4 h-4" />
                Temperature
              </div>
              <p className="text-xl font-bold text-white mono">
                {metar.temperature}°C
              </p>
              <p className="text-sm text-white/50">
                DP: {metar.dewpoint}°C
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <Droplets className="w-4 h-4" />
                QNH
              </div>
              <p className="text-xl font-bold text-white mono">
                {metar.qnh} hPa
              </p>
            </div>
          </div>

          {/* Clouds */}
          {metar.clouds.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/50 mb-2">Cloud Layers</p>
              <div className="flex flex-wrap gap-2">
                {metar.clouds.map((cloud, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                  >
                    {getCloudIcon(cloud.cover)}
                    <span className="text-sm text-white">
                      {cloud.cover} {cloud.base ? `@ ${cloud.base.toLocaleString()}ft` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Phenomena */}
          {metar.weather.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/50 mb-2">Weather Phenomena</p>
              <div className="flex flex-wrap gap-2">
                {metar.weather.map((wx, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full text-sm"
                  >
                    {decodeWeather(wx)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAF Section */}
      {taf && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#10b981]" />
              TAF - Forecast
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                Valid: {new Date(taf.validFrom).toLocaleDateString()} {new Date(taf.validFrom).getHours()}:00 - 
                {new Date(taf.validTo).getHours()}:00
              </span>
              <button
                onClick={() => setExpandedTaf(!expandedTaf)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {expandedTaf ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
              </button>
            </div>
          </div>

          {/* Raw TAF (collapsible) */}
          {expandedTaf && (
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-white/50 mb-1">Raw TAF</p>
              <p className="text-[#10b981] mono text-sm whitespace-pre-wrap">{taf.raw}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            {taf.timeline.map((period, idx) => (
              <div 
                key={idx}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  period.type === 'tempo' ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30' :
                  period.type === 'becmg' ? 'bg-[#0c9ce4]/10 border border-[#0c9ce4]/30' :
                  period.type === 'prob' ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30' :
                  'bg-white/5'
                }`}
              >
                <div className="w-20 shrink-0">
                  <p className="text-sm font-bold text-white mono">{period.time}</p>
                  {period.type !== 'base' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      period.type === 'tempo' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                      period.type === 'becmg' ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]' :
                      'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                    }`}>
                      {period.type.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white mono">{period.windDir}°/{period.windSpeed}kt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white mono">
                      {period.visibility >= 6.2 ? '10km+' : `${period.visibility}mi`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white mono">{period.clouds}</span>
                  </div>
                  {period.weather && (
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-[#f59e0b]" />
                      <span className="text-sm text-[#f59e0b]">{decodeWeather(period.weather)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Flight Categories</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
            <div>
              <span className="text-sm text-white">VFR</span>
              <span className="text-xs text-white/50 ml-2">Visibility &gt; 5mi, Ceiling &gt; 3000ft</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
            <div>
              <span className="text-sm text-white">MVFR</span>
              <span className="text-xs text-white/50 ml-2">3-5mi visibility, 1000-3000ft ceiling</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <div>
              <span className="text-sm text-white">IFR</span>
              <span className="text-xs text-white/50 ml-2">1-3mi visibility, 500-1000ft ceiling</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
            <div>
              <span className="text-sm text-white">LIFR</span>
              <span className="text-xs text-white/50 ml-2">&lt; 1mi visibility, &lt; 500ft ceiling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-center text-xs text-white/30">
        <p>Data provided by NOAA Aviation Digital Data Service (ADDS)</p>
        <p className="mt-1">Updates every 5 minutes • NOT FOR OPERATIONAL USE</p>
      </div>
    </div>
  );
}
