import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("gnis_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    let session: { userId: string };
    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const data = await sql`
      select id, client_id as "clientId", pro_profile_id as "proProfileId",
             service_id as "serviceId", date, start_time as "startTime",
             end_time as "endTime", status
      from bookings
      where client_id = ${session.userId}
      order by date desc`;

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("BOOKING_GET_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not load bookings" }, { status: 500 });
  }
}