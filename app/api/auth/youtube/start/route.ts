import { NextResponse } from 'next/server';
import { getYoutubeAuthUrl } from '@/lib/youtubeOAuth';

export async function GET() {
  try {
    return NextResponse.redirect(getYoutubeAuthUrl());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '연결을 시작하지 못했습니다.' },
      { status: 500 },
    );
  }
}
