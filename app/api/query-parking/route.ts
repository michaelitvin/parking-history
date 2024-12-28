import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { putParkingData, ParkingEntry } from '@/lib/dynamodb';

const TARGET_URLS = [
  "https://www.ahuzot.co.il/Parking/ParkingDetails/?ID=123"
];

export async function GET(req: Request) {
  if (req.headers.get('x-api-key') !== `${process.env.CUSTOM_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Start background processing
  (async () => {
    try {
      for (const url of TARGET_URLS) {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const is_full = $(".ParkingDetailsTable td img").attr("src")?.includes("male.png") ?? false;
        const lot_name = $(".ParkingTableHeader").text().trim()

        const data: ParkingEntry = {
          uuid: crypto.randomUUID(),
          timestamp: new Date().toISOString(),  
          lot_name,
          is_full,
          url
        };

        await putParkingData(data);
      }
    } catch (error) {
      console.error('Error in background processing:', error);
    }
  })();

  // Return immediately
  return NextResponse.json({ success: true, message: 'Query initiated' });
}
