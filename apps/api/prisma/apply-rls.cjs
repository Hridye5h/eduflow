/**
 * Applies prisma/rls.sql against DATABASE_URL.
 *
 * Idempotent — safe to run after every `prisma db push` / migrate. Uses the
 * generated Prisma client (already a dependency), so no psql binary is required.
 *
 *   pnpm --filter api db:rls
 */
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const sqlPath = path.join(__dirname, 'rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/;\s*$/, '');
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✓ RLS policies applied (prisma/rls.sql)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('✗ Failed to apply RLS policies:', err.message || err);
  process.exit(1);
});
