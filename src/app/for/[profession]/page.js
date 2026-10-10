import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROFESSIONS, bySlug } from '@/lib/professions';
import { SITE_URL } from '@/lib/site';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return PROFESSIONS.map((p) => ({ profession: p.slug }));
}

export async function generateMetadata({ params }) {
  const { profession } = await params;
  const p = bySlug(profession);
  if (!p) return {};
  const title = `Free booking website for ${p.name} | GNIS Engine`;
  const description = `Get a professional website, online bookings, a shop and AI price negotiation for your ${p.noun}. No coding. Launch in minutes.`;
  return { title, description, alternates: { canonical: `${SITE_URL}/for/${p.slug}` }, openGraph: { title, description, url: `${SITE_URL}/for/${p.slug}`, type: 'website' } };
}

const FEATURES = [
  ['A website that looks professional', 'Pick from five designs, add your photos and services, and go live in minutes.'],
  ['Online booking, 24 hours a day', 'Customers pick a service, a date and a time. You approve with one tap.'],
  ['AI price negotiation', 'Let customers haggle within limits you set. The price is locked once agreed, and your lowest price stays private.'],
  ['Fewer no-shows', 'Email and SMS reminders, calendar invites and a risk score on every booking.'],
  ['Sell products online', 'A built-in shop and cart with card payments paid straight into your bank.'],
  ['Know your numbers', 'Revenue, repeat customers, busiest times and conversion, all in one dashboard.'],
];

export default async function Page({ params }) {
  const { profession } = await params;
  const p = bySlug(profession);
  if (!p) notFound();

  const faq = [
    [`Is it really free to start?`, `Yes. You can build and publish your ${p.noun} website without paying. Paid plans add more features as you grow.`],
    [`Do I need technical skills?`, `No. If you can fill in a form you can build your site. Add your services (for example: ${p.example.toLowerCase()}), your photos and your prices.`],
    [`Can customers pay online?`, `Yes. Connect your bank through Stripe and customers can pay by card. Or let them pay in person.`],
    [`Does it work on a phone?`, `Yes. Your site and your dashboard are built for phones first.`],
  ];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'SoftwareApplication', name: 'GNIS Engine', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: `${SITE_URL}/for/${p.slug}`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' } },
      { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };

  const wrap = { maxWidth: 1100, margin: '0 auto', padding: '0 20px' };
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827', background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: 'inherit', textDecoration: 'none' }}>GNIS Engine</Link>
          <Link href="/" style={{ background: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>Get started</Link>
        </div>
      </header>

      <section style={{ background: 'linear-gradient(135deg,#eff6ff,#fff)', padding: 'clamp(48px,9vw,110px) 0' }}>
        <div style={wrap}>
          <h1 style={{ fontSize: 'clamp(32px,6vw,60px)', lineHeight: 1.05, margin: 0, letterSpacing: '-0.03em', maxWidth: 800 }}>A booking website for {p.name.toLowerCase()}, built in minutes</h1>
          <p style={{ fontSize: 'clamp(17px,2.2vw,21px)', color: '#4b5563', maxWidth: 640, margin: '20px 0 28px' }}>Stop losing customers to {p.pain}. Get your own website, online booking, a shop and AI price negotiation for your {p.noun}.</p>
          <Link href="/" style={{ background: '#2563eb', color: '#fff', padding: '15px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 17, display: 'inline-block' }}>Create your {p.noun} website</Link>
        </div>
      </section>

      <section style={{ padding: 'clamp(48px,8vw,96px) 0' }}>
        <div style={wrap}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', margin: '0 0 28px' }}>Everything a {p.noun} needs</h2>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
            {FEATURES.map(([t, d]) => (
              <div key={t} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{t}</h3>
                <p style={{ margin: 0, color: '#4b5563' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#f9fafb', padding: 'clamp(48px,8vw,96px) 0' }}>
        <div style={{ ...wrap, maxWidth: 760 }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', margin: '0 0 24px' }}>Questions from {p.name.toLowerCase()}</h2>
          {faq.map(([q, a]) => (
            <div key={q} style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{q}</h3>
              <p style={{ margin: 0, color: '#4b5563' }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: '32px 0', borderTop: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280' }}>
        <div style={{ ...wrap, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
          <span>© {new Date().getFullYear()} GNIS Engine</span>
          <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
            <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
            {PROFESSIONS.slice(0, 5).map((x) => (<Link key={x.slug} href={`/for/${x.slug}`} style={{ color: 'inherit' }}>{x.name}</Link>))}
          </span>
        </div>
      </footer>
    </div>
  );
}
