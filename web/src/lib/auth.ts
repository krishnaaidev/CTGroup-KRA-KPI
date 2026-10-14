import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getDb } from './db';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'ct-group-kra-kpi-secret-key-2026-secure-jwt';
const TOKEN_COOKIE_NAME = 'ctgroup_session_token';

export interface TokenPayload {
  id: number;
  college_id: string;
  email: string;
  name: string;
  role: UserRole;
  department_id: number | null;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function getSessionFromCookies(): TokenPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): TokenPayload | null {
  // Check Authorization Bearer header first (useful for Mobile Apps & APIs)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7);
    const decoded = verifyToken(bearerToken);
    if (decoded) return decoded;
  }

  // Check cookies
  const cookie = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookie) {
    return verifyToken(cookie);
  }
  return null;
}

export function getUserById(id: number): User | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT u.*, d.name as department_name 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.id = ?
  `).get(id) as any;
  if (!row) return null;
  return row as User;
}

export function getUserByEmailOrCollegeId(identifier: string): User | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT u.*, d.name as department_name 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.email = ? OR u.college_id = ?
  `).get(identifier, identifier) as any;
  if (!row) return null;
  return row as User;
}

export const AUTH_COOKIE_OPTIONS = {
  name: TOKEN_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
