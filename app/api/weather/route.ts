import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station") || "OOSA"
  const type = request.nextUrl.searchParams.get("type") || "metar"

  const baseUrl = "https://aviationweather.gov/api/data"
  const url =
    type === "taf"
      ? `${baseUrl}/taf?ids=${encodeURIComponent(station)}&format=json&time=valid`
      : `${baseUrl}/metar?ids=${encodeURIComponent(station)}&format=json&hours=3`

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "Aviation weather API unavailable", status: res.status },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    )
  }
}
