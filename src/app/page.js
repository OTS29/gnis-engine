'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { login, signup, logout } from './auth/action';

// Set to true after you add public/demo.mp4
const SHOW_VIDEO = false;

const CATEGORIES = ['All', 'Beauty & Hair', 'Home Services', 'Trades', 'Health & Wellness', 'Education & Tutoring', 'Creative & Media', 'Business Services', 'Events & Catering', 'Tech & Digital', 'Transport & Delivery'];

const CATEGORY_ICONS = {
  'Beauty & Hair': '💇', 'Home Services': '🧹', 'Trades': '🔧', 'Health & Wellness': '🏋️',
  'Education & Tutoring': '📚', 'Creative & Media': '📸', 'Business Services': '📊',
  'Events & Catering': '🍽️', 'Tech & Digital': '💻', 'Transport & Delivery': '🚚'
};

const SERVICE_PRESETS = {
  'Beauty & Hair': [{ name: 'Haircut', price: 25 }, { name: 'Colour', price: 60 }, { name: 'Beard Trim', price: 15 }, { name: 'Manicure', price: 30 }],
  'Home Services': [{ name: 'Home Clean', price: 15 }, { name: 'Deep Clean', price: 80 }, { name: 'Laundry', price: 20 }, { name: 'Gardening', price: 25 }],
  'Trades': [{ name: 'Call-out', price: 50 }, { name: 'Electrical Repair', price: 40 }, { name: 'Plumbing Fix', price: 45 }, { name: 'Painting', price: 200 }],
  'Health & Wellness': [{ name: 'Personal Training', price: 45 }, { name: 'Massage', price: 50 }, { name: 'Nutrition Consult', price: 40 }],
  'Education & Tutoring': [{ name: 'Maths Tutoring', price: 30 }, { name: 'English Lesson', price: 28 }, { name: 'Exam Prep', price: 35 }],
  'Creative & Media': [{ name: 'Photo Session', price: 150 }, { name: 'Logo Design', price: 120 }, { name: 'Video Edit', price: 90 }],
  'Business Services': [{ name: 'Bookkeeping', price: 35 }, { name: 'Consultation', price: 60 }, { name: 'Social Media Management', price: 200 }],
  'Events & Catering': [{ name: 'Event Catering', price: 18 }, { name: 'DJ Set', price: 250 }, { name: 'Decor Setup', price: 180 }],
  'Tech & Digital': [{ name: 'Website Build', price: 400 }, { name: 'IT Support', price: 45 }, { name: 'SEO Audit', price: 150 }],
  'Transport & Delivery': [{ name: 'Courier Run', price: 15 }, { name: 'Removals', price: 120 }, { name: 'Airport Transfer', price: 40 }]
};

// PLACEHOLDER stories: replace with real customer quotes once you have them
const realUserReviews = [
  { id: 1, text: "I manage bookings and payments in one place now, and I stopped chasing clients for deposits.", user: "Sample: Hair Stylist", type: "Beauty & Hair" },
  { id: 2, text: "Setting up my services page took minutes. Clients find me by postcode and book directly.", user: "Sample: Maths Tutor", type: "Education & Tutoring" },
  { id: 3, text: "My calendar, invoices and customer list live together. It feels like having an assistant.", user: "Sample: Event Caterer", type: "Events & Catering" }
];

export default function LandingPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);

  const heroBadgeRef = useRef(null);
  const heroHeadingRef = useRef(null);
  const heroSubtextRef = useRef(null);
  const heroButtonRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [aiCategory, setAiCategory] = useState('Beauty & Hair');
  const [regCategory, setRegCategory] = useState('Home Services');
  const [activeModal, setActiveModal] = useState(null); // 'login', 'register', 'reset'
  const [registrationType, setRegistrationType] = useState('pro');

  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [regError, setRegError] = useState('');

  // Demo data until the marketplace is wired to the database
  const [allPros, setAllPros] = useState([
    { id: 1, name: "Jordan Cuts", skill: "Barber", category: "Beauty & Hair", area: "SE1", rate: "£25", availability: "Immediate" },
    { id: 2, name: "Sparky Dan", skill: "Electrician", category: "Trades", area: "N1", rate: "£40/hr", availability: "Booked" },
    { id: 3, name: "Clean Queen", skill: "Cleaner", category: "Home Services", area: "E1", rate: "£15/hr", availability: "Immediate" },
    { id: 4, name: "Ada Tutors", skill: "Maths Tutor", category: "Education & Tutoring", area: "E3", rate: "£30/hr", availability: "Immediate" },
    { id: 5, name: "Lens & Light", skill: "Photographer", category: "Creative & Media", area: "SW9", rate: "£150/session", availability: "Immediate" },
    { id: 6, name: "Mama Kitchen", skill: "Event Caterer", category: "Events & Catering", area: "SE15", rate: "£18/head", availability: "Booked" },
    { id: 7, name: "Ledger Right", skill: "Bookkeeper", category: "Business Services", area: "EC1", rate: "£35/hr", availability: "Immediate" },
    { id: 8, name: "FitPath", skill: "Personal Trainer", category: "Health & Wellness", area: "W1", rate: "£45/hr", availability: "Immediate" },
  ]);

  const [businessName] = useState("GNIS ENGINE");
  const [marketingText, setMarketingText] = useState("Bookings, payments and your online presence in one place, for every skilled professional and small business.");
  const [location] = useState("London, United Kingdom");

  const [services, setServices] = useState([{ id: 1, name: 'Consultation', price: 30 }]);
  const [aiFeatures, setAiFeatures] = useState({ showGallery: true, showStaff: true, showBooking: true });
  const [aiSelectedServices, setAiSelectedServices] = useState([]);

  const [regName, setRegName] = useState('');
  const [regSkill, setRegSkill] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPostcode, setRegPostcode] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRate, setRegRate] = useState('£25');

  const [targetRegion, setTargetRegion] = useState('UK');
  const [verificationMethod, setVerificationMethod] = useState('nin');
  const [idNumberInput, setIdNumberInput] = useState('');

  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(heroBadgeRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(heroHeadingRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.4')
        .fromTo(heroSubtextRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.5')
        .fromTo(heroButtonRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 }, '-=0.3');
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveReviewIndex((p) => (p + 1) % realUserReviews.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark'); else root.classList.remove('dark');
  }, [isDarkMode]);

  // Restore the logged-in user from the session cookie
  useEffect(() => {
    fetch('/api/users/get')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.ok) setCurrentUser(j.data); })
      .catch(() => {});
  }, []);

  const filtered = allPros.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesText =
      p.skill.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesText && matchesCategory;
  });

  const openRegister = (type = 'pro') => { setRegistrationType(type); setActiveModal('register'); setMenuOpen(false); };

  const toggleAiService = (name, price) => {
    if (aiSelectedServices.find(s => s.name === name)) {
      setAiSelectedServices(aiSelectedServices.filter(s => s.name !== name));
    } else {
      setAiSelectedServices([...aiSelectedServices, { name, price }]);
    }
  };

  const applyAiGeneration = () => {
    if (aiSelectedServices.length === 0) return alert("Please select at least one service!");
    const generated = aiSelectedServices.map((s, i) => ({ id: `svc-${Date.now()}-${i}`, ...s }));
    setServices(generated);
    setMarketingText(`Premium ${aiSelectedServices.map(s => s.name.toLowerCase()).join(' & ')} services by ${businessName}.`);
    alert("Preview updated. Edit names and prices in the matrix.");
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    try {
      const formData = new FormData();
      formData.append('email', regEmail);
      formData.append('password', regPassword);
      formData.append('name', regName);
      formData.append('role', registrationType.toLowerCase());
      formData.append('region', targetRegion);

      if (registrationType === 'pro') {
        formData.append('skill', regSkill);
        formData.append('rate', regRate);
      }
      if (targetRegion === 'UK') {
        formData.append('address', regAddress);
        formData.append('postcode', regPostcode);
      } else {
        formData.append('verificationMethod', verificationMethod);
        formData.append('idNumber', idNumberInput);
      }

      const result = await signup(formData);
      if (result?.error) throw new Error(result.error);

      if (registrationType === 'pro') {
        const rate = String(regRate || '£25');
        setAllPros([{
          id: `new-${Date.now()}`,
          name: regName || 'New Professional',
          skill: regSkill || 'General Provider',
          category: regCategory,
          area: targetRegion === 'UK' ? regPostcode.toUpperCase() : 'NG',
          rate: rate.startsWith('£') ? rate : `£${rate}`,
          availability: 'Immediate'
        }, ...allPros]);
      }

      setCurrentUser(result.user);
      setActiveModal(null);
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegSkill('');
      setRegPostcode(''); setRegAddress(''); setIdNumberInput('');
      router.push(registrationType === 'pro' ? '/dashboard' : '/portal/bookings');
    } catch (err) {
      setRegError(err.message);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const formData = new FormData();
      formData.append('email', loginEmail);
      formData.append('password', loginPassword);

      const result = await login(formData);
      if (result?.error) throw new Error(result.error);

      if (result?.user) {
        setCurrentUser(result.user);
        const userRole = result.user.role || 'client';
        setActiveModal(null);
        setLoginEmail('');
        setLoginPassword('');
        router.push(userRole === 'pro' || userRole === 'admin' ? '/dashboard' : '/portal/bookings');
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    router.refresh();
  };

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>

      <style jsx global>{`
        .glass {
          background: ${isDarkMode ? 'rgba(9, 15, 29, 0.85)' : 'rgba(255, 255, 255, 0.85)'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .gradient-bg {
          background: ${isDarkMode ? 'radial-gradient(circle at top, #14532d10 0%, #020617 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fdf2f8 100%)'};
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- ANNOUNCEMENT BAR --- */}
      <div className="bg-green-950/40 border-b border-green-500/10 py-2 px-3 text-center text-[9px] font-mono tracking-widest text-green-400 leading-relaxed flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-green-500 animate-pulse"></span>
        NOW ONBOARDING FOUNDING PROFESSIONALS IN LONDON
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-slate-900 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl sm:text-3xl font-black text-green-600 tracking-tighter italic">GNIS</h1>
            <div className="hidden md:flex items-center gap-6">
              {!currentUser && (
                <button onClick={() => openRegister('pro')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">Register as Pro</button>
              )}
              <a href="#who-its-for" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">Who it's for</a>
              <a href="#services-matrix" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">Builder</a>
              <a href="#marketplace-feed" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">Marketplace</a>
              <a href="#pricing" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">Pricing</a>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Signed in</p>
                    <p className="text-xs font-bold uppercase italic">{currentUser.name}</p>
                  </div>
                  <Link href="/dashboard" className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-green-500 transition">Dashboard</Link>
                  <button onClick={handleLogout} className="p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition text-[10px] font-black">LOGOUT</button>
                </>
              ) : (
                <button onClick={() => setActiveModal('login')} className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-green-600 hover:text-white transition">Log in</button>
              )}
            </div>

            <div className="md:hidden">
              {currentUser ? (
                <Link href="/dashboard" className="bg-green-600 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase">Dashboard</Link>
              ) : (
                <button onClick={() => setActiveModal('login')} className="bg-green-600 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase">Log in</button>
              )}
            </div>

            <button onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle theme" className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 text-xs">
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" className="md:hidden p-2 rounded-xl border border-gray-200 dark:border-slate-800 text-sm leading-none">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 py-4 space-y-1 bg-slate-950/95 text-white">
            <a href="#who-its-for" onClick={() => setMenuOpen(false)} className="block text-xs font-black uppercase tracking-widest py-2.5">Who it's for</a>
            <a href="#services-matrix" onClick={() => setMenuOpen(false)} className="block text-xs font-black uppercase tracking-widest py-2.5">Builder</a>
            <a href="#marketplace-feed" onClick={() => setMenuOpen(false)} className="block text-xs font-black uppercase tracking-widest py-2.5">Marketplace</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-xs font-black uppercase tracking-widest py-2.5">Pricing</a>
            {!currentUser && (
              <button onClick={() => openRegister('pro')} className="block w-full text-left text-xs font-black uppercase tracking-widest py-2.5 text-green-400">Register as Pro</button>
            )}
            {currentUser && (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left text-xs font-black uppercase tracking-widest py-2.5 text-red-400">Logout</button>
            )}
          </div>
        )}
      </nav>

      {/* --- HERO --- */}
      <header className="pt-16 sm:pt-24 pb-16 text-center max-w-4xl mx-auto px-5 sm:px-6 gradient-bg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/5 blur-[100px] rounded-full -z-10 animate-pulse"></div>
        <div ref={heroBadgeRef} className="inline-block px-4 py-1.5 mb-6 rounded-full bg-green-100 dark:bg-green-950/40 border border-green-500/20 text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">
          For every skilled professional // Early access
        </div>
        <h2 ref={heroHeadingRef} className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
          Run Your Skills Business.<br/><span className="text-green-600">ON AUTO-PILOT.</span>
        </h2>
        <p ref={heroSubtextRef} className="mt-6 text-sm md:text-base font-bold uppercase tracking-widest opacity-70 max-w-2xl mx-auto leading-relaxed">
          {marketingText}
        </p>
        <div ref={heroButtonRef} className="mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button onClick={() => openRegister('pro')} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-500 transition shadow-xl shadow-green-600/10 active:scale-95">
            Start free
          </button>
          <a href="#marketplace-feed" className="border border-slate-700 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-green-500 transition">
            Find a professional
          </a>
        </div>
      </header>

      {/* --- WHO IT'S FOR --- */}
      <section id="who-its-for" className="py-20 max-w-6xl mx-auto px-5 sm:px-6">
        <p className="text-green-500 font-black text-[10px] text-center uppercase tracking-widest mb-2">Built for every skill</p>
        <h2 className="text-3xl md:text-4xl font-black italic uppercase text-center tracking-tighter mb-10">If you sell your skills, GNIS works for you</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CATEGORIES.filter(c => c !== 'All').map(c => (
            <button
              key={c}
              onClick={() => { setActiveCategory(c); document.getElementById('marketplace-feed')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-green-500/50 transition text-center"
            >
              <span className="text-2xl block mb-2">{CATEGORY_ICONS[c]}</span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">{c}</span>
            </button>
          ))}
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-16 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <h2 className="text-3xl font-black italic uppercase text-center tracking-tighter mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '1', t: 'Create your profile', d: 'Add your skills, rates and service area in minutes.' },
              { n: '2', t: 'Get found and booked', d: 'Clients search by skill or postcode and book you directly.' },
              { n: '3', t: 'Get paid, grow', d: 'Manage your calendar, payments and customers from one dashboard.' }
            ].map(s => (
              <div key={s.n} className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40">
                <div className="w-9 h-9 rounded-full bg-green-600 text-white font-black flex items-center justify-center mb-4">{s.n}</div>
                <h3 className="font-black text-white mb-1">{s.t}</h3>
                <p className="text-sm text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- AI BUILDER --- */}
      <section id="services-matrix" className="py-20 max-w-6xl mx-auto px-5 sm:px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] sm:rounded-[3.5rem] p-6 md:p-14 shadow-2xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <span className="text-green-500 font-mono text-[9px] tracking-widest uppercase block mb-1">// INTERACTIVE PREVIEW</span>
              <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter">✨ Website builder</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xs font-medium uppercase tracking-wider md:text-right">
              Pick your industry and services to preview your price list.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div>
                <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-3">Step 1: Choose your industry and services</h4>
                <select
                  value={aiCategory}
                  onChange={(e) => { setAiCategory(e.target.value); setAiSelectedServices([]); }}
                  className="w-full mb-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_PRESETS[aiCategory].map(s => (
                    <button
                      key={s.name}
                      onClick={() => toggleAiService(s.name, s.price)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${aiSelectedServices.find(x => x.name === s.name) ? 'bg-green-600 text-white border border-green-500' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
                    >
                      {s.name} · £{s.price}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-3">Step 2: Add features</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.keys(aiFeatures).map(f => (
                    <label key={f} className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-800/50 transition">
                      <input type="checkbox" checked={aiFeatures[f]} onChange={() => setAiFeatures({ ...aiFeatures, [f]: !aiFeatures[f] })} className="accent-green-500 w-4 h-4 rounded" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">{f.replace('show', '')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-[2rem] p-5 sm:p-6 border border-slate-800 shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-900 mb-4">
                  <h4 className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">Your price list</h4>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
                  {services.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                      <input
                        className="bg-transparent border-b border-slate-800 text-sm font-bold flex-1 min-w-0 focus:outline-none focus:border-green-500 text-white"
                        value={s.name}
                        onChange={(e) => updateService(s.id, 'name', e.target.value)}
                      />
                      <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-xs font-bold text-slate-500 mr-1">£</span>
                        <input
                          type="number"
                          className="bg-transparent w-14 text-sm focus:outline-none font-black text-green-400"
                          value={s.price}
                          onChange={(e) => updateService(s.id, 'price', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={applyAiGeneration} className="w-full mt-6 bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-lg">
                Generate preview
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- MARKETPLACE --- */}
      <section id="marketplace-feed" className="max-w-6xl mx-auto py-12 px-5 sm:px-6 border-t border-slate-900">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-green-500 font-black text-[10px] uppercase tracking-widest mb-2">Marketplace preview</p>
            <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase">Find a professional</h3>
            <p className="text-xs text-slate-500 mt-2">Sample listings shown. Real profiles appear as professionals join.</p>
          </div>

          <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center border border-slate-800 shadow-xl focus-within:ring-2 focus-within:ring-green-500/30 w-full max-w-sm transition-all">
            <input
              type="text"
              placeholder="Skill, postcode area or name..."
              className="bg-transparent px-4 py-2 text-xs font-bold outline-none text-white w-full placeholder:text-slate-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white text-[10px] font-mono px-2">✕</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition ${activeCategory === c ? 'bg-green-600 border-green-500 text-white' : 'border-slate-800 text-slate-400 hover:border-slate-600'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-900/30 rounded-[2rem] p-10 text-center border border-slate-800 max-w-xl mx-auto">
            <p className="text-xl font-black italic text-slate-400 mb-2 uppercase tracking-tight">No matches yet</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-6">Nothing found for "{searchQuery}" in {activeCategory}</p>
            <button onClick={() => openRegister('pro')} className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition">
              List your service here
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(pro => (
              <div key={pro.id} className="bg-slate-900/60 p-6 sm:p-8 rounded-[2rem] border border-slate-900 hover:border-green-500/30 transition-all flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xl font-black tracking-tight text-white">{pro.name}</h4>
                    <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
                      {pro.availability}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-wider mt-1">📍 {pro.area} • {pro.skill}</p>
                  <p className="text-[10px] text-green-500/80 font-mono mt-1">{pro.category}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800/50 mt-6">
                  <p className="text-lg font-black tracking-tight text-white">{pro.rate}</p>
                  <button onClick={() => alert('Booking opens soon. Create a free account to be notified.')} className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 hover:text-white transition tracking-wider">
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- VIDEO (enable with SHOW_VIDEO at top of file) --- */}
      {SHOW_VIDEO && (
        <section className="py-20 max-w-6xl mx-auto px-5 sm:px-6">
          <div className="relative rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-slate-900 bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay loop muted playsInline>
              <source src="/demo.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6 md:p-14">
              <div className="text-white">
                <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">See GNIS in action</h3>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- SAMPLE STORIES --- */}
      <section className="py-16 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-y border-slate-900 overflow-hidden text-white">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 text-center">
          <span className="text-green-500 font-mono text-[9px] tracking-widest uppercase block mb-4">// SAMPLE OPERATOR STORIES</span>
          <div className="min-h-[130px] flex flex-col justify-center">
            <p className="text-lg md:text-xl font-black italic text-slate-200 leading-relaxed">
              "{realUserReviews[activeReviewIndex].text}"
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-green-500">
              {realUserReviews[activeReviewIndex].user} — <span className="text-slate-400 font-mono font-medium">{realUserReviews[activeReviewIndex].type}</span>
            </p>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {realUserReviews.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeReviewIndex ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-800'}`}></span>
            ))}
          </div>
        </div>
      </section>

      {/* --- TRUST --- */}
      <section className="py-20 bg-slate-950 border-b border-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 text-center">
          <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">Built with trust in mind</h3>
          <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest max-w-2xl mx-auto mb-12 leading-relaxed">
            Clear practices for both professionals and their clients.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { i: '🛡️', t: 'Privacy by design', d: 'We collect only what we need and never sell your data. Privacy policy coming before launch.' },
              { i: '🔑', t: 'Secure sign-in', d: 'Passwords are hashed and sessions use secure, HTTP-only cookies.' },
              { i: '✅', t: 'Identity checks', d: 'Optional identity verification for professionals, rolling out in stages.' }
            ].map(x => (
              <div key={x.t} className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 hover:border-green-500/40 transition">
                <span className="text-4xl block mb-4">{x.i}</span>
                <h4 className="text-lg font-black uppercase tracking-tight mb-2">{x.t}</h4>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <p className="text-green-500 font-black text-[10px] text-center uppercase tracking-widest mb-2">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase text-center tracking-tighter mb-3">Simple, honest pricing</h2>
          <p className="text-center text-sm text-slate-400 mb-10">Start free. Upgrade when your business grows.</p>

          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={`text-xs font-bold uppercase tracking-wider ${billingCycle === 'monthly' ? 'text-green-400' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              aria-label="Toggle billing cycle"
              className="w-14 h-7 bg-slate-900 border border-slate-700 rounded-full p-1 transition-all flex items-center"
            >
              <div className={`h-5 w-5 rounded-full bg-green-500 transition-all duration-300 transform ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-bold uppercase tracking-wider ${billingCycle === 'yearly' ? 'text-green-400' : 'text-slate-500'}`}>
              Yearly <span className="ml-1 text-[9px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">SAVE 20%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col">
              <h3 className="text-sm font-bold text-slate-300">Starter</h3>
              <div className="mt-4 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">£0</span>
                <span className="text-sm text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mb-6 h-4"></p>
              <ul className="text-sm text-slate-300 space-y-3 mb-8 flex-1">
                <li>✓ 1 professional profile</li>
                <li>✓ Marketplace listing</li>
                <li>✓ Manual bookings</li>
              </ul>
              <button onClick={() => openRegister('pro')} className="w-full py-3 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition">Start free</button>
            </div>

            <div className="p-8 rounded-3xl border-2 border-green-600 bg-slate-900 flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Most popular</span>
              <h3 className="text-sm font-bold text-green-400">Professional</h3>
              <div className="mt-4 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{billingCycle === 'monthly' ? '£12' : '£10'}</span>
                <span className="text-sm text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mb-6 h-4">{billingCycle === 'yearly' ? 'Billed £115 yearly' : ''}</p>
              <ul className="text-sm text-slate-300 space-y-3 mb-8 flex-1">
                <li>✓ Everything in Starter</li>
                <li>✓ Website builder</li>
                <li>✓ Online booking and calendar</li>
                <li>✓ Priority in local search</li>
              </ul>
              <button onClick={() => openRegister('pro')} className="w-full py-3 text-xs font-black uppercase tracking-wider bg-green-600 hover:bg-green-500 rounded-xl text-white transition">Get Professional</button>
            </div>

            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col">
              <h3 className="text-sm font-bold text-slate-300">Business</h3>
              <div className="mt-4 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{billingCycle === 'monthly' ? '£29' : '£23'}</span>
                <span className="text-sm text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mb-6 h-4">{billingCycle === 'yearly' ? 'Billed £278 yearly' : ''}</p>
              <ul className="text-sm text-slate-300 space-y-3 mb-8 flex-1">
                <li>✓ Everything in Professional</li>
                <li>✓ Up to 10 staff profiles</li>
                <li>✓ Multiple locations</li>
                <li>✓ Priority support</li>
              </ul>
              <button onClick={() => alert("Thanks. We'll be in touch soon.")} className="w-full py-3 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition">Contact us</button>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-white pt-20 pb-12 px-5 sm:px-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-900 pb-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-3xl font-black mb-4 italic tracking-tighter text-green-500">{businessName}</h4>
            <p className="text-slate-500 max-w-sm mb-6 text-xs font-medium uppercase tracking-wider leading-relaxed">{marketingText}</p>
            <div className="flex max-w-sm bg-slate-900 rounded-2xl p-1 border border-slate-800 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
              <input placeholder="Email for updates" className="bg-transparent border-0 px-4 py-2 w-full text-xs font-bold outline-none text-white placeholder:text-slate-600" />
              <button onClick={() => alert('Thanks. Newsletter sign-up is coming soon.')} className="bg-green-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-green-500 transition-all">Join</button>
            </div>
          </div>

          <div>
            <h5 className="font-black mb-4 uppercase text-[10px] tracking-widest text-slate-500">Explore</h5>
            <ul className="space-y-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
              <li><a href="#who-its-for" className="hover:text-green-500 transition-colors">Who it's for</a></li>
              <li><a href="#marketplace-feed" className="hover:text-green-500 transition-colors">Marketplace</a></li>
              <li><a href="#pricing" className="hover:text-green-500 transition-colors">Pricing</a></li>
              <li><button onClick={() => openRegister('pro')} className="hover:text-green-500 transition-colors text-left">Join as a professional</button></li>
              <li><button onClick={() => openRegister('client')} className="hover:text-green-500 transition-colors text-left">Create client account</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black mb-4 uppercase text-[10px] tracking-widest text-slate-500">Support hours</h5>
            <ul className="space-y-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <li className="flex justify-between"><span>Mon - Fri</span> <span className="text-white">09:00 - 19:00</span></li>
              <li className="flex justify-between"><span>Saturday</span> <span className="text-white">10:00 - 17:00</span></li>
              <li className="flex justify-between"><span>Sunday</span> <span className="text-slate-600">Closed</span></li>
              <li className="pt-4 text-[10px] italic text-slate-500 tracking-normal normal-case font-mono">{location}</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] text-center">
            © 2026 {businessName} • London
          </div>
          <div className="flex gap-6 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setActiveModal(null)} className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-2xl z-10 max-h-[90vh] overflow-y-auto scrollbar-hide text-white">

            <button onClick={() => setActiveModal(null)} className="absolute top-5 right-5 text-slate-500 hover:text-white font-mono text-xs uppercase tracking-widest transition z-20">
              Close ✕
            </button>

            {activeModal === 'login' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-1 mt-4">WELCOME BACK</h3>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-6">Sign in to your account</p>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                    <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 text-white" placeholder="name@domain.com" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                      <button type="button" onClick={() => setActiveModal('reset')} className="text-[9px] font-black uppercase tracking-widest text-green-500 hover:underline">Forgot?</button>
                    </div>
                    <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 text-white" placeholder="••••••••" />
                  </div>

                  {loginError && (
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">⚠️ {loginError}</p>
                  )}

                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition active:scale-95 mt-2">Log in</button>
                </form>
                <p className="text-[10px] text-slate-500 mt-6 text-center font-medium">
                  New here? <button onClick={() => setActiveModal('register')} className="text-green-500 hover:underline font-bold">Create an account</button>
                </p>
              </div>
            )}

            {activeModal === 'register' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-1 mt-4">CREATE ACCOUNT</h3>

                <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800/60 my-3">
                  <button type="button" onClick={() => setRegistrationType('pro')} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'pro' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>🛠 Professional</button>
                  <button type="button" onClick={() => setRegistrationType('client')} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'client' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>🛒 Client</button>
                </div>

                <div className="mb-4">
                  <label className="block text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest mb-1.5">Region</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTargetRegion('UK')} className={`py-2 text-xs font-bold rounded-xl border ${targetRegion === 'UK' ? 'border-green-500 bg-green-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>United Kingdom</button>
                    <button type="button" onClick={() => setTargetRegion('NG')} className={`py-2 text-xs font-bold rounded-xl border ${targetRegion === 'NG' ? 'border-green-500 bg-green-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>Nigeria / Africa</button>
                  </div>
                </div>

                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{registrationType === 'pro' ? 'Business name' : 'Full name'}</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 text-white" />
                  </div>

                  {registrationType === 'pro' && (
                    <>
                      <select value={regCategory} onChange={(e) => setRegCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white">
                        {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Your skill (e.g. Photographer)" required value={regSkill} onChange={(e) => setRegSkill(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                        <input type="text" placeholder="Rate" required value={regRate} onChange={(e) => setRegRate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      </div>
                    </>
                  )}

                  <input type="email" placeholder="Email address" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <input type="password" placeholder="Password (min 8 characters)" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />

                  {targetRegion === 'UK' ? (
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="Address" className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} />
                      <input type="text" placeholder="Postcode" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase" value={regPostcode} onChange={(e) => setRegPostcode(e.target.value)} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setVerificationMethod('nin')} className={`py-1.5 text-[10px] font-black uppercase rounded-lg border ${verificationMethod === 'nin' ? 'border-green-500 bg-green-500/20 text-white' : 'border-slate-800 text-slate-400'}`}>NIN</button>
                        <button type="button" onClick={() => setVerificationMethod('bvn')} className={`py-1.5 text-[10px] font-black uppercase rounded-lg border ${verificationMethod === 'bvn' ? 'border-green-500 bg-green-500/20 text-white' : 'border-slate-800 text-slate-400'}`}>BVN</button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder={verificationMethod === 'nin' ? "11-digit National ID Number" : "11-digit Bank Verification Number"}
                        value={idNumberInput}
                        onChange={(e) => setIdNumberInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest"
                      />
                    </div>
                  )}

                  {regError && (
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">⚠️ {regError}</p>
                  )}

                  <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-xs uppercase hover:bg-green-500 transition">Create account</button>
                </form>
                <p className="text-[10px] text-slate-500 mt-6 text-center font-medium">
                  Already registered? <button onClick={() => setActiveModal('login')} className="text-green-500 hover:underline font-bold">Log in</button>
                </p>
              </div>
            )}

            {activeModal === 'reset' && (
              <div>
                <h3 className="text-2xl font-black italic tracking-tighter text-green-500 mb-1 mt-4 uppercase">Reset password</h3>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-8">Password recovery is not available yet</p>
                <form onSubmit={(e) => { e.preventDefault(); alert("Password recovery is coming soon. Please contact support."); setActiveModal('login'); }} className="space-y-6">
                  <input type="email" placeholder="Your email" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition">Request reset</button>
                </form>
                <button onClick={() => setActiveModal('login')} className="mt-6 w-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Back to log in</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}