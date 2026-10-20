import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// A link a customer can open without signing in. Signed by the server, so it cannot be guessed or edited.
export const invoiceToken = (bookingId, siteId) => jwt.sign({ typ: 'inv', b: String(bookingId), s: String(siteId) }, process.env.JWT_SECRET, { expiresIn: '400d' });
export const readInvoiceToken = (t) => { try { const p = jwt.verify(String(t || ''), process.env.JWT_SECRET); return p.typ === 'inv' ? p : null; } catch { return null; } };
export const invoiceLink = (bookingId, siteId) => `${SITE_URL}/api/site/invoice?t=${encodeURIComponent(invoiceToken(bookingId, siteId))}`;

export const pad = (n) => `INV-${String(n).padStart(4, '0')}`;

function money(n, cur = 'GBP') {
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(Number(n) || 0); }
  catch { return `${cur} ${(Number(n) || 0).toFixed(2)}`; }
}

// Everything needed to draw one invoice or receipt. Pass either the owner's id or nothing (token links check the booking id themselves).
export async function loadInvoice(bookingId, ownerId = null) {
  const [b] = await sql`select b.id::text as id, b.customer, b.contact, b.service, b.price::float8 as price,
      b.date::text as date, left(b.time::text, 5) as time, lower(b.status) as status,
      coalesce(b.gift_applied, 0)::float8 as gift_applied, coalesce(b.deposit_amount, 0)::float8 as deposit_amount,
      coalesce(b.deposit_paid, false) as deposit_paid, coalesce(b.loyalty_applied, false) as loyalty_applied,
      b.paid_at is not null as paid, b.paid_method,
      to_char(b.paid_at at time zone 'Europe/London', 'DD Mon YYYY') as paid_date,
      b.invoice_no, to_char(b.invoice_issued_at at time zone 'Europe/London', 'DD Mon YYYY') as issued,
      st.id::text as site_id, st.owner_id::text as owner, st.slug, st.data
    from site_bookings b join sites st on st.id = b.site_id
    where b.id::text = ${String(bookingId)}`;
  if (!b) return null;
  if (ownerId && String(b.owner) !== String(ownerId)) return null;
  return b;
}

// Gives the booking its next invoice number the first time it is needed. Numbers count up per business: INV-0001, INV-0002...
export async function ensureInvoiceNo(b) {
  if (b.invoice_no) return b;
  const [r] = await sql`with nxt as (
      update sites set invoice_seq = invoice_seq + 1
      where id::text = ${b.site_id} and exists (select 1 from site_bookings where id::text = ${b.id} and invoice_no is null)
      returning invoice_seq
    )
    update site_bookings set invoice_no = (select invoice_seq from nxt), invoice_issued_at = now()
    where id::text = ${b.id} and invoice_no is null and exists (select 1 from nxt)
    returning invoice_no, to_char(invoice_issued_at at time zone 'Europe/London', 'DD Mon YYYY') as issued`;
  if (r) return { ...b, invoice_no: r.invoice_no, issued: r.issued };
  const [again] = await sql`select invoice_no, to_char(invoice_issued_at at time zone 'Europe/London', 'DD Mon YYYY') as issued from site_bookings where id::text = ${b.id}`;
  return { ...b, invoice_no: again?.invoice_no || null, issued: again?.issued || null };
}

// The sums. Tax follows the seller's settings: prices either already include tax, or tax is added on top.
export function figures(b) {
  const d = b.data || {};
  const rate = Math.max(0, Number(d.taxRate) || 0);
  const price = Number(b.price) || 0;
  let net = price, tax = 0, gross = price;
  if (rate > 0) {
    if (d.taxIncluded !== false) { net = round2(price / (1 + rate / 100)); tax = round2(price - net); gross = price; }
    else { net = price; tax = round2(price * rate / 100); gross = round2(price + tax); }
  }
  const gift = Math.min(round2(b.gift_applied), gross);
  const deposit = b.deposit_paid ? Math.min(round2(b.deposit_amount), round2(gross - gift)) : 0;
  const balance = b.paid ? 0 : Math.max(0, round2(gross - gift - deposit));
  return { rate, net, tax, gross, gift, deposit, balance, paidNow: b.paid ? round2(gross - gift - deposit) : 0 };
}

// A complete, print-ready page. Opens in the browser; the "Print / Save as PDF" button uses the phone's or computer's own print window.
export function invoiceHtml(b, { toolbar = true } = {}) {
  const d = b.data || {};
  const cur = d.currency || 'GBP';
  const f = figures(b);
  const accent = /^#[0-9a-fA-F]{6}$/.test(d.accent) ? d.accent : '#2563eb';
  const isReceipt = f.balance === 0;
  const title = isReceipt ? 'Receipt' : 'Invoice';
  const legal = d.legalName || d.businessName || '';
  const trading = d.legalName && d.businessName && d.legalName !== d.businessName ? `Trading as ${d.businessName}` : '';
  const address = d.regAddress || d.location || '';
  const lines = [];
  if (d.companyNumber) lines.push(`Company number: ${d.companyNumber}`);
  if (d.vatNumber) lines.push(`VAT number: ${d.vatNumber}`);
  const contact = [d.email, d.phone].filter(Boolean).join(' · ');
  const when = [b.date, b.time].filter(Boolean).join(' at ');
  const row = (label, value, strong = false) => `<tr${strong ? ' class="strong"' : ''}><td>${h(label)}</td><td class="r">${h(value)}</td></tr>`;
  const sums = [];
  if (f.rate > 0) { sums.push(row('Subtotal', money(f.net, cur))); sums.push(row(`Tax (${f.rate}%)`, money(f.tax, cur))); }
  sums.push(row('Total', money(f.gross, cur), true));
  if (f.gift > 0) sums.push(row('Paid with gift card', `−${money(f.gift, cur)}`));
  if (f.deposit > 0) sums.push(row('Deposit paid online', `−${money(f.deposit, cur)}`));
  if (b.paid) sums.push(row(`Paid${b.paid_method ? ` (${b.paid_method})` : ''}${b.paid_date ? ` on ${b.paid_date}` : ''}`, money(f.paidNow, cur)));
  sums.push(row('Balance due', money(f.balance, cur), true));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${h(title)} ${b.invoice_no ? h(pad(b.invoice_no)) : ''} · ${h(legal)}</title>
<style>
  :root{--accent:${accent}}
  *{box-sizing:border-box}
  body{margin:0;background:#f3f4f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;line-height:1.45}
  .bar{max-width:760px;margin:16px auto 0;padding:0 16px;display:flex;gap:8px;flex-wrap:wrap}
  .bar button,.bar a{background:#111827;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
  .sheet{max-width:760px;margin:16px auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .top{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:3px solid var(--accent);padding-bottom:16px}
  h1{margin:0;font-size:30px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
  .muted{color:#6b7280;font-size:13px}
  .seller{font-size:14px;max-width:340px}
  .seller b{font-size:16px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
  .meta h3{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding:8px 0}
  td{padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;vertical-align:top}
  .r{text-align:right;white-space:nowrap}
  .sums{margin-top:12px;margin-left:auto;max-width:340px}
  .sums td{padding:6px 0;border-bottom:0}
  .strong td{font-weight:700;font-size:16px;border-top:1px solid #e5e7eb}
  .stamp{display:inline-block;border:3px solid #059669;color:#059669;font-weight:800;letter-spacing:.12em;padding:4px 14px;border-radius:6px;transform:rotate(-4deg);margin-top:10px}
  .note{margin-top:22px;font-size:13px;color:#374151;white-space:pre-wrap}
  .foot{margin-top:28px;font-size:11px;color:#9ca3af;text-align:center}
  @media print{body{background:#fff}.bar{display:none}.sheet{box-shadow:none;margin:0;padding:0;border-radius:0;max-width:none}}
  @media (max-width:520px){.sheet{padding:20px}.meta{grid-template-columns:1fr}}
</style></head><body>
${toolbar ? '<div class="bar"><button id="p" type="button">Print / Save as PDF</button></div>' : ''}
<div class="sheet">
  <div class="top">
    <div><h1>${h(title)}</h1><div class="muted">${b.invoice_no ? h(pad(b.invoice_no)) : ''}${b.issued ? ` · Issued ${h(b.issued)}` : ''}</div>${b.paid ? '<div class="stamp">PAID</div>' : ''}</div>
    <div class="seller"><b>${h(legal)}</b>${trading ? `<div class="muted">${h(trading)}</div>` : ''}${address ? `<div>${h(address)}</div>` : ''}${contact ? `<div class="muted">${h(contact)}</div>` : ''}${lines.map((l) => `<div class="muted">${h(l)}</div>`).join('')}</div>
  </div>
  <div class="meta">
    <div><h3>Billed to</h3><div><b>${h(b.customer)}</b></div><div class="muted">${h(b.contact)}</div></div>
    <div><h3>Booking</h3><div>${h(when)}</div><div class="muted">Ref ${h(String(b.id).slice(0, 8).toUpperCase())}</div></div>
  </div>
  <table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
    <tbody><tr><td>${h(b.service)}${b.loyalty_applied ? '<div class="muted">Loyalty discount applied</div>' : ''}</td><td class="r">${h(money(f.rate > 0 ? f.net : f.gross, cur))}</td></tr></tbody></table>
  <table class="sums"><tbody>${sums.join('')}</tbody></table>
  ${d.invoiceNote && !isReceipt ? `<div class="note"><b>How to pay</b>\n${h(d.invoiceNote)}</div>` : ''}
  <div class="foot">Thank you for your business.</div>
</div>
${toolbar ? '<script>document.getElementById("p").addEventListener("click",function(){window.print()})</script>' : ''}
</body></html>`;
}

// Short email with the key figures and a link to the full printable page.
export function invoiceEmail(b, link) {
  const d = b.data || {};
  const cur = d.currency || 'GBP';
  const f = figures(b);
  const accent = /^#[0-9a-fA-F]{6}$/.test(d.accent) ? d.accent : '#2563eb';
  const isReceipt = f.balance === 0;
  const name = pad(b.invoice_no || 0);
  return {
    subject: `${isReceipt ? 'Receipt' : 'Invoice'} ${name} from ${d.legalName || d.businessName || 'your provider'}`,
    html: `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
      <h2 style="margin:0 0 12px;color:${h(accent)}">${isReceipt ? 'Receipt' : 'Invoice'} ${h(name)}</h2>
      <p style="font-size:16px;line-height:1.55">Hi ${h(String(b.customer || '').split(' ')[0])}, here is your ${isReceipt ? 'receipt' : 'invoice'} for <b>${h(b.service)}</b> on ${h(b.date)}.</p>
      <p style="font-size:16px;line-height:1.55">Total: <b>${h(money(f.gross, cur))}</b>${isReceipt ? ' · Paid in full' : ` · Balance due: <b>${h(money(f.balance, cur))}</b>`}</p>
      <p><a href="${h(link)}" style="background:${h(accent)};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">View, print or save as PDF</a></p>
      <p style="font-size:12px;color:#6b7280">${h(d.legalName || d.businessName || '')}</p></div>`,
  };
}
