import Link from 'next/link';
import { diasporaMode } from '@/lib/diaspora';
import FamilyForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Book for family back home', description: 'Coming soon: book a trusted professional for family in Nigeria while you are abroad. Join the waiting list.' };

const STEPS = [
  ['Choose a professional', 'Browse verified hairdressers, barbers and cleaners in Nigeria.'],
  ['Book for your family member', 'Enter their name, phone number, area and the date you want.'],
  ['Pay from abroad', 'You pay in your own currency. The money is meant to stay with a payment provider until the job is done.'],
  ['Get proof', 'The professional takes photos inside the app, stamped with time, date and place.'],
  ['Your family member confirms', 'They receive a one-time code and give it to the professional only when they are happy.'],
];

export default function FamilyPage() {
  const mode = diasporaMode();
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <Link href="/" className="text-green-500 font-black italic text-2xl tracking-tighter">GNIS</Link>
        {mode !== 'off' && <p className="mt-6 text-xs bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-xl px-4 py-3">Test mode. For invited testers only. No real money is used.</p>}
        <p className="mt-8 text-green-500 font-black text-[10px] uppercase tracking-widest">Coming soon · Waiting list</p>
        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Book for family back home</h1>
        <p className="mt-5 text-slate-300 max-w-2xl">Living abroad and want a hairdresser, barber or cleaner for your mum, sister or friend in Nigeria? We are building a way to book and pay from where you are, with proof the job was done.</p>
        <p className="mt-3 text-sm text-amber-300">This is not open yet and we are not taking any payments. Joining the list is free and only means we will email you when it is ready.</p>

        {mode !== 'off' && (
          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            <Link href="/family/pros" className="bg-green-600 hover:bg-green-500 rounded-2xl px-4 py-4 text-center font-black text-[10px] uppercase tracking-widest">Find a professional</Link>
            <Link href="/family/jobs" className="border border-slate-700 hover:border-slate-500 rounded-2xl px-4 py-4 text-center font-black text-[10px] uppercase tracking-widest">My jobs</Link>
            <Link href="/family/pro" className="border border-slate-700 hover:border-slate-500 rounded-2xl px-4 py-4 text-center font-black text-[10px] uppercase tracking-widest">I am a professional</Link>
          </div>
        )}

        <h2 className="mt-12 text-xl font-black uppercase italic tracking-tight">How it is planned to work</h2>
        <ol className="mt-4 space-y-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-green-600 text-white font-black text-sm flex items-center justify-center">{i + 1}</span>
              <span><b className="block">{t}</b><span className="text-sm text-slate-400">{d}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">These are plans, not promises yet. The protections that apply will be set out in our terms before anything opens. Services are provided by independent professionals. GNIS connects you but does not provide the service.</p>

        <h2 className="mt-12 text-xl font-black uppercase italic tracking-tight">Join the waiting list</h2>
        <FamilyForm />
        <p className="mt-10 text-[11px] text-slate-500">Read our <Link href="/privacy" className="underline">privacy policy</Link>. You can ask to be removed from the list at any time.</p>
      </div>
    </main>
  );
}
