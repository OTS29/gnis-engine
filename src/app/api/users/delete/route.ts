import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await req.json();

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  return Response.json({ ok: !error, error });
}
