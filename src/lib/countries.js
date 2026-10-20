// Countries offered in the dashboard. Codes are the two-letter ISO codes.
export const COUNTRY_CODES = ['GB', 'IE', 'NG', 'GH', 'KE', 'ZA', 'US', 'CA', 'AU', 'NZ', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'PL', 'AE', 'SA', 'EG', 'IN', 'PK', 'BD', 'SG', 'MY', 'PH', 'BR', 'MX', 'JM', 'TT', 'UG', 'TZ', 'RW', 'ZW', 'ZM', 'CM', 'SN', 'CI'];
export const cleanCountry = (v) => {
  const c = String(v || '').trim().toUpperCase();
  const x = c === 'UK' ? 'GB' : c;
  return /^[A-Z]{2}$/.test(x) ? x : '';
};
