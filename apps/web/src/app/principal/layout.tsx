'use client';
import { RolePortalShell } from '@/components/layout/RolePortalShell';

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <RolePortalShell role="SUPER_ADMIN">{children}</RolePortalShell>;
}
