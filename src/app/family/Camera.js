'use client';
import { useEffect, useRef, useState } from 'react';
import { btn, btnGhost } from './ui';

// In-app camera only. There is no file picker, so photos cannot come from the gallery.
// The date, time and place are drawn onto the picture and also sent separately; the server adds its own receive time.
export default function Camera({ kind, label, onSubmit }) {
  const video = useRef(null);
  const stream = useRef(null);
  const geo = useRef(null);
  const [state, setState] = useState('idle'); // idle | starting | live | preview | sending
  const [shot, setShot] = useState(null);
  const [err, setErr] = useState('');

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => stop, []);

  async function start() {
    setErr(''); setState('starting');
    if (!navigator.mediaDevices?.getUserMedia) { setErr('This browser cannot open the camera. Try Chrome or Safari on your phone.'); setState('idle'); return; }
    try {
      geo.current = await new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error('no geolocation'));
        navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), () => rej(new Error('denied')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
    } catch { setErr('Location is needed for proof photos. Allow location access in your browser settings, then try again.'); setState('idle'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.current = s; video.current.srcObject = s; await video.current.play(); setState('live');
    } catch { setErr('Could not open the camera. Allow camera access and try again.'); setState('idle'); }
  }

  function snap() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0, c.width, c.height);
    const now = new Date(), g = geo.current;
    const text = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB')}  ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}  ${kind.toUpperCase()}`;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, c.height - 30, c.width, 30);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(text, 8, c.height - 10);
    let q = 0.75, data = c.toDataURL('image/jpeg', q);
    while (data.length > 800000 && q > 0.3) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
    setShot({ data, capturedAt: now.toISOString(), ...g });
    stop(); setState('preview');
  }

  async function send() {
    setState('sending'); setErr('');
    const r = await onSubmit({ kind, image: shot.data, lat: shot.lat, lng: shot.lng, accuracy: shot.accuracy, capturedAt: shot.capturedAt });
    if (r && r.ok === false) { setErr(r.error || 'Could not send the photo.'); setState('preview'); } else { setShot(null); setState('idle'); }
  }

  return (
    <div>
      <video ref={video} playsInline muted className={state === 'live' ? 'w-full rounded-xl bg-black' : 'hidden'} />
      {state === 'preview' || state === 'sending' ? <img src={shot?.data} alt="Photo to send" className="w-full rounded-xl" /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {(state === 'idle' || state === 'starting') && <button type="button" className={btn} disabled={state === 'starting'} onClick={start}>{state === 'starting' ? 'Opening camera…' : label}</button>}
        {state === 'live' && <button type="button" className={btn} onClick={snap}>Take photo</button>}
        {(state === 'preview' || state === 'sending') && <>
          <button type="button" className={btn} disabled={state === 'sending'} onClick={send}>{state === 'sending' ? 'Sending…' : 'Send this photo'}</button>
          <button type="button" className={btnGhost} disabled={state === 'sending'} onClick={() => { setShot(null); setState('idle'); }}>Retake</button>
        </>}
      </div>
      {err && <p className="mt-3 text-sm text-amber-400" role="alert">{err}</p>}
    </div>
  );
}
