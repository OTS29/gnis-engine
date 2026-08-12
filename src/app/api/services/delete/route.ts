import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { id } = await req.json();

  const { error } = await supabase
    .from("service_nodes")
    .delete()
    .eq("id", id);

  return Response.json({ ok: !error, error });
}
