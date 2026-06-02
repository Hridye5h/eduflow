import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Parent sign in — EduFlow',
  description: 'Track your child’s attendance, marks, and school updates.',
};

export default function ParentLogin() {
  return <LoginForm role="parent" />;
}
