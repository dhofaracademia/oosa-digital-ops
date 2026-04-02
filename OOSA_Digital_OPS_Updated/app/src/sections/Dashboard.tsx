import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plane, Cloud, Radar, FileText, AlertTriangle,
  Wind, Eye, Thermometer, Droplets, ArrowRight, Activity,
} from 'lucide-react';
import type { ModuleType } from '../App';

interface DashboardProps { onNavigate: (module: ModuleType) => void; }
interface WeatherData { metar:string; windDir:number; windSpeed:number; visibility:number; temperature:number; dewpoint:number; qnh:number; clouds:string; }
interface FlightStats { active:number; arriving:number; departing:number; source:string; status:'live'|'loading'|'unavailable' }

const OOSA = { lat: 17.0389, lon: 54.0914 };
const NOAA_BASE = "https://aviationweather.gov/api/data";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

function airportIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;background:#0c9ce4;border:2px solid white;border-radius:50%;box-shadow:0 0 6px #0c9ce4"></div>`,
    iconSize:[10,10], iconAnchor:[5,5],
  });
}
function planeIcon(heading: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${heading}deg);color:${color};font-size:14px;line-height:1;filter:drop-shadow(0 0 2px ${color}80)">\u2708</div>`,
    iconSize:[16,16], iconAnchor:[8,8],
  });
}

function DisableInteraction() {
  const map = useMap();
  useEffect(() => {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.zoomControl?.remove();
  }, [map]);
  return null;
}

function getColor(alt: number) {
  if (alt > 25000) return '#0c9ce4';
  if (alt > 10000) return '#10b981';
  return '#f59e0b';
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flights, setFlights] = useState<FlightStats>({ active:0, arriving:0, departing:0, source:'', status:'loading' });
  const [miniAircraft, setMiniAircraft] = useState<{lat:number;lon:number;heading:number;alt:number;callsign:string}[]>([]);

  useEffect(() => {
    const fetchWeather = async () => {
      const metarUrl = `${NOAA_BASE}/metar?ids=OOSA&format=json&hours=3`;
      try {
        let data: Record<string, unknown>[] = [];
        try {
          const res = await fetch(metarUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
          data = await res.json();
        } catch {
          const res = await fetch(`${CORS_PROXY}${encodeURIComponent(metarUrl)}`, { signal: AbortSignal.timeout(10000) });
          data = await res.json();
        }
        const arr = Array.isArray(data) ? data : [];
        if (arr.length > 0) {
          const m = arr[0];
          const visRaw = (m.visib ?? m.visibility_statute_mi ?? 0) as number;
          const visMi = visRaw > 100 ? parseFloat((visRaw / 1609.34).toFixed(1)) : visRaw;
          setWeather({
            metar: (m.rawOb || m.raw_text || "") as string,
            windDir: (m.wdir ?? m.wind_dir_degrees ?? 0) as number,
            windSpeed: (m.wspd ?? m.wind_speed_kt ?? 0) as number,
            visibility: visMi,
            temperature: (m.temp ?? m.temp_c ?? 0) as number,
            dewpoint: (m.dewp ?? m.dewpoint_c ?? 0) as number,
            qnh: m.altim ? Math.round(m.altim as number) : m.altim_in_hg ? Math.round((m.altim_in_hg as number) * 33.8639) : 0,
            clouds: (m.cover ?? (m.sky_condition as Record<string,string>[])?.[0]?.sky_cover ?? "CLR") as string,
          });
        }
      } catch { /* weather unavailable */ }
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 300_000);
    return () => clearInterval(id);
  }, []);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.adsb.fi/v2/lat/${OOSA.lat}/lon/${OOSA.lon}/dist/250`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error('adsb.fi');
      const data = await res.json();
      const ac = (data.ac ?? [])
        .filter((a: Record<string,unknown>) => a.lat != null && a.lon != null)
        .map((a: Record<string,unknown>) => ({
          lat: a.lat as number, lon: a.lon as number,
          heading: Math.round((a.track as number) || 0),
          alt: Math.round(a.alt_baro === 'ground' ? 0 : ((a.alt_baro as number) || 0)),
          callsign: ((a.flight as string) || '').trim() || 'Unknown',
        }));
      setMiniAircraft(ac);
      setFlights({ active: ac.length, arriving: ac.filter((a:{alt:number}) => a.alt > 0 && a.alt < 10000).length, departing: ac.filter((a:{alt:number}) => a.alt > 10000 && a.alt < 25000).length, source: 'adsb.fi', status: 'live' });
      return;
    } catch { /* try fallback */ }

    try {
      const res = await fetch(
        `https://api.airplanes.live/v2/point/${OOSA.lat}/${OOSA.lon}/250`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error('airplanes.live');
      const data = await res.json();
      const ac = (data.ac ?? [])
        .filter((a: Record<string,unknown>) => a.lat != null && a.lon != null)
        .map((a: Record<string,unknown>) => ({
          lat: a.lat as number, lon: a.lon as number,
          heading: Math.round((a.track as number) || 0),
          alt: Math.round(a.alt_baro === 'ground' ? 0 : ((a.alt_baro as number) || 0)),
          callsign: ((a.flight as string) || '').trim() || 'Unknown',
        }));
      setMiniAircraft(ac);
      setFlights({ active: ac.length, arriving: ac.filter((a:{alt:number}) => a.alt > 0 && a.alt < 10000).length, departing: ac.filter((a:{alt:number}) => a.alt > 10000 && a.alt < 25000).length, source: 'airplanes.live', status: 'live' });
      return;
    } catch { /* all failed */ }

    setFlights(prev => ({ ...prev, status: 'unavailable' }));
  }, []);

  useEffect(() => {
    fetchFlights();
    const id = setInterval(fetchFlights, 15000);
    return () => clearInterval(id);
  }, [fetchFlights]);

  const modules = [
    { id: 'radar' as ModuleType, title: 'Live Flight Radar', description: 'Real-time ADS-B tracking within 250 NM of OOSA', icon: Radar, color: '#0c9ce4', status: flights.status === 'live' ? 'Live' : 'Connecting' },
    { id: 'weather' as ModuleType, title: 'Weather Station', description: 'METAR, TAF, and weather history charts', icon: Cloud, color: '#10b981', status: weather ? 'Updated' : 'Loading' },
    { id: 'fpl' as ModuleType, title: 'Flight Plan Validator', description: 'Full ICAO FPL validation for CADAS-ATS', icon: FileText, color: '#f59e0b', status: 'Ready' },
    { id: 'notam' as ModuleType, title: 'NOTAM Search & Decoder', description: 'Search and decode ICAO NOTAMs', icon: AlertTriangle, color: '#ef4444', status: 'Ready' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="w-full h-full rounded-full border-2 border-[#0c9ce4] animate-ping" style={{animationDuration:'3s'}} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[#10b981]" />
            <span className="text-sm text-[#10b981] font-medium">
              {flights.status === 'live' ? 'All Systems Operational' : flights.status === 'loading' ? 'Connecting...' : 'Partial Connectivity'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Flight Operations Center</h2>
          <p className="text-white/60 max-w-2xl">
            Real-time flight tracking, weather monitoring, and flight plan validation for{' '}
            <span className="text-[#0c9ce4] font-medium">Salalah International Airport (OOSA/SLL)</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div onClick={() => onNavigate('radar')} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/50 text-sm mb-1">Active Flights</p>
              <p className="text-3xl font-bold text-white font-mono">
                {flights.status === 'live' ? flights.active : flights.status === 'loading' ? '\u2026' : '\u2014'}
              </p>
              <p className="text-white/40 text-sm mt-1">
                {flights.status === 'live' ? `${flights.arriving} below FL100 / ${flights.departing} mid-alt` : flights.status === 'loading' ? 'Fetching live data\u2026' : 'ADS-B feeds unavailable'}
              </p>
              {flights.status === 'live' && <p className="text-xs text-[#10b981] mt-1">via {flights.source}</p>}
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#0c9ce4]/20">
              <Plane className="w-6 h-6 text-[#0c9ce4]" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-[#0c9ce4] opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Open Radar</span><ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div onClick={() => onNavigate('weather')} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/50 text-sm mb-1">Wind Conditions</p>
              <p className="text-3xl font-bold text-white font-mono">
                {weather ? `${weather.windDir}\u00b0/${weather.windSpeed}kt` : '\u2026'}
              </p>
              <p className="text-white/40 text-sm mt-1">
                {weather ? `Vis: ${weather.visibility}mi  |  QNH: ${weather.qnh}hPa` : 'Loading METAR\u2026'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#10b981]/20">
              <Wind className="w-6 h-6 text-[#10b981]" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Weather Details</span><ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div onClick={() => onNavigate('radar')} className="glass-card p-1 cursor-pointer relative overflow-hidden h-[180px]">
          <style>{`.mini-map .leaflet-control-attribution{display:none!important}.mini-map .leaflet-container{background:#101c22!important}`}</style>
          <div className="mini-map w-full h-full rounded-lg overflow-hidden">
            <MapContainer center={[OOSA.lat, OOSA.lon]} zoom={7} style={{width:'100%',height:'100%'}} attributionControl={false}>
              <DisableInteraction/>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={18}/>
              <Marker position={[OOSA.lat, OOSA.lon]} icon={airportIcon()}><Popup>OOSA</Popup></Marker>
              {miniAircraft.slice(0, 50).map((ac, i) => (
                <Marker key={i} position={[ac.lat, ac.lon]} icon={planeIcon(ac.heading, getColor(ac.alt))}/>
              ))}
            </MapContainer>
          </div>
          <div className="absolute top-3 left-3 z-[1000] glass-card px-2 py-1 flex items-center gap-1.5 pointer-events-none">
            <div className={`w-1.5 h-1.5 rounded-full ${flights.status==='live'?'bg-[#10b981] animate-pulse':'bg-[#f59e0b] animate-pulse'}`}/>
            <span className="text-[10px] text-white font-medium">{flights.status==='live'?`${miniAircraft.length} aircraft`:'Loading\u2026'}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#0c9ce4] rounded-full" /> Operations Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(mod => (
            <div key={mod.id} onClick={() => onNavigate(mod.id)}
              className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: mod.color }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}20` }}>
                  <mod.icon className="w-5 h-5" style={{ color: mod.color }} />
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${mod.color}20`, color: mod.color }}>{mod.status}</span>
              </div>
              <h4 className="text-white font-semibold mb-1">{mod.title}</h4>
              <p className="text-white/50 text-sm">{mod.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: mod.color }}>
                <span>Open</span><ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {weather && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#0c9ce4]" /> Current Conditions
            </h3>
            <button onClick={() => onNavigate('weather')} className="text-sm text-[#0c9ce4] hover:underline flex items-center gap-1">
              Full Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4"/>Wind</div>
              <p className="text-xl font-bold text-white font-mono">{weather.windDir}\u00b0/{weather.windSpeed}kt</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4"/>Visibility</div>
              <p className="text-xl font-bold text-white font-mono">{weather.visibility} mi</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4"/>Temp</div>
              <p className="text-xl font-bold text-white font-mono">{weather.temperature}\u00b0C</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4"/>QNH</div>
              <p className="text-xl font-bold text-white font-mono">{weather.qnh} hPa</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-black/30 rounded-lg">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-sm text-[#0c9ce4] font-mono">{weather.metar}</p>
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${flights.status==='live'?'bg-[#10b981] animate-pulse':'bg-[#ef4444]'}`}/>
              <span className="text-sm text-white/70">ADS-B {flights.status==='live'?`(${flights.source})`:''}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${weather?'bg-[#10b981] animate-pulse':'bg-[#f59e0b] animate-pulse'}`}/>
              <span className="text-sm text-white/70">NOAA Weather</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"/>
              <span className="text-sm text-white/70">Systems</span>
            </div>
          </div>
          <div className="text-xs text-white/40">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="text-center text-xs text-white/30 py-4">
        <p>NOT FOR OPERATIONAL USE \u2014 FOR EDUCATIONAL AND DEMONSTRATION PURPOSES ONLY</p>
        <p className="mt-1">All data should be verified with official sources before use in flight operations</p>
      </div>
    </div>
  );
}
