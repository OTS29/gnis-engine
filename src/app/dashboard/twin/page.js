'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function TwinPage() {
  // Functional controls for the system parameters
  const [autoNegotiate, setAutoNegotiate] = useState(true);
  const [surgePricing, setSurgePricing] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans selection:bg-green-500/20">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Handshake */}
        <Link href="/" className="inline-flex items-center gap-2 text-green-500 text-xs font-black uppercase tracking-widest hover:text-green-400 transition-colors">
          ← Return to Operational Core
        </Link>
        
        <header className="mt-8 mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter">AI TWIN <span className="text-green-500">ENGINE</span></h1>
          <p className="text-slate-400 mt-2 uppercase text-xs font-bold tracking-[0.2em] font-mono">Autonomous Command Center Active</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Neural Settings Card */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Neural Settings</h3>
              <p className="text-sm text-slate-500 mb-6">Configure runtime conversation behaviors for your consumer-facing twin.</p>
              
              <div className="space-y-4">
                {/* Auto Negotiation Toggle */}
                <div className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-slate-800/60">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">Auto-Negotiation</span>
                    <span className="text-[10px] text-slate-500 font-medium">Allows AI to counter offers within your floor rate.</span>
                  </div>
                  <button 
                    onClick={() => setAutoNegotiate(!autoNegotiate)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${autoNegotiate ? 'bg-green-500 justify-end' : 'bg-slate-800 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                  </button>
                </div>

                {/* Surge Pricing Toggle */}
                <div className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-slate-800/60">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">Surge Pricing</span>
                    <span className="text-[10px] text-slate-500 font-medium">Bumps baseline rates by 15% when shop occupancy hits 80%.</span>
                  </div>
                  <button 
                    onClick={() => setSurgePricing(!surgePricing)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${surgePricing ? 'bg-green-500 justify-end' : 'bg-slate-800 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                  </button>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-600 font-mono italic mt-6">Parameters auto-save to global framework state.</p>
          </div>

          {/* Twin Status Card */}
          <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-2xl shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden group">
            {/* Background design elements */}
            <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 pointer-events-none font-black select-none">AI</div>
            
            <div>
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold tracking-tight">Twin Status</h3>
                <span className="bg-indigo-500/50 text-white text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border border-indigo-400/30 animate-pulse">
                  Telemetry Online
                </span>
              </div>
              <div className="text-5xl my-6 transition-transform group-hover:scale-110 duration-300">🤖</div>
              <p className="text-indigo-100 font-medium text-sm leading-relaxed">
                Your AI twin model is currently monitoring <strong className="text-white font-black">0 active conversations</strong> on the retail booking matrix.
              </p>
            </div>
            
            <button 
              onClick={() => alert("Loading systemic communication telemetry sequence...")} 
              className="mt-8 w-full bg-white text-indigo-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-50 shadow-md active:scale-95"
            >
              View Conversation Logs
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}