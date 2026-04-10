import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get('phantom_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ connected: [] });
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    });

    const connected = accounts.map(a => a.provider);
    return NextResponse.json({ connected, userId });
  } catch (err) {
    console.error('[Providers Status] Error:', err);
    return NextResponse.json({ connected: [] });
  }
}
