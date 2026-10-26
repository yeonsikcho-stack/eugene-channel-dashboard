import { NextResponse } from 'next/server';
import { getOAuthConnection } from '@/lib/oauth';

export async function GET() {
  const connection = getOAuthConnection('instagram');
  if (!connection) {
    return NextResponse.json({ status: 'disconnected' });
  }
  return NextResponse.json({
    status: connection.status,
    lastError: connection.lastError,
    connectedAt: connection.connectedAt,
  });
}
