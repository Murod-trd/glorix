import { prisma } from '../_lib/db.js';
import { getAuthUser } from '../_lib/auth.js';
import { applyCors, readBody } from '../_lib/http.js';
import { isValidCompanyType } from '../_lib/roles.js';

async function currentMembership(userId) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const membership = await currentMembership(user.id);
      if (!membership) return res.status(404).json({ error: 'No company found' });
      return res.status(200).json({ company: membership.company, role: membership.role });
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const membership = await currentMembership(user.id);
      if (!membership) return res.status(404).json({ error: 'No company found' });

      const body = readBody(req);
      const data = {};
      if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
      if (typeof body.country === 'string') data.country = body.country.trim() || null;
      if (body.taxId !== undefined || body.registrationNumber !== undefined) {
        const v = body.taxId ?? body.registrationNumber;
        data.taxId = v ? String(v).trim() : null;
      }
      if (body.companyType !== undefined) {
        if (!isValidCompanyType(String(body.companyType))) {
          return res.status(400).json({ error: 'Invalid companyType' });
        }
        data.companyType = String(body.companyType);
      }
      // verificationStatus is intentionally NOT updatable here — KYC is future work.

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }

      const company = await prisma.company.update({
        where: { id: membership.companyId },
        data,
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'company.update',
          entityType: 'Company',
          entityId: company.id,
          metadata: JSON.stringify({ fields: Object.keys(data) }),
        },
      });
      return res.status(200).json({ company, role: membership.role });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/companies/me]', err);
    return res.status(500).json({ error: 'Company operation failed' });
  }
}
