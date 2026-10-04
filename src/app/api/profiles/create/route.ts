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

    const { primarySkill, baseRate, operatingRadius, addressVector, isAutonomous } = await req.json();

    const [data] = await sql`
      insert into pro_profiles (user_id, primary_skill, base_rate, operating_radius, address_vector, is_autonomous)
      values (${session.userId},
              ${primarySkill ?? "General Provider"},
              ${baseRate ?? "£25"},
              ${operatingRadius ?? "UNKNOWN"},
              ${addressVector ?? "Not Specified"},
              ${isAutonomous ?? true})
      on conflict (user_id) do nothing
      returning id, user_id as "userId", primary_skill as "primarySkill", base_rate as "baseRate",
                operating_radius as "operatingRadius", address_vector as "addressVector",
                is_autonomous as "isAutonomous"`;

    if (!data) return NextResponse.json({ ok: false, error: "Profile already exists" }, { status: 409 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e) {
    console.error("PROFILE_CREATE_FAULT:", e);
    return NextResponse.json({ ok: false, error: "Could not create profile" }, { status: 500 });
  }
}