// Seed a demo tenant + a varied Smart-Dunning collections board, then print a
// ready-to-use principal session (token + subdomain) for the dashboard.
//   node seed-demo.cjs
const { PrismaClient } = require('@prisma/client');

const API = process.env.API_BASE || 'http://127.0.0.1:4001';
const sub = 'sunrise-' + Math.floor(Math.random() * 1e4);
const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000);

(async () => {
  // 1) Register a fresh school → working principal JWT (no OTP needed).
  const reg = await fetch(`${API}/auth/register-school`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      schoolName: 'Sunrise Coaching Classes',
      subdomain: sub,
      board: 'CBSE',
      adminName: 'Principal Sharma',
      adminEmail: `principal@${sub}.test`,
      adminPassword: 'demo1234',
    }),
  });
  if (!reg.ok) {
    console.log('register-school failed', reg.status, await reg.text());
    process.exit(1);
  }
  const { school, accessToken } = await reg.json();

  // 2) Seed a realistic collections board (bypass RLS for the system seed).
  const prisma = new PrismaClient();
  const runs = [
    { studentId: 'Aarav Sharma (VIII-A)',  amount: 4500, stage: 1, status: 'ACTIVE',             phone: '919812300001', due: 7 },
    { studentId: 'Diya Patel (IX-B)',      amount: 6000, stage: 2, status: 'ACTIVE',             phone: '919812300002', due: 12 },
    { studentId: 'Vivaan Gupta (VII-A)',   amount: 3200, stage: 0, status: 'ACTIVE',             phone: '919812300003', due: 3 },
    { studentId: 'Ananya Singh (X-C)',     amount: 8500, stage: 4, status: 'AWAITING_APPROVAL',  phone: '919812300004', due: 21 },
    { studentId: 'Reyansh Kumar (VI-A)',   amount: 5000, stage: 3, status: 'ACTIVE',             phone: '919812300005', due: 16 },
    { studentId: 'Saanvi Reddy (VIII-B)',  amount: 4500, stage: 2, status: 'PAID',               phone: '919812300006', due: 10 },
    { studentId: 'Kabir Mehta (IX-A)',     amount: 7000, stage: 1, status: 'ACTIVE',             phone: '919812300007', due: 5 },
  ];
  for (const r of runs) {
    await prisma.$transaction([
      prisma.$executeRaw`SELECT set_config('app.bypass_rls','on', true)`,
      prisma.dunningRun.create({
        data: {
          schoolId: school.id,
          studentId: r.studentId,
          amount: r.amount,
          dueDate: daysAgo(r.due),
          toPhone: r.phone,
          stage: r.stage,
          status: r.status,
          nextActionAt: new Date(now + 7 * 86400000), // future → the live tick won't touch demo data
        },
      }),
    ]);
  }
  await prisma.$disconnect();

  console.log(JSON.stringify({ subdomain: sub, schoolId: school.id, accessToken, seeded: runs.length }, null, 2));
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
