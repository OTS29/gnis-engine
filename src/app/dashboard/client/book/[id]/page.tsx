"use client";

import { useState } from "react";

export default function BookProvider({ params }: any) {
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  async function submitBooking() {
    await fetch("/api/bookings/create", {
      method: "POST",
      body: JSON.stringify({
        clientId: "CLIENT_ID_HERE",
        proProfileId: params.id,
        serviceId,
        date,
        startTime,
        endTime
      })
    });

    alert("Booking created!");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Book Provider</h1>

      <div className="mt-4 space-y-4">
        <input
          className="w-full p-2 border rounded"
          placeholder="Service ID"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        />

        <input
          className="w-full p-2 border rounded"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          className="w-full p-2 border rounded"
          placeholder="Start Time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <input
          className="w-full p-2 border rounded"
          placeholder="End Time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        <button
          onClick={submitBooking}
          className="p-3 bg-blue-600 text-white rounded"
        >
          Submit Booking
        </button>
      </div>
    </div>
  );
}
