import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const proProfileId = new URL(req.url).searchParams.get("proProfileId");
    if (!proProfileId) {
      return NextResponse.json({ ok: false, error: "Missing proProfileId" }, { status: 400 });
    }

    const data = await sql`
      select id, pro_profile_id as "proProfileId", day_of_week as "dayOfWeek",
             start_time as "startTime", end_time as "endTime"
      from availability where pro_profile_id = ${proProfileId}
      order by day_of_week, start_time`;

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("AVAILABILITY_GET_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load availability" }, { status: 500 });
  }
}