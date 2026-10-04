import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("gnis_session")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    let session: { userId: string };
    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const { name, description, price, durationMinutes } = await req.json();
    if (!name) return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });

    const [data] = await sql`
      insert into services (owner_id, name, description, price, duration_minutes)
      values (${session.userId}, ${name}, ${description ?? null},
              ${Number(price) || 0}, ${Number(durationMinutes) || 30})
      returning id, owner_id as "ownerId", name, description, price,
                duration_minutes as "durationMinutes"`;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e) {
    console.error("SERVICE_CREATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not create service" }, { status: 500 });
  }
}