"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const proProfileId = searchParams.get("proProfileId");

  let query = supabase.from("bookings").select("*");

  if (clientId) query = query.eq("clientId", clientId);
  if (proProfileId) query = query.eq("proProfileId", proProfileId);

  const { data, error } = await query;

  return NextResponse.json({ ok: !error, data, error });
}
