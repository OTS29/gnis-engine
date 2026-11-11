'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, api, card, dayText } from '../ui';
import { STATUS_LABEL, fmtMoney } from '@/lib/familyLabels';

function Jobs() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/family/bookings').then(setD); }, []);
  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  if (!d.ok) return <p className="mt-8 text-amber-400 text-sm">{d.error}</p>;
  if (!d.jobs.length) return <div className={`${card} mt-8 text-sm text-slate-300`}>No jobs yet. <Link href="/family/pros" className="underline text-green-400">Find a professional</Link> to make a request.</div>;
  return (
    <div className="mt-6 space-y-3">
      {d.jobs.map((j) => (
        <Link key={j.id} href={`/family/jobs/${j.id}`} className={`${card} block hover:border-slate-600`}>
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-bold">{j.service_name} for {j.recipient_name}</p>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-400">{STATUS_LABEL[j.status] || j.status}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{j.business} · {dayText(j.scheduled_date)} {j.scheduled_time} · {fmtMoney(j.price_local, j.local_currency)} · {j.as_pro && !j.as_sender ? 'You are the professional' : 'You booked'}{j.is_test ? ' · TEST' : ''}</p>
        </Link>
      ))}
    </div>
  );
}

export default function Page() { return <Shell title="My jobs">{() => <Jobs />}</Shell>; }
