'use client';

import { useEffect, useState } from 'react';
import Heatmap, { HeatmapData } from './components/Heatmap';

interface ParkingEntry {
  id: string;
  timestamp: string;
  url: string;
  lot_name: string;
  is_full: boolean;
}

interface ParkingLotData {
  heatmap: HeatmapData[];
  last_entry: ParkingEntry;
}

interface ParkingLotsData {
  [url: string]: ParkingLotData;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default function Home() {
  const [parkingHeatmapData, setParkingHeatmapData] = useState<ParkingLotsData>({});
  const [loading, setLoading] = useState(true);
  const [weeksLimit, setWeeksLimit] = useState<number | undefined>();

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/parking-heatmap');
        const data = await response.json();
        console.log('Data parsed:', data);
        setParkingHeatmapData(data);
      } catch (error) {
        console.error('Error fetching parking data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const lotEntries = Object.entries(parkingHeatmapData);

  function getTitle(lot_data: ParkingLotData) {
    const status = lot_data.last_entry.is_full ? "&#128308;" : "&#128994;";
    return status + " " + lot_data.last_entry.lot_name;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              id="weeks-history"
              type="checkbox"
              checked={weeksLimit !== undefined}
              onChange={(e) => setWeeksLimit(e.target.checked ? 1 : undefined)}
            />
            <label htmlFor="weeks-history" className="text-sm">Weeks of History:</label>
            <input
              id="weeks-history"
              type="number"
              value={weeksLimit || ''}
              onChange={(e) => setWeeksLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              className="border rounded px-2 py-1 w-24 text-sm"
              min="1"
            />
          </div>
          {loading ? (
            <div className="flex items-center flex-col gap-8">
              <p>Loading...</p>
            </div>
          ) : (
            <div className="flex items-center flex-col gap-8">
              {lotEntries.map(([url, lot_data]) => {
                return (
                  <Heatmap 
                    key={url}
                    data={lot_data.heatmap}
                    title={getTitle(lot_data)}
                    last_updated={lot_data.last_entry.timestamp}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
