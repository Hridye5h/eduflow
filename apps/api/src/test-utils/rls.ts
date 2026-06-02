import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * Apply the RLS policies for DB-gated specs. DDL (ALTER TABLE / CREATE POLICY)
 * requires the table-owner role, so this connects via DIRECT_URL (owner) — the
 * app role the tests otherwise run as is intentionally non-privileged for DDL.
 * Idempotent; safe to call in every suite's beforeAll.
 */
export async function applyRlsAsOwner(): Promise<void> {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const sql = fs
    .readFileSync(path.join(__dirname, '..', '..', 'prisma', 'rls.sql'), 'utf8')
    .replace(/;\s*$/, '');
  const owner = new PrismaClient({ datasources: { db: { url } } });
  try {
    await owner.$executeRawUnsafe(sql);
  } finally {
    await owner.$disconnect();
  }
}
