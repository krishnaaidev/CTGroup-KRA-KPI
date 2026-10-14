import { redirect } from 'next/navigation';
import { getSessionFromCookies, getUserById } from '@/lib/auth';

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
    case 'HOD':
      redirect('/hod');
    case 'HOI':
      redirect('/hoi');
    case 'FACULTY':
    default:
      redirect('/faculty');
  }
}
