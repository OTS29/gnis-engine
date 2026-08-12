"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("services")
    .insert(body)
    .select()
    .single();

  return NextResponse.json({ ok: !error, data, error });
}
