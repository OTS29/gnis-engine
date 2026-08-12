import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, name, role } = await req.json();

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      passwordHash,
      name,
      role: role ?? "CLIENT"
    })
    .select()
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message });
  }

  return Response.json({ ok: true, user: data });
}
