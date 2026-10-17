export const EXPENSE_CATEGORIES = ['Rent', 'Supplies', 'Stock', 'Staff pay', 'Marketing', 'Travel', 'Software', 'Utilities', 'Insurance', 'Other'];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isIso = (s) => ISO.test(String(s || '')) && !isNaN(new Date(`${s}T00:00:00Z`).getTime());
export const addDays = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
export const londonToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

// Turns the screen's choices into a safe date range and grouping. Long ranges are grouped more coarsely so charts stay readable.
export function cleanRange(q, today = londonToday()) {
  let from = isIso(q.from) ? q.from : `${today.slice(0, 8)}01`;
  let to = isIso(q.to) ? q.to : today;
  if (from > to) [from, to] = [to, from];
  if (daysBetween(from, to) > 730) from = addDays(to, -730);
  const span = daysBetween(from, to) + 1;
  let group = ['day', 'week', 'month'].includes(q.group) ? q.group : 'day';
  if (group === 'day' && span > 92) group = 'week';
  if (group === 'week' && span > 400) group = 'month';
  return { from, to, group, span };
}
