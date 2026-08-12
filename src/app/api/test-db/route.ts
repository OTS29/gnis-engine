"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.rpc("ping");

    if (error) {
      return NextResponse.json({
        ok: false,
        message: "Database connection failed",
        error: String(error)
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Database connected successfully!",
      result: data
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: "Database connection failed",
      error: String(error)
    });
  }
}
