import { NextResponse } from 'next/server';
import { getAllParkingData, ParkingEntry } from '@/lib/dynamodb';
import { ParkingLotsData } from '@/lib/heatmap';
import { toZonedTime } from 'date-fns-tz';

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
      return { day, hour, value: 0, count: 0, total: 0 };
    });

    // Count occurrences and full status for each day/hour combination
    const counters = new Array(7 * 24).fill(0);
    const fullCounts = new Array(7 * 24).fill(0);

    lotEntries.forEach(entry => {
      const date = toZonedTime(entry.timestamp, "Asia/Jerusalem");
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
      slot.value = fullCounts[index] / counters[index];
      slot.count = fullCounts[index];
      slot.total = counters[index];
    });

    parkingLots[url].heatmap = heatmapData;
  });

  return parkingLots;
}

// Define the cache type to allow for ParkingLotsData or null
interface Cache {
  data: ParkingLotsData | null;
  timestamp: number | null;
}

// In-memory cache
const cache: Cache = {
  data: null,
  timestamp: null,
};

// Define the cache duration (5 minutes in milliseconds)
const CACHE_DURATION = 5 * 60 * 1000;

export async function GET() {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log('Cache hit');
      return NextResponse.json(cache.data);
    }

    const rawData = await getAllParkingData();
    const heatmapData = processDataToHeatmap(rawData);
    
    // Store the data in cache
    cache.data = heatmapData;
    cache.timestamp = now;
    
    return NextResponse.json(heatmapData);
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return NextResponse.json(
      { error: 'Failed to generate heatmap data' },
      { status: 500 }
    );
  }
}
