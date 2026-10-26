'use client';
import { useState } from 'react';
import Link from 'next/link';

const TOOLS = [
  { id: 'website', name: 'AI Website Writer', blurb: 'Describe your business. Get a full website draft.' },
  { id: 'plan', name: 'Launch Plan', blurb: 'A simple step-by-step plan to open.' },
  { id: 'opportunity', name: 'Idea Check', blurb: 'Test an idea for your area with your own facts.' },
  { id: 'manager', name: 'Business Manager', blurb: 'Ask questions about your own numbers.' },
  { id: 'document', name: 'Document Reader', blurb: 'Read a PDF, CSV or text file and answer questions.' },
];

async function call(body) {
  const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: false, error: 'Something went wrong.' }));
}

const inp = 'w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-green-500/40';
const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-1';
const btn = 'mt-5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition';

function Out({ text }) {
  return text ? <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap">{text}</div> : null;
}

export default function AIStudio() {
  const [tool, setTool] = useState('website');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [out, setOut] = useState('');
  const [draft, setDraft] = useState(null);
  const [f, setF] = useState({ currency: 'GBP' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const run = async (body, after) => {
    setBusy(true); setErr(''); setOut(''); setDraft(null);
    const j = await call(body);
    setBusy(false);
    if (!j.ok) { setErr(j.error || 'Something went wrong.'); return; }
    after(j);
  };

  const readFile = (file) => new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = rej;
    fr.onload = () => res(fr.result);
    file.type === 'application/pdf' ? fr.readAsDataURL(file) : fr.readAsText(file);
  });

  const doc = async () => {
    const file = f.file;
    if (!file) { setErr('Choose a file first.'); return; }
    if (file.size > 3 * 1024 * 1024) { setErr('Keep the file under 3 MB.'); return; }
    if (/\.(xlsx|xls)$/i.test(file.name)) { setErr('In Excel choose Save As, then CSV, and upload that file.'); return; }
    const content = await readFile(file);
    const isPdf = file.type === 'application/pdf';
    run({ tool: 'document', name: file.name, question: f.question, ...(isPdf ? { pdf: content } : { text: content }) }, (j) => setOut(j.text));
  };

  const apply = async () => {
    setBusy(true); setErr('');
    const a = await call({ tool: 'apply', draft });
    if (!a.ok) { setBusy(false); setErr(a.error); return; }
    const r = await fetch('/api/site', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ template: a.template, data: a.data }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) { setErr(j.error || 'Could not save.'); return; }
    setOut('Done. Your text, services and FAQs are saved. Your photos and payment settings were not touched. Open the Dashboard to add photos and check prices.');
    setDraft(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <div className="flex items-center justify-between"><Link href="/" className="text-green-500 font-black italic text-2xl tracking-tighter">GNIS</Link><Link href="/dashboard" className="text-xs text-slate-400 underline">Dashboard</Link></div>
        <p className="mt-8 text-green-500 font-black text-[10px] uppercase tracking-widest">Log in required</p>
        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">AI Studio</h1>
        <p className="mt-4 text-slate-400 text-sm max-w-xl">AI helpers for your business. They only use what you type or what is in your own account. They do not have market data and they will say so. Free accounts get 5 requests a day, Professional gets 40.</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {TOOLS.map((t) => <button key={t.id} onClick={() => { setTool(t.id); setErr(''); setOut(''); setDraft(null); }} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border ${tool === t.id ? 'bg-green-600 border-green-600' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>{t.name}</button>)}
        </div>
        <p className="text-slate-400 text-sm mt-3">{TOOLS.find((t) => t.id === tool).blurb}</p>

        {tool === 'website' && <div>
          <label className={lbl}>Describe your business</label>
          <textarea rows={5} className={inp} placeholder="Example: I do mobile braids and natural hair styling in Lewisham. I come to your home. Weekdays after 5pm and weekends." onChange={set('description')} />
          <label className={lbl}>Location</label><input className={inp} onChange={set('location')} placeholder="e.g. Lewisham, London" />
          <button disabled={busy} className={btn} onClick={() => run({ tool: 'website', description: f.description, location: f.location, currency: f.currency }, (j) => setDraft(j.draft))}>{busy ? 'Writing…' : 'Write my website'}</button>
          {draft && <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Draft. Check every price before you apply it.</p>
            <p className="text-lg font-bold">{draft.businessName}</p><p className="text-slate-300">{draft.tagline}</p>
            <p className="whitespace-pre-wrap text-slate-300">{draft.about}</p>
            <div>{(draft.services || []).map((s, i) => <p key={i}><b>{s.name}</b> {s.price ? `· ${s.price}` : '· price not set'} {s.duration ? `· ${s.duration}` : ''}<br /><span className="text-slate-400">{s.desc}</span></p>)}</div>
            <p className="text-slate-400">Style: {draft.template}</p>
            <button disabled={busy} className={btn} onClick={apply}>{busy ? 'Saving…' : 'Apply to my website'}</button>
            <p className="text-[11px] text-slate-500">This replaces your site text, services and FAQs. Photos, payments and bookings are not changed.</p>
          </div>}
        </div>}

        {tool === 'plan' && <div>
          {[['idea', 'Your business idea'], ['place', 'Where'], ['customers', 'Who will buy'], ['budget', 'Money you have to start'], ['hours', 'Hours per week you can work'], ['experience', 'Your experience']].map(([k, l]) => <div key={k}><label className={lbl}>{l}</label><input className={inp} onChange={set(k)} /></div>)}
          <button disabled={busy} className={btn} onClick={() => run({ tool: 'plan', answers: f }, (j) => setOut(j.text))}>{busy ? 'Planning…' : 'Make my plan'}</button>
          <p className="mt-3 text-xs text-slate-500">Want the numbers? Try the <Link className="underline text-green-500" href="/simulator">Business simulator</Link>.</p>
        </div>}

        {tool === 'opportunity' && <div>
          {[['idea', 'Your idea'], ['area', 'Area (town or postcode)'], ['competitors', 'Competitors you found nearby (how many, names if you like)'], ['prices', 'What they charge'], ['demand', 'Why you think people want it']].map(([k, l]) => <div key={k}><label className={lbl}>{l}</label><input className={inp} onChange={set(k)} /></div>)}
          <button disabled={busy} className={btn} onClick={() => run({ tool: 'opportunity', ...f }, (j) => setOut(j.text))}>{busy ? 'Thinking…' : 'Check my idea'}</button>
        </div>}

        {tool === 'manager' && <div>
          <label className={lbl}>Ask about your business</label>
          <textarea rows={3} className={inp} placeholder="Why am I getting no-shows? Which service should I push? How do I fill quiet days?" onChange={set('question')} />
          <button disabled={busy} className={btn} onClick={() => run({ tool: 'manager', question: f.question }, (j) => setOut(j.text))}>{busy ? 'Thinking…' : 'Ask'}</button>
        </div>}

        {tool === 'document' && <div>
          <label className={lbl}>File (PDF, CSV or text, under 3 MB)</label>
          <input type="file" accept=".pdf,.csv,.txt,.xlsx,.xls" className="text-sm" onChange={(e) => setF((p) => ({ ...p, file: e.target.files?.[0] }))} />
          <label className={lbl}>What do you want to know?</label><input className={inp} onChange={set('question')} placeholder="Add up what I spent on supplies" />
          <button disabled={busy} className={btn} onClick={doc}>{busy ? 'Reading…' : 'Read it'}</button>
          <p className="mt-3 text-xs text-slate-500">Excel files: use Save As, CSV first. The file is sent to the AI to answer your question and is not stored by GNIS.</p>
        </div>}

        {err && <p className="mt-5 text-sm text-amber-400">{err}</p>}
        <Out text={out} />
        <p className="mt-10 text-[11px] text-slate-500">AI can be wrong. Check prices, laws and numbers before you act. This is not legal, tax or financial advice.</p>
      </div>
    </main>
  );
}
