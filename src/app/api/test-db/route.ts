import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('ping');

    if (error) {
      return Response.json({
        ok: false,
        message: "Database connection failed",
        error: String(error)
      });
    }

    return Response.json({
      ok: true,
      message: "Database connected successfully!",
      result: data
    });

  } catch (error) {
    return Response.json({
      ok: false,
      message: "Database connection failed",
      error: String(error)
    });
  }
}
