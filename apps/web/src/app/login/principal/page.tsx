import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Principal sign in — EduFlow',
  description: 'Sign in to the EduFlow administrator portal.',
};

export default function PrincipalLogin() {
  return <LoginForm role="principal" />;
}
