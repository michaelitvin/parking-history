import { NextResponse } from 'next/server';
import { getAllParkingData } from '@/lib/dynamodb';

type ParkingEntry = {
  id: string;
  timestamp: string;
  url: string;
  lot_name: string;
  is_full: boolean;
};

type HeatmapData = {
  day: number;
  hour: number;
  value: number;
};

type ParkingLotData = {
  heatmap: HeatmapData[];
  last_entry: ParkingEntry;
};

type ParkingLotsData = {
  [url: string]: ParkingLotData;
};

function processDataToHeatmap(data: ParkingEntry[]): ParkingLotsData {
  const parkingLots: ParkingLotsData = {};

  // Initialize the structure for each unique parking lot
  data.forEach(entry => {
    if (!parkingLots[entry.url] || entry.timestamp > parkingLots[entry.url].last_entry.timestamp) {
      parkingLots[entry.url] = {
        heatmap: [],
        last_entry: entry,
      };
    }
  });

  // Process data for each parking lot
  Object.keys(parkingLots).forEach(url => {
    const lotEntries = data.filter(entry => entry.url === url);
    const heatmapData = new Array(7 * 24).fill(0).map((_, index) => {
      const day = Math.floor(index / 24);
      const hour = index % 24;
      return { day, hour, value: 0 };
    });

    // Count occurrences and full status for each day/hour combination
    const counters = new Array(7 * 24).fill(0);
    const fullCounts = new Array(7 * 24).fill(0);

    lotEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      const index = day * 24 + hour;
      
      counters[index]++;
      if (entry.is_full) {
        fullCounts[index]++;
      }
    });

    // Calculate percentage for each time slot
    heatmapData.forEach((slot, index) => {
      if (counters[index] > 0) {
        slot.value = fullCounts[index] / counters[index];
      }
    });

    parkingLots[url].heatmap = heatmapData;
  });

  return parkingLots;
}

export async function GET() {
  try {
    const rawData = await getAllParkingData();
    const heatmapData = processDataToHeatmap(rawData);
    return NextResponse.json(heatmapData);
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return NextResponse.json(
      { error: 'Failed to generate heatmap data' },
      { status: 500 }
    );
  }
}
