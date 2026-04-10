import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          include: {
            beliefs: true,
          },
        },
      },
    });

    // Filter out orphaned sessions that have no participants (broken/deleted records)
    const validSessions = sessions.filter(s => s.participants.length > 0);

    const response = NextResponse.json(validSessions);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
