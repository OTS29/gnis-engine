'use client';
import Link from 'next/link';

export default function CustomerPortal() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="flex justify-between items-center mb-12 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">GNIS Consumer Hub</h1>
        <Link href="/" className="text-sm text-slate-600 hover:underline">Sign Out</Link>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold mb-2">Your Appointments</h2>
          <p className="text-slate-500 text-sm mb-6">View and manage your upcoming locked time slots.</p>
          
          {/* Simple placeholder table or list for client appointments */}
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            No upcoming bookings found.
          </div>
        </div>
      </main>
    </div>
  );
}