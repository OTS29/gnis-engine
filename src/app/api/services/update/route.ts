"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { id, ...rest } = await req.json();

  const { data, error } = await supabase
    .from("services")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ ok: !error, data, error });
}
