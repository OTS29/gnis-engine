import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("pro_profiles")
    .select("*");

  return Response.json({ ok: !error, data, error });
}
