// Prisma client singleton for Vercel serverless functions.
// Reusing a single client across warm invocations avoids exhausting DB connections.
/* global process */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__glorixPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__glorixPrisma = prisma;
}

export default prisma;
