import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("gnis_session")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    let session: { userId: string };
    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const { id, name, description, price, durationMinutes } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const [data] = await sql`
      update services set
        name = coalesce(${name ?? null}, name),
        description = coalesce(${description ?? null}, description),
        price = coalesce(${price != null ? Number(price) : null}, price),
        duration_minutes = coalesce(${durationMinutes != null ? Number(durationMinutes) : null}, duration_minutes)
      where id = ${id} and owner_id = ${session.userId}
      returning id, owner_id as "ownerId", name, description, price,
                duration_minutes as "durationMinutes"`;

    if (!data) return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("SERVICE_UPDATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}