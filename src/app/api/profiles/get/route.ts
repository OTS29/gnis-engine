"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const { data, error } = await supabase
    .from("pro_profiles")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json({ ok: !error, data, error });
}
