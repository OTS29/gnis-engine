"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { id } = await req.json();

  const { error } = await supabase
    .from("pro_profiles")
    .delete()
    .eq("id", id);

  return NextResponse.json({ ok: !error, error });
}
