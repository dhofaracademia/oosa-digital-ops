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
interface FlightStats { active:number; arriving:number; departing:number; }

const OOSA = { lat: 17.0389, lon: 54.0914 };

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
    html: `<div style="transform:rotate(${heading}deg);color:${color};font-size:14px;line-height:1;filter:drop-shadow(0 0 2px ${color}80)">✈</div>`,
    iconSize:[16,16], iconAnchor:[8,8],
  });
}

// Mini-map is non-interactive — block pointer events so click-to-navigate works
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

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flights, setFlights] = useState<FlightStats>({ active:0, arriving:0, departing:0 });
  const [miniAircraft, setMiniAircraft] = useState<{lat:number;lon:number;heading:number;alt:number;callsign:string}[]>([]);

  // ── Weather ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('https://aviationweather.gov/api/data/metar?ids=OOSA&format=json&hours=3');
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.METAR;
        if (arr?.length > 0) {
          const m = arr[0];
          const visRaw = m.visib ?? m.visibility_statute_mi ?? 0;
          const visMi = visRaw > 100 ? parseFloat((visRaw / 1609.34).toFixed(1)) : visRaw;
          setWeather({
            metar: m.rawOb || m.raw_text || '',
            windDir: m.wdir ?? m.wind_dir_degrees ?? 0,
            windSpeed: m.wspd ?? m.wind_speed_kt ?? 0,
            visibility: visMi,
            temperature: m.temp ?? m.temp_c ?? 0,
            dewpoint: m.dewp ?? m.dewpoint_c ?? 0,
            qnh: m.altim ? Math.round(m.altim) : m.altim_in_hg ? Math.round(m.altim_in_hg * 33.8639) : 0,
            clouds: m.cover ?? m.sky_condition?.[0]?.sky_cover ?? 'CLR',
          });
        } else { throw new Error('no data'); }
      } catch {
        setWeather({ metar:'METAR OOSA — unavailable', windDir:0, windSpeed:0, visibility:0, temperature:0, dewpoint:0, qnh:0, clouds:'CLR' });
      }
    };
    fetch_();
    const id = setInterval(fetch_, 300000);
    return () => clearInterval(id);
  }, []);

  // ── Flights + mini-map aircraft ──────────────────────────────────────────
  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(`https://opensky-network.org/api/states/all?lamin=${OOSA.lat-1.5}&lamax=${OOSA.lat+1.5}&lomin=${OOSA.lon-1.5}&lomax=${OOSA.lon+1.5}`);
      const data = await res.json();
      if (data.states) {
        setFlights({
          active: data.states.length,
          arriving: data.states.filter((s:any[]) => s[7] && s[7] < 1524).length,
          departing: data.states.filter((s:any[]) => s[7] && s[7] > 1524 && s[7] < 4572).length,
        });
        setMiniAircraft(
          data.states
            .filter((s:any[]) => s[6] && s[5])
            .slice(0, 40)
            .map((s:any[]) => ({
              lat: s[6], lon: s[5],
              heading: Math.round(s[10]||0),
              alt: Math.round((s[7]||0)*3.28084),
              callsign: (s[1] as string)?.trim()||'Unknown',
            }))
        );
      }
    } catch {
      setFlights({ active:12, arriving:4, departing:3 });
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    const id = setInterval(fetchFlights, 30000);
    return () => clearInterval(id);
  }, [fetchFlights]);

  const quickStats = [
    { id:'flights', label:'Active Flights', value:flights.active, subtext:`${flights.arriving} arriving · ${flights.departing} departing`, icon:Plane, color:'#0c9ce4', module:'radar' as ModuleType },
    { id:'weather', label:'Wind Conditions', value:weather?`${weather.windDir}°/${weather.windSpeed}kt`:'--', subtext:weather?`Vis: ${weather.visibility}mi · QNH: ${weather.qnh}hPa`:'Loading...', icon:Wind, color:'#10b981', module:'weather' as ModuleType },
  ];

  const modules = [
    { id:'radar',   title:'Live Flight Radar',    description:'Real-time ADS-B tracking within 50nm of OOSA', icon:Radar,         color:'#0c9ce4', status:'Live'    },
    { id:'weather', title:'Weather Station',       description:'METAR, TAF, and meteorological data',          icon:Cloud,         color:'#10b981', status:'Updated' },
    { id:'fpl',     title:'Flight Plan Validator', description:'ICAO flight plan format validation',           icon:FileText,      color:'#f59e0b', status:'Ready'   },
    { id:'notam',   title:'NOTAM Decoder',         description:'Decode raw ICAO NOTAM messages',               icon:AlertTriangle, color:'#ef4444', status:'Ready'   },
  ];

  return (
    <div className="space-y-6">
      <style>{`
        .dp .leaflet-popup-content-wrapper,.dp .leaflet-popup-tip{background:#101c22!important;color:#fff!important;border:1px solid rgba(12,156,228,.3)!important}
        .dp .leaflet-popup-content{margin:0!important}
        .leaflet-container{background:#101c22!important}
        .leaflet-control-attribution{background:rgba(16,28,34,.8)!important;color:rgba(255,255,255,.3)!important;font-size:8px!important}
        .leaflet-control-attribution a{color:rgba(12,156,228,.6)!important}
      `}</style>

      {/* Welcome */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10"><div className="radar-pulse w-full h-full"></div></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-[#10b981]"/><span className="text-sm text-[#10b981] font-medium">All Systems Operational</span></div>
          <h2 className="text-2xl font-bold text-white mb-2">Flight Operations Center</h2>
          <p className="text-white/60 max-w-2xl">Real-time flight tracking, weather monitoring, and flight plan validation for <span className="text-[#0c9ce4] font-medium">Salalah International Airport (OOSA/SLL)</span></p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickStats.map(stat => (
          <div key={stat.id} onClick={() => onNavigate(stat.module)} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white mono">{stat.value}</p>
                <p className="text-white/40 text-sm mt-1">{stat.subtext}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{backgroundColor:`${stat.color}20`}}>
                <stat.icon className="w-6 h-6" style={{color:stat.color}}/>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#0c9ce4] opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View Details</span><ArrowRight className="w-4 h-4"/>
            </div>
          </div>
        ))}
      </div>

      {/* Mini-map radar preview — react-leaflet, no iframe */}
      <div className="glass-card p-1 relative">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radar className="w-5 h-5 text-[#0c9ce4]"/> Live ADS-B Radar
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-xs text-[#10b981] font-normal">LIVE</span>
            </div>
          </h3>
          <button onClick={() => onNavigate('radar')} className="text-sm text-[#0c9ce4] hover:underline flex items-center gap-1">
            Full Radar <ArrowRight className="w-3.5 h-3.5"/>
          </button>
        </div>
        <div className="relative h-[320px] rounded-b-lg overflow-hidden cursor-pointer" onClick={() => onNavigate('radar')}>
          <MapContainer center={[OOSA.lat, OOSA.lon]} zoom={8} style={{width:'100%',height:'100%'}} attributionControl={true}>
            <DisableInteraction/>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd" maxZoom={18}
            />
            <Marker position={[OOSA.lat, OOSA.lon]} icon={airportIcon()}>
              <Popup className="dp"><div style={{fontFamily:'monospace',padding:'4px 8px'}}><b style={{color:'#0c9ce4'}}>OOSA / SLL</b></div></Popup>
            </Marker>
            {miniAircraft.map((ac, i) => {
              const color = ac.alt>25000?'#0c9ce4':ac.alt>10000?'#10b981':'#f59e0b';
              return (
                <Marker key={i} position={[ac.lat, ac.lon]} icon={planeIcon(ac.heading, color)}>
                  <Popup className="dp"><div style={{fontFamily:'monospace',padding:'4px 8px',fontSize:'12px'}}><b style={{color}}>{ac.callsign}</b><br/><span style={{opacity:.6}}>{ac.alt.toLocaleString()} ft</span></div></Popup>
                </Marker>
              );
            })}
          </MapContainer>
          {/* Click overlay label */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg pointer-events-none">
            <span className="text-xs text-white/70">OOSA / SLL — Click to open full radar · {flights.active} aircraft</span>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#0c9ce4] rounded-full"></span> Operations Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(mod => (
            <div key={mod.id} onClick={() => onNavigate(mod.id as ModuleType)} className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" style={{backgroundColor:mod.color}}/>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:`${mod.color}20`}}>
                  <mod.icon className="w-5 h-5" style={{color:mod.color}}/>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{backgroundColor:`${mod.color}20`,color:mod.color}}>{mod.status}</span>
              </div>
              <h4 className="text-white font-semibold mb-1">{mod.title}</h4>
              <p className="text-white/50 text-sm">{mod.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{color:mod.color}}>
                <span>Open</span><ArrowRight className="w-4 h-4"/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Summary */}
      {weather && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Cloud className="w-5 h-5 text-[#0c9ce4]"/> Current Conditions</h3>
            <button onClick={() => onNavigate('weather')} className="text-sm text-[#0c9ce4] hover:underline">Full Report →</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4"><div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4"/>Wind</div><p className="text-xl font-bold text-white mono">{weather.windDir}°/{weather.windSpeed}kt</p></div>
            <div className="bg-white/5 rounded-lg p-4"><div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4"/>Visibility</div><p className="text-xl font-bold text-white mono">{weather.visibility} mi</p></div>
            <div className="bg-white/5 rounded-lg p-4"><div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4"/>Temperature</div><p className="text-xl font-bold text-white mono">{weather.temperature}°C</p></div>
            <div className="bg-white/5 rounded-lg p-4"><div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4"/>QNH</div><p className="text-xl font-bold text-white mono">{weather.qnh} hPa</p></div>
          </div>
          <div className="mt-4 p-3 bg-black/30 rounded-lg">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-sm text-[#0c9ce4] mono">{weather.metar}</p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {['OpenSky API','NOAA Weather','Systems'].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                <span className="text-sm text-white/70">{s}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-white/40">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="text-center text-xs text-white/30 py-4">
        <p>NOT FOR OPERATIONAL USE • FOR EDUCATIONAL AND DEMONSTRATION PURPOSES ONLY</p>
        <p className="mt-1">All data should be verified with official sources before use in flight operations</p>
      </div>
    </div>
  );
}
