'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [parkingData, setParkingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/parking-data');
        const data = await response.json();
        setParkingData(data);
      } catch (error) {
        console.error('Error fetching parking data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Parking History</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {parkingData.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-lg p-4 shadow-sm"
            >
              <p className="text-sm text-gray-500">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
              {Object.entries(entry)
                .filter(([key]) => !['id', 'timestamp'].includes(key))
                .map(([key, value]) => (
                  <p key={key} className="mt-2">
                    <span className="font-semibold">{key}:</span> {String(value)}
                  </p>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
