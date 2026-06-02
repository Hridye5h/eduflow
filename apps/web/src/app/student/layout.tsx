'use client';
import { RolePortalShell } from '@/components/layout/RolePortalShell';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RolePortalShell role="STUDENT">{children}</RolePortalShell>;
}
