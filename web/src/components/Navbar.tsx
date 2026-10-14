'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  Calendar, 
  FileSpreadsheet, 
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  user?: {
    id: number;
    name: string;
    college_id: string;
    email: string;
    role: 'ADMIN' | 'HOD' | 'HOI' | 'FACULTY';
    department_name?: string;
    designation: string;
  } | null;
  activeSession?: string;
}

export default function Navbar({ user, activeSession = '2026-2027' }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      router.push('/login');
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HOI': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'HOD': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FACULTY': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Brand & Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                CT
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">CT Group of Institutions</span>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    1,000-Mark KRA/KPI
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Performance Evaluation & Appraisal Portal</p>
              </div>
            </Link>
          </div>

          {/* Center: Session Badge */}
          <div className="hidden lg:flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 my-auto">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Session:</span>
            <span className="font-medium text-blue-700">{activeSession}</span>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <>
                <div className="flex flex-col text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    ID: {user.college_id} {user.department_name ? `• ${user.department_name}` : ''}
                  </span>
                </div>

                {/* Quick Role Navigator for Reviewers / Admins */}
                <div className="relative">
                  <button
                    onClick={() => setIsSwitchMenuOpen(!isSwitchMenuOpen)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 text-xs flex items-center space-x-1 border border-slate-200"
                    title="Switch Portal Views"
                  >
                    <span>Portals</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isSwitchMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                      <Link 
                        href="/faculty" 
                        onClick={() => setIsSwitchMenuOpen(false)}
                        className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Faculty Portal
                      </Link>
                      <Link 
                        href="/hod" 
                        onClick={() => setIsSwitchMenuOpen(false)}
                        className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Building2 className="w-3.5 h-3.5 mr-2 text-blue-600" /> HOD Dashboard
                      </Link>
                      <Link 
                        href="/hoi" 
                        onClick={() => setIsSwitchMenuOpen(false)}
                        className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-2 text-indigo-600" /> HOI Dashboard
                      </Link>
                      <Link 
                        href="/admin" 
                        onClick={() => setIsSwitchMenuOpen(false)}
                        className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-t border-slate-100 font-semibold"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-2 text-purple-600" /> Admin Console
                      </Link>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-blue-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm"
                >
                  Faculty Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {user ? (
            <>
              <div className="py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                <p className="text-xs text-slate-500">ID: {user.college_id} ({user.role})</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/faculty" className="text-xs font-medium text-slate-700 p-2 bg-slate-50 rounded">
                  Faculty Portal
                </Link>
                <Link href="/hod" className="text-xs font-medium text-slate-700 p-2 bg-slate-50 rounded">
                  HOD Dashboard
                </Link>
                <Link href="/hoi" className="text-xs font-medium text-slate-700 p-2 bg-slate-50 rounded">
                  HOI Dashboard
                </Link>
                <Link href="/admin" className="text-xs font-medium text-slate-700 p-2 bg-slate-50 rounded">
                  Admin Console
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-3 flex items-center justify-center px-4 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-md border border-red-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              <Link href="/login" className="text-center py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded">
                Sign In
              </Link>
              <Link href="/register" className="text-center py-2 text-sm font-semibold text-white bg-blue-700 rounded">
                Faculty Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
