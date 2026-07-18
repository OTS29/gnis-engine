export default function ClientDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Client Dashboard</h1>

      <div className="mt-6 space-y-4">
        <a href="/dashboard/client/browse" className="block p-4 bg-gray-100 rounded">
          Browse Providers
        </a>

        <a href="/dashboard/client/bookings" className="block p-4 bg-gray-100 rounded">
          My Bookings
        </a>
      </div>
    </div>
  );
}
