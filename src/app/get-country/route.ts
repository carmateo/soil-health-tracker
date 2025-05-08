import { NextResponse } from 'next/server';
import { getLocationDetails } from '@/ai/get-location-details'; // este path es válido en tu estructura

export async function POST(req: Request) {
  const { latitude, longitude } = await req.json();
  const result = await getLocationDetails({ latitude, longitude });
  return NextResponse.json(result);
}
