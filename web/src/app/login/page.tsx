'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  GraduationCap
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Redirect according to user role
      const role = data.user.role;
      if (role === 'ADMIN') router.push('/admin');
      else router.push('/faculty');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoIdentifier: string, demoPass: string) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl border-2 border-white">
            CT
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          CT Group of Institutions
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-slate-600">
          KRA & KPI Performance Management System (1,000 Marks)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                College ID or Institutional Email
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 20 or developer@ctgroup.in"
                  className="block w-full pl-9 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs text-center text-slate-600 mb-3">
              New faculty member?{' '}
              <Link href="/register" className="font-semibold text-blue-700 hover:underline">
                Register Faculty Account
              </Link>
            </p>

            {/* Quick Demo Login Credentials Card */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Default Administrator Login</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickLogin('developer@ctgroup.in', 'CTAdmin@2026')}
                className="w-full p-2.5 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-900 block text-xs">👑 Initial Admin (ID: 20)</span>
                  <span className="text-[11px] text-purple-700 font-medium">Click to fill</span>
                </div>
                <span className="text-slate-500 text-[11px]">developer@ctgroup.in • Password: CTAdmin@2026</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
