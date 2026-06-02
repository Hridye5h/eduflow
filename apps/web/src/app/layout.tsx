import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { UserProfile } from '@/components/common/UserProfile';
import { TopProgressBar } from '@/components/common/TopProgressBar';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduFlow — School Management',
  description: 'Multi-tenant school portal: attendance, marks, class wall, timetable, fees.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <TopProgressBar />
        <UserProfile />
        {children}
      </body>
    </html>
  );
}
