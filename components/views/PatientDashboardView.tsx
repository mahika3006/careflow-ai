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
  AlertCircle
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { UrgencyCategory, PatientStatus } from '@/types';
import { getUrgencyStyles, isOverdue, calculateQueuePriority } from '@/lib/triage-rules';

interface PatientDashboardViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewIntakeModal: () => void;
}

export function PatientDashboardView({ onSelectPatient, onOpenNewIntakeModal }: PatientDashboardViewProps) {
  const { patients, doctors, searchQuery, setSearchQuery } = useCareFlow();

  // Filters
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY' | 'WAITING' | 'ARRIVAL' | 'NAME'>('PRIORITY');

  // Filtered and sorted patient list
  const filteredPatients = useMemo(() => {
    let list = [...patients];

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
        const cat = p.clinicianConfirmedCategory || p.provisionalCategory;
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

    // Status Filter
    if (selectedStatus !== 'ALL') {
      list = list.filter((p) => p.status === selectedStatus);
    }

    // Language Filter
    if (selectedLang !== 'ALL') {
      list = list.filter((p) => p.originalLanguage === selectedLang);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        return calculateQueuePriority(b) - calculateQueuePriority(a);
      }
      if (sortBy === 'WAITING') {
        return b.waitingDurationMinutes - a.waitingDurationMinutes;
      }
      if (sortBy === 'ARRIVAL') {
        return new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime();
      }
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [patients, searchQuery, selectedUrgency, selectedDoctor, selectedStatus, selectedLang, sortBy]);

  // Metrics summary
  const total = patients.length;
  const active = patients.filter((p) => p.status !== 'DISCHARGED').length;
  const immediate = patients.filter((p) => {
    const cat = p.clinicianConfirmedCategory || p.provisionalCategory;
    return cat === 'EMERGENCY' && p.status !== 'DISCHARGED';
  }).length;
  const awaiting = patients.filter((p) => !p.assignedDoctorId && p.status !== 'DISCHARGED').length;
  const overdue = patients.filter((p) => isOverdue(p) && p.status !== 'DISCHARGED').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Patient Management & Triage Register
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Centralized registry of admitted patients, AI-assisted provisional categories, and human clinician reviews
          </p>
        </div>

        <button
          onClick={onOpenNewIntakeModal}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto active:scale-95 hover:shadow-emerald-500/20"
        >
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">{total}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active In Dept</div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">{active}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs bg-gradient-to-b from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/20">
          <div className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Immediate Review</span>
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-1.5 tracking-tight">{immediate}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Awaiting Doctor</div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">{awaiting}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SLA Overdue</div>
          <div className={`text-3xl font-black mt-1.5 tracking-tight ${overdue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {overdue}
          </div>
        </div>
      </div>

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
            <span className="text-slate-500 font-semibold text-[11px]">Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 max-w-[150px] truncate"
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

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="TRIAGED">Triaged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="REVIEWED">Reviewed / Finalized</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Lang:</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Languages</option>
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
        </div>

        {/* Sorting Control */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="PRIORITY">Triage Priority Policy (Safety Rule Top)</option>
            <option value="WAITING">Longest Waiting Time</option>
            <option value="ARRIVAL">Latest Arrival Time</option>
            <option value="NAME">Patient Name</option>
          </select>

          {(selectedUrgency !== 'ALL' || selectedDoctor !== 'ALL' || selectedStatus !== 'ALL' || selectedLang !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedUrgency('ALL');
                setSelectedDoctor('ALL');
                setSelectedStatus('ALL');
                setSelectedLang('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Patient ID & Profile</th>
                <th className="py-3 px-3">Age / Sex</th>
                <th className="py-3 px-4">Reported Incident & Vitals</th>
                <th className="py-3 px-3">Arrival & Waiting</th>
                <th className="py-3 px-3">Provisional / Confirmed</th>
                <th className="py-3 px-3">Assigned Doctor</th>
                <th className="py-3 px-3">Case Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No patients match your active search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const effectiveCategory = patient.clinicianConfirmedCategory || patient.provisionalCategory;
                  const styles = getUrgencyStyles(effectiveCategory);
                  const isOverdueItem = isOverdue(patient);
                  const hasCriticalFlags = patient.aiAssessment?.warningFlags?.some((f) => f.severity === 'CRITICAL');

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* ID & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={patient.avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{patient.name}</span>
                              {hasCriticalFlags && (
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
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {patient.age}y • {patient.gender[0]}
                      </td>

                      {/* Incident & Vitals */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="line-clamp-1 font-medium text-slate-800">
                          {patient.incidentDescription}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span>BP: <strong className="text-slate-700">{patient.vitals.bloodPressure}</strong></span>
                          <span>•</span>
                          <span>SpO2: <strong className="text-slate-700">{patient.vitals.spO2}%</strong></span>
                          <span>•</span>
                          <span>HR: <strong className="text-slate-700">{patient.vitals.heartRate}</strong></span>
                        </div>
                      </td>

                      {/* Arrival & Waiting */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1 font-bold text-slate-900">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{patient.waitingDurationMinutes} min</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          SLA: {patient.slaMinutes}m
                        </div>
                        {isOverdueItem && (
                          <div className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1 py-0.2 rounded mt-0.5 inline-block border border-amber-200">
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
                          <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                            ✓ Clinician Confirmed
                          </div>
                        )}
                      </td>

                      {/* Assigned Doctor */}
                      <td className="py-3 px-3">
                        {patient.assignedDoctorName ? (
                          <div className="text-slate-900 font-medium truncate max-w-[140px]">
                            {patient.assignedDoctorName}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {patient.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(patient.id);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
