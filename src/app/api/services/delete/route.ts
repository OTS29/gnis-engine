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

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const rows = await sql`
      delete from services where id = ${id} and owner_id = ${session.userId} returning id`;

    if (!rows.length) return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("SERVICE_DELETE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Delete failed" }, { status: 500 });
  }
}