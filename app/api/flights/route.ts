import { NextRequest, NextResponse } from "next/server"

const OOSA = { lat: 17.0389, lon: 54.0914 }

export async function GET(request: NextRequest) {
  const range = parseFloat(request.nextUrl.searchParams.get("range") || "1.5")
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") || String(OOSA.lat))
  const lon = parseFloat(request.nextUrl.searchParams.get("lon") || String(OOSA.lon))

  const url = `https://opensky-network.org/api/states/all?lamin=${lat - range}&lamax=${lat + range}&lomin=${lon - range}&lomax=${lon + range}`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 15 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "OpenSky Network unavailable", status: res.status },
        { status: 502 }
      )
    }

    const data = await res.json()
    const aircraft = (data.states ?? [])
      .map((s: (string | number | boolean | null)[]) => ({
        icao24: s[0] as string,
        callsign: ((s[1] as string) || "").trim() || "Unknown",
        lat: s[6] as number,
        lon: s[5] as number,
        altitude: Math.round(((s[7] as number) || 0) * 3.28084),
        speed: Math.round(((s[9] as number) || 0) * 1.94384),
        heading: Math.round((s[10] as number) || 0),
        verticalRate: Math.round(((s[11] as number) || 0) * 196.85),
        onGround: s[8] as boolean,
      }))
      .filter((a: { lat: number; lon: number }) => a.lat && a.lon)

    return NextResponse.json({ aircraft, time: data.time })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch flight data" },
      { status: 500 }
    )
  }
}
