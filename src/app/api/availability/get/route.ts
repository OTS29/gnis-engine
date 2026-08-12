import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const proProfileId = searchParams.get("proProfileId");

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("proProfileId", proProfileId);

  return Response.json({ ok: !error, data, error });
}
