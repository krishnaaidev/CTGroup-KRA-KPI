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
  UserPlus
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'reviews' | 'categories' | 'audit' | 'analytics'>('users');
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

  // Review Modal state
  const [reviewModalSub, setReviewModalSub] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvedScoreInput, setApprovedScoreInput] = useState<number>(0);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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

      // Fetch submissions for review
      const subRes = await fetch('/api/submissions?viewAll=true');
      const subData = await subRes.json();
      if (subData.submissions) setSubmissions(subData.submissions);

      // Fetch audit logs
      const auditRes = await fetch('/api/admin/audit-logs');
      const auditData = await auditRes.json();
      if (auditData.logs) setAuditLogs(auditData.logs);

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
    setApprovedScoreInput(sub.calculated_score || 0);
    setReviewComments('');
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
      alert('Review failed: ' + err.message);
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
      setActionMsg(data.message);
      loadData();
    } catch (err: any) {
      alert('User creation failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Admin Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-800 to-indigo-900 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">Administrator Console</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Initial Admin (ID: 20)
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Centralized Governance, User Approvals, Evaluation Scoring & Audit Trails
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded font-mono font-medium">developer@ctgroup.in</span>
                <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1 rounded font-medium">Session: 2026-2027</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center no-print">
            <a
              href="/api/reports/export?type=faculty"
              download
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
            >
              <Download className="w-4 h-4 mr-1.5 text-blue-600" />
              Download Faculty Report (Excel)
            </a>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-semibold text-white shadow-sm transition"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Faculty Member
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMsg && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-blue-500 hover:text-blue-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* High-level Global Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered Faculties</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{userStats.total || 0}</span>
              <span className="text-xs text-slate-500 font-medium">Faculty Members</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Registered in Portal</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Registrations</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-amber-600">{userStats.pending || 0}</span>
              <span className="text-xs text-slate-500 font-medium">Awaiting Approval</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Mandatory Admin validation</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Submissions</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-purple-700">
                {submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'RESUBMITTED').length}
              </span>
              <span className="text-xs text-slate-500 font-medium">In Queue</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Ready for scoring review</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Evaluations</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-emerald-700">
                {submissions.filter(s => s.status === 'APPROVED').length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Finalized</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Locked into audit trail</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-slate-200 flex flex-wrap gap-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'users' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & Approvals</span>
            {userStats.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                {userStats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'reviews' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Award className="w-4 h-4" />
            <span>Evaluation Review Queue</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
              {submissions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-4 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'categories' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Settings className="w-4 h-4" />
            <span>Evaluation Categories Config</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 text-sm font-bold border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'audit' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <History className="w-4 h-4" />
            <span>Live Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: User Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Search and Filters */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, College ID, or Email..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Roles</option>
                  <option value="FACULTY">Faculty Only</option>
                  <option value="ADMIN">Admin Only</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
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
                          u.role === 'HOI' ? 'bg-indigo-100 text-indigo-800' :
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
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Pending</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Rejected</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.status === 'PENDING_APPROVAL' ? (
                          <div className="flex justify-end space-x-1.5">
                            <button
                              onClick={() => handleApproveUser(u.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveUser(u.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Review Queue */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Institutional Review & Scoring Queue</h3>
              <p className="text-xs text-slate-500">
                Verify supporting documents, review calculated marks against institutional slabs, and approve/reject with transparent audit feedback.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Faculty & Dept</th>
                    <th className="px-6 py-3.5">Category & Criteria</th>
                    <th className="px-6 py-3.5">Claimed Achievement</th>
                    <th className="px-6 py-3.5">Calculated Score</th>
                    <th className="px-6 py-3.5">Approved Score</th>
                    <th className="px-6 py-3.5">Evidence</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{sub.faculty_name}</div>
                        <div className="text-[11px] text-slate-500">{sub.department_name} ({sub.faculty_college_id})</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{sub.category_name}</div>
                        <div className="text-[11px] text-slate-500">Max: {sub.max_marks} marks</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {sub.achievement_input || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {sub.calculated_score} marks
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {sub.approved_score !== null ? (
                          <span className="text-emerald-700">{sub.approved_score} / {sub.max_marks}</span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.evidence_url ? (
                          <a
                            href={sub.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-semibold flex items-center"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            {sub.evidence_name || 'View Doc'}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === 'APPROVED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Approved</span>
                        ) : sub.status === 'REJECTED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Under Review</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openReviewModal(sub)}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md font-bold text-xs"
                        >
                          Verify & Score
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Categories Configuration */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Evaluation Categories Framework</h3>
              <p className="text-xs text-slate-500">
                Institutional categories, max marks, target criteria, and scoring rules for Faculty (1,000 Marks), HOD (400/600), and HOI (500/500).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-700">#{c.order_num} • {c.code}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-slate-200">
                      {c.max_marks} Marks
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.target_criteria}</p>
                  <div className="text-[11px] text-slate-400 font-mono">Type: {c.scoring_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Live Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Live Institutional Audit Trail (Section 8)</h3>
              <p className="text-xs text-slate-500">
                Tamper-proof record of logins, submissions, automated calculations, approvals, and system events.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">User</th>
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
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {log.user_name || 'System Admin'}
                        <div className="text-[10px] text-slate-400">{log.user_email}</div>
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

      {/* Review Modal */}
      {reviewModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify & Approve Submission</h3>
                <p className="text-xs text-slate-500">{reviewModalSub.faculty_name} • {reviewModalSub.category_name}</p>
              </div>
              <button onClick={() => setReviewModalSub(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Claimed Achievement:</span>
                <span className="font-semibold text-slate-800">{reviewModalSub.achievement_input || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Calculated Score:</span>
                <span className="font-bold text-blue-700">{reviewModalSub.calculated_score} / {reviewModalSub.max_marks} marks</span>
              </div>
              {reviewModalSub.evidence_url && (
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Attached Evidence:</span>
                  <a href={reviewModalSub.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Attached Evidence
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Review Decision</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('APPROVED')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${reviewDecision === 'APPROVED' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'border-slate-200 text-slate-600'}`}
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Approve Score</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('REJECTED')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${reviewDecision === 'REJECTED' ? 'bg-red-50 border-red-500 text-red-800' : 'border-slate-200 text-slate-600'}`}
                >
                  <X className="w-4 h-4 text-red-600" />
                  <span>Reject (Needs Revision)</span>
                </button>
              </div>
            </div>

            {reviewDecision === 'APPROVED' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Approved Marks (Max {reviewModalSub.max_marks})
                </label>
                <input
                  type="number"
                  min="0"
                  max={reviewModalSub.max_marks}
                  value={approvedScoreInput}
                  onChange={(e) => setApprovedScoreInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mandatory Review Comments & Audit Reason
              </label>
              <textarea
                rows={3}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Explain approval or rejection justification..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalSub(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewLoading}
                onClick={handleReviewSubmit}
                className="px-5 py-2 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 disabled:opacity-50"
              >
                {reviewLoading ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Institutional User / HOD / HOI</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College ID</label>
                  <input
                    type="text"
                    required
                    value={newUserData.college_id}
                    onChange={(e) => setNewUserData({ ...newUserData, college_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FACULTY">Faculty Member</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserData.department_id}
                    onChange={(e) => setNewUserData({ ...newUserData, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Campus Wide / None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newUserData.designation}
                    onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800"
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
