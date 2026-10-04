import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const [data] = await sql`
      select id, user_id as "userId", primary_skill as "primarySkill", base_rate as "baseRate",
             operating_radius as "operatingRadius", address_vector as "addressVector",
             is_autonomous as "isAutonomous"
      from pro_profiles where id = ${id}`;

    if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("PROFILE_GET_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load profile" }, { status: 500 });
  }
}