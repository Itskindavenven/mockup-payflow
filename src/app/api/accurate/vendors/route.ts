import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchVendors } from "@/lib/accurate-api";
import { accurateMasterDataStore } from "@/lib/accurate-master-data-store";
import { resolveAccurateDbId } from "@/lib/db-alias";

// Baca dari cache lokal (cepat) — kalau belum pernah di-sync (cache kosong),
// fallback ke live fetch supaya app tetap jalan sebelum sync pertama, tapi
// hasil live itu nggak ditulis ke cache di sini (biar "terakhir sync" cuma
// berubah lewat tombol Sync yang eksplisit, bukan diam-diam).
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const cached = await accurateMasterDataStore.listVendors(dbId);
    if (cached.length > 0) return NextResponse.json(cached);
    const data = await fetchVendors(session.id, dbId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
