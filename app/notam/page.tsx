import AppShell from "@/components/app-shell"
import NotamDecoder from "@/components/notam-decoder"

export const metadata = {
  title: "NOTAM Search & Decoder - OOSA Digital OPS",
  description: "Search active NOTAMs by ICAO station code and decode raw NOTAM text into plain English",
}

export default function NotamPage() {
  return (
    <AppShell>
      <NotamDecoder />
    </AppShell>
  )
}
