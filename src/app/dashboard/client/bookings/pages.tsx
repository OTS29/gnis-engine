import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

export default async function ClientBookings() {
  const token = (await cookies()).get("gnis_session")?.value;

  let userId: string | null = null;
  if (token) {
    try {
      userId = (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId;
    } catch {
      userId = null;
    }
  }
  if (!userId) redirect("/");

  const bookings = await sql`
    select id, date, start_time as "startTime", end_time as "endTime", status
    from bookings
    where client_id = ${userId}
    order by date desc`;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">My Bookings</h1>

      <div className="space-y-4">
        {bookings.length === 0 && <p>No bookings yet.</p>}
        {bookings.map((booking: any) => (
          <div key={booking.id} className="p-4 bg-gray-100 rounded">
            <p>Date: {String(booking.date).slice(0, 10)}</p>
            <p>Time: {booking.startTime} - {booking.endTime}</p>
            <p>Status: {booking.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}