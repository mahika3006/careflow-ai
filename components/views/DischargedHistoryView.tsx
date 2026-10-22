'use client';

import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  FileText, 
  ArrowUpRight, 
  RotateCcw, 
  ShieldAlert,
  Calendar,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { UrgencyCategory } from '@/types';
import { getUrgencyStyles, getPatientEffectiveCategory } from '@/lib/triage-rules';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface DischargedHistoryViewProps {
  onSelectPatient: (patientId: string) => void;
}

export function DischargedHistoryView({ onSelectPatient }: DischargedHistoryViewProps) {
  const { patients, readmitPatient, currentRole } = useCareFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [readmitModalPatient, setReadmitModalPatient] = useState<string | null>(null);
  const [readmitReason, setReadmitReason] = useState('');

  // Discharged patient list only
  const dischargedPatients = useMemo(() => {
    return patients.filter((p) => p.status === 'DISCHARGED');
  }, [patients]);

  // Filtered list
  const filteredDischarged = useMemo(() => {
    let list = [...dischargedPatients];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.incidentDescription.toLowerCase().includes(q) ||
          (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(q)) ||
          p.reportedSymptoms.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    if (selectedUrgency !== 'ALL') {
      list = list.filter((p) => {
        const cat = getPatientEffectiveCategory(p);
        return cat === selectedUrgency;
      });
    }

    // Sort: most recently discharged or admitted first
    list.sort((a, b) => {
      const dateA = new Date(a.dischargedAt || a.consultation?.finalizedAt || a.arrivalTime).getTime();
      const dateB = new Date(b.dischargedAt || b.consultation?.finalizedAt || b.arrivalTime).getTime();
      return dateB - dateA;
    });

    return list;
  }, [dischargedPatients, searchQuery, selectedUrgency]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Discharged Patient History & Archives
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {dischargedPatients.length} Historical Records
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Permanent historical records of stabilized and discharged emergency encounters. Records are read-only and preserved for clinical audit.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Discharged
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {dischargedPatients.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Encounter Finalized
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
            {dischargedPatients.filter((p) => p.consultation?.finalizedByDoctor).length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Past Emergency Cases
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-1.5 tracking-tight">
            {dischargedPatients.filter((p) => getPatientEffectiveCategory(p) === 'EMERGENCY').length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Prescriptions Issued
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {dischargedPatients.reduce((acc, p) => acc + (p.consultation?.prescriptions?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discharged by patient name, ID, symptoms, or doctor..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-bold">Previous Priority:</span>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="URGENT">Urgent</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="ROUTINE">Routine</option>
          </select>
        </div>
      </div>

      {/* Discharged Patients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredDischarged.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchQuery || selectedUrgency !== 'ALL'
                ? 'No matching discharged records found'
                : 'No patients have been discharged yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When an attending doctor finalizes a consultation or formal discharge is recorded, patients are safely archived here with their full clinical history.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Patient Demographics</th>
                  <th className="py-3 px-4">Previous Priority</th>
                  <th className="py-3 px-4">Admission Date</th>
                  <th className="py-3 px-4">Discharge Date</th>
                  <th className="py-3 px-4">Attending Doctor</th>
                  <th className="py-3 px-4">Discharge Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDischarged.map((patient) => {
                  const effectiveCat = getPatientEffectiveCategory(patient);
                  const styles = getUrgencyStyles(effectiveCat);

                  const admissionStr = new Date(patient.arrivalTime).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const dischargeDate = patient.dischargedAt || patient.consultation?.finalizedAt;
                  const dischargeStr = dischargeDate
                    ? new Date(dischargeDate).toLocaleDateString(undefined, {
                        year: 'numeric',
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Patient & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar name={patient.name} src={patient.avatar} size="md" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {patient.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {patient.id} • {patient.age}y • {patient.gender}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Previous Priority */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${styles.badgeBg}`}>
                          {effectiveCat}
                        </span>
                      </td>

                      {/* Admission Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{admissionStr}</span>
                        </div>
                      </td>

                      {/* Discharge Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">{dischargeStr}</span>
                        </div>
                      </td>

                      {/* Assigned Doctor */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.assignedDoctorName || 'Attending Clinician'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Discharged (Archived)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectPatient(patient.id)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="View Read-Only Historical Profile"
                          >
                            <span>View Profile</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>

                          {currentRole !== 'PATIENT' && (
                            <button
                              onClick={() => {
                                setReadmitModalPatient(patient.id);
                                setReadmitReason('');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Re-admit Patient to Active Care"
                            >
                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                              <span>Re-admit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Readmission Confirmation Modal */}
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
              This will restore the patient to the active emergency workflow without creating duplicate records. All previous clinical documents, prescriptions, and historical notes will remain intact.
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
