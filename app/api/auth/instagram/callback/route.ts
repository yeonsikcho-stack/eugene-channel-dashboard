import { NextRequest, NextResponse } from 'next/server';
import { exchangeInstagramAuthCode } from '@/lib/instagramOAuth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/channels/instagram?oauth=error`);
  }

  try {
    await exchangeInstagramAuthCode(code);
    return NextResponse.redirect(`${origin}/channels/instagram?oauth=connected`);
  } catch (error) {
    console.error('instagram oauth callback error:', error);
    return NextResponse.redirect(`${origin}/channels/instagram?oauth=error`);
  }
}
