'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  ExternalLink, 
  Search, 
  Filter, 
  Award, 
  Users, 
  Send, 
  Check, 
  X, 
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Download,
  Briefcase,
  ShieldCheck,
  Crown
} from 'lucide-react';

export default function HoiPortal() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'faculty_queue' | 'hod_reviews' | 'hoi_kpi' | 'dept_matrix'>('faculty_queue');
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<any[]>([]);
  const [hoiCategories, setHoiCategories] = useState<any[]>([]);
  const [hoiEvaluation, setHoiEvaluation] = useState<any>(null);

  // Review modal state
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [hoiScore, setHoiScore] = useState<number>(0);
  const [hoiRemarks, setHoiRemarks] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // HOI KPI Form
  const [instScoreInput, setInstScoreInput] = useState<number>(440);
  const [selfScoreInput, setSelfScoreInput] = useState<number>(470);
  const [hoiKpiSubmitting, setHoiKpiSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (!userData.authenticated) {
        window.location.href = '/login';
        return;
      }
      if (userData.user.role !== 'HOI' && userData.user.role !== 'ADMIN') {
        window.location.href = '/faculty';
        return;
      }
      setUser(userData.user);

      // Fetch all submissions for institutional verification
      const subRes = await fetch('/api/submissions?viewAll=true');
      const subData = await subRes.json();
      if (subData.submissions) {
        setSubmissions(subData.submissions);
      }

      // Fetch HOI evaluation data & department summaries
      const hoiRes = await fetch('/api/hoi/evaluations');
      const hoiData = await hoiRes.json();
      if (hoiData.categories) setHoiCategories(hoiData.categories);
      if (hoiData.departmentSummaries) setDeptSummaries(hoiData.departmentSummaries);
      if (hoiData.evaluation) {
        setHoiEvaluation(hoiData.evaluation);
        setInstScoreInput(hoiData.evaluation.inst_score || 0);
        setSelfScoreInput(hoiData.evaluation.self_score || 0);
      }
    } catch (err) {
      console.error('HOI Portal load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReviewModal = (sub: any) => {
    setSelectedSub(sub);
    setHoiScore(sub.hod_score || sub.claimed_score || sub.calculated_score || 0);
    setHoiRemarks(sub.hoi_remarks || '');
    setActionSuccessMsg(null);
  };

  const handleReviewAction = async (decision: 'VERIFY' | 'REJECT') => {
    if (!selectedSub) return;
    setReviewLoading(true);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSub.id,
          decision,
          approvedScore: hoiScore,
          comments: hoiRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setActionSuccessMsg(
        decision === 'VERIFY'
          ? `Verified! Forwarded to Director for Final Institutional Approval with score ${hoiScore}/${selectedSub.max_marks}.`
          : 'Returned for revisions.'
      );

      setTimeout(() => {
        setSelectedSub(null);
        loadData();
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleHoiKpiSubmit = async (action: 'DRAFT' | 'SUBMIT') => {
    setHoiKpiSubmitting(true);
    try {
      const res = await fetch('/api/hoi/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instScore: instScoreInput,
          selfScore: selfScoreInput,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setHoiKpiSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchSearch = searchQuery === '' || 
      (sub.faculty_name && sub.faculty_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.department_name && sub.department_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.category_name && sub.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'ALL') return matchSearch;
    if (statusFilter === 'PENDING') return matchSearch && (sub.status === 'VERIFIED_BY_HOD' || sub.status === 'SUBMITTED_TO_HOD');
    if (statusFilter === 'VERIFIED') return matchSearch && sub.status === 'VERIFIED_BY_HOI';
    if (statusFilter === 'APPROVED') return matchSearch && sub.status === 'APPROVED';
    return matchSearch;
  });

  const pendingHoiCount = submissions.filter(s => s.status === 'VERIFIED_BY_HOD').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_TO_HOD':
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">Awaiting HOD</span>;
      case 'VERIFIED_BY_HOD':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Ready for HOI Review</span>;
      case 'VERIFIED_BY_HOI':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">Verified by HOI (At Director)</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Approved by Director</span>;
      case 'REJECTED_BY_HOI':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">Needs Revision (HOI)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 mb-3">
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Tier 3: Head of Institution (HOI) Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Institutional Quality & Appraisal Portal
              </h1>
              <p className="mt-1 text-amber-100/90 text-sm">
                Campus-Wide Verification of Departmental & Faculty Evaluations
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-amber-300">{pendingHoiCount}</div>
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">Awaiting HOI Review</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-white">{deptSummaries.length}</div>
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">Active Departments</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveTab('faculty_queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'faculty_queue'
                  ? 'bg-white text-amber-900 shadow-md'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              HOD-Verified Queue ({pendingHoiCount})
            </button>
            <button
              onClick={() => setActiveTab('hoi_kpi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'hoi_kpi'
                  ? 'bg-white text-amber-900 shadow-md'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-4 h-4" />
              HOI Institutional KPI (1,000 Marks)
            </button>
            <button
              onClick={() => setActiveTab('dept_matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'dept_matrix'
                  ? 'bg-white text-amber-900 shadow-md'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Department Score Matrix
            </button>
          </div>
        </div>

        {/* TAB 1: HOD-Verified Queue */}
        {activeTab === 'faculty_queue' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty, dept, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'PENDING', 'VERIFIED', 'APPROVED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      statusFilter === filter
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">HOD Submissions Forwarded to HOI</h3>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredSubmissions.length} records
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No submissions matching filter</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <div key={sub.id} className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm">{sub.faculty_name}</span>
                          <span className="text-xs font-semibold text-slate-500">• {sub.department_name}</span>
                          {getStatusBadge(sub.status)}
                        </div>
                        <h4 className="font-semibold text-blue-900 text-sm">{sub.category_name}</h4>
                        
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-500">Claimed:</span>{' '}
                            <span className="font-bold text-slate-800">{sub.claimed_score} / {sub.max_marks}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">HOD Verified:</span>{' '}
                            <span className="font-bold text-blue-700">{sub.hod_score || 'Pending'}</span>
                          </div>
                          {sub.hoi_score !== null && sub.hoi_score !== undefined && (
                            <div>
                              <span className="font-semibold text-slate-500">HOI Verified:</span>{' '}
                              <span className="font-bold text-emerald-700">{sub.hoi_score}</span>
                            </div>
                          )}
                          {sub.hod_remarks && (
                            <div className="italic text-slate-500">
                              &ldquo;{sub.hod_remarks}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => openReviewModal(sub)}
                          className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          Institutional Review <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOI Institutional KPI */}
        {activeTab === 'hoi_kpi' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  HOI Institutional Leadership & Governance KPI (1,000 Marks)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted directly to Institutional Director / Main Admin for Tier 4 Final Approval
                </p>
              </div>
              <div>{getStatusBadge(hoiEvaluation?.status || 'DRAFT')}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
              {/* Part A: Institutional Performance */}
              <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-amber-900 text-sm">Part A: Institutional Performance</h3>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Max: 500 Marks
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  NAAC/NBA accreditation readiness, campus admissions yield, placement percentage and research funding.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Claimed Institutional Score (0 - 500)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={instScoreInput}
                    onChange={(e) => setInstScoreInput(Math.min(500, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-600 bg-white"
                  />
                </div>
              </div>

              {/* Part B: Strategic Leadership & Expansion */}
              <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-orange-900 text-sm">Part B: Strategic Leadership & Governance</h3>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-orange-200 text-orange-900">
                    Max: 500 Marks
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Statutory council governance, Centers of Excellence, corporate partnerships, and campus financial health.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Claimed Leadership Score (0 - 500)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={selfScoreInput}
                    onChange={(e) => setSelfScoreInput(Math.min(500, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-600 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between mb-6">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total HOI Institutional Claim</span>
                <div className="text-2xl font-black text-amber-400">
                  {instScoreInput + selfScoreInput} / 1,000 Marks
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                Target Verification: Institutional Director
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={hoiKpiSubmitting}
                onClick={() => handleHoiKpiSubmit('DRAFT')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={hoiKpiSubmitting}
                onClick={() => handleHoiKpiSubmit('SUBMIT')}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit HOI KPI to Director
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Department Score Matrix */}
        {activeTab === 'dept_matrix' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Institutional Departments Summary</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {deptSummaries.map((dept) => (
                <div key={dept.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{dept.name}</h4>
                    <p className="text-xs text-slate-500">
                      Code: {dept.code} • HOD: <span className="font-semibold text-slate-700">{dept.hod_name || 'Assigned HOD'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Faculties</span>
                      <span className="font-bold text-slate-800 text-sm">{dept.faculty_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Avg Score</span>
                      <span className="font-bold text-blue-700 text-sm">{Math.round(dept.avg_score || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Tier 3: HOI Verification
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedSub.category_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Faculty: <span className="font-semibold text-slate-800">{selectedSub.faculty_name}</span> ({selectedSub.department_name})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {actionSuccessMsg ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{actionSuccessMsg}</h4>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Faculty Claimed:</span>
                      <div className="text-sm font-black text-slate-800">
                        {selectedSub.claimed_score} / {selectedSub.max_marks}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">HOD Verified:</span>
                      <div className="text-sm font-black text-blue-700">
                        {selectedSub.hod_score || 'N/A'} / {selectedSub.max_marks}
                      </div>
                    </div>
                  </div>

                  {selectedSub.hod_remarks && (
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
                      <span className="font-bold">HOD Remarks:</span> {selectedSub.hod_remarks}
                    </div>
                  )}

                  {selectedSub.evidence_url && (
                    <div>
                      <a
                        href={selectedSub.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Uploaded Evidence
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HOI Verified Score (Max {selectedSub.max_marks})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={selectedSub.max_marks}
                      value={hoiScore}
                      onChange={(e) => setHoiScore(Math.min(selectedSub.max_marks, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HOI Institutional Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={hoiRemarks}
                      onChange={(e) => setHoiRemarks(e.target.value)}
                      placeholder="Add remarks for Director final approval..."
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction('REJECT')}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                    >
                      Return / Reject
                    </button>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction('VERIFY')}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Verify & Forward to Director
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
