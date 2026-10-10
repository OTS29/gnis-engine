'use client';
import { useEffect, useState } from 'react';
import { tr } from '@/lib/i18n';

// Stores the visitor's choice in this browser only. Optional tools (like a chat widget) should load only when
// localStorage 'gnis_consent' === 'yes'.
export default function CookieBanner({ lang = 'en', accent = '#2563eb' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem('gnis_consent')) setShow(true); } catch {}
  }, []);
  if (!show) return null;
  const choose = (v) => { try { localStorage.setItem('gnis_consent', v); } catch {} setShow(false); window.dispatchEvent(new Event('gnis-consent')); };
  return (
    <div role="dialog" aria-live="polite" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 90, background: '#111827', color: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.35)', maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <span style={{ flex: '1 1 260px', fontSize: 14, lineHeight: 1.45 }}>{tr(lang, 'cookieText')} <a href="/privacy" style={{ color: '#93c5fd' }}>{tr(lang, 'privacy')}</a></span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => choose('no')} style={{ background: 'transparent', color: '#fff', border: '1px solid #4b5563', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', fontWeight: 600 }}>{tr(lang, 'cookieDecline')}</button>
        <button onClick={() => choose('yes')} style={{ background: accent, color: '#fff', border: 0, borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700 }}>{tr(lang, 'cookieAccept')}</button>
      </span>
    </div>
  );
}
