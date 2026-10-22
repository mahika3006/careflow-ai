'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldAlert, 
  Clock, 
  ArrowUpDown, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  Edit3, 
  UserCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { 
  getUrgencyStyles, 
  isOverdue, 
  calculateQueuePriority, 
  comparePatientsByPriority, 
  getPatientEffectiveCategory 
} from '@/lib/triage-rules';
import { UrgencyCategory } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface TriageQueueViewProps {
  onSelectPatient: (patientId: string) => void;
  onNavigateAssignments: () => void;
}

export function TriageQueueView({ onSelectPatient, onNavigateAssignments }: TriageQueueViewProps) {
  const { patients, currentRole, confirmOrOverrideTriage } = useCareFlow();

  // Selected category filter
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Override dialog state
  const [overridePatientId, setOverridePatientId] = useState<string | null>(null);
  const [selectedNewCat, setSelectedNewCat] = useState<UrgencyCategory>('URGENT');
  const [justification, setJustification] = useState('');

  // Filter active (non-discharged) queue
  const activeQueue = patients.filter((p) => p.status !== 'DISCHARGED');

  // Sorted by standardized priority: Emergency -> Urgent -> Needs Review -> Routine
  // With dynamic queue score as secondary sort within each priority bracket
  const sortedQueue = [...activeQueue].sort((a, b) => {
    return comparePatientsByPriority(a, b, (p1, p2) => calculateQueuePriority(p2) - calculateQueuePriority(p1));
  });

  const filteredQueue = sortedQueue.filter((p) => {
    if (filterCategory === 'ALL') return true;
    const cat = getPatientEffectiveCategory(p);
    return cat === filterCategory;
  });

  // Partition into Emergency Alert group vs Standard Queue
  const emergencyGroup = filteredQueue.filter((p) => {
    const cat = getPatientEffectiveCategory(p);
    return cat === 'EMERGENCY';
  });

  // Standard group: strictly ordered Urgent -> Needs Review -> Routine
  const standardGroup = filteredQueue
    .filter((p) => {
      const cat = getPatientEffectiveCategory(p);
      return cat !== 'EMERGENCY';
    })
    .sort((a, b) =>
      comparePatientsByPriority(a, b, (p1, p2) => calculateQueuePriority(p2) - calculateQueuePriority(p1))
    );

  const handleOpenOverride = (e: React.MouseEvent, pId: string, currentCat: UrgencyCategory) => {
    e.stopPropagation();
    setOverridePatientId(pId);
    setSelectedNewCat(currentCat);
    setJustification('');
  };

  const handleCommitOverride = () => {
    if (!overridePatientId) return;
    if (!justification.trim()) {
      alert('Clinical rationale is required to override or confirm triage category.');
      return;
    }
    confirmOrOverrideTriage(overridePatientId, selectedNewCat, justification, currentRole);
    setOverridePatientId(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Engine Policy Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Centralized Clinical Triage Queue
            </h2>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
              Deterministic Rules Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Prioritized by safety rules and waiting-time escalation. Emergency cases are strictly pinned to top.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Category Filter Pills */}
          {(['ALL', 'EMERGENCY', 'URGENT', 'NEEDS_REVIEW', 'ROUTINE'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterCategory === cat
                  ? 'bg-[#0F2E22] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Queue' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* SLA Policy Explainer Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Priority Dynamic Policy:</strong> Emergency (SLA 10m) • Urgent (SLA 30m) • Needs Review (SLA 60m) • Routine (SLA 120m). Cases exceeding SLA automatically escalate in score to prevent starvation.
          </span>
        </div>
        <button
          onClick={onNavigateAssignments}
          className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
        >
          <span>Run Doctor Matching Engine</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SECTION 1: Stat Emergency Alerts Pinned to Top */}
      {emergencyGroup.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>Stat Emergency Alert Queue (Immediate Escalation Required)</span>
            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full">
              {emergencyGroup.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {emergencyGroup.map((patient, rank) => {
              const effectiveCat = patient.clinicianConfirmedCategory || patient.provisionalCategory;
              const styles = getUrgencyStyles(effectiveCat);

              return (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient.id)}
                  className="bg-red-50/60 border-2 border-red-500 rounded-lg p-4 shadow-xs hover:bg-red-50 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {rank + 1}
                    </span>
                    <UserAvatar
                      name={patient.name}
                      src={patient.avatar}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {patient.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {patient.id}
                        </span>
                        <span className="text-xs text-slate-600">
                          {patient.age}y • {patient.gender}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium mt-1 line-clamp-1">
                        {patient.incidentDescription}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                        <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                          {patient.aiAssessment?.warningFlags[0]?.flag || 'STAT EMERGENCY'}
                        </span>
                        <span className="text-slate-600">
                          BP: <strong>{patient.vitals.bloodPressure}</strong> | SpO2: <strong>{patient.vitals.spO2}%</strong> | HR: <strong>{patient.vitals.heartRate}</strong>
                        </span>
                        <span className="text-slate-500">
                          Assigned: <strong>{patient.assignedDoctorName || 'Pending Emergency Call'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-end shrink-0 justify-between gap-2">
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-700 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-red-600" />
                        <span>Waited: {patient.waitingDurationMinutes} min</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        SLA Window: {patient.slaMinutes}m
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleOpenOverride(e, patient.id, effectiveCat)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-bold border border-slate-300"
                      >
                        Override / Sign
                      </button>
                      <button
                        onClick={() => onSelectPatient(patient.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-xs"
                      >
                        Review Stat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Standard Prioritized Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>Standard Prioritized Queue ({standardGroup.length} Patients)</span>
          <span>Calculated Priority Score</span>
        </div>

        <div className="space-y-2">
          {standardGroup.map((patient, idx) => {
            const effectiveCat = patient.clinicianConfirmedCategory || patient.provisionalCategory;
            const styles = getUrgencyStyles(effectiveCat);
            const isOver = isOverdue(patient);
            const priorityScore = calculateQueuePriority(patient);

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`bg-white border rounded-lg p-3.5 shadow-2xs hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOver ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {emergencyGroup.length + idx + 1}
                  </span>
                  <UserAvatar
                    name={patient.name}
                    src={patient.avatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {patient.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {patient.id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {patient.age}y/{patient.gender[0]}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${styles.badgeBg}`}>
                        {effectiveCat}
                      </span>
                      {patient.clinicianConfirmedCategory && (
                        <span className="text-[9px] text-emerald-700 font-semibold">
                          ✓ Confirmed
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                      {patient.incidentDescription}
                    </p>

                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1">
                      <span>BP: <strong className="text-slate-700">{patient.vitals.bloodPressure}</strong></span>
                      <span>•</span>
                      <span>SpO2: <strong className="text-slate-700">{patient.vitals.spO2}%</strong></span>
                      <span>•</span>
                      <span>Assigned: <strong className="text-slate-700">{patient.assignedDoctorName || 'Unassigned'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center space-x-1 justify-end text-xs font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{patient.waitingDurationMinutes}m</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      SLA: {patient.slaMinutes}m
                    </div>
                    {isOver && (
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                        ESCALATED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => handleOpenOverride(e, patient.id, effectiveCat)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200"
                    >
                      Override
                    </button>
                    <button
                      onClick={() => onSelectPatient(patient.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded text-xs font-bold border border-slate-200 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Clinician Override Modal */}
      {overridePatientId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-700" />
              Adjust Triage Classification
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select New Urgency Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['EMERGENCY', 'URGENT', 'NEEDS_REVIEW', 'ROUTINE'] as UrgencyCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedNewCat(cat)}
                      className={`p-2 rounded border font-bold text-left ${
                        selectedNewCat === cat
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Clinical Rationale (Mandatory)</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="State clinical reason for overriding or confirming triage priority..."
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setOverridePatientId(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitOverride}
                className="px-4 py-1.5 rounded text-xs font-bold bg-[#0F2E22] hover:bg-[#164232] text-white"
              >
                Commit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
