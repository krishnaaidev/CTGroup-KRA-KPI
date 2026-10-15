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
  GraduationCap,
  Briefcase,
  Crown,
  Smartphone,
  Download
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'FACULTY' | 'HOD' | 'HOI' | 'ADMIN'>('FACULTY');
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

      let data: any = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        if (data && data.error) {
          throw new Error(data.error);
        }
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('Cloud server is currently starting up. Please wait 15-30 seconds and try again.');
        }
        throw new Error(`Authentication server error (HTTP ${res.status}). Please check credentials.`);
      }

      if (!data || !data.user) {
        throw new Error('Invalid response received from authentication server.');
      }

      // 4-Tier Role-Based Navigation
      const role = data.user.role;
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'HOI') {
        router.push('/hoi');
      } else if (role === 'HOD') {
        router.push('/hod');
      } else {
        router.push('/faculty');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleTabs = [
    { id: 'FACULTY', label: 'Faculty', icon: GraduationCap, desc: 'Self-Appraisal & Evidence' },
    { id: 'HOD', label: 'HOD', icon: Briefcase, desc: 'Dept Verification' },
    { id: 'HOI', label: 'HOI', icon: Building2, desc: 'Institutional Verification' },
    { id: 'ADMIN', label: 'Director', icon: Crown, desc: 'Final Institutional Authority' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Institution Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white font-black text-2xl shadow-2xl border-2 border-white/20">
            CT
          </div>
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          CT Group of Institutions
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-300">
          KRA & KPI Performance Management Portal
        </p>
        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
          Tiered Verification: Faculty → HOD → HOI → Director
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
          {/* Role Selection Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Select Your Access Level
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {roleTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedRole(tab.id as any)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-md scale-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="truncate w-full text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
              Logging in as: <span className="font-semibold text-blue-700">{roleTabs.find(t => t.id === selectedRole)?.desc}</span>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                <div className="flex-1 leading-relaxed font-medium">{error}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                College ID or Institutional Email
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. Employee ID or name@ctgroup.in"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'Verifying Credentials...' : `Sign In as ${roleTabs.find(t => t.id === selectedRole)?.label}`}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>

          {/* Registration link */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs text-center text-slate-600">
              New faculty member?{' '}
              <Link href="/register" className="font-bold text-blue-700 hover:underline">
                Register Faculty Account
              </Link>
            </p>

            {/* Android Mobile Application Download Section */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <a
                href="/CTGroup_KRA_KPI.apk"
                download="CTGroup_KRA_KPI.apk"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:from-emerald-700 hover:to-teal-800 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                      Download Android App (APK)
                      <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-medium">v1.2</span>
                    </div>
                    <div className="text-[11px] text-emerald-100">Direct install on your smartphone</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white text-emerald-700 flex items-center justify-center group-hover:scale-110 transition shadow">
                  <Download className="w-4 h-4" />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <p className="mt-6 text-center text-xs text-slate-400 font-medium">
          Protected by CT Group Institutional Role-Based Access Control (RBAC)
        </p>
      </div>
    </div>
  );
}
