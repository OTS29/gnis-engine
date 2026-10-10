import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Privacy Policy', description: `How ${COMPANY.brand} collects and uses personal data.` };

const wrap = { maxWidth: 780, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.7, color: '#111827', background: '#fff', minHeight: '100vh' };
const h2 = { fontSize: 20, marginTop: 32 };

export default function Privacy() {
  return (
    <main style={wrap}>
      <a href="/" style={{ fontSize: 14 }}>← Back</a>
      <h1>Privacy Policy</h1>
      <p style={{ color: '#6b7280' }}>Last updated {COMPANY.updated}</p>

      <p>{COMPANY.brand} is run by {COMPANY.legalName} (company number {COMPANY.companyNumber}), {COMPANY.address}. We are the controller of personal data for people who register as sellers. For customers who book or buy from a seller's site, the seller decides why the data is collected and we process it for them as their processor. Contact: {COMPANY.email}. ICO registration: {COMPANY.icoNumber}.</p>

      <h2 style={h2}>What we collect</h2>
      <ul>
        <li><b>Sellers:</b> name, email, hashed password, business details, site content, staff names and clock-in times, payout status.</li>
        <li><b>Customers of a seller:</b> name, phone or email, the service or items chosen, booking date and time, price, order details.</li>
        <li><b>Visitors:</b> a one-way daily hash of IP address and browser type, used only to count visits. It cannot be reversed and sets no cookie.</li>
        <li><b>Payments:</b> card details are entered on Stripe's pages. We never see or store them.</li>
      </ul>

      <h2 style={h2}>Why we use it, and our legal basis</h2>
      <ul>
        <li>To run accounts, bookings and orders (contract).</li>
        <li>To send booking confirmations and reminders by email or SMS (contract and legitimate interests).</li>
        <li>To show sellers analytics about their own site and to keep the service secure and free of abuse (legitimate interests).</li>
        <li>To meet legal and tax duties (legal obligation).</li>
      </ul>

      <h2 style={h2}>AI price negotiation</h2>
      <p>When a customer negotiates, the offer, service name and the seller's rules are used to decide a counter-offer. The decision is made by fixed rules on our server. If enabled, an AI provider (Anthropic) may be sent the offer and service name to word the reply. The AI cannot change the price. No automated decision has a legal or similarly significant effect on a person, and the seller can always approve or decline a booking.</p>

      <h2 style={h2}>Who we share data with</h2>
      <p>Providers that process data on our behalf: Vercel (hosting and image storage), Neon (database), Stripe (payments), Resend (email), Twilio (SMS), Anthropic (optional negotiation wording) and Crisp (optional chat, only if you accept optional cookies). Some are outside the UK. Where they are, we rely on UK-approved transfer safeguards.</p>

      <h2 style={h2}>How long we keep it</h2>
      <p>Account data until you delete your account. Booking and order records for up to 6 years for accounting purposes, then they are deleted or anonymised. Visit hashes for 13 months.</p>

      <h2 style={h2}>Cookies</h2>
      <p>We use one essential cookie to keep sellers signed in and, if you arrive through a referral link, a short-lived cookie that remembers who referred you. Optional tools such as chat load only if you accept them in the banner. You can change your choice by clearing this site's data in your browser.</p>

      <h2 style={h2}>Your rights</h2>
      <p>You can ask to see, correct, delete or export your data, to object to or restrict its use, and to complain. Email {COMPANY.email}. If you are a customer of a seller, you can also contact that seller. You can complain to the Information Commissioner's Office at ico.org.uk.</p>

      <p style={{ marginTop: 40, fontSize: 13, color: '#6b7280' }}>This is a template written for a small UK platform. Have it checked by a qualified adviser and fill in the company details in lib/company.js before relying on it.</p>
    </main>
  );
}
