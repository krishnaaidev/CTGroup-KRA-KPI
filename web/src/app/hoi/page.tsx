'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Building2, 
  Award, 
  TrendingUp, 
  Users, 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Send,
  Building,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function HoiDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'hoi_submission'>('overview');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [instScoreInput, setInstScoreInput] = useState<number>(440);
  const [selfScoreInput, setSelfScoreInput] = useState<number>(460);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

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

      const hoiRes = await fetch('/api/hoi/evaluations');
      const hoiData = await hoiRes.json();
      if (hoiData.success) {
        setEvaluation(hoiData.evaluation);
        setCategories(hoiData.categories || []);
        setDepartmentSummaries(hoiData.departmentSummaries || []);
        if (hoiData.evaluation) {
          setInstScoreInput(hoiData.evaluation.inst_score || 440);
          setSelfScoreInput(hoiData.evaluation.self_score || 460);
        }
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

  const handleHoiSubmit = async (action: 'DRAFT' | 'SUBMIT') => {
    setSubmitting(true);
    setFormMsg(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to submit HOI evaluation');
      setFormMsg(data.message);
      loadData();
    } catch (err: any) {
      setFormMsg('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalHoiScore = instScoreInput + selfScoreInput;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HOI Banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-800 to-purple-900 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Head of Institution (HOI)
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Campus Director • CT Group of Institutions
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded font-mono font-medium">HOI ID: {user?.college_id}</span>
                <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-1 rounded font-medium">
                  50/50 Rule: 500 Institutional / 500 Self (1,000 Total)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center no-print">
            <a
              href="/api/reports/export?type=hoi"
              download
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
            >
              <Download className="w-4 h-4 mr-1.5 text-blue-600" />
              Export HOI Report
            </a>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Departments</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{departmentSummaries.length || 7}</span>
              <span className="text-xs text-slate-500 font-medium">Academic Depts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">CT Group Campus Branches</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institutional KPIs</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-blue-700">{instScoreInput}</span>
              <span className="text-sm font-semibold text-slate-400">/ 500</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(instScoreInput / 500) * 100}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HOI Self Appraisal</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-purple-700">{selfScoreInput}</span>
              <span className="text-sm font-semibold text-slate-400">/ 500</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${(selfScoreInput / 500) * 100}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Score</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-emerald-700">{totalHoiScore}</span>
              <span className="text-sm font-semibold text-slate-400">/ 1,000</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(totalHoiScore / 1000) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Institutional Overview
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'departments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Department Summaries & KPIs
          </button>
          <button
            onClick={() => setActiveTab('hoi_submission')}
            className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'hoi_submission' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Submit HOI Evaluation (500 + 500)
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Institutional Performance Criteria (500 Marks)</h3>
              <p className="text-xs text-slate-500">
                Institutional targets including enrollment, NAAC/NIRF accreditation, research funding, and industrial tie-ups.
              </p>
              <div className="space-y-3 pt-2">
                {categories.filter(c => c.section === 'INST').map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                      <p className="text-xs text-slate-500">{c.target_criteria}</p>
                    </div>
                    <span className="font-bold text-indigo-700 text-xs px-2.5 py-1 bg-white rounded-md border border-slate-200">
                      Max {c.max_marks}m
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">HOI Overall Evaluation</h3>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-800 to-purple-900 text-white text-center space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Combined HOI Score</span>
                <div className="text-4xl font-black">{totalHoiScore} / 1,000</div>
                <div className="text-xs opacity-90 pt-1">
                  Institutional: {instScoreInput}/500 • Self: {selfScoreInput}/500
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Review Status:</span>
                  <span className="font-bold text-indigo-700">{evaluation?.status || 'Draft'}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Academic Year:</span>
                  <span className="font-bold text-slate-800">2026-2027</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Departments */}
        {activeTab === 'departments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Campus Department Summaries</h3>
              <p className="text-xs text-slate-500">
                Departmental performance, faculty submissions, and HOD leadership status.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">Appointed HOD</th>
                    <th className="px-6 py-3.5">Faculty Count</th>
                    <th className="px-6 py-3.5">Approved Submissions</th>
                    <th className="px-6 py-3.5">Pending Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {departmentSummaries.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{dept.name}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-600">{dept.code}</td>
                      <td className="px-6 py-4 text-slate-800">{dept.hod_name || 'Dr. Rajesh Sharma'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{dept.faculty_count || 2} members</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {dept.approved_submissions || 7} Approved
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          {dept.pending_submissions || 1} Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: HOI Submission Form */}
        {activeTab === 'hoi_submission' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit HOI Evaluation (1,000 Marks)</h3>
              <p className="text-xs text-slate-500">
                Institutional 50/50 Split: Institutional Performance (500 Marks) and HOI Self Performance (500 Marks).
              </p>
            </div>

            {formMsg && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs">
                {formMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Institutional Section (500 Marks) */}
              <div className="p-5 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">1. Institutional Performance (500 Marks)</h4>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Max 500
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Target intake fulfillment, NAAC/NBA criteria compliance, corporate placements, and research infrastructure.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Awarded Institutional Score (0 - 500)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={instScoreInput}
                    onChange={(e) => setInstScoreInput(Math.min(500, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Self Performance Section (500 Marks) */}
              <div className="p-5 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">2. HOI Self Performance (500 Marks)</h4>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Max 500
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Strategic 5-year roadmap, financial sustainability, staff leadership retention, and institutional branding.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Awarded Self Performance Score (0 - 500)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={selfScoreInput}
                    onChange={(e) => setSelfScoreInput(Math.min(500, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Total HOI Score Preview */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-900">Total Combined HOI Evaluation Score:</span>
                <p className="text-xs text-indigo-700">Strictly normalized out of 1,000 marks.</p>
              </div>
              <div className="text-2xl font-black text-indigo-900">
                {totalHoiScore} / 1,000
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleHoiSubmit('DRAFT')}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleHoiSubmit('SUBMIT')}
                className="px-5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Submit to Institutional Authority'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
