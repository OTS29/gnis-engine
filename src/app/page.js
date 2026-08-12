'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added for seamless Next.js navigation
import { gsap } from 'gsap';
import { login, signup, verifyOTP } from './auth/action';

// FIX 1: Moved static asset data OUTSIDE the component to prevent re-allocation on every render pass
const realUserReviews = [
  { id: 1, text: "GNIS single-handedly automated my entire routing matrix, calendar synchronization, and customer booking pipelines within London.", user: "Jordan Cuts", type: "Service Pro Node" },
  { id: 2, text: "The automated retainer invoicing system processes payments instantly. My clients feel completely secure with the transparency layers.", user: "Sparky Dan", type: "Enterprise Operator" },
  { id: 3, text: "Data protection rules kept my corporate client list safe. Moving my logistics data block here was the best choice I made this year.", user: "Clean Queen", type: "Independent Brand" }
];

export default function LandingPage() {
  const router = useRouter(); // Initialize the Next.js router
  const [isDarkMode, setIsDarkMode] = useState(true); 
  const videoRef = useRef(null);

  // --- GSAP ANIMATION REFS ---
  const heroBadgeRef = useRef(null);
  const heroHeadingRef = useRef(null);
  const heroSubtextRef = useRef(null);
  const heroButtonRef = useRef(null);

  // --- PLATFORM SYSTEMS & MARKETPLACE DATA ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNetworkLoad, setActiveNetworkLoad] = useState(142);
  const [activeModal, setActiveModal] = useState(null); // 'login', 'register', 'verify', 'reset'
  const [registrationType, setRegistrationType] = useState('pro'); 

  // --- AUTH & IDENTITY STATE ---
  const [currentUser, setCurrentUser] = useState(null); 
  const [tempUser, setTempUser] = useState(null); 

  // LIVE DATABASE PIPELINE FEEDBACK STATES
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [regError, setRegError] = useState('');

  // Dynamic Marketplace Database State
  const [allPros, setAllPros] = useState([
    { id: 1, name: "Jordan Cuts", skill: "Barber", area: "SE1", rate: "£25", availability: "Immediate" },
    { id: 2, name: "Sparky Dan", skill: "Electrician", area: "N1", rate: "£40/hr", availability: "Booked" },
    { id: 3, name: "Clean Queen", skill: "Cleaner", area: "E1", rate: "£15/hr", availability: "Immediate" },
  ]);

  // --- BUSINESS CONTENT STATES ---
  const [businessName, setBusinessName] = useState("GNIS ENGINE");
  const [marketingText, setMarketingText] = useState("The world's most powerful AI-driven business operating system.");
  const [location, setLocation] = useState("London, United Kingdom");

  // --- AI PREVIEW OPERATOR STATES ---
  const [services, setServices] = useState([
    { id: 1, name: 'Standard Haircut', price: 25 }
  ]);
  const [aiFeatures, setAiFeatures] = useState({ showGallery: true, showStaff: true, showBooking: true });
  const [aiSelectedServices, setAiSelectedServices] = useState([]);

  // --- REGISTRATION PARAMETER CAPTURE STATES ---
  const [regName, setRegName] = useState('');
  const [regSkill, setRegSkill] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState(''); 
  const [regPostcode, setRegPostcode] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRate, setRegRate] = useState('£25');
  
  // Global Identity Verification Tracking States
  const [targetRegion, setTargetRegion] = useState('UK'); 
  const [verificationMethod, setVerificationMethod] = useState('document'); 
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
    const reviewTimer = setInterval(() => {
      setActiveReviewIndex((prevIndex) => (prevIndex + 1) % realUserReviews.length);
    }, 4000);
    return () => clearInterval(reviewTimer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  // --- HANDLERS & OPERATIONS ---
  const toggleAiService = (name, price) => {
    if (aiSelectedServices.find(s => s.name === name)) {
      setAiSelectedServices(aiSelectedServices.filter(s => s.name !== name));
    } else {
      setAiSelectedServices([...aiSelectedServices, { name, price }]);
    }
  };

  const applyAiGeneration = () => {
    if (aiSelectedServices.length === 0) return alert("Please select at least one service!");
    const generated = aiSelectedServices.map(s => ({ id: Math.random(), ...s }));
    setServices(generated);
    setMarketingText(`Premium ${aiSelectedServices.map(s => s.name.toLowerCase()).join(' & ')} services by ${businessName}.`);
    alert("AI has updated your website configuration successfully!");
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Production Identity Initialization Pipeline (Supabase Handshake)
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
      
      if (result?.error) {
        throw new Error(result.error);
      }

      setTempUser({
        name: regName,
        email: regEmail,
        region: targetRegion,
        skill: regSkill,
        rate: regRate,
        area: targetRegion === 'UK' ? regPostcode.toUpperCase() : 'NG Node'
      });

      setActiveModal('verify');

    } catch (err) {
      setRegError(err.message);
      alert(`Identity initialization failure: ${err.message}`);
    }
  };

  // Operational OTP Token Decryption Vector
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    const inputElements = e.target.querySelectorAll('input');
    const combinedToken = Array.from(inputElements).map(input => input.value).join('');

    if (combinedToken.length < 6) {
      alert("Verification sequence incomplete. Ensure all 6 channels are entered.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', tempUser?.email);
      formData.append('token', combinedToken);

      const result = await verifyOTP(formData);

      if (result?.error) {
        throw new Error(result.error);
      }

      // FIX 2: Added absolute type protection to prevent undefined reading errors
      if (registrationType === 'pro' && tempUser) {
        const structuralRate = String(tempUser.rate || '£25');
        const newPro = {
          id: allPros.length + 1,
          name: tempUser.name || 'Anonymous Node',
          skill: tempUser.skill || "General Provider",
          area: tempUser.area || 'Global Node',
          rate: structuralRate.startsWith('£') ? structuralRate : `£${structuralRate}`,
          availability: "Immediate"
        };
        setAllPros([newPro, ...allPros]);
      }

      setCurrentUser(result.user || { email: tempUser?.email });
      alert(`Identity Verified and Database Node synchronized successfully! Welcome to the GNIS Mesh, ${tempUser?.name || ''}.`);
      
      setActiveModal(null);
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegSkill(''); setRegPostcode(''); setRegAddress(''); setIdNumberInput('');
      
    } catch (err) {
      setRegError(err.message);
      alert(`Pipeline Verification Failed: ${err.message}`);
    }
  };


  // Production Login Authentication Pipeline (Supabase Engine)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const formData = new FormData();
      formData.append('email', loginEmail);
      formData.append('password', loginPassword);

      const result = await login(formData);

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.user) {
        setCurrentUser(result.user);
        
        // 1. Extract the secure role configuration directly from the metadata layer
        const userRole = result.user.user_metadata?.role || 'customer';
        
        alert("Authentication verified successfully. Authorization granted.");
        setActiveModal(null);
        
        // 2. Strict Architectural Separation Layer
        if (userRole === 'pro' || userRole === 'admin') {
          // Service Pros and System Administrators get direct route access to the workspace engine
          router.push('/dashboard'); 
        } else {
          // Regular customers go to a separate client portal (e.g., booking logs, consumer settings)
          router.push('/portal/bookings'); 
        }
      }

    } catch (err) {
      setLoginError(err.message || 'Authentication failed');
    }
  };
  
  // Your return ( ... ) block stays exactly as it is below this line
  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      
      <style jsx global>{`
        .glass { 
          background: ${isDarkMode ? 'rgba(9, 15, 29, 0.8)' : 'rgba(255, 255, 255, 0.8)'}; 
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .gradient-bg { 
          background: ${isDarkMode ? 'radial-gradient(circle at top, #14532d10 0%, #020617 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fdf2f8 100%)'}; 
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- LIVE TELEMETRY RUNTIME RUNWAY --- */}
      <div className="bg-green-950/40 border-b border-green-500/10 py-2 text-center text-[9px] font-mono tracking-widest text-green-400 flex items-center justify-center gap-2 z-[110] relative">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        GNIS RUNTIME ACTIVE // {activeNetworkLoad} PROVIDERS CURRENTLY ROUTED IN SECURITY REGION
      </div>

      {/* --- GLOBAL APPLICATION NAVIGATION --- */}
      <nav className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-slate-900 w-full">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6 md:gap-8">
            <h1 className="text-3xl font-black text-green-600 tracking-tighter italic">GNIS</h1>
            {!currentUser && (
              <button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">
                Register as Pro
              </button>
            )}
            <a href="#services-matrix" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">
              Services
            </a>
            <a href="#marketplace-feed" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-green-500 transition">
              Marketplace
            </a>
          </div>
                    
          <div className="flex items-center space-x-3 md:space-x-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Account Owner</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase italic">{currentUser.name}</p>
                </div>
                <button onClick={() => setCurrentUser(null)} className="p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition text-[10px] font-black">LOGOUT</button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setActiveModal('login')}
                  className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-green-600 hover:text-white transition shadow-sm"
                >
                  Login Gateway
                </button>

                {/* NAVIGATION CONFIGURATION NOTE: 
                  - Change href="/dashboard" to your custom route (e.g. "/dashboard/builder" or "/builder") if it's on an external subpage.
                  - If you want it to jump down to the "AI Platform Builder" preview sandbox section on this page, change it to href="#services-matrix"
                */}
                <Link href="/dashboard" className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg hover:bg-green-500 transition active:scale-95">
                  Dashboard OS
                </Link>
              </>
            )}

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 transition-all hover:bg-green-600/20 text-xs"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO BRAND LAYER --- */}
      <header className="pt-24 pb-16 text-center max-w-4xl mx-auto px-6 gradient-bg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/5 blur-[100px] rounded-full -z-10 animate-pulse"></div>
        <div ref={heroBadgeRef} className="inline-block px-4 py-1.5 mb-6 rounded-full bg-green-100 dark:bg-green-950/40 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-mono font-black uppercase tracking-wider">
          v3.0 Engine Operational // Global Mesh Routing Active
        </div>
        <h2 ref={heroHeadingRef} className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
          Run Your Entire Service Business.<br/><span className="text-green-600">ON AUTO-PILOT.</span>
        </h2>
        <p ref={heroSubtextRef} className="mt-6 text-sm md:text-base font-bold uppercase tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
          {marketingText}
        </p>
        <div ref={heroButtonRef} className="mt-10 flex justify-center gap-4">
          <button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-500 transition shadow-xl shadow-green-600/10 active:scale-95">
            Start Your Free Trial
          </button>
        </div>
      </header>

      {/* --- THE PRO ENGINE TEASER COMMAND MATRIX --- */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-900/20 border-y border-gray-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            
            {/* Left Side Container Frame */}
            <div className="w-full">
              <div className="bg-white dark:bg-slate-950 p-4 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-slate-900 md:rotate-2 hover:rotate-0 transition-transform duration-500">
                 <div className="group relative overflow-hidden p-10 bg-green-600 rounded-[2.5rem] shadow-xl">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                      <span className="text-3xl mb-4 block">🤖</span>
                      <h3 className="text-white text-3xl font-black italic tracking-tighter uppercase">AI Twin Engine</h3>
                      <p className="text-green-100 text-xs mt-1 uppercase font-mono tracking-widest opacity-90">Autonomous Booking & Surge Analytics</p>
                      <div className="mt-8 inline-flex items-center text-[9px] font-black text-white bg-slate-950/30 px-6 py-2.5 rounded-full uppercase tracking-widest border border-white/10">
                        Operational Sandbox Layer
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Right Side Structural Copy */}
            <div className="w-full space-y-6">
              <p className="text-green-500 font-black text-[10px] uppercase tracking-widest">Autonomous Infrastructure</p>
              <h3 className="text-4xl font-black italic text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                Manage your enterprise on <span className="text-green-500">Your terms.</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                GNIS operators deploy an immutable digital identity layer. It acts as an autonomous digital operator—processing calendar scheduling matrix arrays, Retainers, and smart workflows 24/7.
              </p>
              <button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="inline-block bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">
                Create Pro Ledger
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* --- LIVE INTERACTIVE AI GENERATOR SANDBOX --- */}
      <section id="services-matrix" className="py-24 max-w-6xl mx-auto px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-8 md:p-14 shadow-2xl relative">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <span className="text-green-500 font-mono text-[9px] tracking-widest uppercase block mb-1 animate-pulse">// REAL-TIME EXPERIMENTAL ENGINE</span>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">✨ AI Platform Builder</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-xs font-medium uppercase tracking-wider md:text-right">
                Modify variables inside the sandbox matrix to preview live architecture generation vectors.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-3">Step 1: Map Fleet Service Nodes</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Skin Fade', 'Full Color', 'Beard Sculpt', 'Massage', 'Manicure', 'Consultation'].map(sName => (
                      <button 
                        key={sName}
                        onClick={() => toggleAiService(sName, 30)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${aiSelectedServices.find(s => s.name === sName) ? 'bg-green-600 text-white border border-green-500' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
                      >
                        {sName}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-3">Step 2: Append Functional Elements</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(aiFeatures).map(f => (
                      <label key={f} className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-800/50 transition">
                        <input type="checkbox" checked={aiFeatures[f]} onChange={() => setAiFeatures({...aiFeatures, [f]: !aiFeatures[f]})} className="accent-green-500 w-4 h-4 rounded" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-300">{f.replace('show', '')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Layout Controller Screen */}
              <div className="bg-slate-950 rounded-[2.5rem] p-6 border border-slate-800 shadow-inner flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-900 mb-4">
                    <h4 className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">Live Operations Matrix</h4>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-2 scrollbar-hide">
                    {services.map(s => (
                      <div key={s.id} className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <input 
                          className="bg-transparent border-b border-slate-800 text-sm font-bold flex-1 focus:outline-none focus:border-green-500 text-white" 
                          value={s.name} 
                          onChange={(e) => updateService(s.id, 'name', e.target.value)}
                        />
                        <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                          <span className="text-xs font-bold text-slate-500 mr-1">£</span>
                          <input 
                            type="number" 
                            className="bg-transparent w-8 text-sm focus:outline-none font-black text-green-400" 
                            value={s.price} 
                            onChange={(e) => updateService(s.id, 'price', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={applyAiGeneration} className="w-full mt-6 bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-lg">
                  Deploy Generated Blueprint
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE DEMAND MARKETPLACE ROUTING ENGINE FEED --- */}
      <section id="marketplace-feed" className="max-w-6xl mx-auto py-12 px-6 border-t border-slate-900">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-green-500 font-black text-[10px] uppercase tracking-widest mb-2">Decentralized Procurement Feed</p>
            <h3 className="text-4xl font-black italic tracking-tighter uppercase">Local Marketplace Nodes</h3>
          </div>
          
          {/* Dynamic Search Vector Block */}
          <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center border border-slate-800 shadow-xl focus-within:ring-2 focus-within:ring-green-500/30 w-full max-w-sm transition-all">
            <input 
              type="text" 
              placeholder="Filter by Skill, Postcode Area, Name..." 
              className="bg-transparent px-4 py-2 text-xs font-bold outline-none text-white w-full placeholder:text-slate-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white text-[10px] font-mono tracking-wider px-2">
                ✕
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-900/30 rounded-[2.5rem] p-12 text-center border border-slate-800 max-w-xl mx-auto">
            <p className="text-xl font-black italic text-slate-400 mb-2 uppercase tracking-tight">No Active Node Matches In Vector</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-6">No direct match data found for parameters: "{searchQuery}"</p>
            <button 
              onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }}
              className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition"
            >
              Register & Deploy This Missing Skill Block
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(pro => (
              <div key={pro.id} className="bg-slate-900/60 p-8 rounded-[3rem] border border-slate-900 hover:border-green-500/30 transition-all flex flex-col justify-between min-h-[240px]">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xl font-black tracking-tight text-white">{pro.name}</h4>
                    <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">
                      {pro.availability}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-wider mt-1">📍 {pro.area} • {pro.skill}</p>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-800/50 mt-6">
                  <p className="text-lg font-black tracking-tight text-white">{pro.rate}</p>
                  <button onClick={() => alert(`Connecting securely to execution endpoint: Node ${pro.id}`)} className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 hover:text-white transition tracking-wider">
                    Secure Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* --- TELEMETRY VIDEO ARCHITECTURE PREVIEW --- */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-slate-900 bg-black aspect-video">
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover opacity-80" 
            autoPlay loop muted playsInline
          >
            <source src="/Users/admin/Desktop/" type="video/quicktime" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-8 md:p-14">
            <div className="text-white">
               <span className="text-green-500 font-mono text-[9px] tracking-widest uppercase block mb-1">// STREAMING DOCUMENTATION VECTOR</span>
               <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">See GNIS in Real Time Action</h3>
               <p className="opacity-60 text-xs max-w-md font-medium mt-2 leading-relaxed">
                 Explore the unified system flow overview detailing pipeline adjustments, style generation tools, and direct user scheduling arrays.
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- AUTO-DISPLAYING REAL USER TESTIMONIAL LOOPS --- */}
      <section className="py-16 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-y border-slate-900 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-green-500 font-mono text-[9px] tracking-widest uppercase block mb-4">// GNIS REAL OPERATOR VERIFIED FEED</span>
          <div className="min-h-[110px] flex flex-col justify-center transition-all duration-500 transform">
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

      {/* --- BOLD DATA PRIVACY & SAFETY COMPLIANCE MATRIX --- */}
      <section className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-green-950/30 border border-green-500/20 text-green-400 text-[9px] font-mono font-black uppercase tracking-widest mb-4">
            🔒 High-Risk End-User Protection Standard
          </div>
          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4">
            PRIVACY, SAFETY, & DATA TRUST VECTOR
          </h3>
          <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest max-w-2xl mx-auto mb-14 leading-relaxed">
            GNIS integrates structural security layers ensuring both business operations (B2B) and consumers (B2C) maintain total privacy compliance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 hover:border-green-500/40 transition-all duration-300 group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">🛡️</span>
              <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">GDPR & UK COMPLIANT</h4>
              <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                Complete absolute data protection. End-user personal schedules and identity archives are anonymized with strict storage protocols.
              </p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 hover:border-green-500/40 transition-all duration-300 group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">🔑</span>
              <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">256-BIT LEDGER PROTECTION</h4>
              <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                Immutable transaction nodes. High-tier secure protocols completely encapsulate financial logs, preventing third-party tracking.
              </p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 hover:border-green-500/40 transition-all duration-300 group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">🔒</span>
              <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">ZERO-KNOWLEDGE VAULT</h4>
              <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                Isolated system parameters. Consumer locations, addresses, and rates are strictly visible only to approved active endpoints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- TIERS & SUBSCRIPTION SPECIFICATIONS --- */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-green-500 font-black text-[10px] text-center uppercase tracking-widest mb-2">Flexible Subscription Plans</p>
          <h2 className="text-4xl font-black italic uppercase text-center tracking-tighter mb-6">Simple transparent packages</h2>
          
          <div className="flex justify-center items-center gap-4 mb-16">
            <span className={`text-xs font-black uppercase tracking-wider ${billingCycle === 'monthly' ? 'text-green-500' : 'text-slate-500'}`}>Monthly Billing</span>
            <button 
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="w-14 h-7 bg-slate-900 border border-slate-800 rounded-full p-1 transition-all flex items-center"
            >
              <div className={`h-5 w-5 rounded-full bg-green-500 transition-all duration-300 transform ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-black uppercase tracking-wider ${billingCycle === 'yearly' ? 'text-green-500' : 'text-slate-500'}`}>Yearly Billing <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">SAVE 20%</span></span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="p-8 rounded-[2.5rem] border border-slate-900 bg-slate-900/40 hover:scale-105 hover:border-green-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[440px]">
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Free Basic Plan</h3>
                <div className="my-6">
                  <span className="text-5xl font-black tracking-tight">£0</span>
                  <span className="text-xs font-mono text-slate-500">/mo</span>
                </div>
                <ul className="text-xs uppercase font-bold tracking-wider text-slate-500 space-y-3 mb-8 border-t border-slate-900 pt-6">
                  <li>• 1 Service Provider Profile</li>
                  <li>• Standard Marketplace Listing</li>
                  <li>• Manual Booking Controls</li>
                  <li>• Basic Matrix Dashboard</li>
                </ul>
              </div>
              <button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="block w-full py-4 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-center rounded-xl border border-slate-800 text-white transition">Deploy Basic Node</button>
            </div>
            
            <div className="p-10 rounded-[3rem] border-4 border-green-600 bg-slate-900 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer relative flex flex-col justify-between min-h-[480px]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Most Popular Plan</div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-green-400">Professional Plan</h3>
                <div className="my-6">
                  <span className="text-5xl font-black tracking-tight">
                    {billingCycle === 'monthly' ? '£29' : '£23'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/mo</span>
                </div>
                <ul className="text-xs uppercase font-bold tracking-wider text-slate-300 space-y-3 mb-8 border-t border-slate-800 pt-6">
                  <li className="text-green-400">• Full AI Platform Builder Access</li>
                  <li>• Autonomous Twin Booking Engine</li>
                  <li>• Smart Ledger & Secure Retainers</li>
                  <li>• Priority Regional Postcode Match</li>
                </ul>
              </div>
              <button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="block w-full py-4 text-xs font-black uppercase tracking-wider bg-green-600 hover:bg-green-500 text-white text-center rounded-xl transition shadow-lg shadow-green-600/20">Initialize Enterprise Sandbox</button>
            </div>

            <div className="p-8 rounded-[2.5rem] border border-slate-900 bg-slate-900/40 hover:scale-105 hover:border-green-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[440px]">
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Enterprise Growth Plan</h3>
                <div className="my-6">
                  <span className="text-5xl font-black tracking-tight">
                    {billingCycle === 'monthly' ? '£89' : '£71'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">/mo</span>
                </div>
                <ul className="text-xs uppercase font-bold tracking-wider text-slate-500 space-y-3 mb-8 border-t border-slate-900 pt-6">
                  <li>• Unlimited Multi-Staff Profiles</li>
                  <li>• Multi-Region Postcode Mesh Routing</li>
                  <li>• Zero-Knowledge Isolation Storage</li>
                  <li>• 24/7 Dedicated Support Link</li>
                </ul>
              </div>
              <button onClick={() => alert("Securing communication vector with Sales Division...")} className="block w-full py-4 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-center rounded-xl border border-slate-800 text-white transition">Request Vector Consultation</button>
            </div>
          </div>
        </div>
      </section>

      {/* --- PLATFORM FOOTER LAYOUT --- */}
      <footer className="bg-slate-950 text-white pt-24 pb-12 px-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-900 pb-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-3xl font-black mb-4 italic tracking-tighter text-green-500">{businessName}</h4>
            <p className="text-slate-500 max-w-sm mb-6 text-xs font-medium uppercase tracking-wider leading-relaxed">{marketingText}</p>
            <div className="flex max-w-sm bg-slate-900 rounded-2xl p-1 border border-slate-800 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
              <input placeholder="Email for VIP updates" className="bg-transparent border-0 px-4 py-2 w-full text-xs font-bold focus:ring-0 outline-none text-white placeholder:text-slate-600" />
              <button className="bg-green-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-green-500 transition-all">Join</button>
            </div>
          </div>
          
          <div>
            <h5 className="font-black mb-4 uppercase text-[10px] tracking-widest text-slate-500">Navigation Matrix</h5>
            <ul className="space-y-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
              <li><a href="#services-matrix" className="hover:text-green-500 transition-colors">Services Nodes</a></li>
              <li><a href="#marketplace-feed" className="hover:text-green-500 transition-colors">Marketplace Node</a></li>
              <li><button onClick={() => { setRegistrationType('pro'); setActiveModal('register'); }} className="hover:text-green-500 transition-colors text-left">Deploy Pro Fleet</button></li>
              <li><button onClick={() => { setRegistrationType('client'); setActiveModal('register'); }} className="hover:text-green-500 transition-colors text-left">Setup Account</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black mb-4 uppercase text-[10px] tracking-widest text-slate-500">Operations Area</h5>
            <ul className="space-y-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <li className="flex justify-between"><span>Mon - Fri</span> <span className="text-white">09:00 - 19:00</span></li>
              <li className="flex justify-between"><span>Saturday</span> <span className="text-white">10:00 - 17:00</span></li>
              <li className="flex justify-between"><span>Sunday</span> <span className="text-slate-700">Offline</span></li>
              <li className="pt-4 text-[10px] italic text-slate-500 tracking-normal normal-case font-mono">{location}</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
            © 2026 {businessName} • Built with GNIS ENGINE v3.0 • London
          </div>
          <div className="flex gap-6 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <a href="#" className="hover:text-white">Privacy Vector</a>
            <a href="#" className="hover:text-white">Terms of Runtime</a>
          </div>
        </div>
      </footer>

      {/* --- GLOBAL POPUP SYSTEM PORTAL OVERLAY --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setActiveModal(null)} className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 z-10 max-h-[90vh] overflow-y-auto scrollbar-hide text-white">
            
            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white font-mono text-sm uppercase tracking-widest transition z-20">
              Close ✕
            </button>

            {/* --- LOGIN GATEWAY --- */}
            {activeModal === 'login' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-1">WELCOME BACK</h3>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-6">GNIS Secure Access Gateway</p>
                
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identity Email</label>
                    <input 
                      type="email" 
                      required 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" 
                      placeholder="name@domain.com" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Key</label>
                      <button type="button" onClick={() => setActiveModal('reset')} className="text-[9px] font-black uppercase tracking-widest text-green-500 hover:underline">Forgot?</button>
                    </div>
                    <input 
                      type="password" 
                      required 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-medium" 
                      placeholder="••••••••" 
                    />
                  </div>

                  {loginError && (
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                      ⚠️ {loginError}
                    </p>
                  )}

                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition shadow-lg active:scale-95 mt-2">
                    Log in
                  </button>
                </form>
                <p className="text-[10px] text-slate-500 mt-6 text-center font-medium">
                  New operator? <button onClick={() => setActiveModal('register')} className="text-green-500 hover:underline font-bold">Create account to log in</button>
                </p>
              </div>
            )}

            {/* --- REGISTER LAYER --- */}
            {activeModal === 'register' && (
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-green-500 mb-1">INITIALIZE IDENTITY</h3>
                
                <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800/60 my-3">
                  <button type="button" onClick={() => setRegistrationType('pro')} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'pro' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>🛠 Service Pro</button>
                  <button type="button" onClick={() => setRegistrationType('client')} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${registrationType === 'client' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>🛒 Client / Booker</button>
                </div>

                <div className="mb-4">
                  <label className="block text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest mb-1.5">Select Operational Jurisdiction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTargetRegion('UK')} className={`py-2 text-xs font-bold rounded-xl border ${targetRegion === 'UK' ? 'border-green-500 bg-green-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>United Kingdom (UK)</button>
                    <button type="button" onClick={() => setTargetRegion('NG')} className={`py-2 text-xs font-bold rounded-xl border ${targetRegion === 'NG' ? 'border-green-500 bg-green-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}>Nigeria / Africa</button>
                  </div>
                </div>
                
                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{registrationType === 'pro' ? 'Brand Name' : 'Full Name'}</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50 text-white" />
                  </div>
                  {registrationType === 'pro' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Skill" required value={regSkill} onChange={(e) => setRegSkill(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      <input type="text" placeholder="Rate" required value={regRate} onChange={(e) => setRegRate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                    </div>
                  )}
                  <input type="email" placeholder="Email Address" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <input type="password" placeholder="Create Password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  
                  {targetRegion === 'UK' ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                        🛡️ Address fields subject to automatic Royal Mail Postcode Validation. Professional right-to-work parameters checked natively via Home Office.
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="text" placeholder="UK Address" className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} />
                        <input type="text" placeholder="Postcode" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase" value={regPostcode} onChange={(e) => setRegPostcode(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                        🇳🇬 Security Anchor: Select Identity Verification Framework linked securely to central national nodes.
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setVerificationMethod('nin')} className={`py-1.5 text-[10px] font-black uppercase rounded-lg border ${verificationMethod === 'nin' ? 'border-green-500 bg-green-500/20 text-white' : 'border-slate-800 text-slate-400'}`}>NIN (NIMC)</button>
                        <button type="button" onClick={() => setVerificationMethod('bvn')} className={`py-1.5 text-[10px] font-black uppercase rounded-lg border ${verificationMethod === 'bvn' ? 'border-green-500 bg-green-500/20 text-white' : 'border-slate-800 text-slate-400'}`}>BVN (Anti-Fraud)</button>
                      </div>
                      <input 
                        type="text" 
                        required 
                        placeholder={verificationMethod === 'nin' ? "Enter 11-Digit National ID Number" : "Enter 11-Digit Bank Verification Number"} 
                        value={idNumberInput}
                        onChange={(e) => setIdNumberInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest" 
                      />
                    </div>
                  )}

                  <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-xs uppercase hover:bg-green-500 transition">Register & Send Secure Link</button>
                </form>
              </div>
            )}

            {/* --- VERIFICATION LAYER --- */}
            {activeModal === 'verify' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">{tempUser?.region === 'UK' ? '📩' : '💬'}</span>
                </div>
                
                {tempUser?.region === 'UK' ? (
                  <>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Check Identity Channel</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">We dispatched a 6-digit verification code to <br/><span className="text-green-500 font-mono lowercase">{tempUser?.email}</span></p>
                    <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-6">
                      📍 UK PROTOCOL ACTIVE: Driver's License or Passport vector scanning pending validation through Stripe Identity / Onfido parameters.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Verify WhatsApp Vector</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">OTP Transmitted securely via WhatsApp system node to bypass localized data latency.</p>
                    <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-6">
                      🇳🇬 REGIONAL SECURITY LAYER: Verification payload routing parameters cross-referenced through NIMC structural records.
                    </p>
                  </>
                )}
                
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {[1,2,3,4,5,6].map(i => (
                      <input key={i} type="text" maxLength={1} className="w-10 h-12 bg-slate-950 border border-slate-800 rounded-lg text-center font-black text-lg focus:border-green-500 outline-none text-white" />
                    ))}
                  </div>
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition">Verify Account</button>
                </form>
                <button className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Resend Dispatch Signal</button>
              </div>
            )}

            {/* --- PASSWORD RESET LAYER --- */}
            {activeModal === 'reset' && (
              <div>
                <h3 className="text-2xl font-black italic tracking-tighter text-green-500 mb-1 uppercase">Reset Access Key</h3>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-8">Input registered email to receive recovery link</p>
                <form onSubmit={(e) => { e.preventDefault(); alert("Recovery link dispatched to node."); setActiveModal('login'); }} className="space-y-6">
                  <input type="email" placeholder="Verification Email" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white transition">Send Recovery Vector</button>
                </form>
                <button onClick={() => setActiveModal('login')} className="mt-6 w-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Back to Gateway</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}