import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await sql`
      select id, user_id as "userId", primary_skill as "primarySkill", base_rate as "baseRate",
             operating_radius as "operatingRadius", address_vector as "addressVector",
             is_autonomous as "isAutonomous"
      from pro_profiles order by created_at desc`;

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("PROFILE_GET_ALL_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load profiles" }, { status: 500 });
  }
}