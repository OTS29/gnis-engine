'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PRESETS, simulate } from '@/lib/simulator';

const CURRENCIES = { GBP: '£', EUR: '€', USD: '$', NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' };

export default function SimulatorPage() {
  const [cur, setCur] = useState('GBP');
  const [kind, setKind] = useState('salon');
  const [f, setF] = useState({ ...PRESETS.salon, budget: 10000, taxPct: 0 });
  const sym = CURRENCIES[cur];
  const r = useMemo(() => simulate(f), [f]);
  const fmt = (n) => `${n < 0 ? '-' : ''}${sym}${Math.abs(Math.round(n)).toLocaleString('en-GB')}`;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const pick = (k) => { setKind(k); const p = PRESETS[k]; setF((x) => ({ ...x, startup: p.startup, fixed: p.fixed, price: p.price, perWeek: p.perWeek, varPct: p.varPct, ramp: p.ramp })); };

  // chart of cash in the bank over 24 months
  const W = 640, H = 220, pad = 36;
  const ys = r.rows.map((x) => x.cash).concat([f.budget - f.startup, 0]);
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = (m) => pad + ((m - 1) / 23) * (W - pad * 2);
  const Y = (v) => H - pad - ((v - lo) / span) * (H - pad * 2);
  const path = r.rows.map((x, i) => `${i ? 'L' : 'M'}${X(x.m).toFixed(1)},${Y(x.cash).toFixed(1)}`).join(' ');

  const Field = ({ label, k, prefix, suffix, hint }) => (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="mt-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-green-500/40">
        {prefix && <span className="pl-3 text-slate-400 text-sm">{prefix}</span>}
        <input type="number" inputMode="decimal" min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none" />
        {suffix && <span className="pr-3 text-slate-400 text-sm">{suffix}</span>}
      </div>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  );

  const bad = r.extraNeeded > 0 || r.neverBreaksEven;
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-10">
        <Link href="/" className="text-green-500 font-black italic text-2xl tracking-tighter">GNIS</Link>
        <p className="mt-8 text-green-500 font-black text-[10px] uppercase tracking-widest">Free tool</p>
        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Business simulator</h1>
        <p className="mt-4 text-slate-400 max-w-2xl text-sm">Type in your own numbers and see your monthly profit, when you break even, and whether your starting money lasts. It is simple arithmetic on what you enter, not a prediction. Replace the starting numbers with real quotes.</p>

        <div className="mt-8 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business type</span>
                <select value={kind} onChange={(e) => pick(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm">{Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</span>
                <select value={cur} onChange={(e) => setCur(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm">{Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            {cur !== 'GBP' && <p className="text-[11px] text-amber-400">The starting numbers are rough UK pounds figures. Replace every number with your own prices in {cur}.</p>}
            <Field label="Money you have to start" k="budget" prefix={sym} />
            <Field label="Start-up cost (equipment, deposit, fit-out)" k="startup" prefix={sym} />
            <Field label="Fixed costs per month (rent, wages, insurance, software)" k="fixed" prefix={sym} />
            <Field label="Average price per customer" k="price" prefix={sym} />
            <Field label="Customers per week when busy" k="perWeek" />
            <Field label="Supplies and card fees" k="varPct" suffix="% of sales" />
            <Field label="Months to get busy" k="ramp" hint="You start at 30% busy and grow to full." />
            <Field label="Tax on profit (optional)" k="taxPct" suffix="%" hint="Ask an accountant. Leave 0 to ignore tax." />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className={`rounded-2xl border p-5 ${bad ? 'border-amber-500/40 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">What this says</p>
              <p className="mt-2 text-lg font-bold">
                {r.neverBreaksEven ? 'With these numbers the business does not cover its costs in 24 months.' : `You cover your monthly costs from month ${r.breakeven}.`}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {r.extraNeeded > 0 ? `Your money runs out. You would need about ${fmt(r.extraNeeded)} more in reserve to get through month ${r.lowestMonth}.` : `Your lowest bank balance is ${fmt(r.lowestCash)} (month ${r.lowestMonth || 'start'}).`}
                {r.payback ? ` You earn back your start-up cost by month ${r.payback}.` : ' You do not earn back the start-up cost in 24 months.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['Month 12 profit', fmt(r.month12.net)], ['Month 24 profit', fmt(r.month24.net)], ['Break even', r.breakevenPerWeek === null ? 'n/a' : `${Math.ceil(r.breakevenPerWeek)} customers/week`], ['Month 12 sales', fmt(r.month12.revenue)]].map(([a, b]) => (
                <div key={a} className="bg-slate-900 border border-slate-800 rounded-xl p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{a}</p><p className="mt-1 text-lg font-black">{b}</p></div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Money in the bank, 24 months</p>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Money in the bank over 24 months">
                <line x1={pad} x2={W - pad} y1={Y(0)} y2={Y(0)} stroke="#475569" strokeDasharray="4 4" />
                <text x={pad} y={Y(0) - 4} fontSize="10" fill="#94a3b8">{sym}0</text>
                <path d={path} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinejoin="round" />
                {[1, 6, 12, 18, 24].map((m) => <text key={m} x={X(m)} y={H - 10} fontSize="10" fill="#94a3b8" textAnchor="middle">M{m}</text>)}
                <text x={W - pad} y={Y(r.month24.cash) - 8} fontSize="11" fill="#22c55e" textAnchor="end">{fmt(r.month24.cash)}</text>
              </svg>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead><tr className="text-left text-[10px] uppercase tracking-widest text-slate-400"><th className="p-3">Month</th><th className="p-3">Busy</th><th className="p-3">Sales</th><th className="p-3">Costs</th><th className="p-3">Profit</th><th className="p-3">Bank</th></tr></thead>
                <tbody>{r.rows.filter((x) => [1, 2, 3, 6, 9, 12, 18, 24].includes(x.m)).map((x) => (
                  <tr key={x.m} className="border-t border-slate-800"><td className="p-3">{x.m}</td><td className="p-3">{Math.round(x.occ * 100)}%</td><td className="p-3">{fmt(x.revenue)}</td><td className="p-3">{fmt(x.variable + x.fixed)}</td><td className={`p-3 font-bold ${x.net < 0 ? 'text-red-400' : 'text-green-400'}`}>{fmt(x.net)}</td><td className={`p-3 ${x.cash < 0 ? 'text-red-400' : ''}`}>{fmt(x.cash)}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">Estimates from the numbers above. It ignores seasons, wages for yourself, VAT, loan repayments and one-off costs. Check the numbers with an accountant before you commit money.</p>
            <div className="flex flex-wrap gap-3"><Link href="/" className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-500 transition">Build your website with GNIS</Link></div>
          </div>
        </div>
      </div>
    </main>
  );
}
