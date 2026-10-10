import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Terms of Service', description: `Terms for using ${COMPANY.brand}.` };

const wrap = { maxWidth: 780, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.7, color: '#111827', background: '#fff', minHeight: '100vh' };
const h2 = { fontSize: 20, marginTop: 32 };

export default function Terms() {
  return (
    <main style={wrap}>
      <a href="/" style={{ fontSize: 14 }}>← Back</a>
      <h1>Terms of Service</h1>
      <p style={{ color: '#6b7280' }}>Last updated {COMPANY.updated}</p>

      <p>These terms cover your use of {COMPANY.brand}, provided by {COMPANY.legalName} (company number {COMPANY.companyNumber}), {COMPANY.address}. By creating an account or using a seller's site you agree to them.</p>

      <h2 style={h2}>1. The service</h2>
      <p>{COMPANY.brand} lets professionals build a website with services, products, bookings and payments. We are a platform. The contract for any service or product is between the customer and the seller, not us.</p>

      <h2 style={h2}>2. Seller accounts</h2>
      <ul>
        <li>You must give accurate details and keep your password safe.</li>
        <li>You are responsible for your content, your prices, your tax and for delivering what you sell.</li>
        <li>You must not post illegal, misleading or infringing content, or use the service to harm others.</li>
        <li>You must have the rights to the images you upload.</li>
      </ul>

      <h2 style={h2}>3. Payments</h2>
      <p>Card payments are handled by Stripe. Sellers must complete Stripe's verification to receive payouts. A platform fee may apply to card payments and is shown before it is charged. Refunds for goods and services are the seller's responsibility under consumer law.</p>

      <h2 style={h2}>4. AI price negotiation</h2>
      <p>The negotiation tool follows the lowest price a seller sets. A price agreed in the chat is locked for that booking. The seller still approves or declines the booking. Negotiation is a convenience and we do not guarantee any outcome.</p>

      <h2 style={h2}>5. Availability and changes</h2>
      <p>We work to keep the service running but do not promise it will always be available. We may change or end features, with notice where we reasonably can.</p>

      <h2 style={h2}>6. Liability</h2>
      <p>Nothing limits liability that cannot be limited by law, including for death or personal injury caused by negligence or for fraud. Otherwise, to the extent the law allows, we are not liable for lost profits or indirect loss, and our total liability to you is limited to the fees you paid us in the 12 months before the claim.</p>

      <h2 style={h2}>7. Ending your account</h2>
      <p>You can stop using the service and ask us to delete your account at any time. We may suspend accounts that break these terms.</p>

      <h2 style={h2}>8. Law</h2>
      <p>These terms are governed by the law of England and Wales and the courts of England and Wales, unless your local consumer law gives you other rights.</p>

      <p>Questions: {COMPANY.email}</p>
      <p style={{ marginTop: 40, fontSize: 13, color: '#6b7280' }}>This is a template, not legal advice. Have it checked by a qualified adviser before relying on it.</p>
    </main>
  );
}
