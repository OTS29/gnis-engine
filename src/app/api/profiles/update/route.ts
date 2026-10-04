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

    const { id, primarySkill, baseRate, operatingRadius, addressVector, isAutonomous } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const [data] = await sql`
      update pro_profiles set
        primary_skill = coalesce(${primarySkill ?? null}, primary_skill),
        base_rate = coalesce(${baseRate ?? null}, base_rate),
        operating_radius = coalesce(${operatingRadius ?? null}, operating_radius),
        address_vector = coalesce(${addressVector ?? null}, address_vector),
        is_autonomous = coalesce(${isAutonomous ?? null}, is_autonomous)
      where id = ${id} and user_id = ${session.userId}
      returning id, user_id as "userId", primary_skill as "primarySkill", base_rate as "baseRate",
                operating_radius as "operatingRadius", address_vector as "addressVector",
                is_autonomous as "isAutonomous"`;

    if (!data) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("PROFILE_UPDATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}