import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plane, 
  TrendingUp, 
  Wind, 
  RefreshCw, 
  Info,
  AlertCircle,
  Radar,
  ExternalLink,
  Maximize2,
  Minimize2,
  Map,
  List
} from 'lucide-react';

interface Aircraft {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
}

const OOSA_CENTER = { lat: 17.0389, lon: 54.0914 };
const ADSB_FULL_URL = 'https://globe.adsbexchange.com/?lat=17.0389&lon=54.0914&zoom=9';

// Dark tile layer — matches app theme perfectly
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

declare global {
  interface Window {
    L: any;
  }
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
      // Script tag exists but L might not be ready yet — poll
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); resolve(); }
      }, 50);
    }
  });
}

function getAircraftColor(alt: number): string {
  if (alt > 25000) return '#0c9ce4';
  if (alt > 10000) return '#10b981';
  return '#f59e0b';
}

export default function FlightRadar() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'live' | 'unavailable' | 'loading'>('loading');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'radar' | 'list'>('radar');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const airportMarkerRef = useRef<any>(null);
  const mapInitialized = useRef(false);

  // ── Fetch aircraft from OpenSky ──────────────────────────────────────────
  const fetchAircraft = useCallback(async () => {
    try {
      setLoading(true);
      const { lat, lon } = OOSA_CENTER;
      const response = await fetch(
        `https://opensky-network.org/api/states/all?lamin=${lat - 1.5}&lamax=${lat + 1.5}&lomin=${lon - 1.5}&lomax=${lon + 1.5}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();

      if (data.states?.length > 0) {
        const parsed: Aircraft[] = data.states
          .map((s: (string | number | boolean | null)[]) => ({
            icao24: s[0] as string,
            callsign: (s[1] as string)?.trim() || 'Unknown',
            lat: s[6] as number,
            lon: s[5] as number,
            altitude: Math.round(((s[7] as number) || 0) * 3.28084),
            speed: Math.round(((s[9] as number) || 0) * 1.94384),
            heading: Math.round((s[10] as number) || 0),
            verticalRate: Math.round(((s[11] as number) || 0) * 196.85),
            onGround: s[8] as boolean,
          }))
          .filter((a: Aircraft) => a.lat && a.lon);
        setAircraft(parsed);
      } else {
        setAircraft([]);
      }
      setApiStatus('live');
      setLastUpdate(new Date());
    } catch {
      setApiStatus('unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAircraft();
    const interval = setInterval(fetchAircraft, 30000);
    return () => clearInterval(interval);
  }, [fetchAircraft]);

  // ── Initialise Leaflet map ───────────────────────────────────────────────
  const initMap = useCallback(async () => {
    if (mapInitialized.current || !mapContainerRef.current) return;
    mapInitialized.current = true;

    await loadLeaflet();
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [OOSA_CENTER.lat, OOSA_CENTER.lon],
      zoom: 9,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    // Airport marker
    const airportIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 14px; height: 14px;
        background: #0c9ce4;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 8px #0c9ce480;
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    airportMarkerRef.current = L.marker([OOSA_CENTER.lat, OOSA_CENTER.lon], { icon: airportIcon })
      .addTo(map)
      .bindPopup('<b>OOSA / SLL</b><br/>Salalah International Airport');

    leafletMapRef.current = map;
  }, []);

  // Init map when radar view is active
  useEffect(() => {
    if (activeView === 'radar') {
      // Small delay so the container is visible/sized before initializing
      const timeout = setTimeout(() => initMap(), 100);
      return () => clearTimeout(timeout);
    }
  }, [activeView, initMap]);

  // Invalidate size when fullscreen toggles
  useEffect(() => {
    if (leafletMapRef.current) {
      setTimeout(() => leafletMapRef.current?.invalidateSize(), 50);
    }
  }, [isFullscreen]);

  // ── Update aircraft markers ──────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletMapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    aircraft.forEach((ac) => {
      const color = getAircraftColor(ac.altitude);
      const status = ac.onGround ? 'On Ground'
        : ac.verticalRate > 500 ? '↑ Climbing'
        : ac.verticalRate < -500 ? '↓ Descending'
        : '→ Cruising';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          transform: rotate(${ac.heading}deg);
          color: ${color};
          font-size: 18px;
          line-height: 1;
          filter: drop-shadow(0 0 3px ${color}80);
          transition: transform 0.3s;
        ">✈</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const popup = `
        <div style="
          font-family: 'Courier New', monospace;
          background: #101c22;
          color: #fff;
          padding: 8px 12px;
          border-radius: 6px;
          min-width: 160px;
          font-size: 12px;
          border: 1px solid ${color}40;
        ">
          <div style="color:${color}; font-size:14px; font-weight:bold; margin-bottom:6px;">
            ${ac.callsign}
          </div>
          <div style="opacity:0.6; font-size:10px; margin-bottom:6px;">${ac.icao24.toUpperCase()}</div>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="opacity:0.5; padding:1px 4px 1px 0">ALT</td><td>${ac.altitude.toLocaleString()} ft</td></tr>
            <tr><td style="opacity:0.5; padding:1px 4px 1px 0">SPD</td><td>${ac.speed} kts</td></tr>
            <tr><td style="opacity:0.5; padding:1px 4px 1px 0">HDG</td><td>${ac.heading}°</td></tr>
            <tr><td style="opacity:0.5; padding:1px 4px 1px 0">V/S</td><td>${ac.verticalRate > 0 ? '+' : ''}${ac.verticalRate} fpm</td></tr>
            <tr><td style="opacity:0.5; padding:1px 4px 1px 0">STS</td><td>${status}</td></tr>
          </table>
        </div>
      `;

      const marker = L.marker([ac.lat, ac.lon], { icon })
        .addTo(leafletMapRef.current)
        .bindPopup(popup, { className: 'leaflet-dark-popup', maxWidth: 200 });

      markersRef.current.push(marker);
    });
  }, [aircraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        mapInitialized.current = false;
      }
    };
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────
  const highAlt  = aircraft.filter(a => a.altitude > 25000);
  const lowAlt   = aircraft.filter(a => a.altitude > 0 && a.altitude < 5000);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Leaflet popup dark theme override */}
      <style>{`
        .leaflet-dark-popup .leaflet-popup-content-wrapper,
        .leaflet-dark-popup .leaflet-popup-tip {
          background: #101c22;
          border: 1px solid rgba(12,156,228,0.3);
          color: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        }
        .leaflet-dark-popup .leaflet-popup-content { margin: 0; }
        .leaflet-container { background: #101c22; }
        .leaflet-control-attribution {
          background: rgba(16,28,34,0.8) !important;
          color: rgba(255,255,255,0.4) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(12,156,228,0.7) !important; }
        .leaflet-control-zoom a {
          background: rgba(16,28,34,0.9) !important;
          color: white !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(12,156,228,0.2) !important; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-[#0c9ce4]" />
            Live Flight Radar
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Real-time ADS-B tracking — OpenSky Network
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveView('radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                activeView === 'radar'
                  ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" />
              Radar
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                activeView === 'list'
                  ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="p-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open full map externally */}
          <a
            href={ADSB_FULL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open ADS-B Exchange</span>
          </a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
            <span className="text-sm text-white/50">Source:</span>
            <span className="text-sm font-medium text-[#10b981]">OpenSky Network</span>
          </div>

          {apiStatus === 'live' && (
            <>
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#0c9ce4]" />
                <span className="text-sm text-white/50">Tracked:</span>
                <span className="text-lg font-bold text-white mono">{aircraft.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#10b981]" />
                <span className="text-sm text-white/50">High Alt:</span>
                <span className="text-lg font-bold text-white mono">{highAlt.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm text-white/50">Approaching:</span>
                <span className="text-lg font-bold text-white mono">{lowAlt.length}</span>
              </div>
            </>
          )}

          {apiStatus === 'unavailable' && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-sm text-[#f59e0b]">OpenSky API unavailable — try refreshing</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-white/40">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAircraft}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg hover:bg-[#0c9ce4]/30 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`grid gap-4 ${activeView === 'radar' && !isFullscreen ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

        {/* Leaflet Map */}
        {activeView === 'radar' && (
          <div
            className={`glass-card p-1 relative overflow-hidden ${
              isFullscreen ? 'h-[80vh]' : 'h-[550px]'
            } ${!isFullscreen ? 'lg:col-span-2' : ''}`}
          >
            {/* Map container */}
            <div
              ref={mapContainerRef}
              className="w-full h-full rounded-lg"
              style={{ background: '#101c22' }}
            />

            {/* Live badge */}
            <div className="absolute top-3 left-3 z-[1000] glass-card px-3 py-1.5 flex items-center gap-2 pointer-events-none">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-xs text-white font-medium">
                LIVE · {aircraft.length} aircraft
              </span>
            </div>

            {/* Airport label */}
            <div className="absolute bottom-3 left-3 z-[1000] glass-card px-3 py-1.5 pointer-events-none">
              <span className="text-xs text-white/70">OOSA / SLL — Salalah International</span>
            </div>

            {/* Loading overlay */}
            {apiStatus === 'loading' && (
              <div className="absolute inset-0 z-[999] flex items-center justify-center bg-[#101c22]/60 rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[#0c9ce4] animate-spin" />
                  <span className="text-white/60 text-sm">Loading radar data…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aircraft List Panel */}
        {(activeView === 'list' || (activeView === 'radar' && !isFullscreen)) && (
          <div className={`glass-card p-4 ${activeView === 'list' ? 'h-auto min-h-[550px]' : 'h-[550px]'} overflow-hidden flex flex-col`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#0c9ce4]" />
              Aircraft in Range
              {apiStatus === 'live' && (
                <span className="text-xs bg-[#0c9ce4]/20 text-[#0c9ce4] px-2 py-0.5 rounded-full ml-auto">
                  {aircraft.length} tracked
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-auto space-y-2">
              {apiStatus === 'loading' ? (
                <div className="text-center py-8 text-white/50">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30 animate-spin" />
                  <p>Fetching aircraft data…</p>
                </div>
              ) : apiStatus === 'unavailable' ? (
                <div className="text-center py-8 text-white/50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#f59e0b]" />
                  <p className="text-[#f59e0b]/70 mb-2">OpenSky API unavailable</p>
                  <p className="text-sm">This may be due to rate limiting.</p>
                  <button
                    onClick={fetchAircraft}
                    className="mt-4 px-4 py-2 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg hover:bg-[#0c9ce4]/30 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : aircraft.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No aircraft in range</p>
                  <p className="text-sm mt-1 opacity-60">±1.5° around OOSA</p>
                </div>
              ) : (
                aircraft.map((ac) => (
                  <div
                    key={ac.icao24}
                    onClick={() => setSelectedAircraft(
                      selectedAircraft?.icao24 === ac.icao24 ? null : ac
                    )}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedAircraft?.icao24 === ac.icao24
                        ? 'bg-[#0c9ce4]/20 border border-[#0c9ce4]/50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white mono">{ac.callsign}</span>
                      <span className="text-xs text-white/40 mono">{ac.icao24.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-white/40" />
                        <span className="text-white/70 mono">{ac.altitude.toLocaleString()} ft</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-3 h-3 text-white/40" />
                        <span className="text-white/70 mono">{ac.speed} kts</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getAircraftColor(ac.altitude) }}
                      />
                      <span className="text-xs text-white/40">
                        {ac.onGround
                          ? 'On Ground'
                          : ac.verticalRate > 500 ? 'Climbing'
                          : ac.verticalRate < -500 ? 'Descending'
                          : 'Cruising'}
                      </span>
                    </div>
                    {selectedAircraft?.icao24 === ac.icao24 && (
                      <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/40">Heading</span>
                          <p className="text-white mono">{ac.heading}°</p>
                        </div>
                        <div>
                          <span className="text-white/40">V/S</span>
                          <p className={`mono ${ac.verticalRate > 0 ? 'text-green-400' : ac.verticalRate < 0 ? 'text-red-400' : 'text-white'}`}>
                            {ac.verticalRate > 0 ? '+' : ''}{ac.verticalRate} fpm
                          </p>
                        </div>
                        <div>
                          <span className="text-white/40">Position</span>
                          <p className="text-white mono">{ac.lat.toFixed(3)}, {ac.lon.toFixed(3)}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Status</span>
                          <p className="text-white">{ac.onGround ? 'Ground' : 'Airborne'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
                  <span className="text-white/50">&lt;10k ft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                  <span className="text-white/50">10–25k ft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0c9ce4]"></div>
                  <span className="text-white/50">&gt;25k ft</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0c9ce4] mt-0.5 shrink-0" />
          <div className="text-sm text-white/60">
            <p>
              <span className="text-white font-medium">Live radar</span> and aircraft list are both powered by the{' '}
              <a href="https://opensky-network.org/" target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">
                OpenSky Network
              </a>{' '}
              open API. Data refreshes every 30 seconds. Click any aircraft marker or list entry for full details.
              For a higher-density view, use{' '}
              <a href={ADSB_FULL_URL} target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">
                ADS-B Exchange
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
