"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { id, dayOfWeek, startTime, endTime } = await req.json();

  const { data, error } = await supabase
    .from("availability")
    .update({
      dayOfWeek,
      startTime,
      endTime
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ ok: !error, data, error });
}
