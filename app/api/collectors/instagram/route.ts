import { NextResponse } from 'next/server';
import { runCollector } from '@/lib/collectors';
import { fetchInstagramSnapshot } from '@/lib/instagram';

export async function POST() {
  const result = await runCollector('instagram', fetchInstagramSnapshot);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
