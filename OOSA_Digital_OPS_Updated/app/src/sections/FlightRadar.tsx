import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plane, TrendingUp, Wind, RefreshCw, Info,
  AlertCircle, Radar, ExternalLink, Maximize2, Minimize2, Map, List,
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

const OOSA = { lat: 17.0389, lon: 54.0914 };
const ADSB_FULL_URL = 'https://globe.adsbexchange.com/?lat=17.0389&lon=54.0914&zoom=9';

function getColor(alt: number) {
  if (alt > 25000) return '#0c9ce4';
  if (alt > 10000) return '#10b981';
  return '#f59e0b';
}

function planeIcon(heading: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${heading}deg);color:${color};font-size:20px;line-height:1;filter:drop-shadow(0 0 3px ${color}80)">✈</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
}

function airportIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:#0c9ce4;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #0c9ce480"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6],
  });
}

function Resizer({ dep }: { dep: boolean }) {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 60); }, [dep, map]);
  return null;
}

export default function FlightRadar() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'live' | 'unavailable' | 'loading'>('loading');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Aircraft | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState<'radar' | 'list'>('radar');

  const fetchAircraft = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://opensky-network.org/api/states/all?lamin=${OOSA.lat - 1.5}&lamax=${OOSA.lat + 1.5}&lomin=${OOSA.lon - 1.5}&lomax=${OOSA.lon + 1.5}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const parsed: Aircraft[] = (data.states ?? [])
        .map((s: (string | number | boolean | null)[]) => ({
          icao24: s[0] as string,
          callsign: (s[1] as string)?.trim() || 'Unknown',
          lat: s[6] as number, lon: s[5] as number,
          altitude: Math.round(((s[7] as number) || 0) * 3.28084),
          speed: Math.round(((s[9] as number) || 0) * 1.94384),
          heading: Math.round((s[10] as number) || 0),
          verticalRate: Math.round(((s[11] as number) || 0) * 196.85),
          onGround: s[8] as boolean,
        }))
        .filter((a: Aircraft) => a.lat && a.lon);
      setAircraft(parsed);
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
    const id = setInterval(fetchAircraft, 30000);
    return () => clearInterval(id);
  }, [fetchAircraft]);

  const highAlt = aircraft.filter(a => a.altitude > 25000);
  const lowAlt  = aircraft.filter(a => a.altitude > 0 && a.altitude < 5000);

  return (
    <div className="space-y-4">
      <style>{`
        .dp .leaflet-popup-content-wrapper, .dp .leaflet-popup-tip {
          background:#101c22!important;color:#fff!important;
          border:1px solid rgba(12,156,228,.3)!important;
          box-shadow:0 4px 20px rgba(0,0,0,.6)!important;
        }
        .dp .leaflet-popup-content{margin:0!important}
        .leaflet-container{background:#101c22!important}
        .leaflet-control-attribution{background:rgba(16,28,34,.8)!important;color:rgba(255,255,255,.4)!important;font-size:9px!important}
        .leaflet-control-attribution a{color:rgba(12,156,228,.7)!important}
        .leaflet-control-zoom a{background:rgba(16,28,34,.9)!important;color:#fff!important;border-color:rgba(255,255,255,.1)!important}
        .leaflet-control-zoom a:hover{background:rgba(12,156,228,.2)!important}
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-[#0c9ce4]" /> Live Flight Radar
          </h2>
          <p className="text-white/50 text-sm mt-1">Real-time ADS-B — OpenSky Network</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-lg p-1">
            {(['radar','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${view===v?'bg-[#0c9ce4]/20 text-[#0c9ce4]':'text-white/50 hover:text-white'}`}>
                {v==='radar'?<Map className="w-4 h-4"/>:<List className="w-4 h-4"/>}
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setFullscreen(f=>!f)} className="p-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
            {fullscreen?<Minimize2 className="w-4 h-4"/>:<Maximize2 className="w-4 h-4"/>}
          </button>
          <a href={ADSB_FULL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm">
            <ExternalLink className="w-4 h-4"/><span className="hidden sm:inline">ADS-B Exchange</span>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
            <span className="text-sm text-white/50">Source:</span>
            <span className="text-sm font-medium text-[#10b981]">OpenSky Network</span>
          </div>
          {apiStatus==='live' && <>
            <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-[#0c9ce4]"/><span className="text-sm text-white/50">Tracked:</span><span className="text-lg font-bold text-white mono">{aircraft.length}</span></div>
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#10b981]"/><span className="text-sm text-white/50">High Alt:</span><span className="text-lg font-bold text-white mono">{highAlt.length}</span></div>
            <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-[#f59e0b]"/><span className="text-sm text-white/50">Approaching:</span><span className="text-lg font-bold text-white mono">{lowAlt.length}</span></div>
          </>}
          {apiStatus==='unavailable' && <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-[#f59e0b]"/><span className="text-sm text-[#f59e0b]">OpenSky unavailable — try refreshing</span></div>}
          <div className="ml-auto flex items-center gap-3">
            {lastUpdate && <span className="text-xs text-white/40">Updated: {lastUpdate.toLocaleTimeString()}</span>}
            <button onClick={fetchAircraft} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg hover:bg-[#0c9ce4]/30 transition-colors disabled:opacity-50 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className={`grid gap-4 ${view==='radar'&&!fullscreen?'grid-cols-1 lg:grid-cols-3':'grid-cols-1'}`}>

        {view==='radar' && (
          <div className={`glass-card p-1 relative overflow-hidden ${fullscreen?'h-[80vh]':'h-[550px]'} ${!fullscreen?'lg:col-span-2':''}`}>
            <MapContainer
              center={[OOSA.lat, OOSA.lon]} zoom={9}
              style={{ width:'100%', height:'100%', borderRadius:'0.5rem' }}
            >
              <Resizer dep={fullscreen}/>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd" maxZoom={18}
              />
              <Marker position={[OOSA.lat, OOSA.lon]} icon={airportIcon()}>
                <Popup className="dp">
                  <div style={{fontFamily:'monospace',padding:'6px 10px'}}>
                    <b style={{color:'#0c9ce4'}}>OOSA / SLL</b><br/>
                    <span style={{opacity:.6,fontSize:'11px'}}>Salalah International Airport</span>
                  </div>
                </Popup>
              </Marker>
              {aircraft.map(ac => {
                const color = getColor(ac.altitude);
                const sts = ac.onGround?'On Ground':ac.verticalRate>500?'↑ Climbing':ac.verticalRate<-500?'↓ Descending':'→ Cruising';
                return (
                  <Marker key={ac.icao24} position={[ac.lat, ac.lon]} icon={planeIcon(ac.heading, color)}>
                    <Popup className="dp" maxWidth={200}>
                      <div style={{fontFamily:'monospace',background:'#101c22',color:'#fff',padding:'8px 12px',borderRadius:'6px',minWidth:'160px',fontSize:'12px'}}>
                        <div style={{color,fontSize:'14px',fontWeight:'bold',marginBottom:'6px'}}>{ac.callsign}</div>
                        <div style={{opacity:.5,fontSize:'10px',marginBottom:'6px'}}>{ac.icao24.toUpperCase()}</div>
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
                          <tbody>
                            <tr><td style={{opacity:.5,paddingRight:'8px'}}>ALT</td><td>{ac.altitude.toLocaleString()} ft</td></tr>
                            <tr><td style={{opacity:.5,paddingRight:'8px'}}>SPD</td><td>{ac.speed} kts</td></tr>
                            <tr><td style={{opacity:.5,paddingRight:'8px'}}>HDG</td><td>{ac.heading}°</td></tr>
                            <tr><td style={{opacity:.5,paddingRight:'8px'}}>V/S</td><td>{ac.verticalRate>0?'+':''}{ac.verticalRate} fpm</td></tr>
                            <tr><td style={{opacity:.5,paddingRight:'8px'}}>STS</td><td>{sts}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            <div className="absolute top-3 left-3 z-[1000] glass-card px-3 py-1.5 flex items-center gap-2 pointer-events-none">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-xs text-white font-medium">LIVE · {aircraft.length} aircraft</span>
            </div>
            <div className="absolute bottom-3 left-3 z-[1000] glass-card px-3 py-1.5 pointer-events-none">
              <span className="text-xs text-white/70">OOSA / SLL — Salalah International</span>
            </div>
            {apiStatus==='loading' && (
              <div className="absolute inset-0 z-[999] flex items-center justify-center bg-[#101c22]/60 rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[#0c9ce4] animate-spin"/>
                  <span className="text-white/60 text-sm">Loading radar data…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {(view==='list'||(view==='radar'&&!fullscreen)) && (
          <div className={`glass-card p-4 ${view==='list'?'h-auto min-h-[550px]':'h-[550px]'} overflow-hidden flex flex-col`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#0c9ce4]"/> Aircraft in Range
              {apiStatus==='live' && <span className="text-xs bg-[#0c9ce4]/20 text-[#0c9ce4] px-2 py-0.5 rounded-full ml-auto">{aircraft.length} tracked</span>}
            </h3>
            <div className="flex-1 overflow-auto space-y-2">
              {apiStatus==='loading' ? (
                <div className="text-center py-8 text-white/50"><RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30 animate-spin"/><p>Fetching…</p></div>
              ) : apiStatus==='unavailable' ? (
                <div className="text-center py-8 text-white/50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#f59e0b]"/>
                  <p className="text-[#f59e0b]/70 mb-2">OpenSky unavailable</p>
                  <p className="text-sm">May be rate-limited. Try in 60s.</p>
                  <button onClick={fetchAircraft} className="mt-4 px-4 py-2 bg-[#0c9ce4]/20 text-[#0c9ce4] rounded-lg text-sm">Retry</button>
                </div>
              ) : aircraft.length===0 ? (
                <div className="text-center py-8 text-white/50"><Plane className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>No aircraft in range</p></div>
              ) : aircraft.map(ac => (
                <div key={ac.icao24}
                  onClick={() => setSelected(selected?.icao24===ac.icao24?null:ac)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${selected?.icao24===ac.icao24?'bg-[#0c9ce4]/20 border-[#0c9ce4]/50':'bg-white/5 hover:bg-white/10 border-transparent'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white mono">{ac.callsign}</span>
                    <span className="text-xs text-white/40 mono">{ac.icao24.toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-white/40"/><span className="text-white/70 mono">{ac.altitude.toLocaleString()} ft</span></div>
                    <div className="flex items-center gap-1.5"><Wind className="w-3 h-3 text-white/40"/><span className="text-white/70 mono">{ac.speed} kts</span></div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor:getColor(ac.altitude)}}/>
                    <span className="text-xs text-white/40">{ac.onGround?'On Ground':ac.verticalRate>500?'Climbing':ac.verticalRate<-500?'Descending':'Cruising'}</span>
                  </div>
                  {selected?.icao24===ac.icao24 && (
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-white/40">Heading</span><p className="text-white mono">{ac.heading}°</p></div>
                      <div><span className="text-white/40">V/S</span><p className={`mono ${ac.verticalRate>0?'text-green-400':ac.verticalRate<0?'text-red-400':'text-white'}`}>{ac.verticalRate>0?'+':''}{ac.verticalRate} fpm</p></div>
                      <div><span className="text-white/40">Position</span><p className="text-white mono">{ac.lat.toFixed(3)}, {ac.lon.toFixed(3)}</p></div>
                      <div><span className="text-white/40">Status</span><p className="text-white">{ac.onGround?'Ground':'Airborne'}</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div><span className="text-white/50">&lt;10k ft</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div><span className="text-white/50">10–25k ft</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0c9ce4]"></div><span className="text-white/50">&gt;25k ft</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0c9ce4] mt-0.5 shrink-0"/>
          <p className="text-sm text-white/60">
            <span className="text-white font-medium">Live radar</span> powered by{' '}
            <a href="https://opensky-network.org/" target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">OpenSky Network</a>.
            Refreshes every 30s. Click aircraft for details. For denser coverage use{' '}
            <a href={ADSB_FULL_URL} target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">ADS-B Exchange</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
