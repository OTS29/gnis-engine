// No-show risk scoring. This is a transparent baseline model, not a black box.
// 1. Start from the seller's own no-show rate once there are enough finished bookings (otherwise a 10% prior).
// 2. Adjust for customer history, how far ahead the booking is, how deep the discount is, and the contact method.
// 3. Return a probability and the plain-English reasons behind it.
export function siteBaseRate(totals) {
  const resolved = (totals.completed || 0) + (totals.no_show || 0);
  if (resolved >= 30) return Math.min(0.4, Math.max(0.04, totals.no_show / resolved));
  return 0.1;
}

export function riskFor(b, hist, base) {
  let p = base;
  const reasons = [];
  const h = hist || { noShow: 0, cancelled: 0, completed: 0 };

  if (h.noShow > 0) { p += Math.min(0.35, 0.18 * h.noShow); reasons.push(`${h.noShow} previous no-show${h.noShow > 1 ? 's' : ''}`); }
  if (h.cancelled > 0) { p += Math.min(0.15, 0.05 * h.cancelled); reasons.push(`${h.cancelled} previous cancellation${h.cancelled > 1 ? 's' : ''}`); }
  if (h.completed >= 2 && h.noShow === 0) { p -= 0.07; reasons.push('reliable repeat customer'); }
  else if (h.completed === 0 && h.noShow === 0 && h.cancelled === 0) { p += 0.03; reasons.push('first-time customer'); }

  const created = String(b.created || '').slice(0, 10);
  const day = String(b.date || '').slice(0, 10);
  if (created && day) {
    const lead = Math.round((new Date(day) - new Date(created)) / 86400000);
    if (lead > 14) { p += 0.08; reasons.push(`booked ${lead} days ahead`); }
    else if (lead <= 1) { p -= 0.04; reasons.push('short notice, usually committed'); }
  }

  const list = Number(b.list_price) || 0;
  const price = Number(b.price) || 0;
  if (list > 0 && price < list * 0.7) { p += 0.06; reasons.push('large discount negotiated'); }

  if (!/@/.test(String(b.contact || ''))) { p += 0.03; reasons.push('phone only, no email'); }

  p = Math.min(0.9, Math.max(0.03, p));
  const label = p < 0.15 ? 'low' : p < 0.3 ? 'medium' : 'high';
  return { p: Math.round(p * 100) / 100, label, reasons };
}
