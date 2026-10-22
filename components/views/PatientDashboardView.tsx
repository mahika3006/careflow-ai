'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  UserCheck, 
  FileText,
  Stethoscope,
  X,
  AlertCircle,
  History,
  RotateCcw,
  ArrowUpRight,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { UrgencyCategory, PatientStatus } from '@/types';
import { 
  getUrgencyStyles, 
  isOverdue, 
  calculateQueuePriority,
  comparePatientsByPriority,
  getPatientEffectiveCategory 
} from '@/lib/triage-rules';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface PatientDashboardViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewIntakeModal: () => void;
}

export function PatientDashboardView({ onSelectPatient, onOpenNewIntakeModal }: PatientDashboardViewProps) {
  const { patients, doctors, searchQuery, setSearchQuery, readmitPatient, currentRole } = useCareFlow();

  // Active vs Discharged Tabs
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'DISCHARGED'>('ACTIVE');

  // Filters
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY' | 'WAITING' | 'ARRIVAL' | 'NAME'>('PRIORITY');

  // Readmit Modal State
  const [readmitModalPatient, setReadmitModalPatient] = useState<string | null>(null);
  const [readmitReason, setReadmitReason] = useState('');

  // Filtered and sorted patient list
  const filteredPatients = useMemo(() => {
    let list = [...patients];

    // Pillar 2: Exclude discharged patients from active views, or show only discharged in archive
    if (viewMode === 'ACTIVE') {
      list = list.filter((p) => p.status !== 'DISCHARGED');
    } else {
      list = list.filter((p) => p.status === 'DISCHARGED');
    }

    // Global Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.incidentDescription.toLowerCase().includes(q) ||
          p.reportedSymptoms.some((s) => s.toLowerCase().includes(q)) ||
          (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(q))
        );
      });
    }

    // Urgency Filter
    if (selectedUrgency !== 'ALL') {
      list = list.filter((p) => {
        const cat = getPatientEffectiveCategory(p);
        return cat === selectedUrgency;
      });
    }

    // Doctor Filter
    if (selectedDoctor !== 'ALL') {
      if (selectedDoctor === 'UNASSIGNED') {
        list = list.filter((p) => !p.assignedDoctorId);
      } else {
        list = list.filter((p) => p.assignedDoctorId === selectedDoctor);
      }
    }

    // Status Filter (active mode only)
    if (viewMode === 'ACTIVE' && selectedStatus !== 'ALL') {
      list = list.filter((p) => p.status === selectedStatus);
    }

    // Language Filter
    if (selectedLang !== 'ALL') {
      list = list.filter((p) => p.originalLanguage === selectedLang);
    }

    // Pillar 1: Standardize Patient Priority Ordering Everywhere
    // Emergency (1) -> Urgent (2) -> Needs Review (3) -> Routine (4)
    list.sort((a, b) => {
      const secondaryComparator = (p1: typeof a, p2: typeof b) => {
        if (sortBy === 'PRIORITY') {
          return calculateQueuePriority(p2) - calculateQueuePriority(p1);
        }
        if (sortBy === 'WAITING') {
          return (p2.waitingDurationMinutes || 0) - (p1.waitingDurationMinutes || 0);
        }
        if (sortBy === 'ARRIVAL') {
          return new Date(p2.arrivalTime).getTime() - new Date(p1.arrivalTime).getTime();
        }
        if (sortBy === 'NAME') {
          return p1.name.localeCompare(p2.name);
        }
        return 0;
      };

      if (viewMode === 'DISCHARGED') {
        const dateA = new Date(a.dischargedAt || a.consultation?.finalizedAt || a.arrivalTime).getTime();
        const dateB = new Date(b.dischargedAt || b.consultation?.finalizedAt || b.arrivalTime).getTime();
        return dateB - dateA;
      }

      // Enforce strict Emergency -> Urgent -> Needs Review -> Routine priority
      return comparePatientsByPriority(a, b, secondaryComparator);
    });

    return list;
  }, [patients, viewMode, searchQuery, selectedUrgency, selectedDoctor, selectedStatus, selectedLang, sortBy]);

  // Metrics summary (accurately segregated)
  const total = patients.length;
  const activeCount = patients.filter((p) => p.status !== 'DISCHARGED').length;
  const dischargedCount = patients.filter((p) => p.status === 'DISCHARGED').length;
  const immediate = patients.filter((p) => {
    const cat = getPatientEffectiveCategory(p);
    return cat === 'EMERGENCY' && p.status !== 'DISCHARGED';
  }).length;
  const awaiting = patients.filter((p) => !p.assignedDoctorId && p.status !== 'DISCHARGED').length;
  const overdue = patients.filter((p) => isOverdue(p) && p.status !== 'DISCHARGED').length;

  const handleConfirmReadmit = () => {
    if (!readmitModalPatient) return;
    const actor = currentRole === 'DOCTOR' ? 'Dr. Attending Physician' : 'Triage Nurse Lead';
    readmitPatient(readmitModalPatient, actor, readmitReason.trim() || undefined);
    setReadmitModalPatient(null);
    setReadmitReason('');
  };

  const patientToReadmit = patients.find((p) => p.id === readmitModalPatient);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Patient Management & Triage Register
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Centralized registry of admitted patients, standardized priority ordering, and archived discharge records
          </p>
        </div>

        <button
          onClick={onOpenNewIntakeModal}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto active:scale-95 hover:shadow-emerald-500/20"
        >
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* View Mode Tabs: Active Register vs Discharged Archive */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setViewMode('ACTIVE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'ACTIVE'
              ? 'bg-[#0F2E22] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Active Patient Register</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            viewMode === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setViewMode('DISCHARGED')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'DISCHARGED'
              ? 'bg-[#0F2E22] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Discharged Patient History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            viewMode === 'DISCHARGED' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {dischargedCount}
          </span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active in Department
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
            {activeCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs bg-gradient-to-b from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/20">
          <div className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency (Top Tier)</span>
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-1.5 tracking-tight">
            {immediate}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Awaiting Doctor
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
            {awaiting}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            SLA Overdue
          </div>
          <div className={`text-3xl font-black mt-1.5 tracking-tight ${overdue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {overdue}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Archived Discharged
          </div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-1.5 tracking-tight">
            {dischargedCount}
          </div>
        </div>
      </div>

      {/* Priority Ordering Rule Callout */}
      {viewMode === 'ACTIVE' && (
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              <strong>Standardized Patient Priority:</strong> Active patients are strictly ordered by clinical urgency:
              <span className="font-bold text-red-700 dark:text-red-400 ml-1">Emergency (1st)</span> →
              <span className="font-bold text-amber-700 dark:text-amber-400 ml-1">Urgent (2nd)</span> →
              <span className="font-bold text-blue-700 dark:text-blue-400 ml-1">Needs Review (3rd)</span> →
              <span className="font-bold text-emerald-700 dark:text-emerald-400 ml-1">Routine (4th)</span>.
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider hidden md:inline">
            Deterministic Ranking Active
          </span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Urgency Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">Urgency:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="EMERGENCY">Emergency (Red)</option>
              <option value="URGENT">Urgent (Amber)</option>
              <option value="NEEDS_REVIEW">Needs Review (Blue)</option>
              <option value="ROUTINE">Routine (Green)</option>
            </select>
          </div>

          {/* Doctor Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 max-w-[150px] truncate"
            >
              <option value="ALL">All Doctors</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (only active mode) */}
          {viewMode === 'ACTIVE' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="ALL">All Active Statuses</option>
                <option value="TRIAGED">Triaged</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="REVIEWED">Reviewed</option>
              </select>
            </div>
          )}

          {/* Language Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Language:</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
            </select>
          </div>
        </div>

        {/* Search & Secondary Sort Control */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {viewMode === 'ACTIVE' && (
            <div className="flex items-center space-x-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Within Group:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              >
                <option value="PRIORITY">Priority Score</option>
                <option value="WAITING">Waiting Time</option>
                <option value="ARRIVAL">Arrival Time</option>
                <option value="NAME">Patient Name</option>
              </select>
            </div>
          )}

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={viewMode === 'ACTIVE' ? "Search active patients..." : "Search discharged history..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 w-full sm:w-52"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Patient Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">ID & Photo</th>
                <th className="py-3 px-3">Age/Sex</th>
                <th className="py-3 px-4">Chief Complaint & Vitals</th>
                {viewMode === 'ACTIVE' ? (
                  <>
                    <th className="py-3 px-3">Waiting (SLA)</th>
                    <th className="py-3 px-3">Priority Category</th>
                    <th className="py-3 px-3">Assigned Doctor</th>
                    <th className="py-3 px-3">Case Status</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3">Admission Time</th>
                    <th className="py-3 px-3">Discharge Date</th>
                    <th className="py-3 px-3">Previous Priority</th>
                    <th className="py-3 px-3">Attending Doctor</th>
                  </>
                )}
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    {viewMode === 'ACTIVE'
                      ? 'No active patients match your search and filter criteria.'
                      : 'No discharged patient records found in historical archives.'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const effectiveCategory = getPatientEffectiveCategory(patient);
                  const styles = getUrgencyStyles(effectiveCategory);
                  const isOverdueItem = isOverdue(patient);
                  const hasCriticalFlags = patient.aiAssessment?.warningFlags?.some((f) => f.severity === 'CRITICAL');

                  const admissionStr = new Date(patient.arrivalTime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const dischargeDate = patient.dischargedAt || patient.consultation?.finalizedAt;
                  const dischargeStr = dischargeDate
                    ? new Date(dischargeDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Discharged on record';

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* ID & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar
                            name={patient.name}
                            src={patient.avatar}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              <span>{patient.name}</span>
                              {hasCriticalFlags && viewMode === 'ACTIVE' && (
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" title="Critical flag active" />
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {patient.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Age & Sex */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {patient.age}y • {patient.gender[0]}
                      </td>

                      {/* Incident & Vitals */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="line-clamp-1 font-medium text-slate-800 dark:text-slate-200">
                          {patient.incidentDescription}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>BP: <strong className="text-slate-700 dark:text-slate-300">{patient.vitals.bloodPressure}</strong></span>
                          <span>•</span>
                          <span>SpO2: <strong className="text-slate-700 dark:text-slate-300">{patient.vitals.spO2}%</strong></span>
                          <span>•</span>
                          <span>HR: <strong className="text-slate-700 dark:text-slate-300">{patient.vitals.heartRate}</strong></span>
                        </div>
                      </td>

                      {viewMode === 'ACTIVE' ? (
                        <>
                          {/* Arrival & Waiting */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1 font-bold text-slate-900 dark:text-white">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{patient.waitingDurationMinutes} min</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              SLA: {patient.slaMinutes}m
                            </div>
                            {isOverdueItem && (
                              <div className="text-[9px] font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1 py-0.2 rounded mt-0.5 inline-block border border-amber-200 dark:border-amber-800">
                                EXCEEDED
                              </div>
                            )}
                          </td>

                          {/* Urgency Badge */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${styles.badgeBg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.dotColor}`} />
                              {effectiveCategory}
                            </span>
                            {patient.clinicianConfirmedCategory && (
                              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                                ✓ Clinician Confirmed
                              </div>
                            )}
                          </td>

                          {/* Assigned Doctor */}
                          <td className="py-3 px-3">
                            {patient.assignedDoctorName ? (
                              <div className="text-slate-900 dark:text-white font-medium truncate max-w-[140px]">
                                {patient.assignedDoctorName}
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800">
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {patient.status.replace('_', ' ')}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Historical Admission Date */}
                          <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{admissionStr}</span>
                            </div>
                          </td>

                          {/* Historical Discharge Date */}
                          <td className="py-3 px-3 font-medium text-emerald-700 dark:text-emerald-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-semibold">{dischargeStr}</span>
                            </div>
                          </td>

                          {/* Historical Previous Priority */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${styles.badgeBg}`}>
                              {effectiveCategory}
                            </span>
                          </td>

                          {/* Historical Doctor */}
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            {patient.assignedDoctorName || 'Attending Clinician'}
                          </td>
                        </>
                      )}

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectPatient(patient.id)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-slate-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center space-x-1"
                            title={viewMode === 'ACTIVE' ? "Review Active Encounter" : "View Read-Only History"}
                          >
                            <span>{viewMode === 'ACTIVE' ? 'Review' : 'View Profile'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          {viewMode === 'DISCHARGED' && currentRole !== 'PATIENT' && (
                            <button
                              onClick={() => {
                                setReadmitModalPatient(patient.id);
                                setReadmitReason('');
                              }}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Re-admit Patient"
                            >
                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                              <span>Re-admit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Re-admission Modal */}
      {readmitModalPatient && patientToReadmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 rounded-xl text-emerald-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Re-admit Patient to Active Registry
                </h3>
                <p className="text-xs text-slate-500">
                  {patientToReadmit.name} ({patientToReadmit.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This restores the patient into the active clinical workflow without creating duplicate records. All previous clinical documents and historical notes remain preserved.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Reason for Readmission
              </label>
              <textarea
                value={readmitReason}
                onChange={(e) => setReadmitReason(e.target.value)}
                placeholder="e.g., Recurrent acute pain, post-discharge complications, or urgent re-evaluation..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setReadmitModalPatient(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReadmit}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Confirm Readmission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
