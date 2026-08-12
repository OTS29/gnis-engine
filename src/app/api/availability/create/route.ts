import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { proProfileId, dayOfWeek, startTime, endTime } = await req.json();

  const { data, error } = await supabase
    .from("availability")
    .insert({
      proProfileId,
      dayOfWeek,
      startTime,
      endTime
    })
    .select()
    .single();

  return Response.json({ ok: !error, data, error });
}
