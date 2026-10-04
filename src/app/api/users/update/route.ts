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

    const { name, region, skill, rate, address, postcode } = await req.json();

    const [user] = await sql`
      update users set
        name = coalesce(${name ?? null}, name),
        region = coalesce(${region ?? null}, region),
        skill = coalesce(${skill ?? null}, skill),
        rate = coalesce(${rate ?? null}, rate),
        address = coalesce(${address ?? null}, address),
        postcode = coalesce(${postcode ?? null}, postcode)
      where id = ${session.userId}
      returning id, email, name, role, region, skill, rate, address, postcode`;

    return NextResponse.json({ ok: true, data: user });
  } catch (e) {
    console.error("USER_UPDATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}