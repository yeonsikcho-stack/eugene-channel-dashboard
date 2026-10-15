import { NextRequest, NextResponse } from 'next/server';
import { exchangeYoutubeAuthCode } from '@/lib/youtubeOAuth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/channels/youtube?oauth=error`);
  }

  try {
    await exchangeYoutubeAuthCode(code);
    return NextResponse.redirect(`${origin}/channels/youtube?oauth=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/channels/youtube?oauth=error`);
  }
}
