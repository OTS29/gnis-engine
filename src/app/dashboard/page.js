'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';


export default function Home() {
  // --- SYSTEM STATES ---
  const [view, setView] = useState('dashboard'); 
  const [activeTab, setActiveTab] = useState('wizard');
  const [businessName, setBusinessName] = useState('Champion Salon');
  const [location, setLocation] = useState('123 London Way, UK');
  const [themeColor, setThemeColor] = useState('bg-indigo-600');
  const [textColor, setTextColor] = useState('text-indigo-600');
  
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [tempFloorPrice, setTempFloorPrice] = useState(22);
  const [tempPeakPremium, setTempPeakPremium] = useState(20);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: "Hi! I'm your AI assistant. How can I help you book today?" }]);
  
  // Sandbox Internal Live Testing Chat State
  const [sandboxMessages, setSandboxMessages] = useState([
    { role: 'ai', text: 'System initialized. Enter client dialogue inputs below to evaluate response vectors.' }
  ]);

  // --- CONTENT & METADATA STATES ---
  const [marketingText, setMarketingText] = useState('Experience luxury services at 123 London Way, UK. Professionalism and style at your fingertips.');
  const [socialLinks, setSocialLinks] = useState({ instagram: '', tiktok: '', facebook: '' });
  const [videoLinks, setVideoLinks] = useState({ vid1: '', vid2: '' });
  const [bgImage, setBgImage] = useState(null);
  const [gallery, setGallery] = useState([]); 
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Premium Texture Paste', price: 18, detail: 'High hold, matte finish pomade.', img: null },
    { id: 2, name: 'Revitalizing Beard Oil', price: 22, detail: 'Organic cedarwood conditioning matrix.', img: null },
    { id: 3, name: 'Sulfate-Free Daily Wash', price: 15, detail: 'Hydrating cleanse for coarse hair.', img: null }
  ]); 
  
  const [services, setServices] = useState([{ id: 1, name: 'Standard Haircut', price: 25, duration: 30, status: 'approved' }]);
  const [appointments, setAppointments] = useState([
    { id: 101, customer: "James Dean", service: "Standard Haircut", time: "09:00 AM", date: "2026-05-01", priceSet: 25, status: "Upcoming", isBargained: false },
    { id: 102, customer: "Omowunmi Peters", service: "Standard Haircut", time: "11:30 AM", date: "2026-05-02", priceSet: 22, status: "Rendered", isBargained: true }
  ]);
 
  const [negotiatedPrice, setNegotiatedPrice] = useState(null);

  // --- STAFF SYSTEM STATES ---
  const [staffLogs, setStaffLogs] = useState([]); 
  const [staffPinInput, setStaffPinInput] = useState(''); 
  const [staffList, setStaffList] = useState([
    { id: 1, name: "Jordan", pin: "1234", role: "Barber" },
    { id: 2, name: "Sarah", pin: "5555", role: "Stylist" }
  ]);

  const [dateFilter, setDateFilter] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // --- NEW ADDED FEATURE STATES (ADDITIONS ONLY) ---
  const [searchFilter, setSearchFilter] = useState('');
  const [isAiActive, setIsAiActive] = useState(true);

  // --- PERSISTENCE ENGINE (LOCALSTORAGE) ---
  useEffect(() => {
    const data = {
      inventory: localStorage.getItem('gnis_inventory'),
      services: localStorage.getItem('gnis_services'),
      appointments: localStorage.getItem('gnis_appointments'),
      gallery: localStorage.getItem('gnis_gallery'),
      business: localStorage.getItem('gnis_business_meta'),
      socials: localStorage.getItem('gnis_socials'),
      videos: localStorage.getItem('gnis_videos'),
      bg: localStorage.getItem('gnis_bg'),
      staff: localStorage.getItem('gnis_staff'),
      logs: localStorage.getItem('gnis_staff_logs')
    };

    if (data.inventory) setInventory(JSON.parse(data.inventory));
    if (data.services) setServices(JSON.parse(data.services));
    if (data.appointments) setAppointments(JSON.parse(data.appointments));
    if (data.gallery) setGallery(JSON.parse(data.gallery));
    if (data.socials) setSocialLinks(JSON.parse(data.socials));
    if (data.videos) setVideoLinks(JSON.parse(data.videos));
    if (data.bg) setBgImage(data.bg);
    if (data.staff) setStaffList(JSON.parse(data.staff)); 
    if (data.logs) setStaffLogs(JSON.parse(data.logs));
    
    if (data.business) {
      const meta = JSON.parse(data.business);
      setBusinessName(meta.name);
      setLocation(meta.loc);
      setMarketingText(meta.mkt);
      setThemeColor(meta.theme);
      setTextColor(meta.text);
    }
  }, []);

  useEffect(() => { localStorage.setItem('gnis_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('gnis_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('gnis_appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('gnis_gallery', JSON.stringify(gallery)); }, [gallery]);
  useEffect(() => { localStorage.setItem('gnis_socials', JSON.stringify(socialLinks)); }, [socialLinks]);
  useEffect(() => { localStorage.setItem('gnis_videos', JSON.stringify(videoLinks)); }, [videoLinks]);
  useEffect(() => { localStorage.setItem('gnis_staff', JSON.stringify(staffList)); }, [staffList]); 
  useEffect(() => { localStorage.setItem('gnis_staff_logs', JSON.stringify(staffLogs)); }, [staffLogs]);
  useEffect(() => { if(bgImage) localStorage.setItem('gnis_bg', bgImage); }, [bgImage]);

  useEffect(() => {
    const meta = { name: businessName, loc: location, mkt: marketingText, theme: themeColor, text: textColor };
    localStorage.setItem('gnis_business_meta', JSON.stringify(meta));
  }, [businessName, location, marketingText, themeColor, textColor]);

  // --- METRICS COMPUTATION ENGINE ---
  const totalGmv = appointments.reduce((sum, appt) => sum + (appt.priceSet || 0), 0);
  const bargainedCount = appointments.filter(a => a.isBargained).length;
  const aiConversionRate = appointments.length > 0 ? Math.round((bargainedCount / appointments.length) * 100) : 0;

  // NEW FEATURE COMPUTATION: Calculate cumulative bargaining savings allowed
  const totalConcededSavings = appointments.reduce((sum, appt) => {
    if (appt.isBargained) {
      const matched = services.find(s => s.name === appt.service);
      const basePrice = matched ? matched.price : 30;
      return sum + Math.max(0, basePrice - appt.priceSet);
    }
    return sum;
  }, 0);

  // --- LOGIC HANDLERS ---
  const handleExportCSV = () => {
    if(appointments.length === 0) return alert("Registry database is empty.");
    const headers = ["ID", "Customer", "Service", "Date", "Time", "Price", "Status", "Bargained"];
    const rows = appointments.map(a => [a.id, a.customer, a.service, a.date, a.time, `£${a.priceSet}`, a.status, a.isBargained ? "YES" : "NO"]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${businessName.toLowerCase().replace(/\s+/g, '_')}_bookings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const name = e.target.pname.value;
    const price = e.target.pprice.value;
    const detail = e.target.pdetail?.value || "";
    const file = e.target.pimg?.files[0];

    if(!name || !price) return;

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInventory([...inventory, { id: Date.now(), name, price: parseInt(price), detail, img: reader.result }]);
      };
      reader.readAsDataURL(file);
    } else {
      setInventory([...inventory, { id: Date.now(), name, price: parseInt(price), detail, img: null }]);
    }
    e.target.reset();
  };

  const handleDeleteProduct = (id) => {
    if(confirm("Remove this product?")) {
      setInventory(inventory.filter(item => item.id !== id));
    }
  };

  const handleAddService = (e) => {
    e.preventDefault();
    const name = e.target.sname.value;
    const price = e.target.sprice.value;
    const duration = e.target.sduration?.value || "30"; // Captured duration feature parameter safely
    if(!name || !price) return;
    setServices([...services, { id: Date.now(), name, price: parseInt(price), duration: parseInt(duration), status: 'approved' }]);
    e.target.reset();
  };

  const handleClockAction = (type) => {
    const foundStaff = staffList.find(s => s.pin === staffPinInput);

    if (foundStaff) {
      const newLog = {
        name: foundStaff.name,
        type: type,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      };
      setStaffLogs([newLog, ...staffLogs]);
      setStaffPinInput(''); 
      alert(`${foundStaff.name} clocked ${type} successfully!`);
    } else {
      alert("INVALID PIN - ACCESS DENIED");
      setStaffPinInput(''); 
    }
  };

  const handleCreateStaffMember = (e) => {
    e.preventDefault();
    const name = e.target.newStaffName.value.trim();
    const pin = e.target.newStaffPin.value.trim();
    const role = e.target.newStaffRole.value.trim();

    if(!name || !pin || !role) return;
    if(pin.length !== 4 || isNaN(pin)) return alert("PIN must be exactly 4 digits.");
    
    // Check if PIN is already assigned to avoid system collisions
    if(staffList.some(s => s.pin === pin)) {
      return alert("This PIN is already assigned to another crew member. Please use a unique PIN.");
    }

    setStaffList([...staffList, { id: Date.now(), name, pin, role }]);
    e.target.reset();
    alert(`🎉 Success! Added ${name} to the crew database.`);
  };

  const handleDeleteStaffMember = (id) => {
    if(confirm("Are you sure you want to completely remove this staff member and revoke their access PIN?")) {
      setStaffList(staffList.filter(s => s.id !== id));
    }
  };

  const handleAddGallery = (e) => {
    const file = e.target.files[0];
    const detail = prompt("Enter image description:");
    const reader = new FileReader();
    reader.onloadend = () => {
      setGallery([...gallery, { id: Date.now(), url: reader.result, detail: detail || "No description" }]);
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleDeleteGallery = (id) => {
    if(confirm("Delete this image?")) {
      setGallery(gallery.filter(img => img.id !== id));
    }
  };

  const handleEditGallery = (id) => {
    const newDetail = prompt("Update description:", gallery.find(img => img.id === id).detail);
    if (newDetail !== null) {
      setGallery(gallery.map(img => img.id === id ? { ...img, detail: newDetail } : img));
    }
  };

  const toggleApptStatus = (id) => {
    setAppointments(appointments.map(a => 
      a.id === id ? { ...a, status: a.status === 'Upcoming' ? 'Rendered' : 'Upcoming' } : a
    ));
  };

  const addToCart = (item) => setCart([...cart, { ...item, cartId: Date.now() }]);

  // Enhanced Filter Matrix including new Live Client Search capability
  const filteredAppointments = appointments.filter(a => {
    const matchesDate = dateFilter ? a.date === dateFilter : true;
    const matchesSearch = searchFilter 
      ? (a.customer.toLowerCase().includes(searchFilter.toLowerCase()) || a.service?.toLowerCase().includes(searchFilter.toLowerCase()))
      : true;
    return matchesDate && matchesSearch;
  });

  const runNegotiation = (userInput, contextMessages = chatMessages) => {
    // If AI engine toggled off, intercept negotiation path immediately
    if (!isAiActive) return "Our dynamic bargaining sequence is currently offline. Please review standard options or reach our team directly.";

    const lowerInput = userInput.toLowerCase().trim();
    const occupancy = 0.9; 
    const floorPrice = tempFloorPrice || 22;
    
    const standardRate = services.length > 0 ? services[0].price : 30;
    const premiumRate = Math.round(standardRate * 1.15);

    const aiMessages = contextMessages.filter(m => m.role === 'ai');
    const lastAiMessage = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : "";
    
    const lastAiPriceMatch = lastAiMessage.match(/£\d+/);
    const lastPriceOfferedByAi = lastAiPriceMatch ? parseInt(lastAiPriceMatch[0].replace('£', '')) : null;

    const isRejection = lowerInput.match(/\b(no|nah|negative|can't|cannot|expensive|no deal|too high|stop)\b/);

    if (isRejection && lastPriceOfferedByAi) {
      if (lastPriceOfferedByAi <= floorPrice) {
        return `Look, I really want to get you in today. I can't drop the rate below £${floorPrice} without losing money, but tell you what—if you lock it in right now, I'll throw in a premium treatment upgrade completely free. Do we have a deal?`;
      }
      
      const nextCounter = Math.max(floorPrice, lastPriceOfferedByAi - 3);
      if (nextCounter === floorPrice) {
        return `You're a tough negotiator! Let's do this: I'll drop all the way down to my absolute rock-bottom rate of £${floorPrice} just to get you through the door. This is a one-time offer—should I reserve the slot?`;
      }
      return `I hear you! How about we meet in the middle at £${nextCounter}? That's a massive discount off our premium rate today. Does that work for you?`;
    }

    if (lowerInput.match(/\b(yes|yeah|yep|ok|okay|deal|sure|perfect|cool|book|lock|sound|good)\b/)) {
      return `SUCCESS_AGREED`; 
    }

    if (lowerInput.match(/\b(hi|hello|hey|yo|greetings|good morning|good afternoon)\b/)) {
      return `Hi there! I'm the official AI Twin for ${businessName || 'our business'}. Looking to book an elite session or check our current rates today?`;
    }

    const matchedService = services.find(s => lowerInput.includes(s.name.toLowerCase()));
    if (matchedService) {
      if (occupancy > 0.8) {
        return `I can absolutely get you sorted with a ${matchedService.name}! Just a heads up, our calendar is slammed today. Our live premium rate is £${premiumRate}—shall I lock a priority slot in for you?`;
      }
      return `Excellent choice, we excel at ${matchedService.name}! Our baseline rate for that is £${matchedService.price}. What sort of time window were you looking for?`;
    }

    if (lowerInput.match(/\b(book|appointment|session|reserve|slot|service|visit|fix|consultation|alteration)\b/)) {
      if (occupancy > 0.8) {
        return `We can definitely take care of that for you. Our books are nearly full today, making remaining slots premium at £${premiumRate}. Would you like me to reserve a priority space before they vanish?`;
      }
      return `We can absolutely sort that out! What specific service or timing profile were you hoping to secure?`;
    }

    const priceMatch = userInput.match(/\d+/);
    if (priceMatch) {
      const userOffer = parseInt(priceMatch[0]);
      
      if (userOffer >= standardRate) {
        return `DEAL_MATCH_£${userOffer}`;
      }
      
      if (userOffer >= floorPrice) {
        const tacticalCounter = Math.min(standardRate, userOffer + 3);
        if (tacticalCounter === userOffer || userOffer === floorPrice) {
          return `DEAL_MATCH_£${userOffer}`;
        }
        return `You're close! I can't do £${userOffer}, but if you can meet me at £${tacticalCounter}, we have a firm deal. Sound fair?`;
      }
      
      const startingCounter = Math.round((standardRate + floorPrice) / 2);
      return `I appreciate the offer, but I can't drop down to £${userOffer} because premium work takes real skill. However, I can cut you a custom deal at £${startingCounter} right now. How does that sound?`;
    }

    if (lowerInput.match(/(discount|offer|price|cost|cheap|promo|reduction|rate)/)) {
      if (occupancy > 0.8) {
        return `Our baseline sits at £${standardRate}, but demand is massive today, forcing peak slots to £${premiumRate}. I can bypass the surge pricing and give you our standard rate if you book right now. Deal?`;
      }
      return `Our menu sessions average around £${standardRate}. Let me know what your personal target budget is, and let's see if we can make a deal!`;
    }

    return `Got it! Let's make something happen. Tell me exactly what you're working with—are you looking to negotiate a service rate, or are you ready to lock in a time?`;
  };

  const handleDynamicBookingSubmission = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const selectedServiceName = formData.get('cservice');
    const matchedServiceObj = services.find(s => s.name === selectedServiceName);
    const standardMenuPrice = matchedServiceObj ? matchedServiceObj.price : 30;

    const bookingPayload = {
      id: Date.now(),
      customer: formData.get('cname'),
      date: formData.get('cdate'),
      time: formData.get('ctime'),
      service: selectedServiceName,
      priceSet: negotiatedPrice ? parseFloat(negotiatedPrice) : standardMenuPrice,
      status: "Upcoming",
      rating: null,
      isBargained: negotiatedPrice ? true : false
    };

    setAppointments([bookingPayload, ...appointments]);
    alert(`🎉 Appointment Locked & Sent to Shop!\n\nName: ${bookingPayload.customer}\nPrice Secured: £${bookingPayload.priceSet}`);
    
    setNegotiatedPrice(null);
    e.target.reset();
  };

  // Logic helpers for YouTube Parsing
  const activeLink = videoLinks.vid1 || videoLinks.vid2;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const videoMatch = activeLink?.match(regex);
  const mainVideoId = videoMatch ? videoMatch[1] : null;

  const lastAiMessages = chatMessages.filter(m => m.role === 'ai');
  const lastAiMessageText = lastAiMessages.length > 0 ? lastAiMessages[lastAiMessages.length - 1].text : "";
  const lastAiPriceMatchText = lastAiMessageText.match(/£\d+/);
  const lastPriceOfferedByAi = lastAiPriceMatchText ? parseInt(lastAiPriceMatchText[0].replace('£', '')) : null;

  // --- VIEW: GNIS MAIN LANDING PAGE ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-8xl font-black tracking-tighter mb-6 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">GNIS ENGINE</h1>
        <p className="text-xl text-slate-400 max-w-2xl mb-12">The world's most powerful AI-driven business operating system.</p>
        <div className="flex gap-6">
          <button onClick={() => setView('dashboard')} className="bg-white text-black px-10 py-4 rounded-full font-black text-xl hover:scale-105 transition-all"> 
            Dashboard
          </button>
          <button onClick={() => { setView('preview'); setActiveTab('wizard'); }} className="bg-green-500 text-black px-8 py-4 rounded-2xl font-black text-xl hover:scale-105 transition-all">
            Open AI Twin
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: PREVIEW TEMPLATE ---
  if (view === 'preview') {
    return (
      <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 relative pb-24 text-black">
        {/* Inject Carousel and Typewriter CSS Utilities */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes infiniteScroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .animate-infinite-scroll {
            animation: infiniteScroll 25s linear infinite;
          }
          @keyframes telemetryBlink {
            50% { border-color: transparent; }
          }
          .animate-telemetry-blink {
            animation: telemetryBlink 0.6s step-end infinite;
          }
        `}} />

        {/* Simulated Topbar */}
        <div className="h-2 bg-slate-900 flex justify-center gap-1 py-4 items-center">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] text-slate-500 font-mono ml-4 uppercase tracking-widest">Live Preview Mode</span>
        </div>

        {/* Navigation Bar */}
        <nav className="sticky top-0 bg-white/90 backdrop-blur-md z-[100] px-10 py-5 border-b flex justify-between items-center">
          <div className={`text-2xl font-black ${textColor}`}>{businessName}</div>
          <div className="flex gap-8 font-bold text-sm text-slate-500 items-center">
            <a href="#services" className="hover:text-black">Our Services</a>
            <a href="#gallery" className="hover:text-black">Showcase</a>
            <a href="#shop" className="hover:text-black">Shop</a>
            <a href="#socials" className="hover:text-black">Socials</a>
            {/* Secure Next.js Routing Handshake */}
            <Link href="/dashboard/twin" className="text-indigo-600 border-l pl-8 ml-2 font-black hover:opacity-80 transition-opacity">
              GNIS AI Twin Engine
            </Link>
            <button onClick={() => setView('dashboard')} className="bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200">Dashboard</button>
            <div onClick={() => setIsCartOpen(true)} className={`relative p-3 rounded-full ${themeColor} text-white cursor-pointer shadow-lg`}>
              🛍️ <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>
            </div>
          </div>
        </nav>

        {/* Hero Banner Section */}
        <section className={`h-[60vh] relative flex items-center justify-center text-white ${!bgImage && themeColor}`}>
          {bgImage && <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 text-center space-y-6">
            <h2 className="text-8xl font-black">{businessName}</h2>
            <p className="text-2xl opacity-80">{location}</p>
            <a href="#booking-zone" className="inline-block bg-white text-black px-12 py-4 rounded-full font-black text-lg shadow-2xl hover:scale-105 transition-all">Book Session</a>
          </div>
        </section>

        {/* Dynamic Video Section */}
        {mainVideoId && (
          <section className="py-20 px-6 max-w-7xl mx-auto">
            <div className="w-full aspect-video md:aspect-[21/9] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white ring-1 ring-slate-200">
               <iframe 
                width="100%" height="100%" 
                src={`https://www.youtube.com/embed/${mainVideoId}?autoplay=1&mute=1&loop=1&playlist=${mainVideoId}&controls=0&modestbranding=1`} 
                title="Business Showcase" frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </section>
        )}

        {/* Media Showcase Grid */}
        <section id="gallery" className="max-w-6xl mx-auto py-24 px-6 text-center">
          <h3 className="text-4xl font-black mb-12 uppercase tracking-tighter">Our Showcase</h3>
          <div className="grid grid-cols-3 gap-4">
            {gallery.length > 0 ? gallery.map((img, i) => (
              <div key={img.id || i} className="group relative overflow-hidden rounded-3xl h-80">
                <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Gallery" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-6 transition-opacity">
                  <p className="text-white font-bold">{img.detail}</p>
                </div>
              </div>
            )) : <p className="col-span-3 text-slate-400 py-20 border-2 border-dashed rounded-3xl uppercase font-black tracking-widest">Showcase currently empty</p>}
          </div>
        </section>

        {/* --- PREMIUM MODERN PRODUCT SHOWCASE & RETAIL SUITE --- */}
        <section id="shop" className="bg-slate-50 py-24 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${textColor} bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100`}>
                  Curated Retail System
                </span>
                <h3 className="text-5xl font-black uppercase tracking-tighter mt-3 text-slate-900">Retail Products</h3>
                <p className="text-base text-slate-400 mt-2 font-medium">Elevate your home-care workspace with salon-grade formulations.</p>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {inventory.length} Stock Nodes Available
              </div>
            </div>

            {inventory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {inventory.map((item) => (
                  <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-col justify-between text-black transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group relative">
                    <div>
                      <div className="w-full aspect-square bg-slate-50 rounded-3xl mb-6 flex items-center justify-center overflow-hidden relative border border-slate-50">
                        {item.img ? (
                          <img src={item.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={item.name} />
                        ) : (
                          <div className="text-4xl italic font-black text-slate-200 select-none">ITEM</div>
                        )}
                        <span className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                          Available
                        </span>
                      </div>
                      <h4 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 truncate">{item.name}</h4>
                      <p className="text-xs text-slate-400 mt-1.5 mb-6 line-clamp-2 font-medium uppercase tracking-tight leading-relaxed">
                        {item.detail || 'Premium application profile built for high-performance grooming routines.'}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100/60 flex items-center justify-between gap-4 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price</span>
                        <span className={`text-2xl font-black ${textColor}`}>£{item.price}</span>
                      </div>
                      <button 
                        onClick={() => addToCart(item)} 
                        className={`flex-1 ${themeColor} text-white py-4 px-6 rounded-2xl font-black text-xs hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest shadow-md shadow-indigo-600/10`}
                      >
                        Add to Basket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white shadow-inner">
                <span className="text-4xl block mb-3">📦</span>
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No products currently listed in stock control.</p>
              </div>
            )}
          </div>
        </section>


            {/* --- START OF AUTOSCROLLING PRODUCTS SECTION --- */}
<div className="w-full overflow-hidden bg-zinc-50 py-12 border-t border-gray-100">
  <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6">
    <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400">Trending Now</h3>
    <h2 className="text-2xl font-bold text-zinc-900 mt-1">Featured Essentials</h2>
  </div>
  
  {/* Marquee Container */}
  <div className="relative w-full flex overflow-x-hidden group py-4">
    
    {/* First Track */}
    <div className="animate-marquee flex gap-6 whitespace-nowrap shrink-0 pr-6">
      {/* Product 1 */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Premium Matte Clay</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Styling Matte Clay (Strong Hold)</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$24.00</p>
        </div>
      </div>

      {/* Product 2 */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Nourishing Beard Oil</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Premium Organic Beard Blend</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$18.00</p>
        </div>
      </div>

      {/* Product 3 */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Revitalizing Shampoo</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Daily Hydrating Cleanser</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$22.00</p>
        </div>
      </div>

      {/* Product 4 */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Exfoliating Face Wash</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Charcoal Detox Scrub</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$16.00</p>
        </div>
      </div>

      {/* Product 5 */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Precision Grooming Kit</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Stainless Steel Shear Set</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$45.00</p>
        </div>
      </div>
    </div>

    {/* Second Duplicate Track (Creates the seamless infinite looping effect) */}
    <div className="animate-marquee flex gap-6 whitespace-nowrap shrink-0 pr-6 aria-hidden='true'">
      {/* Product 1 Duplicate */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Premium Matte Clay</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Styling Matte Clay (Strong Hold)</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$24.00</p>
        </div>
      </div>

      {/* Product 2 Duplicate */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Nourishing Beard Oil</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Premium Organic Beard Blend</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$18.00</p>
        </div>
      </div>

      {/* Product 3 Duplicate */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Revitalizing Shampoo</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Daily Hydrating Cleanser</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$22.00</p>
        </div>
      </div>

      {/* Product 4 Duplicate */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Exfoliating Face Wash</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Charcoal Detox Scrub</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$16.00</p>
        </div>
      </div>

      {/* Product 5 Duplicate */}
      <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
        <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">Precision Grooming Kit</div>
        <div>
          <h4 className="font-semibold text-zinc-800 text-sm truncate">Stainless Steel Shear Set</h4>
          <p className="text-sm font-bold text-zinc-900 mt-1">$45.00</p>
        </div>
      </div>
    </div>
  </div>

  {/* Self-contained CSS for the infinite marquee animation loop */}
  <style>{`
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-100%); }
    }
    .animate-marquee {
      animation: marquee 30s linear infinite;
    }
    .group:hover .animate-marquee {
      animation-play-state: paused;
    }
  `}</style>
</div>
{/* --- END OF AUTOSCROLLING PRODUCTS SECTION --- */}

        {/* Marketing Rewards & Social Matrix */}
        <section id="socials" className="py-24 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 text-white">
          <div className={`${themeColor} p-12 rounded-[3rem] shadow-2xl`}>
             <h3 className="text-4xl font-black mb-4">Member Rewards</h3>
             <p className="text-lg opacity-90 mb-8 font-medium">Earn points on every visit. 10 points = Free Treatment. Join our community to unlock exclusive offers.</p>
             <button className="bg-white text-black px-10 py-4 rounded-full font-black hover:scale-105 transition-all">Sign Up Now</button>
          </div>
          <div className="bg-slate-900 p-12 rounded-[3rem] shadow-2xl flex flex-col justify-between">
             <div>
                <h3 className="text-4xl font-black mb-4 text-indigo-400">Social Media center</h3>
                <p className="text-lg text-slate-400 font-medium">Follow us for live updates and behind-the-scenes content.</p>
             </div>
             <div className="flex gap-8 mt-8">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="hover:scale-125 transition-transform">
                    <svg className="w-10 h-10 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.849-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849s.012-3.584.07-4.849c.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.337 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.351-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.337-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" className="hover:scale-125 transition-transform">
                    <svg className="w-10 h-10 fill-white" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14.99.13 2.02.74 2.81.59.8 1.55 1.29 2.56 1.35 1.12.05 2.19-.44 2.84-1.33.45-.59.65-1.32.67-2.05V.02z"/></svg>
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="hover:scale-125 transition-transform">
                    <svg className="w-10 h-10 fill-white" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-8.74h-2.94v-3.403h2.94v-2.511c0-2.915 1.78-4.502 4.379-4.502 1.245 0 2.315.093 2.627.135v3.046h-1.803c-1.414 0-1.688.672-1.688 1.658v2.171h3.37l-.439 3.403h-2.931v8.74h6.013c.731 0 1.324-.593 1.324-1.324v-21.351c0-.732-.593-1.325-1.325-1.325z"/></svg>
                  </a>
                )}
             </div>
          </div>
        </section>

        {/* Services Menu & Registration Intake Layout */}
        <section id="services" className="max-w-6xl mx-auto py-24 px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 text-black">
          <div>
            <h3 className="text-4xl font-black mb-10">Our Services</h3>
            <div className="space-y-4">
              {services.map(s => (
                <div key={s.id} className="p-6 bg-slate-50 rounded-3xl border flex justify-between items-center">
                  <div>
                    <span className="text-xl font-bold block">{s.name}</span>
                    {s.duration && <span className="text-xs font-bold text-slate-400 uppercase">{s.duration} minutes</span>}
                  </div>
                  <span className={`text-2xl font-black ${textColor}`}>£{s.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* INTENTIONALLY DESIGNED PRICE-LOCKED BOOKING FORM */}
          <div id="booking-zone" className={`bg-slate-900 text-white p-10 rounded-[3rem] scroll-mt-20 border-4 transition-all duration-500 ${negotiatedPrice ? 'border-emerald-500 shadow-2xl shadow-emerald-500/20' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-black">Reserve Appointment</h3>
                <p className="text-xs text-slate-400 mt-1">Fill in your preferred timeline parameters below.</p>
              </div>
              {negotiatedPrice && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-500/30 animate-pulse">
                  AI Price Locked 🔒
                </span>
              )}
            </div>

            <form onSubmit={handleDynamicBookingSubmission} className="space-y-4 text-white">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input name="cname" placeholder="e.g. John Doe" className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700/50 text-white outline-none focus:border-indigo-500" required />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Intended Service</label>
                <select name="cservice" className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700/50 text-white outline-none focus:border-indigo-500 appearance-none text-white">
                  {services.map(s => (
                    <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                      {s.name} (Standard: £{s.price}{s.duration ? ` • ${s.duration} min` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                  <input name="cdate" type="date" className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700/50 text-white outline-none focus:border-indigo-500" required />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Time Slot</label>
                  <input name="ctime" type="time" className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700/50 text-white outline-none focus:border-indigo-500" required />
                </div>
              </div>

              {/* DYNAMIC CALCULATION DISPLAY MATRICES */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-2 mt-4 text-white">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Base Booking Total:</span>
                  <span className={negotiatedPrice ? "line-through opacity-50" : ""}>£{services.length > 0 ? services[0].price : 30}</span>
                </div>
                {negotiatedPrice && (
                  <div className="flex justify-between text-xs text-emerald-400 font-bold">
                    <span>AI Negotiated Match:</span>
                    <span>- £{(services.length > 0 ? services[0].price : 30) - negotiatedPrice}</span>
                  </div>
                )}
                <hr className="border-slate-800 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-300">Final Locked Invoice:</span>
                  <span className={`text-2xl font-black ${negotiatedPrice ? 'text-emerald-400' : 'text-white'}`}>
                    £{negotiatedPrice || (services.length > 0 ? services[0].price : 30)}
                  </span>
                </div>
                <input type="hidden" name="cprice" value={negotiatedPrice || (services.length > 0 ? services[0].price : 30)} />
              </div>

              <button className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-transform active:scale-95 ${negotiatedPrice ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : themeColor}`}>
                {negotiatedPrice ? 'Secure Negotiated Session' : 'Confirm Standard Session'}
              </button>
            </form>
          </div>
        </section>

        {/* Footer Area */}
        <footer className="bg-slate-950 text-white pt-24 pb-12 px-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h4 className={`text-3xl font-black mb-4 ${textColor}`}>{businessName}</h4>
              <p className="text-slate-400 max-w-sm">{marketingText}</p>
            </div>
            <div>
              <h5 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Quick Links</h5>
              <ul className="space-y-2 text-slate-400 font-medium">
                <li><a href="#services" className="hover:text-white">Services</a></li>
                <li><a href="#shop" className="hover:text-white">Shop</a></li>
                <li><a href="#gallery" className="hover:text-white">Showcase</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Contact</h5>
              <p className="text-slate-400">{location}</p>
              <p className="text-slate-400 mt-2">support@{businessName.toLowerCase().replace(' ', '')}.com</p>
            </div>
          </div>
          <div className="text-center text-slate-600 text-sm font-bold">© 2026 {businessName}. Powered by GNIS ENGINE.</div>
        </footer>

        {/* Slide-out Basket Drawer */}
        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end text-black">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
            <div className="relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-tighter">Basket</h3>
                <button onClick={() => setIsCartOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200">✕</button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {cart.length > 0 ? cart.map((item, i) => (
                  <div key={i} className="flex justify-between items-center border-b pb-4">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="font-black text-indigo-600">£{item.price}</p>
                  </div>
                )) : <p className="text-slate-400 text-center py-10">Empty</p>}
              </div>
              <div className="pt-8 border-t">
                <div className="flex justify-between text-lg font-black mb-6"><span>Total:</span><span>£{cart.reduce((s,i)=>s+i.price, 0)}</span></div>
                <button className={`w-full py-4 rounded-xl text-white font-black text-sm ${themeColor}`} onClick={() => {alert("Processing..."); setCart([])}}>PAY NOW</button>
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Chat Widget */}
        <div className="fixed bottom-4 left-6 flex flex-col items-end" style={{ zIndex: 9999 }}>
          {isChatOpen && (
            <div className="w-80 h-96 bg-white shadow-2xl rounded-2xl border border-slate-100 mb-4 flex flex-col overflow-hidden text-black">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <span className="font-bold text-sm flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isAiActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  AI Twin {isAiActive ? 'Online' : 'Offline'}
                </span>
                <button onClick={() => setIsChatOpen(false)} className="text-xl leading-none hover:text-slate-300">✕</button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 flex flex-col">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`max-w-[85%] p-3 rounded-2xl text-[13px] ${
                      msg.role === 'ai' 
                        ? 'bg-white border border-slate-200 text-slate-800 self-start' 
                        : 'bg-indigo-600 text-white self-end'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}

                {negotiatedPrice && (
                  <div className="w-full pt-2 animate-in fade-in zoom-in-95 duration-300">
                    <a 
                      href="#booking-zone"
                      onClick={() => setIsChatOpen(false)}
                      className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs shadow-md transition-all uppercase tracking-wider"
                    >
                      👉 Go To Appointment Form
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3 border-t bg-white">
                <input 
                  type="text" 
                  disabled={!isAiActive}
                  placeholder={isAiActive ? "Type a message & press Enter..." : "Bargaining engine offline"}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 text-black shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const userText = e.target.value;
                      let aiText = runNegotiation(userText, chatMessages); 

                      if (aiText === 'SUCCESS_AGREED') {
                        const finalDealPrice = lastPriceOfferedByAi || (services.length > 0 ? services[0].price : 30);
                        setNegotiatedPrice(finalDealPrice);
                        aiText = `Awesome! Choice made. I've locked in your exclusive rate of £${finalDealPrice}. Let's get your details filled out below to secure this deal immediately!`;
                      } else if (aiText.startsWith('DEAL_MATCH_')) {
                        const directMatchedPrice = parseInt(aiText.split('_£')[1]);
                        setNegotiatedPrice(directMatchedPrice);
                        aiText = `Deal! £${directMatchedPrice} works perfectly for me. Type "book it" or "ok" to confirm and open up your appointment registration portal right now!`;
                      }

                      setChatMessages([...chatMessages, { role: 'user', text: userText }, { role: 'ai', text: aiText }]);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative"
          >
            <span className="text-xl"> 💬</span>
            <span className={`absolute -top-2 -right-1 w-4 h-4 rounded-full border-2 border-white ${negotiatedPrice ? 'bg-emerald-500' : 'bg-green-500'}`}></span>
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD PANEL ---
  return (
    <main className="min-h-screen bg-slate-50 flex font-sans text-black">
      {/* Side Control Station */}
      <div className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
        <div className="p-8 font-black text-2xl text-indigo-400 tracking-tighter">GNIS OPERATIONAL</div>
        <nav className="flex-1 px-4 space-y-2">
          {[{id:'wizard', l:'Site Builder'}, {id:'inventory', l:'Stock Control'}, {id:'gallery', l:'Media Library'}, {id:'appointments', l:'Appointments'}, {id:'staff', l:'Staff Portal'}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full text-left p-3 rounded-xl font-bold ${activeTab === t.id ? 'bg-indigo-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>{t.l}</button>
          ))}
        </nav>
        
        <div className="p-4 space-y-2">
          <button onClick={() => setView('preview')} className="w-full bg-white text-black py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all">PREVIEW SITE</button>
          <button onClick={() => setView('landing')} className="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Log Out</button>
        </div>
      </div>

      {/* Main Workspace Feed */}
      <div className="flex-1 p-12 overflow-y-auto">
        
        {/* --- PERFORMANCE ANALYTICS HEADER --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Gross Revenue Matrix (GMV)</p>
            <p className="text-3xl font-black text-slate-900 mt-2">£{totalGmv.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">Live Feed Stable</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Negotiation Engagements</p>
            <p className="text-3xl font-black text-indigo-600 mt-2">{bargainedCount} Sessions</p>
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded mt-2 inline-block">{aiConversionRate}% Automation Penetration</span>
          </div>
          {/* NEW METRIC CARD: TRACK CONCEDED DISCOUNT INFRASTRUCTURE VALUE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Conceded Discounts</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">£{totalConcededSavings.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">Bargain Capital Shift</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Total System Footprint</p>
            <p className="text-3xl font-black text-slate-800 mt-2">{appointments.length + inventory.length + gallery.length} Nodes</p>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded mt-2 inline-block">Indexed via LocalStorage</span>
          </div>
        </div>

        {activeTab === 'wizard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <h2 className="text-4xl font-black">Site Builder Centre</h2>
                <label className="text-xs font-black uppercase text-slate-700">Use The Site Builder centre to design How You want Your Website to Appear</label>
                <div className="bg-white p-8 rounded-3xl border space-y-6 shadow-sm">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400">Business Brand Name</label>
                    <input value={businessName} onChange={(e)=>setBusinessName(e.target.value)} className="w-full p-4 border rounded-xl mt-1 bg-white text-black font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400">Add Address / Sort Code</label>
                    <input value={location} onChange={(e)=>setLocation(e.target.value)} className="w-full p-4 border rounded-xl mt-1 bg-white text-black font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400">Luxury Descriptive Anchor</label>
                    <textarea value={marketingText} onChange={(e)=>setMarketingText(e.target.value)} className="w-full p-4 border rounded-xl mt-1 h-20 bg-white text-black font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400">Choose Your Background Image</label>
                    <input type="file" onChange={(e) => {
                      const f = e.target.files[0];
                      const r = new FileReader();
                      r.onloadend = () => setBgImage(r.result);
                      r.readAsDataURL(f);
                    }} className="w-full p-2 border rounded-xl mt-1 text-sm bg-white text-black" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400">Choose Your Website Color Palette Theme</label>
                    <div className="flex gap-4 mt-2">
                        {['bg-indigo-600', 'bg-rose-500', 'bg-emerald-600', 'bg-black'].map(c => (
                            <button key={c} onClick={() => {setThemeColor(c); setTextColor(c.replace('bg-', 'text-'))}} className={`w-10 h-10 rounded-full ${c} ${themeColor === c ? 'ring-4 ring-offset-2 ring-indigo-200' : ''}`} />
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Video & Social Column */}
              <div className="space-y-8">
                <h2 className="text-4xl font-black">Videos & Socials</h2>
                <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-500">Input Your Social Media Links</h3>
                  <input placeholder="Instagram Link" value={socialLinks.instagram} onChange={(e)=>setSocialLinks({...socialLinks, instagram: e.target.value})} className="w-full p-3 border rounded-xl bg-white text-black font-medium" />
                  <input placeholder="TikTok Link" value={socialLinks.tiktok} onChange={(e)=>setSocialLinks({...socialLinks, tiktok: e.target.value})} className="w-full p-3 border rounded-xl bg-white text-black font-medium" />
                  <input placeholder="Facebook Link" value={socialLinks.facebook} onChange={(e)=>setSocialLinks({...socialLinks, facebook: e.target.value})} className="w-full p-3 border rounded-xl bg-white text-black font-medium" />
                  
                  <h3 className="font-bold text-slate-500 mt-4">Input Your YouTube Video URLs</h3>
                  <input placeholder="Promo Video URL (Main Advert)" value={videoLinks.vid1} onChange={(e)=>setVideoLinks({...videoLinks, vid1: e.target.value})} className="w-full p-3 border rounded-xl bg-white text-black font-medium" />
                  <input placeholder="Secondary Video URL" value={videoLinks.vid2} onChange={(e)=>setVideoLinks({...videoLinks, vid2: e.target.value})} className="w-full p-3 border rounded-xl bg-white text-black font-medium" />
                </div>

                <h2 className="text-4xl font-black pt-4">Service Management</h2>
                <h2 className="text-l font-black pt-4">Add Your Services & Prices</h2>
                <form onSubmit={handleAddService} className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
                  <input name="sname" placeholder="Service Name" className="w-full p-4 border rounded-xl bg-white text-black font-medium" required />
                  <div className="flex gap-4">
                    <input name="sprice" type="number" placeholder="Price £" className="flex-1 p-4 border rounded-xl bg-white text-black font-medium" required />
                    <input name="sduration" type="number" placeholder="Duration (Mins)" defaultValue={30} className="flex-1 p-4 border rounded-xl bg-white text-black font-medium" />
                  </div>
                  <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-opacity">Add Service</button>
                </form>
              </div>
            </div>

            {/* GNIS AI TWIN CONTROL CENTER MATRIX */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mt-6 max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">AI Twin Engine Vector</h3>
                    
                    {/* --- CSS FLUID TYPEWRITER TELEMETRY EFFECT --- */}
                    <p className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1.5 font-mono">
                      Telemetry: 
                      <span className="text-indigo-600 font-bold border-r-2 border-indigo-600 whitespace-nowrap overflow-hidden animate-telemetry-blink">
                        Evaluating dynamic dialogue parameters...
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* NEW EXCLUSIVE TOGGLE SWITCH FOR AGENT VIABILITY */}
                    <button 
                      onClick={() => setIsAiActive(!isAiActive)}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${isAiActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      AI: {isAiActive ? "ONLINE" : "OFFLINE"}
                    </button>
                    <button 
                      onClick={() => setIsEditingAI(!isEditingAI)} 
                      className={`${isEditingAI ? 'bg-green-600' : 'bg-indigo-600'} text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:opacity-95`}
                    >
                      {isEditingAI ? "Save Rules" : "Edit Rules"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Minimum Floor Rate</span>
                    {isEditingAI ? (
                      <input 
                        type="number" 
                        value={tempFloorPrice} 
                        onChange={(e) => setTempFloorPrice(parseInt(e.target.value) || 0)}
                        className="font-bold text-sl ate-700 bg-white border rounded-lg px-2 py-1 w-full outline-indigo-500 text-black text-sm"
                      />
                    ) : (
                      <span className="font-black text-slate-900 text-xl">£{tempFloorPrice}.00</span>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Peak Surcharge Premium</span>
                    {isEditingAI ? (
                      <input 
                        type="number" 
                        value={tempPeakPremium} 
                        onChange={(e) => setTempPeakPremium(parseInt(e.target.value) || 0)}
                        className="font-bold text-indigo-600 bg-white border rounded-lg px-2 py-1 w-full outline-indigo-500 text-black text-sm"
                      />
                    ) : (
                      <span className="font-black text-indigo-600 text-xl">+{tempPeakPremium}%</span>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Sandbox Input Vector</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type: 'Can I get a discount?' and hit Enter" 
                      className="w-full p-4 pr-12 border rounded-2xl bg-slate-50 text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const userVal = e.target.value;
                          const responseText = runNegotiation(userVal, sandboxMessages);
                          setSandboxMessages([
                            ...sandboxMessages, 
                            { role: 'user', text: userVal }, 
                            { role: 'ai', text: responseText === 'SUCCESS_AGREED' ? '🎯 Deal Completed successfully via conversion thresholds!' : responseText }
                          ]);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="absolute right-3 top-4 text-slate-300">
                      <kbd className="text-[9px] border rounded-md px-1.5 py-1 bg-white shadow-sm text-black font-bold">ENTER</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE SIMULATOR TEXTING CONSOLE BOX */}
              <div className="bg-slate-900 rounded-[2rem] p-6 flex flex-col h-64 border border-slate-800">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                  <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Simulation Visualizer Console
                  </span>
                  <button onClick={() => setSandboxMessages([{ role: 'ai', text: 'Console cleared.' }])} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase">Reset Feed</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
                  {sandboxMessages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-xl max-w-[90%] font-medium ${msg.role === 'ai' ? 'bg-slate-800 text-slate-300 mr-auto' : 'bg-indigo-600 text-white ml-auto'}`}>
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* --- LIVE OPERATION BOOKINGS LEDGER --- */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mt-8 max-w-6xl text-black">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Incoming Bookings Matrix</h3>
                  <p className="text-xs text-slate-400">Live transaction operational feed synced from your live client-facing portal.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-600 font-black text-xs px-4 py-1.5 rounded-full border border-indigo-100">
                  Total Feed Count: {appointments.length}
                </span>
              </div>

              {appointments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 text-sm font-medium uppercase tracking-wider">
                  No appointments scheduled yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold pb-4">
                        <th className="pb-3">Customer Profile</th>
                        <th className="pb-3">Selected Service</th>
                        <th className="pb-3">Schedule Timeline</th>
                        <th className="pb-3">Rate Secured</th>
                        <th className="pb-3 text-right">Transaction Type Vector</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-black">
                      {appointments.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-slate-900 font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            {booking.customer}
                          </td>
                          <td className="py-4 text-slate-600">{booking.service || "Standard Workspace"}</td>
                          <td className="py-4 text-xs text-slate-500">
                            {booking.date} @ <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-md">{booking.time}</span>
                          </td>
                          <td className="py-4 font-black text-slate-900 text-base">£{booking.priceSet || booking.price || 25}</td>
                          <td className="py-4 text-right">
                            {booking.isBargained ? (
                              <span className="bg-emerald-50 text-emerald-600 text-[10px] uppercase font-black px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1 shadow-sm">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                AI Bargained 💰
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black px-3 py-1 rounded-full inline-block">
                                Standard Menu
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black">Booking Registry Ledger</h2>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border text-black shadow-sm">
                <button onClick={handleExportCSV} className="bg-slate-900 text-white font-black uppercase text-xs px-4 py-2 rounded-xl hover:opacity-90 tracking-wider mr-4">Export Registry (CSV)</button>
                
                {/* NEW COMPONENT FEATURE: Client and Service keyword Text Filter element */}
                <input 
                  type="text"
                  placeholder="Search Client or Service..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="border rounded-lg p-2 text-sm bg-white text-black font-medium placeholder-slate-400 outline-indigo-500"
                />

                <label className="text-xs font-black uppercase text-slate-400">Filter Date:</label>
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border rounded-lg p-2 text-sm bg-white text-black font-medium" />
                {(dateFilter || searchFilter) && <button onClick={() => { setDateFilter(''); setSearchFilter(''); }} className="text-xs font-bold text-red-500 hover:underline">Clear Filters</button>}
              </div>
            </div>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden text-black">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-6 font-black uppercase text-xs text-slate-400">Customer Identity</th>
                    <th className="p-6 font-black uppercase text-xs text-slate-400">Date Link</th>
                    <th className="p-6 font-black uppercase text-xs text-slate-400">Time Slot</th>
                    <th className="p-6 font-black uppercase text-xs text-slate-400">Status Vector</th>
                    <th className="p-6 font-black uppercase text-xs text-slate-400">Action Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-black font-medium">
                  {filteredAppointments.length > 0 ? filteredAppointments.sort((a,b) => new Date(a.date) - new Date(b.date)).map(appt => (
                    <tr key={appt.id}>
                      <td className="p-6 font-bold text-slate-900">{appt.customer}</td>
                      <td className="p-6">{appt.date}</td>
                      <td className="p-6">{appt.time}</td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${appt.status === 'Upcoming' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <button onClick={() => toggleApptStatus(appt.id)} className="text-xs font-bold text-indigo-600 hover:underline">Mark as {appt.status === 'Upcoming' ? 'Done' : 'Pending'}</button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold">No corresponding database entries found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black items-start">
            <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-500">
              <h2 className="text-4xl font-black italic tracking-tighter">STAFF GATEWAY PORTAL</h2>
              
              <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-2xl space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Secure Staff PIN Matrix</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      value={staffPinInput} 
                      onChange={(e) => setStaffPinInput(e.target.value)} 
                      placeholder="ENTER 4-DIGIT PIN" 
                      className="w-full p-6 border-2 border-slate-100 rounded-3xl mt-1 text-center text-3xl font-black tracking-[1em] focus:border-indigo-500 outline-none transition-all bg-white text-black" 
                    />
                  </div>

                  <div className="flex gap-4">
                      <button 
                        onClick={() => handleClockAction('IN')} 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-8 rounded-[2rem] font-black text-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                      >
                        CLOCK IN
                      </button>
                      <button 
                        onClick={() => handleClockAction('OUT')} 
                        className="flex-1 bg-slate-900 hover:bg-black text-white py-8 rounded-[2rem] font-black text-2xl shadow-lg shadow-black/20 active:scale-95 transition-all"
                      >
                        CLOCK OUT
                      </button>
                  </div>

                  {/* LOGS SECTION */}
                  <div className="pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Active Shift Logs</h3>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                      </div>
                      
                      <div className="space-y-3">
                          {staffLogs.map((log, i) => (
                              <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors text-black">
                                  <div>
                                    <p className="font-black text-slate-900 uppercase text-sm">{log.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">{log.date}</p>
                                  </div>
                                  <span className={`px-4 py-2 rounded-full font-black text-[10px] ${log.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {log.type} @ {log.time}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* NEW ADDITION: DYNAMIC ADMIN CREW MANAGER FORM BLOCK */}
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Manage Crew & Security Pins</h3>
                  <p className="text-xs text-slate-400 mt-1">Admin access point to dynamically assign passwords and onboard new crew nodes.</p>
                </div>
                
                <form onSubmit={handleCreateStaffMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <input name="newStaffName" placeholder="Staff Name" className="p-4 border rounded-2xl text-sm bg-white text-black font-semibold outline-indigo-500" required />
                  <input name="newStaffRole" placeholder="Role (e.g. Barber)" className="p-4 border rounded-2xl text-sm bg-white text-black font-semibold outline-indigo-500" required />
                  <input name="newStaffPin" type="text" maxLength={4} placeholder="4-Digit PIN Code" className="p-4 border rounded-2xl text-sm bg-white text-black font-mono font-bold tracking-widest outline-indigo-500" required />
                  <button className="md:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm">
                    Register New Crew Profile
                  </button>
                </form>
              </div>
            </div>

            {/* SECURE STAFF DIRECTORY REFERENCE PANEL */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-16">
              <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest mb-4">Credentials Directory</h3>
              <div className="divide-y divide-slate-100">
                {staffList.map(member => (
                  <div key={member.id} className="py-4 flex justify-between items-center text-xs font-bold">
                    <div>
                      <p className="text-slate-900 font-black">{member.name}</p>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 font-mono font-black tracking-wider text-xs border border-slate-200 shadow-sm">
                        PIN: {member.pin}
                      </span>
                      {/* Allow deleting dynamically added members */}
                      <button 
                        onClick={() => handleDeleteStaffMember(member.id)} 
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors text-sm" 
                        title="Remove Staff Access"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-8 max-w-4xl text-black">
            <h2 className="text-4xl font-black">Media Library Repository</h2>
            <div className="bg-white p-8 rounded-3xl border border-dashed text-center">
              <input type="file" onChange={handleAddGallery} className="w-full text-sm bg-white text-black" />
              <p className="text-xs text-slate-400 mt-2 font-bold">Upload high-quality layout parameters for your landing page showcase gallery matrix.</p>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-8">
               {gallery.map(img => (
                 <div key={img.id} className="relative group rounded-xl overflow-hidden border">
                   <img src={img.url} className="w-full aspect-square object-cover" alt="Thumb" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <button onClick={() => handleEditGallery(img.id)} className="p-2 bg-white text-black rounded-full text-xs font-bold">Edit</button>
                      <button onClick={() => handleDeleteGallery(img.id)} className="p-2 bg-red-500 text-white rounded-full text-xs font-bold">X</button>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 max-w-4xl text-black">
            <h2 className="text-4xl font-black">Stock Control Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <form onSubmit={handleAddProduct} className="bg-white p-8 rounded-3xl border shadow-sm space-y-4 h-fit">
                    <h3 className="font-bold text-slate-500">Add New Warehouse Item</h3>
                    <input name="pname" placeholder="Item Name" className="w-full p-4 border rounded-xl bg-white text-black font-medium" required />
                    <input name="pprice" type="number" placeholder="Price £" className="w-full p-4 border rounded-xl bg-white text-black font-medium" required />
                    <textarea name="pdetail" placeholder="Short description details..." className="w-full p-4 border rounded-xl bg-white text-black font-medium" />
                    <div className="p-4 border-2 border-dashed rounded-xl text-center bg-white">
                      <input type="file" name="pimg" className="text-xs text-black" />
                    </div>
                    <button className="w-full bg-black text-white py-4 rounded-xl font-bold hover:opacity-90 transition-opacity">Add to Stock</button>
                </form>
                <div className="space-y-4 text-black font-medium">
                   {inventory.length > 0 ? inventory.map(item => (
                     <div key={item.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                            {item.img ? <img src={item.img} className="w-full h-full object-cover" alt="p" /> : <span className="text-[10px] font-black">BOX</span>}
                          </div>
                          <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-indigo-600 font-black text-sm">£{item.price}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteProduct(item.id)} className="text-red-500 font-bold text-xs p-2 hover:bg-red-50 rounded-lg">Remove</button>
                     </div>
                   )) : <p className="text-center text-slate-400 py-10 font-bold uppercase tracking-wider">Warehouse infrastructure empty.</p>}
                </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}