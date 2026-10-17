// Shared safety helpers.

// Blocks "cross-site" requests that change data. Browsers always say which site a request came from (the Origin header).
// If it is present it must be this site. Requests with no Origin (normal page loads, server tools) are not affected.
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Stops spreadsheet programs from running a cell as a formula. Names and notes typed by strangers can start with = + - or @.
export function safeCell(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
