import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. See .env.example.");
const url = new URL(connectionString);
if (!["postgresql:", "postgres:"].includes(url.protocol)) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string");
}

// Reuse a client during development reloads; one connection pool per process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg(
    { connectionString, connectionTimeoutMillis: 5000 },
    { schema: url.searchParams.get("schema") || "public" },
  ),
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
