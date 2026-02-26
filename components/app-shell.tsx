"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Plane,
  Cloud,
  Radar,
  FileText,
  AlertTriangle,
  Home,
  Clock,
  Menu,
  X,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/weather", label: "Weather", icon: Cloud },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/fpl", label: "Flight Plan", icon: FileText },
  { href: "/notam", label: "NOTAM", icon: AlertTriangle },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [utcTime, setUtcTime] = useState("")
  const [gstTime, setGstTime] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setUtcTime(
        now.toISOString().substring(11, 16) + "Z"
      )
      setGstTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Muscat",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }) + "+04"
      )
    }
    update()
    const id = setInterval(update, 1000)
    const timer = setTimeout(() => setIsLoading(false), 1200)
    return () => {
      clearInterval(id)
      clearTimeout(timer)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-av-dark flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-av-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-av-primary border-t-transparent animate-spin" />
            <Plane className="absolute inset-0 m-auto w-8 h-8 text-av-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            OOSA Digital OPS
          </h1>
          <p className="text-white/50 font-mono text-sm">
            Initializing Flight Operations Center...
          </p>
          <div className="mt-4 flex justify-center gap-1">
            <span className="w-2 h-2 bg-av-primary rounded-full animate-bounce" />
            <span
              className="w-2 h-2 bg-av-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <span
              className="w-2 h-2 bg-av-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-av-dark flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-av-primary/20 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-av-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-av-success rounded-full border-2 border-av-dark" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  OOSA Digital OPS
                </h1>
                <p className="text-xs text-white/50">
                  Salalah International Airport
                </p>
              </div>
            </Link>

            {/* Desktop Time Display */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-av-primary" />
                <div className="text-right">
                  <p className="text-xs text-white/50">UTC</p>
                  <p className="text-lg font-bold text-white font-mono">
                    {utcTime}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-xs text-white/50">GST</p>
                <p className="text-lg font-bold text-white font-mono">
                  {gstTime}
                </p>
              </div>
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-t border-white/10">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === item.href
                      ? "bg-av-primary/20 text-av-primary"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-av-primary" />
                    <span className="text-sm text-white/50">UTC</span>
                  </div>
                  <span className="text-lg font-bold text-white font-mono">
                    {utcTime}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 mt-2">
                  <span className="text-sm text-white/50">GST</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {gstTime}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Desktop Bottom Navigation */}
      <nav className="hidden md:block glass-panel border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-av-primary/20 text-av-primary"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden glass-panel border-t border-white/10 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                pathname === item.href
                  ? "text-av-primary"
                  : "text-white/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="md:hidden h-20" />

      {/* Footer */}
      <footer className="glass-panel border-t border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/40">
              NOT FOR OPERATIONAL USE - FOR DEMONSTRATION PURPOSES ONLY
            </p>
            <p className="text-xs text-white/50">
              Developed by{" "}
              <span className="text-av-primary font-medium">
                Tariq Al Amri
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
