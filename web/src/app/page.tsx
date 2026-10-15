import { redirect } from 'next/navigation';
import { getSessionFromCookies, getUserById } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const session = getSessionFromCookies();

  if (!session) {
    redirect('/login');
  }

  const user = getUserById(session.id);
  if (!user || user.status !== 'APPROVED') {
    redirect('/login');
  }

  switch (user.role) {
    case 'ADMIN':
      redirect('/admin');
    case 'HOI':
      redirect('/hoi');
    case 'HOD':
      redirect('/hod');
    case 'FACULTY':
    default:
      redirect('/faculty');
  }
}
