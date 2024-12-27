import { NextResponse } from 'next/server';
import { getAllParkingData } from '@/lib/dynamodb';

export async function GET() {
  try {
    const data = await getAllParkingData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching parking data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parking data' },
      { status: 500 }
    );
  }
}
