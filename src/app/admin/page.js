'use client';
import { useState } from 'react';

export default function AdminDashboard() {
  // 1. ADVANCED DATA STATE (Simulating Supabase structure with AI Context & Telemetry)
  const [appointments, setAppointments] = useState([
    { 
      id: 1, 
      client: "Marcus Kane", 
      phone: "+2348169230095", 
      service: "Standard Haircut", 
      total: 25, 
      status: "Pending",
      vCode: null,
      smsStatus: "Idle", // Idle, Sending, Delivered, Failed
      bookingType: "AI-Negotiated", // Standard vs AI-Negotiated
      originalPrice: 30
    },
    { 
      id: 2, 
      client: "Sarah Jenkins", 
      phone: "+447712345678", 
      service: "Skin Fade & Styling", 
      total: 35, 
      status: "Accepted",
      vCode: 7842,
      smsStatus: "Delivered",
      bookingType: "Standard",
      originalPrice: 35
    }
  ]);

  // Local state to capture form inputs dynamically per appointment
  const [enteredCodes, setEnteredCodes] = useState({});

  // Computes current dashboard yield metrics instantly from the state
  const completedRevenue = appointments
    .filter(app => app.status === "Completed")
    .reduce((sum, app) => sum + app.total, 0);

  // 2. THE "BRAIN" - Logic to Approve and Generate Code with Telemetry simulation
  const approveBooking = (id, clientPhone, clientName) => {
    const generatedCode = Math.floor(1000 + Math.random() * 9000);
    
    // Simulate initial network outbound pulse
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, status: 'Accepted', vCode: generatedCode, smsStatus: 'Sending' } : app
    ));

    // Simulate carrier delivery verification 1 second later
    setTimeout(() => {
      setAppointments(prev => prev.map(app => 
        app.id === id ? { ...app, smsStatus: 'Delivered' } : app
      ));
    }, 1200);

    alert(`APPROVED!\nNotification sequence initiated for ${clientName}.\nVerification Code: ${generatedCode}`);
  };

  // Secure validation handshake check
  const handleVerifyCodeSubmission = (id, correctCode) => {
    const userInput = enteredCodes[id];
    
    if (String(userInput) === String(correctCode)) {
      setAppointments(prev => prev.map(app => 
        app.id === id ? { ...app, status: 'Completed' } : app
      ));
      alert("🎉 Security Token Confirmed. Appointment marked Completed.");
    } else {
      alert("⚠️ Access Token Mismatch. Please re-read the code from the client's handset.");
    }
  };

  const flagNoShow = (id) => {
    if(confirm("Flag this profile as a No-Show? This terminates the verification vector.")) {
      setAppointments(prev => prev.map(app => 
        app.id === id ? { ...app, status: 'No-Show' } : app
      ));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans selection:bg-green-500/20">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & METRIC CARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-900 gap-4">
          <div>
            <h1 className="text-4xl font-black text-green-500 tracking-tighter italic">GNIS COMMAND</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Operational Control Layer v2.1 // Secure Framework Protocols</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl flex flex-col min-w-[200px]">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500">Settled Revenue</span>
            <span className="text-2xl font-black text-green-400">£{completedRevenue}.00</span>
          </div>
        </div>

        {/* FEED GRID */}
        <div className="space-y-6">
          {appointments.map((app) => (
            <div 
              key={app.id} 
              className={`bg-slate-900 border transition-all duration-300 p-8 rounded-[2.5rem] ${
                app.status === 'Completed' ? 'border-emerald-500/20 opacity-60' : 
                app.status === 'No-Show' ? 'border-rose-500/20 opacity-40' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black tracking-tight">{app.client}</h2>
                    
                    {/* Dynamic Booking Type Badge */}
                    {app.bookingType === 'AI-Negotiated' && (
                      <span className="bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-amber-500/20">
                        🤖 AI Price Match (-£{app.originalPrice - app.total})
                      </span>
                    )}

                    {/* Operational Status Tracking Badge */}
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      app.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      app.status === 'Accepted' ? 'bg-blue-500/10 text-blue-400' :
                      app.status === 'No-Show' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  
                  {/* Phone & Carrier Infrastructure Verification Pill */}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-slate-400 font-mono text-xs">{app.phone}</p>
                    {app.status === 'Accepted' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        app.smsStatus === 'Delivered' ? 'bg-emerald-950 text-emerald-400' :
                        app.smsStatus === 'Sending' ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-slate-950 text-slate-500'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${app.smsStatus === 'Delivered' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        SMS {app.smsStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wide mt-1">{app.service}</p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Secure Rate</p>
                  <p className="text-3xl font-black text-green-400 tracking-tight">£{app.total}</p>
                </div>
              </div>

              {/* ACTION MATRIX */}
              {app.status === 'Pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => approveBooking(app.id, app.phone, app.client)}
                    className="bg-green-600 hover:bg-green-500 px-6 py-3.5 rounded-xl font-black text-[10px] tracking-widest uppercase transition-colors"
                  >
                    Approve & Issue Verification Code
                  </button>
                  <button className="bg-slate-800 hover:bg-slate-700 px-6 py-3.5 rounded-xl font-black text-[10px] tracking-widest uppercase text-slate-400 transition-colors">
                    Reschedule
                  </button>
                </div>
              )}

              {/* LIVE HANDSHAKE INTERFACE VERIFICATION MODULE */}
              {app.status === 'Accepted' && (
                <div className="mt-4 p-6 bg-black/40 rounded-3xl border border-green-500/20 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Client Handshake Verification</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    </div>
                    <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md border border-green-500/10">
                      System Key Generated: <strong className="font-bold text-white tracking-wider">{app.vCode}</strong>
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength={4}
                      placeholder="Enter 4-digit code from client handset" 
                      value={enteredCodes[app.id] || ''}
                      onChange={(e) => setEnteredCodes({ ...enteredCodes, [app.id]: e.target.value })}
                      className="bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-3 text-sm flex-1 outline-none text-white font-mono tracking-widest focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                    />
                    <button 
                      onClick={() => handleVerifyCodeSubmission(app.id, app.vCode)}
                      className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black hover:bg-green-500 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Verify & Settle
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/60">
                    <p className="text-[9px] text-slate-500 italic">Verify token to reconcile workspace ledger.</p>
                    <button 
                      onClick={() => flagNoShow(app.id)} 
                      className="text-rose-500 hover:text-rose-400 text-[9px] uppercase font-black tracking-widest hover:underline"
                    >
                      Flag No-Show ✕
                    </button>
                  </div>
                </div>
              )}

              {/* ARCHIVED SECURE STATES VISUALS */}
              {app.status === 'Completed' && (
                <div className="mt-2 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/20 p-4 border border-emerald-500/10 rounded-2xl flex items-center gap-2">
                  <span>✓</span> Secure Transaction Verified & Cleared via Verification Token Matrix.
                </div>
              )}

              {app.status === 'No-Show' && (
                <div className="mt-2 text-xs font-mono text-rose-400 font-bold bg-rose-950/20 p-4 border border-rose-500/10 rounded-2xl flex items-center gap-2">
                  <span>✕</span> Entry Revoked. Marked as No-Show by admin command.
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}