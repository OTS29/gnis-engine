export default async function ProDetails({ params }: any) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/profiles/get?userId=${params.id}`
  );
  const { data: pro } = await res.json();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{pro.primarySkill}</h1>

      <p className="mt-2">Base Rate: {pro.baseRate}</p>
      <p>Operating Radius: {pro.operatingRadius}</p>

      <h2 className="text-lg font-semibold mt-6">Services</h2>
      <div className="space-y-2">
        {pro.services?.map((service: any) => (
          <div key={service.id} className="p-3 bg-gray-100 rounded">
            <p>{service.name}</p>
            <p>£{service.price}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-6">Availability</h2>
      <div className="space-y-2">
        {pro.availability?.map((slot: any) => (
          <div key={slot.id} className="p-3 bg-gray-100 rounded">
            <p>Day: {slot.dayOfWeek}</p>
            <p>{slot.startTime} - {slot.endTime}</p>
          </div>
        ))}
      </div>

      <a
        href={`/dashboard/client/book/${pro.id}`}
        className="mt-6 inline-block p-3 bg-blue-600 text-white rounded"
      >
        Book Provider
      </a>
    </div>
  );
}
