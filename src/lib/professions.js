// One entry per SEO landing page at /for/<slug>. Add more by copying an entry.
export const PROFESSIONS = [
  { slug: 'barbers', name: 'Barbers', noun: 'barbershop', pain: 'no-shows and a phone that never stops ringing', service: 'Skin fade', example: 'Haircut, beard trim, hot towel shave' },
  { slug: 'hairdressers', name: 'Hairdressers', noun: 'hair salon', pain: 'empty chairs and double bookings', service: 'Cut and blow-dry', example: 'Cuts, colour, braids, extensions' },
  { slug: 'braiders', name: 'Hair Braiders', noun: 'braiding studio', pain: 'long appointments that go unconfirmed', service: 'Knotless braids', example: 'Box braids, twists, cornrows' },
  { slug: 'nail-technicians', name: 'Nail Technicians', noun: 'nail studio', pain: 'last-minute cancellations', service: 'Gel manicure', example: 'Manicures, pedicures, nail art' },
  { slug: 'makeup-artists', name: 'Makeup Artists', noun: 'makeup business', pain: 'chasing deposits and quotes', service: 'Bridal makeup', example: 'Bridal, events, lessons' },
  { slug: 'cleaners', name: 'Cleaners', noun: 'cleaning company', pain: 'quoting every job by hand', service: 'Deep clean', example: 'Home, office, end of tenancy' },
  { slug: 'personal-trainers', name: 'Personal Trainers', noun: 'training business', pain: 'clients who book once and vanish', service: '1-to-1 session', example: 'Training, nutrition, online coaching' },
  { slug: 'tutors', name: 'Tutors', noun: 'tutoring business', pain: 'scheduling around school hours', service: 'Maths lesson', example: 'GCSE, A-level, languages' },
  { slug: 'photographers', name: 'Photographers', noun: 'photography studio', pain: 'enquiries that never turn into bookings', service: 'Portrait session', example: 'Portraits, weddings, product shoots' },
  { slug: 'mechanics', name: 'Mechanics', noun: 'garage', pain: 'a full diary of phone calls', service: 'Full service', example: 'MOT prep, servicing, repairs' },
  { slug: 'massage-therapists', name: 'Massage Therapists', noun: 'massage practice', pain: 'no-shows that waste a treatment slot', service: 'Deep tissue massage', example: 'Sports, deep tissue, relaxation' },
  { slug: 'tailors', name: 'Tailors and Fashion Designers', noun: 'tailoring business', pain: 'fittings that clash and orders that get lost', service: 'Suit alteration', example: 'Alterations, bespoke, fittings' },
];

export const bySlug = (slug) => PROFESSIONS.find((p) => p.slug === slug);
