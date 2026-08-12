"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const {
    clientId,
    proProfileId,
    serviceId,
    date,
    startTime,
    endTime
  } = await req.json();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      clientId,
      proProfileId,
      serviceId,
      date,
      startTime,
      endTime,
      status: "PENDING"
    })
    .select()
    .single();

  return NextResponse.json({ ok: !error, data, error });
}
