// Labels and constants shared by the server rules and the pages. No Node-only imports, so the browser can use it.
export const STATUS_LABEL = {
  requested: 'Waiting for the professional', accepted: 'Accepted, waiting for payment', declined: 'Declined', expired: 'Expired',
  payment_pending: 'Payment pending', funds_held: 'Paid, money held', in_progress: 'Job in progress', proof_submitted: 'Done, waiting for confirmation',
  confirmed: 'Confirmed', released: 'Completed, professional paid', disputed: 'In dispute', refunded: 'Refunded', cancelled: 'Cancelled', failed: 'Failed',
};

export const CATEGORIES = { hair: 'Hair', barbing: 'Barbing', cleaning: 'Cleaning' };
export const DISPUTE_REASONS = { not_done: 'The job was not done', poor_quality: 'The work was poor', no_show: 'The professional did not turn up', other: 'Something else' };
export const TERMS_VERSION = 'draft-1';
export const CODE_HOURS = 72;
export const MAX_CODE_TRIES = 5;
export const MAX_RESENDS = 3;
export const DISCLOSURE = (name) => `This service is provided by ${name}, an independent professional. GNIS connects you but does not provide the service.`;


export const fmtMoney = (n, cur = 'NGN') => {
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(n) || 0); }
  catch { return `${cur} ${(Number(n) || 0).toFixed(2)}`; }
};
