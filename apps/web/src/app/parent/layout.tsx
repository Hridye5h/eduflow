'use client';
import { RolePortalShell } from '@/components/layout/RolePortalShell';
import { ParentChrome } from '@/components/parent/ParentChrome';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolePortalShell role="PARENT">
      <ParentChrome />
      {children}
    </RolePortalShell>
  );
}
