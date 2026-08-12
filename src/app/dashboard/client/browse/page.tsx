"use client";

import { useEffect, useState } from "react";

export default function BrowseProviders() {
  const [pros, setPros] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profiles/get-all");
      const { data } = await res.json();
      setPros(data || []);
    }
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Browse Providers</h1>

      <div className="space-y-4">
        {pros.map((pro: any) => (
          <a
            key={pro.id}
            href={`/dashboard/client/pro/${pro.userId}`}
            className="block p-4 bg-gray-100 rounded"
          >
            <p className="font-semibold">{pro.primarySkill}</p>
            <p>Base Rate: {pro.baseRate}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
