import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OOSA Digital OPS - Aeronautical Information Dashboard",
  description:
    "Flight operations dashboard for Salalah International Airport (OOSA/SLL) — live radar, weather, flight plan validation, and NOTAM decoding for AIS officers.",
}

export const viewport: Viewport = {
  themeColor: "#101c22",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-av-dark text-white antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
