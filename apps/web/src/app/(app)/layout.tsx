'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { PremiumLoader } from '@/components/common/PremiumLoader';
import { PageTransition } from '@/components/layout/PageTransition';
import { session } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [schoolName, setSchoolName] = useState<string | undefined>();

  useEffect(() => {
    if (!session.token()) {
      router.replace('/login');
      return;
    }
    setSchoolName(session.subdomain() ?? undefined);
    setReady(true);
  }, [router]);

  if (!ready) return <PremiumLoader />;

  return (
    <div className="min-h-screen flex">
      <Sidebar schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0">
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}
