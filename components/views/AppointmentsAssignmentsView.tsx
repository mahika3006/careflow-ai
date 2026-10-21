'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Stethoscope, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Building2, 
  Globe, 
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { rankDoctorsForPatient, checkDoctorEligibility } from '@/lib/doctor-matching';
import { getUrgencyStyles } from '@/lib/triage-rules';

interface AppointmentsAssignmentsViewProps {
  onSelectPatient: (patientId: string) => void;
}

export function AppointmentsAssignmentsView({ onSelectPatient }: AppointmentsAssignmentsViewProps) {
  const { doctors, patients, currentRole, assignDoctorToPatient } = useCareFlow();

  // Patients awaiting assignment
  const unassignedPatients = patients.filter((p) => !p.assignedDoctorId && p.status !== 'DISCHARGED');
  
  // Selected patient for matching inspection
  const [matchingPatientId, setMatchingPatientId] = useState<string>(
    unassignedPatients.length > 0 ? unassignedPatients[0].id : patients[0]?.id || ''
  );

  const targetPatient = patients.find((p) => p.id === matchingPatientId) || patients[0];

  // Run 2-Stage matching rankings for selected patient
  const matchingScores = targetPatient ? rankDoctorsForPatient(targetPatient, doctors) : [];

  const handleAutoAssign = () => {
    if (!targetPatient) return;
    const bestEligible = matchingScores.find((s) => s.isEligible);
    if (!bestEligible) {
      alert('No eligible doctors currently available. Activating emergency escalation protocol.');
      return;
    }
    assignDoctorToPatient(targetPatient.id, bestEligible.doctorId, currentRole);
    alert(`Assigned ${targetPatient.name} to ${bestEligible.doctorName} (Score: ${bestEligible.totalScore}/100)`);
  };

  const handleManualAssign = (doctorId: string) => {
    if (!targetPatient) return;
    assignDoctorToPatient(targetPatient.id, doctorId, currentRole);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Optimization Engine Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Two-Stage Doctor Matching & Assignment Engine
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
              Min-Cost Flow Optimization
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage 1 filters verified credentials and duty capacity. Stage 2 optimizes specialty fit (45%), workload headroom (30%), language (15%), and continuity (10%).
          </p>
        </div>

        {targetPatient && !targetPatient.assignedDoctorId && (
          <button
            onClick={handleAutoAssign}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0F2E22] hover:bg-[#164232] text-white rounded-md text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-Match Best Doctor</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left Column (Unassigned Patients List) & Right Column (Doctor Matching Matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Patients Needing Assignment ({unassignedPatients.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Select to Match</span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[640px]">
            {unassignedPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                All admitted patients have been assigned to attending clinicians.
              </div>
            ) : (
              unassignedPatients.map((p) => {
                const isSelected = matchingPatientId === p.id;
                const effectiveCat = p.clinicianConfirmedCategory || p.provisionalCategory;
                const styles = getUrgencyStyles(effectiveCat);

                return (
                  <div
                    key={p.id}
                    onClick={() => setMatchingPatientId(p.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {p.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {p.incidentDescription}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                        <span>Lang: <strong className="text-slate-700">{p.originalLanguage.toUpperCase()}</strong></span>
                        <span>•</span>
                        <span>Waited: <strong className="text-slate-700">{p.waitingDurationMinutes}m</strong></span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${styles.badgeBg}`}>
                      {effectiveCat}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Doctor Matching Optimization Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-5">
          {targetPatient ? (
            <>
              {/* Target Patient Banner */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Evaluating Doctor Match For
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-extrabold text-sm text-slate-900">{targetPatient.name}</span>
                    <span className="font-mono text-slate-400">({targetPatient.id})</span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getUrgencyStyles(targetPatient.clinicianConfirmedCategory || targetPatient.provisionalCategory).badgeBg}`}>
                      {targetPatient.clinicianConfirmedCategory || targetPatient.provisionalCategory}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1 line-clamp-1">
                    Symptoms: {targetPatient.reportedSymptoms.join(', ') || targetPatient.incidentDescription}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold block">CURRENT STATUS</span>
                  <span className={`font-bold text-xs ${targetPatient.assignedDoctorName ? 'text-emerald-800' : 'text-amber-700'}`}>
                    {targetPatient.assignedDoctorName ? `Assigned to ${targetPatient.assignedDoctorName}` : 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Roster & Matching Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span>Ranked Doctor Eligibility & Multi-Factor Compatibility</span>
                  <span>Composite Match Score</span>
                </div>

                <div className="space-y-2.5">
                  {matchingScores.map((score, rank) => {
                    const doc = doctors.find((d) => d.id === score.doctorId)!;
                    const isAssignedToThis = targetPatient.assignedDoctorId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`p-3.5 rounded-lg border transition-all text-xs ${
                          isAssignedToThis
                            ? 'bg-emerald-50/50 border-emerald-500'
                            : score.isEligible
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Doctor Info */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              #{rank + 1}
                            </span>
                            <img
                              src={doc.avatar}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 truncate">
                                  {doc.name}
                                </span>
                                {doc.verifiedRegistration && (
                                  <span className="text-[10px] text-emerald-700 font-bold">✓ Verified</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {doc.specializations.join(', ')} • {doc.languages.join('/')}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Current Caseload: <strong className="text-slate-700">{doc.currentCaseload}/{doc.maxCapacity}</strong> ({doc.availabilityStatus})
                              </div>
                            </div>
                          </div>

                          {/* Score Pill & Assign Button */}
                          <div className="flex items-center space-x-3 shrink-0 justify-between md:justify-end">
                            {score.isEligible ? (
                              <div className="text-right">
                                <div className="text-base font-black text-emerald-800">
                                  {score.totalScore}<span className="text-[10px] text-slate-400 font-normal">/100</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  Spec: {score.specialtyMatchScore} | Load: {score.workloadBalanceScore}
                                </div>
                              </div>
                            ) : (
                              <div className="text-right text-[11px] text-red-600 font-bold">
                                Ineligible ({score.ineligibilityReason})
                              </div>
                            )}

                            <div>
                              {isAssignedToThis ? (
                                <span className="px-3 py-1.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                                  Currently Assigned
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualAssign(doc.id)}
                                  disabled={!score.isEligible}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                    score.isEligible
                                      ? 'bg-[#0F2E22] hover:bg-[#164232] text-white shadow-xs'
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Subscore progress bars */}
                        {score.isEligible && (
                          <div className="grid grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                            <div>
                              <div className="flex justify-between">
                                <span>Specialty (45%):</span>
                                <span className="font-bold text-slate-700">{score.specialtyMatchScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${score.specialtyMatchScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between">
                                <span>Workload (30%):</span>
                                <span className="font-bold text-slate-700">{score.workloadBalanceScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${score.workloadBalanceScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between">
                                <span>Language (15%):</span>
                                <span className="font-bold text-slate-700">{score.languageMatchScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${score.languageMatchScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between">
                                <span>Continuity (10%):</span>
                                <span className="font-bold text-slate-700">{score.continuityScore}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${score.continuityScore}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select an unassigned patient from the left column to run doctor matching optimization.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
