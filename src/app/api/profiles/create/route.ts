import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const {
    userId,
    primarySkill,
    baseRate,
    operatingRadius,
    addressVector,
    isAutonomous
  } = await req.json();

  const { data, error } = await supabase
    .from("pro_profiles")
    .insert({
      userId,
      primarySkill: primarySkill ?? "General Provider",
      baseRate: baseRate ?? "£25",
      operatingRadius: operatingRadius ?? "UNKNOWN",
      addressVector: addressVector ?? "Not Specified",
      isAutonomous: isAutonomous ?? true
    })
    .select()
    .single();

  return Response.json({ ok: !error, data, error });
}
