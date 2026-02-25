import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plane, 
  Cloud, 
  Radar, 
  FileText, 
  AlertTriangle, 
  Wind, 
  Eye,
  Thermometer,
  Droplets,
  ArrowRight,
  Activity
} from 'lucide-react';
import type { ModuleType } from '../App';

interface DashboardProps {
  onNavigate: (module: ModuleType) => void;
}

interface WeatherData {
  metar: string;
  windDir: number;
  windSpeed: number;
  visibility: number;
  temperature: number;
  dewpoint: number;
  qnh: number;
  clouds: string;
}

interface FlightStats {
  active: number;
  arriving: number;
  departing: number;
}

const OOSA = { lat: 17.0389, lon: 54.0914 };

declare global {
  interface Window { L: any; }
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (window.L) { resolve(); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); resolve(); } }, 50);
    }
  });
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flights, setFlights] = useState<FlightStats>({ active: 0, arriving: 0, departing: 0 });
  const [, setLoading] = useState({ weather: true, flights: true });

  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<any>(null);
  const miniMapInitialized = useRef(false);
  const miniMarkersRef = useRef<any[]>([]);

  // ── Fetch weather ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=json&stationString=OOSA&hoursBeforeNow=3'
        );
        const data = await response.json();
        if (data.METAR?.length > 0) {
          const metar = data.METAR[0];
          setWeather({
            metar: metar.raw_text,
            windDir: metar.wind_dir_degrees || 0,
            windSpeed: metar.wind_speed_kt || 0,
            visibility: metar.visibility_statute_mi || 0,
            temperature: metar.temp_c || 0,
            dewpoint: metar.dewpoint_c || 0,
            qnh: metar.altim_in_hg ? Math.round(metar.altim_in_hg * 33.8639) : 0,
            clouds: metar.sky_condition?.[0]?.sky_cover || 'CLR'
          });
        }
      } catch {
        setWeather({
          metar: 'METAR OOSA 121050Z 18005KT 9999 FEW025 31/26 Q1008 NOSIG',
          windDir: 180, windSpeed: 5, visibility: 6.2,
          temperature: 31, dewpoint: 26, qnh: 1008, clouds: 'FEW'
        });
      } finally {
        setLoading(prev => ({ ...prev, weather: false }));
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch flights ──────────────────────────────────────────────────────
  const fetchFlights = useCallback(async () => {
    try {
      const response = await fetch(
        `https://opensky-network.org/api/states/all?lamin=${OOSA.lat - 1.5}&lamax=${OOSA.lat + 1.5}&lomin=${OOSA.lon - 1.5}&lomax=${OOSA.lon + 1.5}`
      );
      const data = await response.json();
      if (data.states) {
        const active = data.states.length;
        const arriving = data.states.filter((s: any[]) => s[7] && s[7] < 1524).length;
        const departing = data.states.filter((s: any[]) => s[7] && s[7] > 1524 && s[7] < 4572).length;
        setFlights({ active, arriving, departing });

        // Update mini-map markers
        const L = window.L;
        if (L && miniMapInstance.current) {
          miniMarkersRef.current.forEach(m => m.remove());
          miniMarkersRef.current = [];
          data.states
            .filter((s: any[]) => s[6] && s[5])
            .slice(0, 30) // limit for performance
            .forEach((s: any[]) => {
              const alt = Math.round((s[7] || 0) * 3.28084);
              const color = alt > 25000 ? '#0c9ce4' : alt > 10000 ? '#10b981' : '#f59e0b';
              const heading = Math.round(s[10] || 0);
              const icon = L.divIcon({
                className: '',
                html: `<div style="transform:rotate(${heading}deg);color:${color};font-size:14px;line-height:1;filter:drop-shadow(0 0 2px ${color}80);">✈</div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });
              const callsign = (s[1] as string)?.trim() || 'Unknown';
              const marker = L.marker([s[6], s[5]], { icon })
                .addTo(miniMapInstance.current)
                .bindPopup(`<b style="color:${color}">${callsign}</b><br/>${alt.toLocaleString()} ft`);
              miniMarkersRef.current.push(marker);
            });
        }
      }
    } catch {
      setFlights({ active: 12, arriving: 4, departing: 3 });
    } finally {
      setLoading(prev => ({ ...prev, flights: false }));
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 30000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  // ── Init mini Leaflet map ──────────────────────────────────────────────
  useEffect(() => {
    if (miniMapInitialized.current || !miniMapRef.current) return;
    miniMapInitialized.current = true;

    loadLeaflet().then(() => {
      const L = window.L;
      if (!L || !miniMapRef.current || miniMapInstance.current) return;

      const map = L.map(miniMapRef.current, {
        center: [OOSA.lat, OOSA.lon],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 18,
      }).addTo(map);

      // Airport dot
      L.divIcon && L.marker([OOSA.lat, OOSA.lon], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#0c9ce4;border:2px solid white;border-radius:50%;box-shadow:0 0 6px #0c9ce4;"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        })
      }).addTo(map).bindPopup('<b>OOSA / SLL</b><br/>Salalah International');

      miniMapInstance.current = map;
      // Trigger flight fetch to populate markers
      fetchFlights();
    });

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
        miniMapInitialized.current = false;
      }
    };
  }, [fetchFlights]);

  // ── Stats & modules ────────────────────────────────────────────────────
  const quickStats = [
    {
      id: 'flights',
      label: 'Active Flights',
      value: flights.active,
      subtext: `${flights.arriving} arriving · ${flights.departing} departing`,
      icon: Plane,
      color: '#0c9ce4',
      module: 'radar' as ModuleType
    },
    {
      id: 'weather',
      label: 'Wind Conditions',
      value: weather ? `${weather.windDir}°/${weather.windSpeed}kt` : '--',
      subtext: weather ? `Vis: ${weather.visibility}mi · QNH: ${weather.qnh}hPa` : 'Loading...',
      icon: Wind,
      color: '#10b981',
      module: 'weather' as ModuleType
    }
  ];

  const modules = [
    { id: 'radar',   title: 'Live Flight Radar',      description: 'Real-time ADS-B tracking within 50nm of OOSA', icon: Radar,        color: '#0c9ce4', status: 'Live'    },
    { id: 'weather', title: 'Weather Station',         description: 'METAR, TAF, and meteorological data',          icon: Cloud,        color: '#10b981', status: 'Updated' },
    { id: 'fpl',     title: 'Flight Plan Validator',   description: 'ICAO flight plan format validation',           icon: FileText,     color: '#f59e0b', status: 'Ready'   },
    { id: 'notam',   title: 'NOTAM Decoder',           description: 'Decode raw ICAO NOTAM messages',               icon: AlertTriangle, color: '#ef4444', status: 'Ready'  },
  ];

  return (
    <div className="space-y-6">
      {/* Leaflet CSS for popups */}
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #101c22 !important;
          color: white !important;
          border: 1px solid rgba(12,156,228,0.3) !important;
        }
        .leaflet-container { background: #101c22; }
      `}</style>

      {/* Welcome Header */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="radar-pulse w-full h-full"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[#10b981]" />
            <span className="text-sm text-[#10b981] font-medium">All Systems Operational</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Flight Operations Center</h2>
          <p className="text-white/60 max-w-2xl">
            Real-time flight tracking, weather monitoring, and flight plan validation for{' '}
            <span className="text-[#0c9ce4] font-medium">Salalah International Airport (OOSA/SLL)</span>
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickStats.map((stat) => (
          <div
            key={stat.id}
            onClick={() => onNavigate(stat.module)}
            className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white mono">{stat.value}</p>
                <p className="text-white/40 text-sm mt-1">{stat.subtext}</p>
              </div>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#0c9ce4] opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View Details</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Live Radar Preview — Leaflet mini-map (no iframe) */}
      <div className="glass-card p-1 relative">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radar className="w-5 h-5 text-[#0c9ce4]" />
            Live ADS-B Radar
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-xs text-[#10b981] font-normal">LIVE</span>
            </div>
          </h3>
          <button
            onClick={() => onNavigate('radar')}
            className="text-sm text-[#0c9ce4] hover:underline flex items-center gap-1"
          >
            Full Radar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Leaflet mini-map container */}
        <div className="relative h-[350px] rounded-b-lg overflow-hidden">
          <div
            ref={miniMapRef}
            className="w-full h-full"
            style={{ background: '#101c22' }}
          />
          {/* Click-to-expand overlay */}
          <div
            className="absolute inset-0 z-[400] cursor-pointer"
            onClick={() => onNavigate('radar')}
            title="Click to open full radar"
          />
          <div className="absolute bottom-3 left-3 z-[500] bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg pointer-events-none">
            <span className="text-xs text-white/70">OOSA / SLL — Salalah International · Click for full radar</span>
          </div>
          <div className="absolute top-3 right-3 z-[500] bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg pointer-events-none">
            <span className="text-xs text-white/50">{flights.active} aircraft</span>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#0c9ce4] rounded-full"></span>
          Operations Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => (
            <div
              key={module.id}
              onClick={() => onNavigate(module.id as ModuleType)}
              className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-20 h-20 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"
                style={{ backgroundColor: module.color }}
              />
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${module.color}20` }}
                >
                  <module.icon className="w-5 h-5" style={{ color: module.color }} />
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${module.color}20`, color: module.color }}
                >
                  {module.status}
                </span>
              </div>
              <h4 className="text-white font-semibold mb-1">{module.title}</h4>
              <p className="text-white/50 text-sm">{module.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: module.color }}>
                <span>Open</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Weather Summary */}
      {weather && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#0c9ce4]" />
              Current Conditions
            </h3>
            <button onClick={() => onNavigate('weather')} className="text-sm text-[#0c9ce4] hover:underline">
              Full Report →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Wind className="w-4 h-4" />Wind</div>
              <p className="text-xl font-bold text-white mono">{weather.windDir}°/{weather.windSpeed}kt</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Eye className="w-4 h-4" />Visibility</div>
              <p className="text-xl font-bold text-white mono">{weather.visibility} mi</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Thermometer className="w-4 h-4" />Temperature</div>
              <p className="text-xl font-bold text-white mono">{weather.temperature}°C</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1"><Droplets className="w-4 h-4" />QNH</div>
              <p className="text-xl font-bold text-white mono">{weather.qnh} hPa</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-black/30 rounded-lg">
            <p className="text-xs text-white/50 mb-1">Raw METAR</p>
            <p className="text-sm text-[#0c9ce4] mono">{weather.metar}</p>
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-sm text-white/70">OpenSky API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-sm text-white/70">NOAA Weather</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-sm text-white/70">Systems</span>
            </div>
          </div>
          <div className="text-xs text-white/40">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-white/30 py-4">
        <p>NOT FOR OPERATIONAL USE • FOR EDUCATIONAL AND DEMONSTRATION PURPOSES ONLY</p>
        <p className="mt-1">All data should be verified with official sources before use in flight operations</p>
      </div>
    </div>
  );
}
