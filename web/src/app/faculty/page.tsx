'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Upload, 
  Download, 
  Printer, 
  ExternalLink, 
  ChevronRight,
  TrendingUp,
  Percent,
  RefreshCw,
  BookOpen,
  X,
  FileCheck,
  Building,
  UserCheck
} from 'lucide-react';
import { computeFacultyScore } from '@/lib/scoringEngine';

export default function FacultyDashboard() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalMaxMarks: 1000,
    totalCalculated: 0,
    totalClaimed: 0,
    totalApproved: 0,
    completedCategories: 0,
    totalCategories: 17,
    completionPercentage: 0,
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal state
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [achievementInput, setAchievementInput] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [details, setDetails] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Real-time live score calculation
  const [liveScore, setLiveScore] = useState<any>(null);

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

      const subRes = await fetch('/api/submissions');
      const subData = await subRes.json();
      if (subData.categories) {
        setCategories(subData.categories);
        setMetrics(subData.metrics);
        setReviews(subData.reviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update real-time score preview when inputs change
  useEffect(() => {
    if (selectedCategory) {
      const result = computeFacultyScore({
        categoryCode: selectedCategory.code,
        target: targetInput,
        achievement: achievementInput,
        details,
      });
      setLiveScore(result);
    }
  }, [selectedCategory, targetInput, achievementInput, details]);

  const openSubmissionModal = (cat: any) => {
    setSelectedCategory(cat);
    setTargetInput(cat.target_input || cat.target_criteria || '');
    setAchievementInput(cat.achievement_input || '');
    setEvidenceName(cat.evidence_name || '');
    setEvidenceUrl(cat.evidence_url || '');
    setRemarks(cat.faculty_remarks || '');
    setModalError(null);

    let parsedDetails = {};
    try {
      parsedDetails = cat.details_json ? JSON.parse(cat.details_json) : {};
    } catch (e) {
      parsedDetails = {};
    }
    setDetails(parsedDetails);
  };

  const closeModal = () => {
    setSelectedCategory(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    if (selectedCategory?.submission_id) {
      formData.append('submissionId', String(selectedCategory.submission_id));
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setEvidenceName(data.fileName);
        setEvidenceUrl(data.fileUrl);
      } else {
        setModalError(data.error || 'File upload failed');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleSaveOrSubmit = async (action: 'DRAFT' | 'SUBMIT') => {
    if (!selectedCategory) return;
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          targetInput,
          achievementInput,
          details,
          action,
          evidenceUrl,
          evidenceName,
          remarks,
          claimedScore: liveScore?.calculatedScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save submission');
      }

      closeModal();
      loadData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved by Director</span>;
      case 'VERIFIED_BY_HOI':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300"><Clock className="w-3 h-3 mr-1" /> Verified by HOI (At Director)</span>;
      case 'VERIFIED_BY_HOD':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300"><Clock className="w-3 h-3 mr-1" /> Verified by HOD (At HOI)</span>;
      case 'SUBMITTED_TO_HOD':
      case 'SUBMITTED':
      case 'RESUBMITTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"><Clock className="w-3 h-3 mr-1" /> Submitted to HOD</span>;
      case 'REJECTED_BY_HOD':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300"><AlertCircle className="w-3 h-3 mr-1" /> Revision Needed (HOD)</span>;
      case 'REJECTED_BY_HOI':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300"><AlertCircle className="w-3 h-3 mr-1" /> Revision Needed (HOI)</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300"><AlertCircle className="w-3 h-3 mr-1" /> Rejected by Director</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Draft</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">Not Started</span>;
    }
  };

  const filteredCategories = categories.filter(c => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'APPROVED') return c.submission_status === 'APPROVED';
    if (filterStatus === 'PENDING') return ['SUBMITTED_TO_HOD', 'SUBMITTED', 'RESUBMITTED', 'VERIFIED_BY_HOD', 'VERIFIED_BY_HOI'].includes(c.submission_status);
    if (filterStatus === 'REJECTED') return ['REJECTED_BY_HOD', 'REJECTED_BY_HOI', 'REJECTED'].includes(c.submission_status);
    if (filterStatus === 'NOT_SUBMITTED') return !c.submission_status || c.submission_status === 'DRAFT';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile & Academic Session Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'CT'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Faculty
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {user?.designation} • {user?.department_name || 'Department of Computer Science & Engineering'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded font-mono font-medium">Employee ID: {user?.college_id}</span>
                <span className="bg-slate-100 px-2 py-1 rounded font-medium">Email: {user?.email}</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-medium">Session: 2026-2027</span>
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
              Download Excel Report
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* 1,000-Mark Score Progress Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Card 1: Approved Score */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Marks</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{metrics.totalApproved}</span>
              <span className="text-sm font-semibold text-slate-400">/ 1,000</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.totalApproved / 1000) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Verified by Department & Administration
            </p>
          </div>

          {/* Card 2: Auto-Calculated Score */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engine Computed</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-blue-700">{metrics.totalCalculated}</span>
              <span className="text-sm font-semibold text-slate-400">/ 1,000</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.totalCalculated / 1000) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Automated score based on strict criteria slabs
            </p>
          </div>

          {/* Card 3: Claimed Score */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Claimed Marks</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{metrics.totalClaimed}</span>
              <span className="text-sm font-semibold text-slate-400">/ 1,000</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.totalClaimed / 1000) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Self-appraisal submitted by faculty
            </p>
          </div>

          {/* Card 4: Submission Progress */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Rate</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-indigo-700">{metrics.completionPercentage}%</span>
              <span className="text-sm font-semibold text-slate-500">({metrics.completedCategories}/17 Items)</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.completionPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Categories submitted for review
            </p>
          </div>
        </div>

        {/* Categories Section with Filter Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Faculty KRA & KPI Framework (1,000 Marks)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict institutional scoring framework across 17 mandatory academic and institutional categories.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600 self-start sm:self-center">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-md transition ${filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
              >
                All (17)
              </button>
              <button
                onClick={() => setFilterStatus('APPROVED')}
                className={`px-3 py-1.5 rounded-md transition ${filterStatus === 'APPROVED' ? 'bg-white text-emerald-800 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-md transition ${filterStatus === 'PENDING' ? 'bg-white text-amber-800 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilterStatus('REJECTED')}
                className={`px-3 py-1.5 rounded-md transition ${filterStatus === 'REJECTED' ? 'bg-white text-red-800 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Needs Action
              </button>
            </div>
          </div>

          {/* Category Cards List */}
          <div className="divide-y divide-slate-100">
            {filteredCategories.map((cat, idx) => {
              const isApproved = cat.submission_status === 'APPROVED';
              const isRejected = cat.submission_status === 'REJECTED';
              const isSubmitted = cat.submission_status === 'SUBMITTED' || cat.submission_status === 'RESUBMITTED';

              return (
                <div 
                  key={cat.id} 
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100">
                      {cat.order_num}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Max: {cat.max_marks} Marks
                        </span>
                        {getStatusBadge(cat.submission_status)}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        <strong className="text-slate-700">Target:</strong> {cat.target_criteria}
                      </p>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400">{cat.description}</p>
                      )}

                      {/* Display reviewer feedback comment if rejected */}
                      {isRejected && (
                        <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Reviewer Feedback:</span> {cat.faculty_remarks || 'Evidence insufficient or incorrect. Please review targets and resubmit.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marks & Submission Action */}
                  <div className="flex items-center justify-between md:justify-end space-x-6 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Score Awarded</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {cat.approved_score !== null && cat.approved_score !== undefined ? (
                          <span className="text-emerald-700">{cat.approved_score} / {cat.max_marks}</span>
                        ) : cat.calculated_score ? (
                          <span className="text-blue-600">{cat.calculated_score} (Calc)</span>
                        ) : (
                          <span className="text-slate-400">0 / {cat.max_marks}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openSubmissionModal(cat)}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition ${
                        isApproved
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : isRejected
                          ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                          : isSubmitted
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                          : 'bg-blue-700 text-white hover:bg-blue-800 shadow-sm'
                      }`}
                    >
                      {isApproved ? 'View Details' : isRejected ? 'Resubmit' : isSubmitted ? 'Edit / View' : 'Submit KPI'}
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Submission & Calculation Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Category #{selectedCategory.order_num} • Max {selectedCategory.max_marks} Marks
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedCategory.name}</h3>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Institutional Rule Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-slate-700">Official Institutional Target & Rule:</span>
                <p className="text-xs text-slate-600 font-medium">{selectedCategory.target_criteria}</p>
                <p className="text-[11px] text-slate-500 italic">{selectedCategory.description}</p>
              </div>

              {/* Custom Input Fields tailored to Category type */}
              <div className="space-y-4">
                {/* 1. Binary categories (Lesson Plan, Teaching Load, Course File, Admin Resp) */}
                {['CAT_LESSON_PLAN', 'CAT_TEACHING_LOAD', 'CAT_COURSE_FILE', 'CAT_ADMIN_RESP'].includes(selectedCategory.code) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Completion Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="Enter 100 for complete coverage"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rule: Strictly binary — 100% completion awards full {selectedCategory.max_marks} marks; otherwise 0.
                    </p>
                  </div>
                )}

                {/* 2. Slabs (Result Performance & Student Attendance) */}
                {['CAT_RESULT', 'CAT_ATTENDANCE'].includes(selectedCategory.code) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Average Percentage Achieved (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 92.5"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Prescribed Slabs:</strong> &lt;50%: 0 | 50-60%: 40 | 60-70%: 80 | 70-80%: 100 | 80-90%: 110 | 90-95%: 120 | &gt;95%: 150 marks.
                    </div>
                  </div>
                )}

                {/* 3. Student Feedback */}
                {selectedCategory.code === 'CAT_FEEDBACK' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Average Feedback Score (out of 5.0)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="5"
                        value={achievementInput}
                        onChange={(e) => setAchievementInput(e.target.value)}
                        placeholder="e.g. 4.6"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Total Responses Count (Min. 5 required)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={details.responsesCount || '5'}
                        onChange={(e) => setDetails({ ...details, responsesCount: e.target.value })}
                        placeholder="e.g. 45"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Admissions Contribution */}
                {selectedCategory.code === 'CAT_ADMISSION' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Verified Student Admissions Facilitated
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rule: 2 marks per admission. Capped at 50 marks.
                    </p>
                  </div>
                )}

                {/* 5. Publications & Books */}
                {['CAT_PUBLICATIONS', 'CAT_BOOKS'].includes(selectedCategory.code) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Number of First-Author Eligible Publications
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rule: First author only. 1st: 15 marks | 2nd: 15 | 3rd: 10 | 4th: 10 (Max 50).
                    </p>
                  </div>
                )}

                {/* 6. Research Projects */}
                {selectedCategory.code === 'CAT_RESEARCH_PROJECTS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Submitted Projects (10 marks each)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={details.submittedProjects || '0'}
                        onChange={(e) => setDetails({ ...details, submittedProjects: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Sanctioned Projects (20 marks each)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={details.sanctionedProjects || '0'}
                        onChange={(e) => setDetails({ ...details, sanctionedProjects: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}

                {/* 7. Conferences / FDPs / Certifications (5m per item) */}
                {['CAT_CONFERENCES', 'CAT_FDP', 'CAT_CERTIFICATIONS'].includes(selectedCategory.code) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Total Eligible Completed Items
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rule: 5 marks per item (Max {selectedCategory.max_marks} marks).
                    </p>
                  </div>
                )}

                {/* 8. Mentorship & Alumni Engagement (Slabs) */}
                {['CAT_MENTORSHIP', 'CAT_ALUMNI'].includes(selectedCategory.code) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Percentage Achieved (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 85%"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Prescribed Slabs:</strong> &lt;70%: 0 | 70-80%: 20 | 80-90%: 60 | 90-95%: 80 | &gt;95%: 100 marks.
                    </div>
                  </div>
                )}

                {/* 9. Event Coordination */}
                {selectedCategory.code === 'CAT_EVENT_COORD' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Number of Events Coordinated
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={achievementInput}
                      onChange={(e) => setAchievementInput(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rule: 1st event: 15 marks | 2nd event: 15 | 3rd: 10 (Max 40 marks).
                    </p>
                  </div>
                )}

                {/* Live Real-time Score Preview Box */}
                {liveScore && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-900 block">
                        Engine Computed Score Preview:
                      </span>
                      <p className="text-xs text-blue-700 mt-0.5">{liveScore.explanation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-900">
                        {liveScore.calculatedScore}
                      </span>
                      <span className="text-xs text-blue-700 block">/ {selectedCategory.max_marks} Max</span>
                    </div>
                  </div>
                )}

                {/* Supporting Document & Evidence Section */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supporting Document / Evidence *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Upload File (PDF / Image / Sheet)</label>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Or Document / Portal Link</label>
                      <input
                        type="url"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        placeholder="https://docs.google.com/... or Vaave link"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  {evidenceName && (
                    <div className="mt-2 text-xs text-emerald-700 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Evidence attached: <span className="font-semibold ml-1">{evidenceName}</span>
                    </div>
                  )}
                </div>

                {/* Faculty Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Faculty Remarks / Justification
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide additional context or reference details for the reviewer..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveOrSubmit('DRAFT')}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveOrSubmit('SUBMIT')}
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
