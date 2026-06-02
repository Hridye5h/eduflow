'use client';
import { RolePortalShell } from '@/components/layout/RolePortalShell';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RolePortalShell role="TEACHER">{children}</RolePortalShell>;
}
