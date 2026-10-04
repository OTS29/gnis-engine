import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ownerId = searchParams.get("ownerId");

    if (id) {
      const [data] = await sql`
        select id, owner_id as "ownerId", name, description, price,
               duration_minutes as "durationMinutes"
        from services where id = ${id}`;
      if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, data });
    }

    if (ownerId) {
      const data = await sql`
        select id, owner_id as "ownerId", name, description, price,
               duration_minutes as "durationMinutes"
        from services where owner_id = ${ownerId} order by created_at desc`;
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: "Provide id or ownerId" }, { status: 400 });
  } catch (e) {
    console.error("SERVICE_GET_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load service" }, { status: 500 });
  }
}