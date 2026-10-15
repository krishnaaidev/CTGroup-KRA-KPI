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
  TrendingUp,
  Download,
  Briefcase,
  ShieldCheck,
  Crown,
  ChevronRight
} from 'lucide-react';

export default function HoiPortal() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dept_matrix' | 'faculty_overview' | 'hoi_kpi'>('dept_matrix');
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<any[]>([]);
  const [hoiCategories, setHoiCategories] = useState<any[]>([]);
  const [hoiEvaluation, setHoiEvaluation] = useState<any>(null);

  // Filter state for faculty overview
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

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

      // Fetch all submissions for institutional overview
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

    const matchDept = selectedDept === 'ALL' || sub.department_code === selectedDept || sub.department_id === Number(selectedDept);
    return matchSearch && matchDept;
  });

  const totalFacultyCount = deptSummaries.reduce((acc, curr) => acc + (curr.faculty_count || 0), 0);
  const totalApprovedCount = submissions.filter(s => s.status === 'APPROVED' || s.status === 'VERIFIED_BY_HOD').length;

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
                Head of Institution (HOI) Console • Institutional Governance
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                9 CT Group Institutes Performance & Oversight
              </h1>
              <p className="mt-1 text-amber-100/90 text-sm">
                Faculty verified directly by Department HODs • Institutional leadership & analytics oversight
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-amber-300">9</div>
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">CT Institutes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                <div className="text-2xl font-black text-white">{totalApprovedCount}</div>
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">HOD Approved Tasks</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveTab('dept_matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'dept_matrix'
                  ? 'bg-white text-amber-900 shadow-md'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4" />
              9 Institutes Performance Matrix
            </button>
            <button
              onClick={() => setActiveTab('faculty_overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'faculty_overview'
                  ? 'bg-white text-amber-900 shadow-md'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              Institutional Faculty Roster ({submissions.length})
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
          </div>
        </div>

        {/* TAB 1: 9 Institutes Matrix */}
        {activeTab === 'dept_matrix' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-lg">9 CT Group Academic Institutes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live performance summary, HOD governance and average faculty appraisal marks
                  </p>
                </div>
                <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  Notice: Faculty tasks finalized directly by Department HODs
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                {deptSummaries.map((dept) => (
                  <div 
                    key={dept.id} 
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 hover:shadow-md transition group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 mb-2">
                          {dept.code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {dept.name}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs space-y-2">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Assigned HOD:</span>
                        <span className="font-bold text-slate-800">{dept.hod_name || 'HOD Appointed'}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Faculty Count:</span>
                        <span className="font-bold text-slate-800">{dept.faculty_count} Members</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Approved Submissions:</span>
                        <span className="font-bold text-emerald-700">{dept.approved_submissions || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Average Score:</span>
                        <span className="font-black text-blue-700 text-sm">{Math.round(dept.avg_score || 0)} Marks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Institutional Faculty Roster (Read-Only Overview) */}
        {activeTab === 'faculty_overview' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty name, category, college ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-600"
                >
                  <option value="ALL">All 9 Institutes</option>
                  {deptSummaries.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                  ))}
                </select>

                <a
                  href="/api/reports/export?type=faculty"
                  download
                  className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-blue-600" /> Export Excel
                </a>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Faculty KPI Overview Across 9 Institutes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tasks are verified & approved directly by each department HOD
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredSubmissions.length} records
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No faculty records found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <div key={sub.id} className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm">{sub.faculty_name}</span>
                          <span className="text-xs font-semibold text-slate-500">({sub.faculty_college_id})</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {sub.department_name}
                          </span>
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Verified & Approved by HOD
                          </span>
                        </div>
                        <h4 className="font-semibold text-blue-900 text-sm">{sub.category_name}</h4>
                        
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-500">Claimed:</span>{' '}
                            <span className="font-bold text-slate-800">{sub.claimed_score} / {sub.max_marks}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">HOD Approved Marks:</span>{' '}
                            <span className="font-bold text-emerald-700">{sub.approved_score || sub.hod_score || sub.calculated_score} / {sub.max_marks}</span>
                          </div>
                          {sub.hod_remarks && (
                            <div className="italic text-slate-500">
                              HOD Remarks: &ldquo;{sub.hod_remarks}&rdquo;
                            </div>
                          )}
                          {sub.evidence_url && (
                            <a
                              href={sub.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Evidence
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HOI Institutional KPI */}
        {activeTab === 'hoi_kpi' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  HOI Institutional Leadership & Governance KPI (1,000 Marks)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted directly to Institutional Director / Administrator
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {hoiEvaluation?.status || 'DRAFT'}
              </span>
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
      </main>
    </div>
  );
}
