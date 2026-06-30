import { prisma } from '../_lib/db.js';
import { verifyPassword } from '../_lib/password.js';
import { signToken, safeUser } from '../_lib/auth.js';
import { applyCors, readBody, isEmail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!isEmail(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Generic message — do not reveal whether the email exists.
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.status === 'disabled') return res.status(403).json({ error: 'Account disabled' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });

    const token = signToken({ sub: user.id, email: user.email });
    return res.status(200).json({
      token,
      user: safeUser(user),
      company: membership?.company ?? null,
      membership: membership ? { role: membership.role, companyId: membership.companyId } : null,
    });
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}
