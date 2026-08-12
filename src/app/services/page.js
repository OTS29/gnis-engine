'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ServicesPage() {
  const [category, setCategory] = useState('salon');
  const [step, setStep] = useState(1); 
  const [booking, setBooking] = useState({
    service: '', duration: 1, date: '', time: '', name: '', phone: '', address: '',
  });

  const HOURLY_CLEANING_RATE = 15;
  const MY_PHONE_NUMBER = "+2348169230095"; // ⬅️ REPLACE THIS WITH YOUR REAL PHONE NUMBER (Include country code, no +)

  const calculatePrice = () => {
    if (category === 'cleaning') return booking.duration * HOURLY_CLEANING_RATE;
    const selectedService = services.salon.find(s => s.name === booking.service);
    return selectedService ? selectedService.price : 0;
  };

  const handleFinalBooking = () => {
    const total = calculatePrice();
    const message = `*NEW GNIS BOOKING*%0A%0A` +
      `*Service:* ${booking.service}%0A` +
      `*Category:* ${category.toUpperCase()}%0A` +
      `*Client:* ${booking.name}%0A` +
      `*Address:* ${booking.address}%0A` +
      `*Date:* ${booking.date}%0A` +
      `*Time:* ${booking.time}%0A` +
      (category === 'cleaning' ? `*Duration:* ${booking.duration} Hours%0A` : '') +
      `*Total Price:* £${total}%0A%0A` +
      `*Payment:* Pay on Arrival`;

    // Opens WhatsApp with the details
    window.open(`https://wa.me/${MY_PHONE_NUMBER}?text=${message}`, '_blank');
    setStep(3); // Move to success screen
  };

  const services = {
    salon: [
      { id: 's1', name: 'Standard Haircut', price: 25, img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' },
      { id: 's2', name: 'Shape Up & Beard', price: 20, img: 'https://images.unsplash.com/photo-1621605815841-aa897bd43944?w=400' },
      { id: 's3', name: 'VIP Full Service', price: 50, img: 'https://images.unsplash.com/photo-1599351473249-28827c1f3f32?w=400' },
    ],
    cleaning: [
      { id: 'c1', name: 'Residential Cleaning', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6954?w=400' },
      { id: 'c2', name: 'Office Sanitization', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' },
    ]
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <nav className="p-6 bg-white/80 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {step > 1 && step < 3 && (
            <button onClick={() => setStep(step - 1)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <Link href="/" className="text-2xl font-black text-green-700 tracking-tighter">GNIS</Link>
        </div>
        {step === 1 && (
          <div className="flex bg-slate-100 rounded-full p-1 border">
            <button onClick={() => setCategory('salon')} className={`px-6 py-2 rounded-full text-[10px] font-black transition ${category === 'salon' ? 'bg-white shadow-sm text-green-700' : 'text-slate-400'}`}>SALON</button>
            <button onClick={() => setCategory('cleaning')} className={`px-6 py-2 rounded-full text-[10px] font-black transition ${category === 'cleaning' ? 'bg-white shadow-sm text-green-700' : 'text-slate-400'}`}>CLEANING</button>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto mt-12 px-6">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter italic">{category === 'salon' ? 'Choose Your Cut' : 'Book Cleaning'}</h1>
            <p className="text-slate-400 font-bold text-sm mb-12 uppercase tracking-widest">{category === 'salon' ? 'Professional Fixed Pricing' : 'Flexible £15/Hour Service'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services[category].map((s) => (
                <div key={s.id} className="bg-white rounded-[2.5rem] overflow-hidden border-2 border-transparent hover:border-green-500 transition-all shadow-xl group">
                  <div className="relative h-48">
                    <img src={s.img} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {category === 'salon' && <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full font-black text-green-700 text-xs shadow-lg italic">£{s.price}</div>}
                  </div>
                  <div className="p-6">
                    <h3 className="font-black text-xl mb-4">{s.name}</h3>
                    <button onClick={() => { setBooking({...booking, service: s.name}); setStep(2); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition">Book Service</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border max-w-xl mx-auto animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 uppercase text-center italic tracking-tighter">Enter Booking Info</h2>
            <div className="space-y-4">
              {category === 'cleaning' && (
                <div className="p-6 bg-green-50 rounded-[2rem] border border-green-100 mb-6 text-center">
                  <label className="text-[10px] font-black uppercase text-green-700 block mb-4 tracking-widest">Select Hours (£15/hr)</label>
                  <div className="flex items-center justify-between px-4">
                     <button onClick={() => setBooking({...booking, duration: Math.max(1, booking.duration - 1)})} className="w-12 h-12 bg-white rounded-2xl border shadow-sm font-black text-xl">-</button>
                     <span className="text-3xl font-black text-slate-800">{booking.duration} hr</span>
                     <button onClick={() => setBooking({...booking, duration: booking.duration + 1})} className="w-12 h-12 bg-white rounded-2xl border shadow-sm font-black text-xl">+</button>
                  </div>
                </div>
              )}
              <input placeholder="Client Full Name" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-green-600 transition" onChange={e => setBooking({...booking, name: e.target.value})} />
              <input placeholder="Full Address & Postcode" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-green-600 transition" onChange={e => setBooking({...booking, address: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none ring-1 ring-slate-100" onChange={e => setBooking({...booking, date: e.target.value})} />
                <input type="time" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none ring-1 ring-slate-100" onChange={e => setBooking({...booking, time: e.target.value})} />
              </div>
              <div className="pt-8 border-t mt-6 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Grand Total</span>
                  <span className="text-3xl font-black text-green-700">£{calculatePrice()}</span>
                </div>
                <button onClick={handleFinalBooking} className="bg-green-700 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all uppercase">
                  Confirm & Message
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-b-[12px] border-green-500">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✅</div>
              <h2 className="text-4xl font-black mb-4 italic tracking-tighter uppercase">Order <span className="text-green-600">Pending</span></h2>
              <p className="text-slate-400 font-bold mb-8">We have received your WhatsApp message! You will pay £{calculatePrice()} in person at the time of service.</p>
              <Link href="/" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-green-700 transition">BACK TO MAIN</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}