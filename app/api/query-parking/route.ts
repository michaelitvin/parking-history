import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { putParkingData } from '@/lib/dynamodb';

const TARGET_URLS = [
  "https://www.ahuzot.co.il/Parking/ParkingDetails/?ID=123"
];

export async function GET(req: Request) {
  if (req.headers.get('x-api-key') !== `${process.env.CUSTOM_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let added_data = [];

  try {
    for (const url of TARGET_URLS) {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const is_full = $(".ParkingDetailsTable td img").attr("src")?.includes("male.png") ?? false;
      const lot_name = $(".ParkingTableHeader").text().trim()

      const data: Record<string, any> = {
        lot_name,
        is_full,
        url
      };

      added_data.push(data);
      await putParkingData(data);
    }

    return NextResponse.json({ success: true, data: added_data });
  } catch (error) {
    console.error('Error querying data:', error);
    return NextResponse.json(
      { error: 'Failed to query parking data' },
      { status: 500 }
    );
  }
}
