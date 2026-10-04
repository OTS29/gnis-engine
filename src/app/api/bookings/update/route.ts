import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
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

    const { id, date, startTime, endTime, status } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing booking id" }, { status: 400 });
    }

    const [booking] = await sql`
      update bookings set
        date = coalesce(${date ?? null}, date),
        start_time = coalesce(${startTime ?? null}, start_time),
        end_time = coalesce(${endTime ?? null}, end_time),
        status = coalesce(${status ?? null}, status)
      where id = ${id} and client_id = ${session.userId}
      returning id, date, start_time as "startTime", end_time as "endTime", status`;

    if (!booking) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: booking });
  } catch (e) {
    console.error("BOOKING_UPDATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}