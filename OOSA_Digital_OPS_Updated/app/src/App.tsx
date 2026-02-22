import { useState, useEffect } from 'react';
import { 
  Plane, 
  Cloud, 
  FileText, 
  AlertTriangle, 
  Home, 
  Radar, 
  Clock,
  Menu,
  X
} from 'lucide-react';
import './App.css';

// Import modules
import Dashboard from './sections/Dashboard';
import FlightRadar from './sections/FlightRadar';
import WeatherStation from './sections/WeatherStation';
import FlightPlanValidator from './sections/FlightPlanValidator';
import NotamDecoder from './sections/NotamDecoder';

export type ModuleType = 'dashboard' | 'radar' | 'weather' | 'fpl' | 'notam';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [utcTime, setUtcTime] = useState('');
  const [gstTime, setGstTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substr(11, 5) + 'Z');
      setGstTime(now.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Muscat', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }) + '+04');
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // Simulate boot sequence
    setTimeout(() => setIsLoading(false), 1500);
    
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: ModuleType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'radar', label: 'Radar', icon: Radar },
    { id: 'fpl', label: 'Flight Plan', icon: FileText },
    { id: 'notam', label: 'NOTAM', icon: AlertTriangle },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'radar':
        return <FlightRadar />;
      case 'weather':
        return <WeatherStation />;
      case 'fpl':
        return <FlightPlanValidator />;
      case 'notam':
        return <NotamDecoder />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#101c22] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#0c9ce4]/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-[#0c9ce4] border-t-transparent animate-spin"></div>
            <Plane className="absolute inset-0 m-auto w-8 h-8 text-[#0c9ce4]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">OOSA Digital OPS</h1>
          <p className="text-white/50 mono text-sm">Initializing Flight Operations Center...</p>
          <div className="mt-4 flex justify-center gap-1">
            <span className="w-2 h-2 bg-[#0c9ce4] rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-[#0c9ce4] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-2 h-2 bg-[#0c9ce4] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101c22] flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-[#0c9ce4]/20 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-[#0c9ce4]" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10b981] rounded-full border-2 border-[#101c22]"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">OOSA Digital OPS</h1>
                <p className="text-xs text-white/50">Salalah International Airport</p>
              </div>
            </div>

            {/* Desktop Time Display */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0c9ce4]" />
                <div className="text-right">
                  <p className="text-xs text-white/50">UTC</p>
                  <p className="text-lg font-bold text-white mono">{utcTime}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="text-right">
                <p className="text-xs text-white/50">GST</p>
                <p className="text-lg font-bold text-white mono">{gstTime}</p>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-t border-white/10">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeModule === item.id 
                      ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0c9ce4]" />
                    <span className="text-sm text-white/50">UTC</span>
                  </div>
                  <span className="text-lg font-bold text-white mono">{utcTime}</span>
                </div>
                <div className="flex items-center justify-between px-4 mt-2">
                  <span className="text-sm text-white/50">GST</span>
                  <span className="text-lg font-bold text-white mono">{gstTime}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderModule()}
        </div>
      </main>

      {/* Bottom Navigation (Desktop) */}
      <nav className="hidden md:block glass-panel border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                  activeModule === item.id 
                    ? 'bg-[#0c9ce4]/20 text-[#0c9ce4]' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden glass-panel border-t border-white/10 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeModule === item.id 
                  ? 'text-[#0c9ce4]' 
                  : 'text-white/50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile padding for bottom nav */}
      <div className="md:hidden h-20"></div>

      {/* Developer Credit */}
      <footer className="glass-panel border-t border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/40">
              NOT FOR OPERATIONAL USE • FOR DEMONSTRATION PURPOSES ONLY
            </p>
            <p className="text-xs text-white/50">
              Developed by <span className="text-[#0c9ce4] font-medium">Tariq Al Amri</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
