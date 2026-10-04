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

    const { dayOfWeek, startTime, endTime } = await req.json();
    if (dayOfWeek == null || !startTime || !endTime) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const [data] = await sql`
      insert into availability (pro_profile_id, day_of_week, start_time, end_time)
      values (${session.userId}, ${String(dayOfWeek)}, ${startTime}, ${endTime})
      returning id, pro_profile_id as "proProfileId", day_of_week as "dayOfWeek",
                start_time as "startTime", end_time as "endTime"`;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e) {
    console.error("AVAILABILITY_CREATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not create slot" }, { status: 500 });
  }
}