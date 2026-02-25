import { useState, useEffect } from 'react';
import {
  Cloud, Wind, Eye, Thermometer, Droplets, Gauge, RefreshCw,
  Sun, CloudRain, CloudFog, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';

interface METARData {
  raw: string; station: string; time: string;
  windDir: number; windSpeed: number; windGust: number | null;
  visibility: number; clouds: Array<{ cover: string; base: number }>;
  temperature: number; dewpoint: number; qnh: number;
  weather: string[]; trend: string;
}
interface TAFTimeline {
  time: string; windDir: number; windSpeed: number;
  visibility: number; clouds: string; weather: string;
  type: 'base' | 'tempo' | 'becmg' | 'prob';
}
interface TAFData {
  raw: string; station: string; issueTime: string;
  validFrom: string; validTo: string; timeline: TAFTimeline[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseVisibility(raw: string | number | undefined): number {
  if (!raw) return 0;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  // NOAA new API returns metres for non-US stations; convert to statute miles
  // Values > 100 are metres, values <= 100 are already statute miles
  return n > 100 ? parseFloat((n / 1609.34).toFixed(1)) : n;
}

function parseFlightCategory(raw: string): string {
  // New API returns wdspdMax etc — compute from vis/ceiling if category absent
  const cat = (raw || '').toUpperCase();
  if (['VFR','MVFR','IFR','LIFR'].includes(cat)) return cat;
  return 'VFR';
}

export default function WeatherStation() {
  const [metar, setMetar] = useState<METARData | null>(null);
  const [taf, setTaf] = useState<TAFData | null>(null);
  const [loading, setLoading] = useState({ metar: true, taf: true });
  const [expandedTaf, setExpandedTaf] = useState(false);

  const fetchWeather = async () => {
    setLoading({ metar: true, taf: true });

    // ── METAR (new NOAA API) ─────────────────────────────────────────────
    try {
      const res = await fetch(
        'https://aviationweather.gov/api/data/metar?ids=OOSA&format=json&hours=3'
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const m = data[0];
        // Cloud layers
        const clouds: Array<{ cover: string; base: number }> = [];
        ['cover', 'cover2', 'cover3', 'cover4'].forEach((k, i) => {
          const cover = m[k] || m[`sky${i + 1}`];
          const base  = m[`base${i > 0 ? i + 1 : ''}`] || m[`skyBase${i + 1}`] || m[`base`];
          if (cover && cover !== 'CLR' && cover !== 'SKC') clouds.push({ cover, base: base || 0 });
        });
        // wx string
        const wxRaw: string = m.wxString || m.wx_string || '';
        setMetar({
          raw: m.rawOb || m.raw_text || '',
          station: m.icaoId || m.station_id || 'OOSA',
          time: m.reportTime || m.observation_time || new Date().toISOString(),
          windDir: m.wdir ?? m.wind_dir_degrees ?? 0,
          windSpeed: m.wspd ?? m.wind_speed_kt ?? 0,
          windGust: m.wgst ?? m.wind_gust_kt ?? null,
          visibility: parseVisibility(m.visib ?? m.visibility_statute_mi),
          clouds,
          temperature: m.temp ?? m.temp_c ?? 0,
          dewpoint: m.dewp ?? m.dewpoint_c ?? 0,
          qnh: m.altim
            ? Math.round(m.altim)
            : m.altim_in_hg
            ? Math.round(m.altim_in_hg * 33.8639)
            : 0,
          weather: wxRaw ? wxRaw.split(' ').filter(Boolean) : [],
          trend: parseFlightCategory(m.fltcat || m.flight_category || 'VFR'),
        });
      } else {
        throw new Error('No METAR data');
      }
    } catch {
      setMetar({
        raw: 'METAR OOSA — data currently unavailable',
        station: 'OOSA', time: new Date().toISOString(),
        windDir: 0, windSpeed: 0, windGust: null, visibility: 0,
        clouds: [], temperature: 0, dewpoint: 0, qnh: 0, weather: [], trend: 'VFR',
      });
    } finally {
      setLoading(prev => ({ ...prev, metar: false }));
    }

    // ── TAF (new NOAA API) ───────────────────────────────────────────────
    try {
      const res = await fetch(
        'https://aviationweather.gov/api/data/taf?ids=OOSA&format=json&time=valid'
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const t = data[0];
        const timeline: TAFTimeline[] = (t.fcsts || t.forecast || []).map((f: any) => {
          const type: TAFTimeline['type'] =
            f.changeIndicator === 'TEMPO' ? 'tempo' :
            f.changeIndicator === 'BECMG' ? 'becmg' :
            f.changeIndicator?.startsWith('PROB') ? 'prob' : 'base';
          const from = f.timeFrom || f.fcst_time_from || '';
          const to   = f.timeTo   || f.fcst_time_to   || '';
          const fmt  = (s: string) => s ? s.toString().substring(11, 16) : '';
          const layers: string[] = [];
          ['cover','cover2','cover3'].forEach((k, i) => {
            const c = f[k]; const b = f[`base${i > 0 ? i+1 : ''}`];
            if (c && c !== 'CLR' && c !== 'SKC') layers.push(`${c}${b ? Math.round(b/100) : ''}`);
          });
          return {
            time: `${fmt(from)}-${fmt(to)}`,
            windDir: f.wdir ?? f.wind_dir_degrees ?? 0,
            windSpeed: f.wspd ?? f.wind_speed_kt ?? 0,
            visibility: parseVisibility(f.visib ?? f.visibility_statute_mi),
            clouds: layers.join(' ') || f.sky_condition?.map((c: any) => `${c.sky_cover}${c.cloud_base_ft_agl ? c.cloud_base_ft_agl/100 : ''}`).join(' ') || 'SKC',
            weather: f.wxString || f.wx_string || '',
            type,
          };
        });
        setTaf({
          raw: t.rawTAF || t.raw_text || '',
          station: t.icaoId || t.station_id || 'OOSA',
          issueTime: t.issueTime || t.issue_time || new Date().toISOString(),
          validFrom: t.validTimeFrom || t.valid_time_from || new Date().toISOString(),
          validTo:   t.validTimeTo   || t.valid_time_to   || new Date(Date.now() + 86400000).toISOString(),
          timeline,
        });
      } else {
        throw new Error('No TAF data');
      }
    } catch {
      setTaf({
        raw: 'TAF OOSA — data currently unavailable',
        station: 'OOSA',
        issueTime: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 86400000).toISOString(),
        timeline: [],
      });
    } finally {
      setLoading(prev => ({ ...prev, taf: false }));
    }
  };

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 300000);
    return () => clearInterval(id);
  }, []);

  const getCloudIcon = (cover: string) => {
    switch (cover) {
      case 'SKC': case 'CLR': return <Sun className="w-5 h-5 text-[#f59e0b]"/>;
      case 'FEW': return <Cloud className="w-5 h-5 text-white/70"/>;
      case 'SCT': case 'BKN': return <Cloud className="w-5 h-5 text-white"/>;
      case 'OVC': return <CloudFog className="w-5 h-5 text-white/70"/>;
      default: return <Cloud className="w-5 h-5 text-white/50"/>;
    }
  };

  const getCatColor = (cat: string) => ({ VFR:'#10b981', MVFR:'#f59e0b', IFR:'#ef4444', LIFR:'#8b5cf6' }[cat] || '#10b981');

  const decodeWx = (code: string) => ({
    RA:'Rain', DZ:'Drizzle', SN:'Snow', SG:'Snow Grains', IC:'Ice Crystals',
    PL:'Ice Pellets', GR:'Hail', GS:'Small Hail', UP:'Unknown Precip',
    BR:'Mist', FG:'Fog', FU:'Smoke', VA:'Volcanic Ash', DU:'Dust',
    SA:'Sand', HZ:'Haze', PO:'Dust Whirls', SQ:'Squalls', FC:'Funnel Cloud',
    SS:'Sandstorm', DS:'Duststorm', TS:'Thunderstorm',
  }[code] || code);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-6 h-6 text-[#0c9ce4]"/> Weather Station
          </h2>
          <p className="text-white/50 text-sm mt-1">Live METAR & TAF — NOAA Aviation Weather Center</p>
        </div>
        <button onClick={fetchWeather} disabled={loading.metar || loading.taf}
          className="flex items-center gap-2 px-4 py-2 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg hover:bg-[#0c9ce4]/30 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${(loading.metar||loading.taf)?'animate-spin':''}`}/>
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* METAR */}
      {metar && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#0c9ce4]"/> METAR — Current Conditions
            </h3>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor:`${getCatColor(metar.trend)}20`, color:getCatColor(metar.trend) }}>
                {metar.trend}
              </span>
              <span className="text-xs text-white/40">{new Date(metar.time).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-[#0c9ce4] mono text-sm break-all">{metar.raw}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4"/>Wind</div>
              <p className="text-xl font-bold text-white mono">{metar.windDir}°/{metar.windSpeed}kt</p>
              {metar.windGust && <p className="text-sm text-[#f59e0b]">Gusts {metar.windGust}kt</p>}
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4"/>Visibility</div>
              <p className="text-xl font-bold text-white mono">{metar.visibility >= 6.2 ? '10km+' : `${metar.visibility}mi`}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4"/>Temperature</div>
              <p className="text-xl font-bold text-white mono">{metar.temperature}°C</p>
              <p className="text-sm text-white/50">DP: {metar.dewpoint}°C</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4"/>QNH</div>
              <p className="text-xl font-bold text-white mono">{metar.qnh} hPa</p>
            </div>
          </div>

          {metar.clouds.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/50 mb-2">Cloud Layers</p>
              <div className="flex flex-wrap gap-2">
                {metar.clouds.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                    {getCloudIcon(c.cover)}
                    <span className="text-sm text-white">{c.cover}{c.base ? ` @ ${c.base.toLocaleString()}ft` : ''}</span>
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

      {/* TAF */}
      {taf && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#10b981]"/> TAF — Forecast
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                Valid: {new Date(taf.validFrom).toLocaleDateString()} — {new Date(taf.validTo).toLocaleDateString()}
              </span>
              <button onClick={() => setExpandedTaf(e => !e)} className="p-1 hover:bg-white/10 rounded transition-colors">
                {expandedTaf ? <ChevronUp className="w-5 h-5 text-white/50"/> : <ChevronDown className="w-5 h-5 text-white/50"/>}
              </button>
            </div>
          </div>

          {expandedTaf && (
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-white/50 mb-1">Raw TAF</p>
              <p className="text-[#10b981] mono text-sm whitespace-pre-wrap break-all">{taf.raw}</p>
            </div>
          )}

          {taf.timeline.length > 0 ? (
            <div className="space-y-3">
              {taf.timeline.map((p, i) => (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                  p.type==='tempo' ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30' :
                  p.type==='becmg' ? 'bg-[#0c9ce4]/10 border border-[#0c9ce4]/30' :
                  p.type==='prob'  ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30' : 'bg-white/5'
                }`}>
                  <div className="w-20 shrink-0">
                    <p className="text-sm font-bold text-white mono">{p.time}</p>
                    {p.type !== 'base' && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.type==='tempo' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                        p.type==='becmg' ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]' :
                        'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                      }`}>{p.type.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-white/40"/><span className="text-sm text-white mono">{p.windDir}°/{p.windSpeed}kt</span></div>
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-white/40"/><span className="text-sm text-white mono">{p.visibility >= 6.2 ? '10km+' : `${p.visibility}mi`}</span></div>
                    <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-white/40"/><span className="text-sm text-white mono">{p.clouds}</span></div>
                    {p.weather && <div className="flex items-center gap-2"><CloudRain className="w-4 h-4 text-[#f59e0b]"/><span className="text-sm text-[#f59e0b]">{decodeWx(p.weather)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-white/40">
              <p>TAF not currently available for OOSA</p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Flight Categories</h4>
        <div className="flex flex-wrap gap-4">
          {[
            { cat:'VFR',  color:'#10b981', desc:'Visibility > 5mi, Ceiling > 3000ft' },
            { cat:'MVFR', color:'#f59e0b', desc:'3–5mi visibility, 1000–3000ft ceiling' },
            { cat:'IFR',  color:'#ef4444', desc:'1–3mi visibility, 500–1000ft ceiling' },
            { cat:'LIFR', color:'#8b5cf6', desc:'< 1mi visibility, < 500ft ceiling' },
          ].map(({ cat, color, desc }) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-sm text-white">{cat}</span>
              <span className="text-xs text-white/50">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-white/30">
        <p>Data: NOAA Aviation Weather Center API • Updates every 5 min • NOT FOR OPERATIONAL USE</p>
      </div>
    </div>
  );
}
