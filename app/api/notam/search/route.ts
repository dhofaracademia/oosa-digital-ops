import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const icao = request.nextUrl.searchParams.get("icao")

  if (!icao || !/^[A-Z]{4}$/i.test(icao)) {
    return NextResponse.json(
      { error: "Invalid ICAO code. Must be exactly 4 letters." },
      { status: 400 }
    )
  }

  const apiKey = process.env.AVWX_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "AVWX_API_KEY not configured",
        message:
          "To enable NOTAM search, add your free AVWX API token as the AVWX_API_KEY environment variable. Get one at https://avwx.rest",
      },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://avwx.rest/api/notam/${icao.toUpperCase()}`,
      {
        headers: {
          Authorization: `BEARER ${apiKey}`,
          Accept: "application/json",
        },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: "AVWX API error", status: res.status, detail: text },
        { status: 502 }
      )
    }

    const data = await res.json()

    // AVWX returns an array of NOTAMs at root level
    if (Array.isArray(data)) {
      return NextResponse.json({
        notams: data.map((n: Record<string, unknown>) => ({
          raw: n.raw || n.text || n.body || "",
          ...n,
        })),
      })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch NOTAM data" },
      { status: 500 }
    )
  }
}
