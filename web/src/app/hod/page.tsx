'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Building2, 
  Users, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  Send, 
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  FileCheck
} from 'lucide-react';

export default function HodDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'faculty_review' | 'hod_submission'>('overview');
  const [facultyStats, setFacultyStats] = useState<any>({ totalFaculty: 0, pendingFacultySubmissions: 0, avgFacultyScore: 0 });
  const [evaluation, setEvaluation] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [facultySubmissions, setFacultySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // HOD Form state
  const [deptScoreInput, setDeptScoreInput] = useState<number>(340);
  const [selfScoreInput, setSelfScoreInput] = useState<number>(510);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // Review modal state for faculty submissions
  const [reviewModalSub, setReviewModalSub] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

      // Fetch HOD evaluation data
      const hodRes = await fetch('/api/hod/evaluations');
      const hodData = await hodRes.json();
      if (hodData.success) {
        setEvaluation(hodData.evaluation);
        setCategories(hodData.categories || []);
        if (hodData.facultyStats) setFacultyStats(hodData.facultyStats);
        if (hodData.evaluation) {
          setDeptScoreInput(hodData.evaluation.dept_score || 340);
          setSelfScoreInput(hodData.evaluation.self_score || 510);
        }
      }

      // Fetch department faculty submissions for review
      const subRes = await fetch('/api/submissions?viewAll=true');
      const subData = await subRes.json();
      if (subData.submissions) {
        setFacultySubmissions(subData.submissions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleHodSubmit = async (action: 'DRAFT' | 'SUBMIT') => {
    setSubmitting(true);
    setFormMsg(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to submit HOD evaluation');
      setFormMsg(data.message);
      loadData();
    } catch (err: any) {
      setFormMsg('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (sub: any) => {
    setReviewModalSub(sub);
    setReviewDecision('APPROVED');
    setReviewScore(sub.calculated_score || 0);
    setReviewComments('');
    setReviewError(null);
  };

  const handleReviewSubmit = async () => {
    if (!reviewModalSub) return;
    setReviewLoading(true);
    setReviewError(null);

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: reviewModalSub.id,
          decision: reviewDecision,
          approvedScore: reviewScore,
          comments: reviewComments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      setReviewModalSub(null);
      loadData();
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const totalHodScore = deptScoreInput + selfScoreInput;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HOD Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Head of Department (HOD)
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {user?.department_name || 'Department of Computer Science & Engineering'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded font-mono font-medium">HOD ID: {user?.college_id}</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-medium">Rule Split: 400 Dept / 600 Self (1,000 Total)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center no-print">
            <a
              href="/api/reports/export?type=hod"
              download
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
            >
              <Download className="w-4 h-4 mr-1.5 text-blue-600" />
              Export HOD Report
            </a>
          </div>
        </div>

        {/* Department Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dept Faculty Count</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{facultyStats.totalFaculty || 2}</span>
              <span className="text-xs text-slate-500 font-medium">Active Teachers</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Department of Computer Science</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Faculty Reviews</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-amber-600">{facultySubmissions.filter(s => s.status === 'SUBMITTED' || s.status === 'RESUBMITTED').length}</span>
              <span className="text-xs text-slate-500 font-medium">Items awaiting action</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Requires HOD verification</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dept Performance</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-emerald-700">{deptScoreInput}</span>
              <span className="text-sm font-semibold text-slate-400">/ 400</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(deptScoreInput / 400) * 100}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HOD Self Appraisal</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-indigo-700">{selfScoreInput}</span>
              <span className="text-sm font-semibold text-slate-400">/ 600</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(selfScoreInput / 600) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Department Overview
          </button>
          <button
            onClick={() => setActiveTab('faculty_review')}
            className={`pb-4 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${activeTab === 'faculty_review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span>Review Faculty Submissions</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
              {facultySubmissions.filter(s => s.status === 'SUBMITTED' || s.status === 'RESUBMITTED').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('hod_submission')}
            className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'hod_submission' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            HOD 1,000-Mark Evaluation (400 + 600)
          </button>
        </div>

        {/* TAB 1: Department Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Department Evaluation Framework (400 Marks)</h3>
              <p className="text-xs text-slate-500">
                Departmental indicators configured dynamically by institutional administration.
              </p>
              <div className="space-y-3 pt-2">
                {categories.filter(c => c.section === 'DEPT').map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                      <p className="text-xs text-slate-500">{c.target_criteria}</p>
                    </div>
                    <span className="font-bold text-slate-700 text-xs px-2.5 py-1 bg-white rounded-md border border-slate-200">
                      Max {c.max_marks}m
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">HOD 1,000-Mark Total</h3>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white text-center space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Aggregate HOD Score</span>
                <div className="text-4xl font-black">{totalHodScore} / 1,000</div>
                <div className="text-xs opacity-90 pt-1">
                  Dept: {deptScoreInput}/400 • Self: {selfScoreInput}/600
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Department Status:</span>
                  <span className="text-emerald-700 font-bold">Compliant</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Evaluation Status:</span>
                  <span className="font-bold text-blue-700">{evaluation?.status || 'Draft'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Review Faculty Submissions */}
        {activeTab === 'faculty_review' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Department Faculty Submissions</h3>
                <p className="text-xs text-slate-500">
                  Verify academic achievements and supporting evidence uploaded by departmental faculty.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Faculty Member</th>
                    <th className="px-6 py-3.5">Category & Max Marks</th>
                    <th className="px-6 py-3.5">Achievement Input</th>
                    <th className="px-6 py-3.5">Engine Score</th>
                    <th className="px-6 py-3.5">Evidence</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {facultySubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {sub.faculty_name}
                        <div className="text-[11px] text-slate-400 font-mono">{sub.faculty_college_id}</div>
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
                      <td className="px-6 py-4">
                        {sub.evidence_url ? (
                          <a
                            href={sub.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:underline font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            {sub.evidence_name || 'View Evidence'}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No file</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Approved</span>
                        ) : sub.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Under Review</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openReviewModal(sub)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-md text-xs font-semibold text-slate-700 transition"
                        >
                          Review & Score
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HOD 1,000-Mark Submission */}
        {activeTab === 'hod_submission' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit HOD Evaluation (1,000 Marks)</h3>
              <p className="text-xs text-slate-500">
                Institutional 60/40 Split: Departmental Performance (400 Marks) and HOD Self Performance (600 Marks).
              </p>
            </div>

            {formMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs">
                {formMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Departmental Section (400 Marks) */}
              <div className="p-5 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">1. Departmental Performance (400 Marks)</h4>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Max 400
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Includes pass rates, placement conversion, research grants, and NBA/NAAC audit compliance.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Awarded Departmental Score (0 - 400)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={deptScoreInput}
                    onChange={(e) => setDeptScoreInput(Math.min(400, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Self Performance Section (600 Marks) */}
              <div className="p-5 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">2. HOD Self Performance (600 Marks)</h4>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Max 600
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Includes academic planning, faculty coordination, student technical clubs governance, and administrative leadership.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Awarded Self Performance Score (0 - 600)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={selfScoreInput}
                    onChange={(e) => setSelfScoreInput(Math.min(600, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Total HOD Score Preview */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900">Total Combined HOD Evaluation Score:</span>
                <p className="text-xs text-blue-700">Strictly normalized out of 1,000 marks.</p>
              </div>
              <div className="text-2xl font-black text-blue-900">
                {totalHodScore} / 1,000
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleHodSubmit('DRAFT')}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleHodSubmit('SUBMIT')}
                className="px-5 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Evaluation to Admin'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Review Modal for Faculty Submission */}
      {reviewModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Faculty Submission</h3>
                <p className="text-xs text-slate-500">{reviewModalSub.faculty_name} • {reviewModalSub.category_name}</p>
              </div>
              <button onClick={() => setReviewModalSub(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {reviewError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Achievement Claimed:</span>
                <span className="font-semibold text-slate-800">{reviewModalSub.achievement_input || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Engine Auto-Calculated Score:</span>
                <span className="font-bold text-blue-700">{reviewModalSub.calculated_score} / {reviewModalSub.max_marks} marks</span>
              </div>
              {reviewModalSub.evidence_url && (
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Evidence:</span>
                  <a href={reviewModalSub.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Attached File
                  </a>
                </div>
              )}
            </div>

            {/* Decision Radio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Review Decision</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('APPROVED')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${reviewDecision === 'APPROVED' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Approve Score</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('REJECTED')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${reviewDecision === 'REJECTED' ? 'bg-red-50 border-red-500 text-red-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <X className="w-4 h-4 text-red-600" />
                  <span>Reject / Need Revision</span>
                </button>
              </div>
            </div>

            {/* Approved score */}
            {reviewDecision === 'APPROVED' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmed Marks (Max {reviewModalSub.max_marks})
                </label>
                <input
                  type="number"
                  min="0"
                  max={reviewModalSub.max_marks}
                  value={reviewScore}
                  onChange={(e) => setReviewScore(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reviewer Comments & Feedback
              </label>
              <textarea
                rows={3}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Required for rejections; optional for approvals..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalSub(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewLoading}
                onClick={handleReviewSubmit}
                className="px-5 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 shadow-sm disabled:opacity-50"
              >
                {reviewLoading ? 'Saving...' : 'Confirm Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
