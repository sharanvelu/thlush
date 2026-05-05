import {NextResponse} from 'next/server';

// Legacy callback route — Auth.js handles callbacks via /api/auth/callback/[provider]
export async function GET(request: Request) {
  const {origin} = new URL(request.url);
  return NextResponse.redirect(`${origin}/`);
}
