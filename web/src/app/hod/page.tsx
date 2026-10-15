'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Briefcase, 
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
  Building2
} from 'lucide-react';

export default function HodPortal() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'hod_kpi' | 'faculty_roster'>('queue');
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [facultyRoster, setFacultyRoster] = useState<any[]>([]);
  const [hodCategories, setHodCategories] = useState<any[]>([]);
  const [hodEvaluation, setHodEvaluation] = useState<any>(null);

  // Filter state
  const [searchFaculty, setSearchFaculty] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Review modal state
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [hodScore, setHodScore] = useState<number>(0);
  const [hodRemarks, setHodRemarks] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // HOD KPI submission state
  const [deptScoreInput, setDeptScoreInput] = useState<number>(320);
  const [selfScoreInput, setSelfScoreInput] = useState<number>(480);
  const [hodKpiRemarks, setHodKpiRemarks] = useState('');
  const [hodKpiSubmitting, setHodKpiSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (!userData.authenticated) {
        window.location.href = '/login';
        return;
      }
      if (userData.user.role !== 'HOD' && userData.user.role !== 'ADMIN') {
        window.location.href = '/faculty';
        return;
      }
      setUser(userData.user);

      // Fetch department submissions
      const subRes = await fetch('/api/submissions?viewAll=true');
      const subData = await subRes.json();
      if (subData.submissions) {
        setSubmissions(subData.submissions);
      }

      // Fetch department faculty list
      const facRes = await fetch(`/api/admin/users?departmentId=${userData.user.department_id || 1}&role=FACULTY`);
      const facData = await facRes.json();
      if (facData.users) {
        setFacultyRoster(facData.users);
      }

      // Fetch HOD categories & existing submission
      const hodRes = await fetch('/api/hod/evaluations');
      const hodData = await hodRes.json();
      if (hodData.categories) {
        setHodCategories(hodData.categories);
      }
      if (hodData.evaluation) {
        setHodEvaluation(hodData.evaluation);
        setDeptScoreInput(hodData.evaluation.dept_score || 0);
        setSelfScoreInput(hodData.evaluation.self_score || 0);
      }
    } catch (err) {
      console.error('HOD Portal load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReviewModal = (sub: any) => {
    setSelectedSub(sub);
    setHodScore(sub.claimed_score || sub.calculated_score || 0);
    setHodRemarks(sub.hod_remarks || '');
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
          approvedScore: hodScore,
          comments: hodRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setActionSuccessMsg(
        decision === 'VERIFY'
          ? `Verified & Approved! Final score ${hodScore}/${selectedSub.max_marks} awarded.`
          : 'Returned to faculty member for revision.'
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

  const handleHodKpiSubmit = async (action: 'DRAFT' | 'SUBMIT') => {
    setHodKpiSubmitting(true);
    try {
      const res = await fetch('/api/hod/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deptScore: deptScoreInput,
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
      setHodKpiSubmitting(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchSearch = searchFaculty === '' || 
      (sub.faculty_name && sub.faculty_name.toLowerCase().includes(searchFaculty.toLowerCase())) ||
      (sub.category_name && sub.category_name.toLowerCase().includes(searchFaculty.toLowerCase()));
    
    if (statusFilter === 'ALL') return matchSearch;
    if (statusFilter === 'PENDING') return matchSearch && (sub.status === 'SUBMITTED_TO_HOD' || sub.status === 'SUBMITTED');
    if (statusFilter === 'APPROVED') return matchSearch && (sub.status === 'APPROVED' || sub.status === 'VERIFIED_BY_HOD');
    if (statusFilter === 'REJECTED') return matchSearch && (sub.status === 'REJECTED_BY_HOD' || sub.status === 'REJECTED');
    return matchSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_TO_HOD':
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Awaiting HOD Verification</span>;
      case 'APPROVED':
      case 'VERIFIED_BY_HOD':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Verified & Approved by HOD</span>;
      case 'REJECTED_BY_HOD':
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">Returned for Revision</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  const pendingVerificationCount = submissions.filter(s => s.status === 'SUBMITTED_TO_HOD' || s.status === 'SUBMITTED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Department Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                Head of Department (HOD) Console • Sole Verification Authority for Faculty
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {user?.department_name || 'Department Faculty Performance & Verification Portal'}
              </h1>
              <p className="mt-1 text-slate-300 text-sm">
                {user?.name} ({user?.designation}) • Academic Session 2026-2027
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-amber-400">{pendingVerificationCount}</div>
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Awaiting Verification</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-white">{facultyRoster.length}</div>
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Dept Faculty</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Faculty Verification Queue ({pendingVerificationCount})
            </button>
            <button
              onClick={() => setActiveTab('hod_kpi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'hod_kpi'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-4 h-4" />
              HOD Self KPI Submission (1,000 Marks)
            </button>
            <button
              onClick={() => setActiveTab('faculty_roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'faculty_roster'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              Department Faculty Roster
            </button>
          </div>
        </div>

        {/* TAB 1: Faculty Verification Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty or category..."
                  value={searchFaculty}
                  onChange={(e) => setSearchFaculty(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      statusFilter === filter
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">Faculty Evaluation Claims</h3>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredSubmissions.length} submissions
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No submissions found</p>
                  <p className="text-xs text-slate-400">All submissions in this category have been processed</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <div key={sub.id} className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm">{sub.faculty_name}</span>
                          <span className="text-xs text-slate-400 font-medium">({sub.faculty_college_id})</span>
                          {getStatusBadge(sub.status)}
                        </div>
                        <h4 className="font-semibold text-blue-900 text-sm">{sub.category_name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Target: {sub.target_criteria}</p>
                        
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-500">Calculated:</span>{' '}
                            <span className="font-bold text-slate-800">{sub.calculated_score} / {sub.max_marks}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Claimed:</span>{' '}
                            <span className="font-bold text-blue-700">{sub.claimed_score} / {sub.max_marks}</span>
                          </div>
                          {sub.hod_score !== null && sub.hod_score !== undefined && (
                            <div>
                              <span className="font-semibold text-slate-500">HOD Verified:</span>{' '}
                              <span className="font-bold text-emerald-700">{sub.hod_score} / {sub.max_marks}</span>
                            </div>
                          )}
                          {sub.evidence_url && (
                            <a
                              href={sub.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View Evidence
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => openReviewModal(sub)}
                          className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          Verify & Approve <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOD Self KPI Submission */}
        {activeTab === 'hod_kpi' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  HOD Department Performance & Leadership KPI (1,000 Marks)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted directly to Head of Institution (HOI) for Tier 3 Institutional Verification
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Submission Status</span>
                <div className="mt-0.5">
                  {getStatusBadge(hodEvaluation?.status || 'DRAFT')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
              {/* Part A: Department Performance */}
              <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-blue-900 text-sm">Part A: Department Performance</h3>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    Max: 400 Marks
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Aggregated pass percentage, student admissions vs intake, research publications, and placements.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Claimed Department Score (0 - 400)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={deptScoreInput}
                    onChange={(e) => setDeptScoreInput(Math.min(400, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                </div>
              </div>

              {/* Part B: HOD Leadership & Governance */}
              <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-indigo-900 text-sm">Part B: HOD Leadership & Governance</h3>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                    Max: 600 Marks
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Academic planning, curriculum audits, faculty mentoring, conferences organized, and NAAC/NBA documentation.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Claimed Leadership Score (0 - 600)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={selfScoreInput}
                    onChange={(e) => setSelfScoreInput(Math.min(600, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Total Marks Banner */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between mb-6">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total HOD KPI Claim</span>
                <div className="text-2xl font-black text-amber-400">
                  {deptScoreInput + selfScoreInput} / 1,000 Marks
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                Target Verification: Head of Institution (HOI)
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={hodKpiSubmitting}
                onClick={() => handleHodKpiSubmit('DRAFT')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={hodKpiSubmitting}
                onClick={() => handleHodKpiSubmit('SUBMIT')}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit HOD KPI to HOI
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Department Faculty Roster */}
        {activeTab === 'faculty_roster' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Department Faculty Members</h3>
              <span className="text-xs text-slate-500 font-medium">Total: {facultyRoster.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {facultyRoster.map((fac) => (
                <div key={fac.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{fac.name}</h4>
                    <p className="text-xs text-slate-500">
                      ID: {fac.college_id} • {fac.designation} • {fac.email}
                    </p>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                      {fac.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    Department HOD Final Verification & Approval
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedSub.category_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Faculty: <span className="font-semibold text-slate-800">{selectedSub.faculty_name}</span> ({selectedSub.faculty_college_id})
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
                  {/* Claimed vs Calculated */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">System Calculated:</span>
                      <div className="text-sm font-black text-slate-800">
                        {selectedSub.calculated_score} / {selectedSub.max_marks}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Faculty Claimed:</span>
                      <div className="text-sm font-black text-blue-700">
                        {selectedSub.claimed_score} / {selectedSub.max_marks}
                      </div>
                    </div>
                  </div>

                  {/* Evidence & Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supporting Evidence
                    </label>
                    {selectedSub.evidence_url ? (
                      <a
                        href={selectedSub.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Uploaded Evidence File
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No evidence file attached</span>
                    )}
                  </div>

                  {/* HOD Verification Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HOD Approved Marks (Max {selectedSub.max_marks})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={selectedSub.max_marks}
                      value={hodScore}
                      onChange={(e) => setHodScore(Math.min(selectedSub.max_marks, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HOD Verification Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={hodRemarks}
                      onChange={(e) => setHodRemarks(e.target.value)}
                      placeholder="Add verification remarks & evaluation feedback..."
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction('REJECT')}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                    >
                      Return to Faculty
                    </button>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction('VERIFY')}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Verify & Finalize Approval
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
