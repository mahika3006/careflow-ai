'use client';

import React from 'react';
import { 
  Users, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  Clock, 
  Stethoscope, 
  Activity, 
  ArrowUpRight, 
  Sparkles,
  ChevronRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { getUrgencyStyles, isOverdue } from '@/lib/triage-rules';

interface OverviewViewProps {
  onSelectPatient: (patientId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export function OverviewView({ onSelectPatient, onNavigateTab }: OverviewViewProps) {
  const { patients, doctors, emergencyAlertCount } = useCareFlow();

  const activeCases = patients.filter((p) => p.status !== 'DISCHARGED');
  const awaitingAssignment = patients.filter((p) => !p.assignedDoctorId && p.status !== 'DISCHARGED');
  const overdueCases = patients.filter((p) => isOverdue(p) && p.status !== 'DISCHARGED');
  const inConsultation = patients.filter((p) => p.status === 'IN_CONSULTATION');

  // Emergency cases
  const emergencyCases = patients.filter(
    (p) => (p.clinicianConfirmedCategory === 'EMERGENCY' || p.provisionalCategory === 'EMERGENCY') && p.status !== 'DISCHARGED'
  );

  return (
    <div className="p-6 lg:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Page Title & Department Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Hospital Triage Operations Overview
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time human-in-the-loop patient intake, multimodal AI safety screening, and clinical assignment
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigateTab('triage-queue')}
            className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95"
          >
            <Flame className="w-4 h-4 text-emerald-200" />
            <span>Open Triage Queue</span>
          </button>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <UserCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Doctor Matching</span>
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner if any emergency is active */}
      {emergencyCases.length > 0 && (
        <div className="bg-red-500/10 border-l-4 border-red-600 p-5 rounded-2xl border border-red-500/20 shadow-md shadow-red-950/10">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <span>CRITICAL EMERGENCY PROTOCOL ACTIVE</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold">
                    {emergencyCases.length} Patient{emergencyCases.length > 1 ? 's' : ''}
                  </span>
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                  Gemma AI safety rules and clinical vitals have flagged life-threatening presentations requiring immediate physician review.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {emergencyCases.map((ec) => (
                    <button
                      key={ec.id}
                      onClick={() => onSelectPatient(ec.id)}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/60 transition-all shadow-xs"
                    >
                      <span>{ec.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({ec.id})</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {ec.aiAssessment?.warningFlags[0]?.category || 'CRITICAL'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Patients */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Patients</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Users className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white tracking-tight">{patients.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Active department registry
          </div>
        </div>

        {/* Active Cases */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active In Care</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCases.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {inConsultation.length} in consultation
          </div>
        </div>

        {/* Immediate Review (Emergency) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs hover:border-red-500/40 transition-all bg-gradient-to-b from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/20">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Stat Emergency</span>
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/80">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-red-600 dark:text-red-400 tracking-tight">{emergencyCases.length}</div>
          <div className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1">
            Target SLA: ≤ 10 mins
          </div>
        </div>

        {/* Awaiting Doctor Assignment */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Doctor</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50">
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white tracking-tight">{awaitingAssignment.length}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Ready for matching
          </div>
        </div>

        {/* Overdue Cases */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">SLA Overdue</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className={`mt-2 text-3xl font-black tracking-tight ${overdueCases.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {overdueCases.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Requires escalation
          </div>
        </div>
      </div>

      {/* Middle Split: Priority Queue Highlight & Doctor Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Patient Intake Stream */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Prioritized Patient Stream
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('triage-queue')}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center space-x-1"
            >
              <span>View Full Queue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {activeCases.slice(0, 5).map((patient) => {
              const effectiveCat = patient.clinicianConfirmedCategory || patient.provisionalCategory;
              const styles = getUrgencyStyles(effectiveCat);
              const overdue = isOverdue(patient);

              return (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient.id)}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                      {patient.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {patient.name}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {patient.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-md">
                        {patient.incidentDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${styles.badgeBg} ${styles.badgeText} ${styles.borderColor}`}>
                      {effectiveCat}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {patient.waitingDurationMinutes}m wait
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: On-Duty Physicians */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Attending Staff
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {doctors.filter((d) => d.availabilityStatus === 'AVAILABLE').length} Available
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 p-2">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        doc.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {doc.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {doc.specializations?.[0] || doc.department}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {doc.currentCaseload} active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
