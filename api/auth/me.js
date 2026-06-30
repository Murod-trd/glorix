import { prisma } from '../_lib/db.js';
import { getAuthUser } from '../_lib/auth.js';
import { applyCors } from '../_lib/http.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      user,
      company: membership?.company ?? null,
      membership: membership ? { role: membership.role, companyId: membership.companyId } : null,
    });
  } catch (err) {
    console.error('[/api/auth/me]', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}
