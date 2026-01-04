import { WebSocket } from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

// Neon Config for Serverless
neonConfig.webSocketConstructor = WebSocket;
const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: adapter as any,
        log: ['query', 'error', 'warn']
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
