import { NextResponse } from 'next/server';
import { getInstagramAuthUrl } from '@/lib/instagramOAuth';

export async function GET() {
  try {
    return NextResponse.redirect(getInstagramAuthUrl());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '연결을 시작하지 못했습니다.' },
      { status: 500 },
    );
  }
}
