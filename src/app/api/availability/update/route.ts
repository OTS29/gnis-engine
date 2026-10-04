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

    const { id, dayOfWeek, startTime, endTime } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const [data] = await sql`
      update availability set
        day_of_week = coalesce(${dayOfWeek != null ? String(dayOfWeek) : null}, day_of_week),
        start_time = coalesce(${startTime ?? null}, start_time),
        end_time = coalesce(${endTime ?? null}, end_time)
      where id = ${id} and pro_profile_id = ${session.userId}
      returning id, pro_profile_id as "proProfileId", day_of_week as "dayOfWeek",
                start_time as "startTime", end_time as "endTime"`;

    if (!data) return NextResponse.json({ ok: false, error: "Slot not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("AVAILABILITY_UPDATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}