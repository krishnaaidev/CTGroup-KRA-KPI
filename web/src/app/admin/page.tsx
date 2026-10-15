'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  ShieldCheck, 
  Users, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  FileText, 
  Check, 
  X, 
  Settings, 
  History, 
  Building2, 
  Calendar,
  Lock,
  ChevronRight,
  UserPlus,
  Database,
  Cloud,
  RefreshCw,
  ExternalLink,
  Crown,
  Briefcase
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'users' | 'google_db' | 'categories' | 'audit'>('reviews');
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({ total: 0, pending: 0, faculty: 0, hod: 0, hoi: 0 });
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState('ALL');

  // Review Modal state (Director Final Institutional Approval)
  const [reviewModalSub, setReviewModalSub] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvedScoreInput, setApprovedScoreInput] = useState<number>(0);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Google Cloud Database state
  const [googleDbStatus, setGoogleDbStatus] = useState<any>(null);
  const [syncingGoogleDb, setSyncingGoogleDb] = useState(false);
  const [googleSyncResult, setGoogleSyncResult] = useState<any>(null);
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);
  const [googleProjectIdInput, setGoogleProjectIdInput] = useState('ctgroup-kra-kpi');

  // Create User Modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    college_id: '',
    email: '',
    phone: '',
    role: 'FACULTY',
    department_id: '',
    designation: 'Assistant Professor',
    password: 'Password@123',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (!userData.authenticated) {
        window.location.href = '/login';
        return;
      }
      if (userData.user.role !== 'ADMIN') {
        window.location.href = '/login';
        return;
      }
      setUser(userData.user);

      // Fetch users
      let userUrl = `/api/admin/users?search=${encodeURIComponent(searchQuery)}`;
      if (roleFilter) userUrl += `&role=${roleFilter}`;
      if (statusFilter) userUrl += `&status=${statusFilter}`;
      if (deptFilter) userUrl += `&departmentId=${deptFilter}`;
      const usersRes = await fetch(userUrl);
      const usersData = await usersRes.json();
      if (usersData.users) {
        setUsers(usersData.users);
        setUserStats(usersData.stats || {});
      }

      // Fetch departments
      const deptsRes = await fetch('/api/departments');
      const deptsData = await deptsRes.json();
      if (deptsData.departments) setDepartments(deptsData.departments);

      // Fetch categories
      const catRes = await fetch('/api/categories?role=FACULTY');
      const catData = await catRes.json();
      if (catData.categories) setCategories(catData.categories);

      // Fetch all submissions for review
      const subRes = await fetch('/api/submissions?viewAll=true');
      const subData = await subRes.json();
      if (subData.submissions) setSubmissions(subData.submissions);

      // Fetch audit logs
      const auditRes = await fetch('/api/admin/audit-logs');
      const auditData = await auditRes.json();
      if (auditData.logs) setAuditLogs(auditData.logs);

      // Fetch Google Database Status
      const gRes = await fetch('/api/admin/google-db');
      const gData = await gRes.json();
      if (gData.status) {
        setGoogleDbStatus(gData.status);
        if (gData.status.projectId) setGoogleProjectIdInput(gData.status.projectId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter, deptFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleApproveUser = async (userId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(data.message);
      loadData();
    } catch (err: any) {
      setActionMsg('Error: ' + err.message);
    }
  };

  const openReviewModal = (sub: any) => {
    setReviewModalSub(sub);
    setReviewDecision('APPROVED');
    // Default to HOI score if present, else HOD score, else calculated
    setApprovedScoreInput(sub.hoi_score ?? sub.hod_score ?? sub.claimed_score ?? sub.calculated_score ?? 0);
    setReviewComments(sub.director_remarks || '');
  };

  const handleReviewSubmit = async () => {
    if (!reviewModalSub) return;
    setReviewLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: reviewModalSub.id,
          decision: reviewDecision,
          approvedScore: approvedScoreInput,
          comments: reviewComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviewModalSub(null);
      loadData();
    } catch (err: any) {
      alert('Final approval failed: ' + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateUserModal(false);
      setNewUserData({
        name: '',
        college_id: '',
        email: '',
        phone: '',
        role: 'FACULTY',
        department_id: '',
        designation: 'Assistant Professor',
        password: 'Password@123',
      });
      loadData();
    } catch (err: any) {
      alert('Error creating user: ' + err.message);
    }
  };

  const handleSyncToGoogleDb = async () => {
    setSyncingGoogleDb(true);
    setGoogleSyncResult(null);
    try {
      const res = await fetch('/api/admin/google-db', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setGoogleSyncResult(data);
      // Refresh status
      const gRes = await fetch('/api/admin/google-db');
      const gData = await gRes.json();
      if (gData.status) setGoogleDbStatus(gData.status);
    } catch (e: any) {
      alert('Google Cloud Database sync error: ' + e.message);
    } finally {
      setSyncingGoogleDb(false);
    }
  };

  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/google-db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: googleProjectIdInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      setShowGoogleConfigModal(false);
      loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (submissionFilter === 'ALL') return true;
    if (submissionFilter === 'PENDING_DIRECTOR') return sub.status === 'VERIFIED_BY_HOI';
    if (submissionFilter === 'APPROVED') return sub.status === 'APPROVED';
    if (submissionFilter === 'PENDING_HOD_HOI') return sub.status === 'SUBMITTED_TO_HOD' || sub.status === 'VERIFIED_BY_HOD';
    if (submissionFilter === 'REJECTED') return sub.status === 'REJECTED' || sub.status === 'REJECTED_BY_HOD' || sub.status === 'REJECTED_BY_HOI';
    return true;
  });

  const pendingDirectorCount = submissions.filter(s => s.status === 'VERIFIED_BY_HOI').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_TO_HOD':
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Tier 1: At HOD</span>;
      case 'VERIFIED_BY_HOD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Tier 2: At HOI</span>;
      case 'VERIFIED_BY_HOI':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Tier 3: Ready for Director</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Final Approved</span>;
      case 'REJECTED':
      case 'REJECTED_BY_HOD':
      case 'REJECTED_BY_HOI':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Director Executive Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 mb-3">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                Tier 4: Campus Director / Main Administrator Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Institutional Authority & Performance Management
              </h1>
              <p className="mt-1 text-slate-300 text-sm">
                4-Tier Governance: Faculty Submission → HOD Verification → HOI Verification → Director Final Approval
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/api/reports/export?type=excel"
                download="CTGroup_KRA_KPI_Report.xlsx"
                className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export Full Excel
              </a>
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add User Account
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Awaiting Director Sign-off</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{pendingDirectorCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Registrations</div>
              <div className="text-2xl font-black text-white mt-1">{userStats.pending || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Submissions</div>
              <div className="text-2xl font-black text-white mt-1">{submissions.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Google DB Sync</div>
              <div className="text-sm font-black text-emerald-400 mt-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                {googleDbStatus?.connected ? 'Live & Synced' : 'Active Local DB'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-slate-200 flex flex-wrap gap-4 sm:gap-6">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'reviews' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Director Final Approvals</span>
            {pendingDirectorCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                {pendingDirectorCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'users' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & Registrations</span>
            {userStats.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                {userStats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('google_db')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'google_db' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Google Cloud Database Integration</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'categories' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Categories (1,000 Marks)</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'audit' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: Final Approvals Queue */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="text-xs font-bold text-slate-700">
                Submissions Filter:
              </div>
              <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'PENDING_DIRECTOR', label: `Pending Director Action (${pendingDirectorCount})` },
                  { id: 'ALL', label: `All Submissions (${submissions.length})` },
                  { id: 'APPROVED', label: 'Final Approved' },
                  { id: 'PENDING_HOD_HOI', label: 'At HOD / HOI' },
                  { id: 'REJECTED', label: 'Rejected' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSubmissionFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      submissionFilter === f.id
                        ? 'bg-purple-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Faculty & Dept</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Claimed</th>
                      <th className="px-6 py-3.5">HOD Verified</th>
                      <th className="px-6 py-3.5">HOI Verified</th>
                      <th className="px-6 py-3.5">Final Status</th>
                      <th className="px-6 py-3.5 text-right">Director Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No submissions matching this filter
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{sub.faculty_name}</div>
                            <div className="text-[11px] text-slate-500">{sub.department_name} ({sub.faculty_college_id})</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{sub.category_name}</div>
                            <div className="text-[11px] text-slate-400">Max: {sub.max_marks} marks</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">
                            {sub.claimed_score} / {sub.max_marks}
                          </td>
                          <td className="px-6 py-4">
                            {sub.hod_score !== null && sub.hod_score !== undefined ? (
                              <div>
                                <span className="font-bold text-blue-700">{sub.hod_score}</span>
                                {sub.hod_remarks && <div className="text-[10px] text-slate-400 truncate max-w-[120px]">&ldquo;{sub.hod_remarks}&rdquo;</div>}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {sub.hoi_score !== null && sub.hoi_score !== undefined ? (
                              <div>
                                <span className="font-bold text-amber-700">{sub.hoi_score}</span>
                                {sub.hoi_remarks && <div className="text-[10px] text-slate-400 truncate max-w-[120px]">&ldquo;{sub.hoi_remarks}&rdquo;</div>}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(sub.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openReviewModal(sub)}
                              className="px-3.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold text-xs transition"
                            >
                              Final Review
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: User Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, College ID, or Email..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">All Roles</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="HOD">HOD</option>
                  <option value="HOI">HOI</option>
                  <option value="ADMIN">Director / Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">College ID</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Designation</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                        {u.college_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'HOI' ? 'bg-amber-100 text-amber-800' :
                          u.role === 'HOD' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {u.department_name || 'Campus Wide'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {u.designation}
                      </td>
                      <td className="px-6 py-4">
                        {u.status === 'APPROVED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Approved</span>
                        ) : u.status === 'PENDING_APPROVAL' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">Pending Approval</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Rejected</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleApproveUser(u.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveUser(u.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Google Cloud Database Integration */}
        {activeTab === 'google_db' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                    <Cloud className="w-4 h-4" />
                    Google Cloud Platform (GCP)
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    Google Cloud Database Connector & Collections Sync
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live bidirectional synchronization between local fast SQLite and Google Cloud Firestore.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowGoogleConfigModal(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300"
                  >
                    Configure Project
                  </button>
                  <button
                    onClick={handleSyncToGoogleDb}
                    disabled={syncingGoogleDb}
                    className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingGoogleDb ? 'animate-spin' : ''}`} />
                    {syncingGoogleDb ? 'Syncing to Google Cloud...' : 'Sync to Google Database Now'}
                  </button>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <span className="text-xs font-bold text-blue-900">Connection Mode</span>
                  <div className="text-sm font-extrabold text-blue-700 mt-1 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    {googleDbStatus?.mode || 'LIVE_GOOGLE_FIRESTORE'}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Google Cloud Firestore</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Project ID</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1 font-mono">
                    {googleDbStatus?.projectId || 'ctgroup-kra-kpi'}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Google Cloud Platform</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Total Synced Records</span>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {googleDbStatus?.totalRecords || 0}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Across 9 Collections</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Last Successful Sync</span>
                  <div className="text-xs font-extrabold text-slate-900 mt-1 font-mono">
                    {googleDbStatus?.lastSyncTime ? new Date(googleDbStatus.lastSyncTime).toLocaleTimeString() : 'Automatic on change'}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Persistent Cloud State</span>
                </div>
              </div>

              {/* Sync Feedback Message */}
              {googleSyncResult && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mb-6 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{googleSyncResult.message}</span>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-700">
                      {Object.entries(googleSyncResult.syncedCollections || {}).map(([col, count]) => (
                        <span key={col} className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          {col}: {count as any}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Collections Grid */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Google Cloud Firestore Collections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'ctgroup_users', desc: 'Faculty, HOD, HOI, and Director authentication and roles' },
                    { name: 'ctgroup_faculty_submissions', desc: '17 KRA/KPI evaluation records with proofs & multi-tier marks' },
                    { name: 'ctgroup_hod_evaluations', desc: 'Departmental leadership 1,000 marks submissions' },
                    { name: 'ctgroup_hoi_evaluations', desc: 'Campus governance 1,000 marks submissions' },
                    { name: 'ctgroup_departments', desc: 'Academic departments & HOD assignments' },
                    { name: 'ctgroup_categories', desc: 'Framework categories and scoring rules' },
                    { name: 'ctgroup_sessions', desc: 'Academic session deadlines and calendar' },
                    { name: 'ctgroup_reviews', desc: 'Full audit of HOD, HOI, and Director review actions' },
                    { name: 'ctgroup_audit_logs', desc: 'Tamper-proof system security logs' },
                  ].map((col) => (
                    <div key={col.name} className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700">{col.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{col.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Categories Framework */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Institutional Categories Framework (1,000 Marks)</h3>
              <p className="text-xs text-slate-500">
                17 Faculty Categories, 8 HOD Categories, and 8 HOI Categories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-700">#{c.order_num} • {c.code}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-slate-200">
                      {c.max_marks} Marks
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.target_criteria}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Live Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Live Institutional Audit Trail</h3>
              <p className="text-xs text-slate-500">
                Tamper-proof record of logins, submissions, automated calculations, approvals, and system events.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Record Type / ID</th>
                    <th className="px-6 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono">
                        {log.record_type} #{log.record_id}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                        {log.details_json}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Director Review Modal */}
      {reviewModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Tier 4: Campus Director Final Institutional Approval
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {reviewModalSub.category_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Faculty: <span className="font-semibold text-slate-800">{reviewModalSub.faculty_name}</span> ({reviewModalSub.department_name})
                </p>
              </div>
              <button
                onClick={() => setReviewModalSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Verification Trail Cards */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Faculty Claim</span>
                  <div className="text-sm font-black text-slate-800">{reviewModalSub.claimed_score} / {reviewModalSub.max_marks}</div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">HOD Verified</span>
                  <div className="text-sm font-black text-blue-700">{reviewModalSub.hod_score ?? 'Pending'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 font-bold uppercase">HOI Verified</span>
                  <div className="text-sm font-black text-amber-700">{reviewModalSub.hoi_score ?? 'Pending'}</div>
                </div>
              </div>

              {reviewModalSub.evidence_url && (
                <div>
                  <a
                    href={reviewModalSub.evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Inspect Faculty Evidence
                  </a>
                </div>
              )}

              {/* Decision */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Director Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('APPROVED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Grant Final Approval
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('REJECTED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewDecision === 'REJECTED'
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Reject / Return
                  </button>
                </div>
              </div>

              {reviewDecision === 'APPROVED' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Final Institutional Marks Awarded (Max {reviewModalSub.max_marks})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={reviewModalSub.max_marks}
                    value={approvedScoreInput}
                    onChange={(e) => setApprovedScoreInput(Math.min(reviewModalSub.max_marks, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Director Institutional Remarks
                </label>
                <textarea
                  rows={2}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Final institutional approval remarks..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalSub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewLoading}
                  onClick={handleReviewSubmit}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-md"
                >
                  {reviewLoading ? 'Processing...' : 'Confirm Director Sign-off'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Cloud Project Config Modal */}
      {showGoogleConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Google Cloud Database Config</h3>
              <button onClick={() => setShowGoogleConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoogleConfig} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Cloud Project ID
                </label>
                <input
                  type="text"
                  required
                  value={googleProjectIdInput}
                  onChange={(e) => setGoogleProjectIdInput(e.target.value)}
                  placeholder="e.g. ctgroup-kra-kpi"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-purple-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Connects to Google Cloud Firestore collections at <code>https://firestore.googleapis.com</code>
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition shadow"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Create Institutional Account</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College ID</label>
                  <input
                    type="text"
                    required
                    value={newUserData.college_id}
                    onChange={(e) => setNewUserData({ ...newUserData, college_id: e.target.value })}
                    placeholder="e.g. CT-101"
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="FACULTY">Faculty</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="HOI">Head of Institution (HOI)</option>
                    <option value="ADMIN">Campus Director / Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="name@ctgroup.in"
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserData.department_id}
                    onChange={(e) => setNewUserData({ ...newUserData, department_id: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Campus Wide / None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={newUserData.designation}
                  onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
                  placeholder="Assistant Professor / Professor / Director"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
