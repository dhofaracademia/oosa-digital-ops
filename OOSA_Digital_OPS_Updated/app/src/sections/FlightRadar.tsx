import { useState, useEffect, useRef } from 'react';
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

// ADS-B Exchange embed URL centered on OOSA (Salalah International Airport)
const ADSB_EMBED_URL = 'https://globe.adsbexchange.com/?lat=17.0389&lon=54.0914&zoom=9';

export default function FlightRadar() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'live' | 'unavailable' | 'loading'>('loading');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'radar' | 'list'>('radar');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // OOSA coordinates
  const OOSA_CENTER = { lat: 17.0389, lon: 54.0914 };

  // Fetch supplementary aircraft data from OpenSky (for the stats sidebar)
  const fetchAircraft = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `https://opensky-network.org/api/states/all?lamin=${OOSA_CENTER.lat - 0.75}&lamax=${OOSA_CENTER.lat + 0.75}&lomin=${OOSA_CENTER.lon - 0.75}&lomax=${OOSA_CENTER.lon + 0.75}`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      if (data.states && data.states.length > 0) {
        const parsed = data.states.map((state: (string | number | boolean | null)[]) => ({
          icao24: state[0] as string,
          callsign: (state[1] as string)?.trim() || 'Unknown',
          lat: state[6] as number,
          lon: state[5] as number,
          altitude: Math.round(((state[7] as number) || 0) * 3.28084),
          speed: Math.round(((state[9] as number) || 0) * 1.94384),
          heading: Math.round((state[10] as number) || 0),
          verticalRate: Math.round(((state[11] as number) || 0) * 196.85),
          onGround: state[8] as boolean
        })).filter((a: Aircraft) => a.lat && a.lon);
        
        setAircraft(parsed);
        setApiStatus('live');
      } else {
        setAircraft([]);
        setApiStatus('live');
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('OpenSky fetch error:', err);
      setApiStatus('unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAircraft();
    const interval = setInterval(fetchAircraft, 30000);
    return () => clearInterval(interval);
  }, []);

  const highAlt = aircraft.filter(a => a.altitude > 25000);
  const lowAlt = aircraft.filter(a => a.altitude > 0 && a.altitude < 5000);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar className="w-6 h-6 text-[#0c9ce4]" />
            Live Flight Radar
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Real-time ADS-B tracking — powered by ADS-B Exchange
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
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open ADS-B Exchange */}
          <a
            href={ADSB_EMBED_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/50 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open Full Map</span>
          </a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
            <span className="text-sm text-white/50">Live Radar:</span>
            <span className="text-sm font-medium text-[#10b981]">ADS-B Exchange</span>
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
              <span className="text-sm text-[#f59e0b]">OpenSky stats unavailable — live radar unaffected</span>
            </div>
          )}
          
          <div className="ml-auto flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-white/40">
                Stats: {lastUpdate.toLocaleTimeString()}
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
        
        {/* Live Radar Embed */}
        {activeView === 'radar' && (
          <div className={`glass-card p-1 relative ${isFullscreen ? 'h-[80vh]' : 'h-[550px]'} ${!isFullscreen ? 'lg:col-span-2' : ''}`}>
            <iframe
              ref={iframeRef}
              src={ADSB_EMBED_URL}
              title="ADS-B Exchange Live Radar"
              className="w-full h-full rounded-lg"
              style={{ border: 'none', backgroundColor: '#101c22' }}
              allow="fullscreen"
              loading="lazy"
            />
            
            {/* Overlay Badge */}
            <div className="absolute top-3 left-3 z-10 glass-card px-3 py-1.5 flex items-center gap-2 pointer-events-none">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-xs text-white font-medium">LIVE — ADS-B Exchange</span>
            </div>

            {/* Airport Label */}
            <div className="absolute bottom-3 left-3 z-10 glass-card px-3 py-1.5 pointer-events-none">
              <span className="text-xs text-white/70">OOSA / SLL — Salalah International</span>
            </div>
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
                  <p>Fetching aircraft data...</p>
                </div>
              ) : apiStatus === 'unavailable' ? (
                <div className="text-center py-8 text-white/50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#f59e0b]" />
                  <p className="text-[#f59e0b]/70 mb-2">OpenSky API unavailable</p>
                  <p className="text-sm">Aircraft list requires OpenSky Network.</p>
                  <p className="text-sm mt-1">The live radar still works via ADS-B Exchange.</p>
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
                  <p>No aircraft reported in range</p>
                  <p className="text-sm mt-1">Check the live radar for real-time positions</p>
                </div>
              ) : (
                aircraft.map((ac) => (
                  <div
                    key={ac.icao24}
                    onClick={() => setSelectedAircraft(selectedAircraft?.icao24 === ac.icao24 ? null : ac)}
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
                        <span className="text-white/70 mono">{ac.altitude.toLocaleString()}ft</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-3 h-3 text-white/40" />
                        <span className="text-white/70 mono">{ac.speed}kts</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          backgroundColor: ac.altitude > 25000 ? '#0c9ce4' : ac.altitude > 10000 ? '#10b981' : '#f59e0b'
                        }}
                      ></div>
                      <span className="text-xs text-white/40">
                        {ac.onGround ? 'On Ground' : ac.verticalRate > 500 ? 'Climbing' : ac.verticalRate < -500 ? 'Descending' : 'Cruising'}
                      </span>
                    </div>

                    {/* Expanded Details */}
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
                  <span className="text-white/50">10-25k ft</span>
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
              <span className="text-white font-medium">Live radar</span> is powered by{' '}
              <a href="https://www.adsbexchange.com/" target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">
                ADS-B Exchange
              </a>
              , the world's largest co-op of unfiltered ADS-B flight data. Aircraft stats panel uses the{' '}
              <a href="https://opensky-network.org/" target="_blank" rel="noopener noreferrer" className="text-[#0c9ce4] hover:underline">
                OpenSky Network
              </a>{' '}
              API (may be rate-limited).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
