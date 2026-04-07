import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = process.env.COMMAND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  try {
    const { key } = await req.json();
    if (!key || key !== secret) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('gt-session', '1', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 3600, // 8 hours
      path: '/',
    });
    res.cookies.set('gt-command-key', key, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 3600,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
