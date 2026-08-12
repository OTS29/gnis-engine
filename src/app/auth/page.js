'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GnisLandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNetworkLoad, setActiveNetworkLoad] = useState(142);
  const [activeModal, setActiveModal] = useState(null); // 'login', 'register', or null
  const [registrationType, setRegistrationType] = useState('pro'); // 'pro' or 'client'

  // Dynamic Marketplace Database State (Initialized with seed accounts)
  const [allPros, setAllPros] = useState([
    { id: 1, name: "Jordan Cuts", skill: "Barber", area: "SE1", rate: "£25", availability: "Immediate" },
    { id: 2, name: "Sparky Dan", skill: "Electrician", area: "N1", rate: "£40/hr", availability: "Booked" },
    { id: 3, name: "Clean Queen", skill: "Cleaner", area: "E1", rate: "£15/hr", availability: "Immediate" },
  ]);

  // Form states to capture registration data points
  const [regName, setRegName] = useState('');
  const [regSkill, setRegSkill] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPostcode, setRegPostcode] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRate, setRegRate] = useState('£25'); // Default base rate variable for new pros

  // Simulating active telemetry fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNetworkLoad(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = allPros.filter(p => 
    p.skill.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Unified Registration Handler
  const handleRegistrationSubmit = (e) => {
    e.preventDefault();
    
    const formattedPostcode = regPostcode.trim().toUpperCase();

    if (registrationType === 'pro') {
      // 1. Construct the new service provider object
      const newPro = {
        id: allPros.length + 1,
        name: regName,
        skill: regSkill || "General Provider",
        area: formattedPostcode,
        rate: regRate.startsWith('£') ? regRate : `£${regRate}`,
        availability: "Immediate"
      };

      // 2. Inject directly into the active searchable marketplace state matrix
      setAllPros([newPro, ...allPros]);
      
      // 3. Drive search matrix straight to their local postcode sector
      setSearchQuery(formattedPostcode);
      
      alert(`Pro Profile Initialized!\n${regName} is now live and searchable in ${formattedPostcode}.`);
    } else {
      // Logic space for saving customer/client parameters
      alert(`Client Account Active!\nWelcome to GNIS, ${regName}. Your dashboard feed is localized to ${formattedPostcode}.`);
    }

    // Reset Form Input State Parameters
    setRegName('');
    setRegSkill('');
    setRegEmail('');
    setRegPostcode('');
    setRegAddress('');
    setRegRate('£25');
    
    // Shut down the popup frame and scroll to view
    setActiveModal(null);
    setTimeout(() => {
      const searchSection = document.getElementById('search');
      if (searchSection) {
        searchSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-green-500 selection:text-white relative">
      
      {/* --- TELEMETRY TICKER BANNER --- */}
      <div className="bg-green-950/40 border-b border-green-500/10 py-2 text-center text-[9px] font-mono tracking-widest text-green-400 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        GNIS MATRIX RUNTIME ACTIVE // {activeNetworkLoad} SECURE PROVIDERS CURRENTLY ROUTED IN LONDON
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
        <h1 className="text-3xl font-black italic text-green-500 tracking-tighter">GNIS</h1>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden lg:flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#search" className="hover:text-white transition">Find Pros</a>
            <a href="#how" className="hover:text-white transition">How it Works</a>
          </div>

          <button 
            onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} 
            className="hidden sm:block text-[10px] font-black text-green-500 border border-green-500/30 px-4 py-2 rounded-full hover:bg-green-500 hover:text-white transition uppercase tracking-widest"
          >
            Register as Pro
          </button>

          <button 
            onClick={() => setActiveModal('login')} 
            className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black hover:bg-green-600 hover:text-white transition uppercase tracking-widest shadow-lg shadow-white/5"
          >
            Login
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-6">
          ANY SKILL.<br/><span className="text-green-500">ON DEMAND.</span>
        </h2>
        <p className="max-w-xl mx-auto text-slate-400 font-bold text-sm md:text-base mb-12 uppercase tracking-[0.2em] leading-relaxed">
          The elite marketplace for <span className="text-white">skilled workers</span> and <span className="text-white">service providers</span>.
        </p>

        {/* --- DYNAMIC SEARCH BAR --- */}
        <div id="search" className="max-w-3xl mx-auto bg-slate-900 p-2 rounded-[2.5rem] flex items-center border border-slate-800 shadow-2xl focus-within:ring-2 focus-within:ring-green-500/50 transition-all group">
          <div className="pl-6 text-slate-500 group-focus-within:text-green-500 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search 'Plumber', 'Barber', or 'Postcode'..." 
            className="flex-1 bg-transparent p-5 outline-none font-bold text-lg text-white placeholder:text-slate-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-slate-500 hover:text-white text-xs uppercase font-mono tracking-wider mr-4"
            >
              Clear ✕
            </button>
          )}
          <button className="bg-green-600 px-8 md:px-12 py-5 rounded-[2rem] font-black text-xs hover:bg-green-500 transition shadow-lg shadow-green-500/20 active:scale-95">
            FIND PRO
          </button>
        </div>
      </header>

      {/* --- MARKETPLACE SECTION --- */}
      <section className="max-w-6xl mx-auto py-10 px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-green-500 font-black text-[10px] uppercase tracking-widest mb-2">Verified Experts</p>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase">Marketplace Feed</h3>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-900/50 rounded-[2.5rem] p-12 text-center border border-slate-800/80 max-w-2xl mx-auto">
            <p className="text-2xl font-black italic text-slate-400 mb-2">No Registered Matches In Range</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">Our standard system has no matches for "{searchQuery}"</p>
            <button 
              onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }}
              className="inline-flex bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition"
            >
              Deploy GNIS AI Agent to Source Provider
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(pro => (
              <div key={pro.id} className="bg-slate-900 p-8 rounded-[3.5rem] border border-slate-800 hover:border-green-500/50 transition-all group flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-2xl font-black mb-1 group-hover:text-green-400 transition-colors tracking-tight">{pro.name}</h4>
                    <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                      pro.availability === 'Immediate' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {pro.availability}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-bold mb-6 italic tracking-wide">📍 {pro.area} • {pro.skill}</p>
                </div>
                
                <div className="flex justify-between items-center pt-6 border-t border-slate-800/50 mt-auto">
                  <p className="text-xl font-black tracking-tight">{pro.rate}</p>
                  <Link href="/dashboard" className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-green-600 hover:text-white transition shadow-sm active:scale-90 tracking-wider">
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- PRO JOIN BANNER --- */}
      <section id="how" className="max-w-6xl mx-auto mb-10 px-6 pt-10">
        <div className="bg-green-600 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 opacity-10 text-[200px] font-black italic -rotate-12 translate-x-20 group-hover:translate-x-10 transition-transform duration-1000">GNIS</div>
          <h3 className="text-4xl md:text-5xl font-black italic mb-6 tracking-tighter leading-tight text-slate-950">
            BECOME A <span className="text-white">GNIS</span> PROVIDER
          </h3>
          <p className="text-green-950 font-bold mb-10 max-w-lg mx-auto uppercase text-xs tracking-widest leading-loose">
            Join the elite network for service providers. Get your own booking engine and scale your business.
          </p>
          <button 
            onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} 
            className="inline-block bg-slate-950 text-white px-12 py-5 rounded-full font-black text-xs tracking-[0.3em] hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            REGISTER AS SERVICE PROVIDER
          </button>
        </div>
      </section>

      {/* --- PRO ENGINE DASHBOARD PREVIEW --- */}
      <section className="max-w-6xl mx-auto py-24 px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none">
            YOUR BUSINESS <br/> <span className="text-green-500">ON AUTO-PILOT.</span>
          </h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            When you register as a pro, you don't just get a profile. You get the <b>GNIS AI Twin Dashboard</b>—an autonomous command center that handles your bookings, surge pricing, and client retention while you focus on your craft.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }}
              className="text-xs font-black uppercase text-green-500 bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-xl hover:bg-green-500 hover:text-white transition"
            >
              Join as Professional
            </button>
            <button 
              onClick={() => { setRegistrationType('client'); setActiveModal('register'); }}
              className="text-xs font-black uppercase text-slate-400 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition"
            >
              Join as Standard Client
            </button>
          </div>
        </div>

        <div className="relative">
           <div className="absolute -inset-4 bg-green-500/20 blur-3xl rounded-full"></div>
           <div className="relative group overflow-hidden p-10 bg-indigo-600 rounded-[3rem] shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-white/20 p-3 rounded-2xl text-3xl">🤖</span>
                <span className="text-white text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-1 rounded-full">Dashboard Preview</span>
              </div>
              <h3 className="text-white text-4xl font-black italic tracking-tight leading-none">AI TWIN <br/> ENGINE</h3>
              <p className="text-indigo-100 text-lg mt-4 font-medium opacity-90 max-w-xs leading-snug">
                Autonomous agent handles your negotiation and scheduling 24/7.
              </p>
              <button 
                onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }}
                className="mt-8 inline-flex items-center text-xs font-black text-indigo-600 bg-white px-8 py-4 rounded-full uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                Register & Explore →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="p-12 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em]">© 2026 GNIS Elite Services • London</p>
      </footer>

      {/* --- GLOBAL POPUP SYSTEM --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setActiveModal(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 z-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
            
            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white font-mono text-sm uppercase tracking-widest transition z-20">
              Close ✕
            </button>

            {/* --- LOGIN FRAME --- */}
            {activeModal === 'login' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-2">WELCOME BACK</h3>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-6">GNIS Secure Access Gateway</p>
                
                <form onSubmit={(e) => { e.preventDefault(); alert("Authenticating account setup..."); }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identity Email</label>
                    <input type="email" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="name@domain.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                    <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="••••••••" />
                  </div>
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-500 hover:text-white transition shadow-lg active:scale-95 mt-2">
                    Authorize Login
                  </button>
                </form>
                <p className="text-[10px] text-slate-500 mt-6 text-center font-medium">
                  New operator? <button onClick={() => setActiveModal('register')} className="text-green-500 hover:underline font-bold">Create Account Ledger</button>
                </p>
              </div>
            )}

            {/* --- REGISTER FRAME (WITH ACCOUNT MODALITY TOGGLE) --- */}
            {activeModal === 'register' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-2">INITIALIZE ACCOUNT</h3>
                
                {/* INTERACTIVE MODE TOGGLE SWITCH */}
                <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800/60 my-4">
                  <button 
                    type="button"
                    onClick={() => setRegistrationType('pro')}
                    className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'pro' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    🛠 Service Pro
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRegistrationType('client')}
                    className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'client' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    🛒 Client / Booker
                  </button>
                </div>
                
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-6">
                  {registrationType === 'pro' ? 'Deploy Autonomous Booking Infrastructure' : 'Setup Standard Local Consumer Profile'}
                </p>
                
                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      {registrationType === 'pro' ? 'Professional / Brand Name' : 'Full Account Name'}
                    </label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder={registrationType === 'pro' ? "e.g., Matrix Grooming" : "John Doe"} />
                  </div>

                  {/* PRO ONLY CONDITIONALS */}
                  {registrationType === 'pro' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Core Skill / Trade</label>
                        <input type="text" required={registrationType === 'pro'} value={regSkill} onChange={(e) => setRegSkill(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="e.g., Barber, Electrician" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Baseline Cost/Rate</label>
                        <input type="text" required={registrationType === 'pro'} value={regRate} onChange={(e) => setRegRate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="e.g., £25 or £40/hr" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Email</label>
                    <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="identity@domain.com" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Address / Sector</label>
                      <input type="text" required value={regAddress} onChange={(e) => setRegAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" placeholder="100 Great Portland St" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Postcode</label>
                      <input type="text" required value={regPostcode} onChange={(e) => setRegPostcode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium uppercase font-mono tracking-wider" placeholder="W1W" maxLength={8} />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-500 transition shadow-lg shadow-green-600/10 active:scale-95 mt-4">
                    {registrationType === 'pro' ? 'Deploy Dashboard & Scan Area' : 'Initialize Client Dashboard'}
                  </button>
                </form>

                <p className="text-[10px] text-slate-500 mt-6 text-center font-medium">
                  Already verified? <button onClick={() => setActiveModal('login')} className="text-green-500 hover:underline font-bold">Enter Control Layer</button>
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}