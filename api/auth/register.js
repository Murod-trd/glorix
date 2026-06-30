import { prisma } from '../_lib/db.js';
import { hashPassword } from '../_lib/password.js';
import { signToken, safeUser } from '../_lib/auth.js';
import { applyCors, readBody, isEmail } from '../_lib/http.js';
import { isValidCompanyType } from '../_lib/roles.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const fullName = String(body.fullName || '').trim();
  const companyName = String(body.companyName || '').trim();
  const country = body.country ? String(body.country).trim() : null;
  const companyType = String(body.companyType || 'buyer').trim();
  const taxId = (body.taxId || body.registrationNumber)
    ? String(body.taxId || body.registrationNumber).trim()
    : null;

  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!fullName) return res.status(400).json({ error: 'fullName is required' });
  if (!companyName) return res.status(400).json({ error: 'companyName is required' });
  if (!isValidCompanyType(companyType)) {
    return res.status(400).json({ error: 'companyType must be buyer, supplier or both' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await hashPassword(password);

    const { user, company, membership } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, country, taxId, companyType },
      });
      const user = await tx.user.create({
        data: { email, passwordHash, fullName, role: 'owner', status: 'active' },
      });
      const membership = await tx.membership.create({
        data: { userId: user.id, companyId: company.id, role: 'owner' },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.register',
          entityType: 'User',
          entityId: user.id,
          metadata: JSON.stringify({ companyId: company.id }),
        },
      });
      return { user, company, membership };
    });

    const token = signToken({ sub: user.id, email: user.email });
    return res.status(201).json({
      token,
      user: safeUser(user),
      company,
      membership: { role: membership.role, companyId: company.id },
    });
  } catch (err) {
    console.error('[/api/auth/register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
