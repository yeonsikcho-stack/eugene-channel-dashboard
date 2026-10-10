import { NextResponse } from 'next/server';
import { runCollector } from '@/lib/collectors';
import { fetchOnlineSaboSnapshot } from '@/lib/onlineSabo';

export async function POST() {
  const result = await runCollector('online_sabo', fetchOnlineSaboSnapshot);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
