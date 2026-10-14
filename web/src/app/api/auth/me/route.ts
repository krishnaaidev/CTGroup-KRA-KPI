import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getUserById } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = getUserById(session.id);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      college_id: user.college_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name,
      designation: user.designation,
      status: user.status,
    };

    return NextResponse.json({ authenticated: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
