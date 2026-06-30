// JWT-based stateless auth foundation.
// NOTE: This is a foundation, not a hardened production auth system.
// JWT_SECRET MUST be a strong random value in production.
/* global process */
import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const DEFAULT_EXPIRY = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured (must be a strong secret of >=16 chars)');
  }
  return secret;
}

export function signToken(payload, expiresIn = DEFAULT_EXPIRY) {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  return match ? match[1].trim() : null;
}

// Returns the authenticated User (without passwordHash) or null.
export async function getAuthUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return null;
  }
  if (!decoded?.sub) return null;
  const user = await prisma.user.findUnique({ where: { id: String(decoded.sub) } });
  if (!user || user.status === 'disabled') return null;
  return safeUser(user);
}

// Strip sensitive fields. passwordHash must NEVER be returned to clients.
export function safeUser(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars -- intentional omit of sensitive field
  const { passwordHash, ...rest } = user;
  return rest;
}
