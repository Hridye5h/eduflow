import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Student sign in — EduFlow',
  description: 'Check your attendance, report card, and class wall.',
};

export default function StudentLogin() {
  return <LoginForm role="student" />;
}
