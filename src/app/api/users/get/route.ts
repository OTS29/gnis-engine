import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("gnis_session")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    let session: { userId: string };
    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const [user] = await sql`
      select id, email, name, role, region, skill, rate, address, postcode,
             pro_profile as "proProfile", created_at as "createdAt"
      from users where id = ${session.userId}`;

    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: user });
  } catch (e) {
    console.error("USER_GET_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load user" }, { status: 500 });
  }
}