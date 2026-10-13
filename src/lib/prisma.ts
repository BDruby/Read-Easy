import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL = 'mysql://shengao:yDrFsxpyQcmGti6G@101.200.156.170:3306/shengao';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
