import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Identify the logged-in user from the session cookie
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

    const { proProfileId, serviceId, date, startTime, endTime } = await req.json();

    if (!proProfileId || !serviceId || !date || !startTime || !endTime) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const [booking] = await sql`
      insert into bookings (client_id, pro_profile_id, service_id, date, start_time, end_time, status)
      values (${session.userId}, ${proProfileId}, ${serviceId}, ${date}, ${startTime}, ${endTime}, 'PENDING')
      returning id, client_id as "clientId", pro_profile_id as "proProfileId",
                service_id as "serviceId", date, start_time as "startTime",
                end_time as "endTime", status`;

    return NextResponse.json({ ok: true, data: booking }, { status: 201 });
  } catch (e) {
    console.error("BOOKING_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Booking failed" }, { status: 500 });
  }
}