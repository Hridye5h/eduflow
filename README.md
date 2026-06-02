# EduFlow

Multi-tenant school management SaaS. Every school gets its own subdomain (`springfield.eduflow.app`) and isolated data via `schoolId` on every row.

## Stack

| Layer | Tech |
|---|---|
| API | NestJS 11 · Prisma 5 · Postgres · Socket.IO · Cloudinary · Nodemailer |
| Web | Next.js 16 · React 19 · Tailwind v4 (light theme) · Recharts · Leaflet |
| Mobile | Expo 52 · React Native · React Navigation v7 |

## Features (12 modules, all implemented)

1. **Auth & onboarding** — register school, email+password, OTP for parents
2. **Class & section management** — bulk import, transfers, class-teacher assignment
3. **Attendance** — chip-based roll call, leave applications, auto-fanout to parents
4. **Marks & report cards** — exams, publish, printable PDF report cards
5. **Class wall** — homework, notices, events, file attachments, reactions, pins
6. **Chat** — Socket.IO real-time class groups + DMs
7. **Timetable** — weekly grid + cross-section conflict detection + substitutions
8. **Homework/assignments** — submit, grade, basic plagiarism flag
9. **Notifications** — inbox + broadcasts + preferences
10. **Reports & analytics** — attendance trend, marks averages, at-risk students
11. **Fees** — structures auto-fanned out per student, partial payments, reminders
12. **Admin settings** — users, subjects, audit log, school profile

## Quick start (local)

```powershell
pnpm install
pnpm docker:up
pnpm prisma:migrate
pnpm prisma:seed       # creates Springfield + admin@springfield.eduflow.local / admin123
pnpm dev               # api:4001  web:3001  mobile via Expo QR
```

- Web: http://localhost:3001
- API: http://localhost:4001 (Swagger at `/docs`)

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for the full GitHub → Render → Vercel walkthrough, including:
- Email provider setup (Resend / Gmail / SendGrid / Brevo)
- Cloudinary keys
- Wildcard subdomain DNS for true multi-tenancy
- Optional Expo build for mobile

## Tests

```bash
pnpm --filter api test:e2e
```

CI runs the same tests on every push — see [.github/workflows/ci.yml](.github/workflows/ci.yml).
