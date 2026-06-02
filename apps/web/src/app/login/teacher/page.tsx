import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Teacher sign in — EduFlow',
  description: 'Mark attendance, enter marks, and post to your class wall.',
};

export default function TeacherLogin() {
  return <LoginForm role="teacher" />;
}
