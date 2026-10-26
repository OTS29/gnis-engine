// Business simulator. It only does arithmetic on the numbers the user types in.
// It does not use market data and it does not predict anything.

export const PRESETS = {
  salon: { label: 'Salon or barber shop', startup: 8000, fixed: 2800, price: 35, perWeek: 60, varPct: 20, ramp: 6 },
  cleaning: { label: 'Cleaning business', startup: 800, fixed: 250, price: 80, perWeek: 15, varPct: 15, ramp: 4 },
  mobile: { label: 'Mobile hair or beauty', startup: 1200, fixed: 300, price: 60, perWeek: 14, varPct: 15, ramp: 4 },
  tutor: { label: 'Tutor or coach', startup: 300, fixed: 100, price: 30, perWeek: 15, varPct: 0, ramp: 3 },
  photo: { label: 'Photographer', startup: 2500, fixed: 250, price: 150, perWeek: 6, varPct: 10, ramp: 5 },
  custom: { label: 'Something else', startup: 2000, fixed: 500, price: 50, perWeek: 20, varPct: 15, ramp: 4 },
};

const num = (v, min = 0, max = 1e12) => Math.min(max, Math.max(min, Number(v) || 0));

export function simulate(raw) {
  const i = {
    budget: num(raw.budget), startup: num(raw.startup), fixed: num(raw.fixed), price: num(raw.price),
    perWeek: num(raw.perWeek, 0, 5000), varPct: num(raw.varPct, 0, 95), taxPct: num(raw.taxPct, 0, 60),
    ramp: Math.round(num(raw.ramp, 1, 24)), months: 24,
  };
  const rows = [];
  let cash = i.budget - i.startup, low = cash, lowMonth = 0, breakeven = null, payback = null, cumNet = 0;
  for (let m = 1; m <= i.months; m++) {
    const occ = i.ramp <= 1 ? 1 : Math.min(1, 0.3 + 0.7 * (m - 1) / (i.ramp - 1));
    const customers = i.perWeek * 4.33 * occ;
    const revenue = customers * i.price;
    const variable = revenue * i.varPct / 100;
    const before = revenue - variable - i.fixed;
    const tax = Math.max(0, before) * i.taxPct / 100;
    const net = before - tax;
    cash += net; cumNet += net;
    if (cash < low) { low = cash; lowMonth = m; }
    if (breakeven === null && before >= 0) breakeven = m;
    if (payback === null && cumNet >= i.startup) payback = m;
    rows.push({ m, occ, customers, revenue, variable, fixed: i.fixed, tax, net, cash });
  }
  const margin = i.price * (1 - i.varPct / 100);
  const breakevenCustomers = margin > 0 ? i.fixed / margin : null;
  return {
    rows, breakeven, payback, lowestCash: low, lowestMonth: lowMonth,
    extraNeeded: low < 0 ? Math.ceil(-low) : 0,
    breakevenPerMonth: breakevenCustomers, breakevenPerWeek: breakevenCustomers === null ? null : breakevenCustomers / 4.33,
    month12: rows[11], month24: rows[23], input: i,
    neverBreaksEven: breakeven === null,
  };
}
