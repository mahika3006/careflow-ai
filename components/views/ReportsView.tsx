'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Eye,
  Filter
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { generatePrintableReportHtml } from '@/lib/reports';

interface ReportsViewProps {
  onSelectPatient: (patientId: string) => void;
}

export function ReportsView({ onSelectPatient }: ReportsViewProps) {
  const { patients, doctors } = useCareFlow();

  const [filterFinalizedOnly, setFilterFinalizedOnly] = useState(false);
  const [activeReportPatientId, setActiveReportPatientId] = useState<string>(patients[0]?.id || '');

  const filteredPatients = patients.filter((p) => {
    if (filterFinalizedOnly) {
      return p.consultation?.finalizedByDoctor;
    }
    return true;
  });

  const selectedPatient = patients.find((p) => p.id === activeReportPatientId) || patients[0];
  const selectedDoctor = doctors.find((d) => d.id === selectedPatient?.assignedDoctorId);

  const handlePrint = (patient: any, doctor: any) => {
    const html = generatePrintableReportHtml(patient, doctor);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Clinical Documentation & Export Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured hospital encounter summaries, clinician-signed documentation, and printable medical reports
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={filterFinalizedOnly}
              onChange={(e) => setFilterFinalizedOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Clinician Finalized Only</span>
          </label>
        </div>
      </div>

      {/* Grid: Left Column (Report Directory) & Right Column (Live Document Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Patient Reports ({filteredPatients.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Click to Preview</span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[680px]">
            {filteredPatients.map((patient) => {
              const isSelected = activeReportPatientId === patient.id;
              const isFinal = patient.consultation?.finalizedByDoctor;

              return (
                <div
                  key={patient.id}
                  onClick={() => setActiveReportPatientId(patient.id)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {patient.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {patient.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      Diagnosis: {patient.consultation?.clinicalAssessment || 'Awaiting Assessment'}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Doctor: <strong className="text-slate-600">{patient.assignedDoctorName || 'Pending'}</strong>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isFinal ? 'FINALIZED' : 'DRAFT'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Report Preview (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-2xs p-6 flex flex-col justify-between">
          {selectedPatient ? (
            <div className="space-y-5">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#0F2E22]">
                <div>
                  <h3 className="text-lg font-black text-[#0F2E22] tracking-tight">
                    CAREFLOW AI CLINICAL ENCOUNTER SUMMARY
                  </h3>
                  <p className="text-xs text-slate-500">
                    Apex Central Healthcare • Department of Emergency Medicine
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePrint(selectedPatient, selectedDoctor)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F2E22] hover:bg-[#164232] text-white rounded text-xs font-bold shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF Export</span>
                  </button>
                  <button
                    onClick={() => onSelectPatient(selectedPatient.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold border border-slate-200"
                  >
                    Full Dossier
                  </button>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className={`p-3 rounded-md text-xs flex items-center justify-between ${
                selectedPatient.consultation?.finalizedByDoctor
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                <div className="flex items-center space-x-2 font-bold">
                  {selectedPatient.consultation?.finalizedByDoctor ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-700" />
                  )}
                  <span>
                    Status: {selectedPatient.consultation?.finalizedByDoctor ? 'CLINICIAN-FINALIZED MEDICAL RECORD' : 'PROVISIONAL DRAFT — PENDING ATTENDING SIGN-OFF'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Encounter: {selectedPatient.id}
                </span>
              </div>

              {/* Patient Demographics Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">PATIENT NAME</span>
                  <span className="font-bold text-slate-900">{selectedPatient.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">AGE / GENDER</span>
                  <span className="font-bold text-slate-900">{selectedPatient.age} yrs • {selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">TRIAGE PRIORITY</span>
                  <span className="font-extrabold text-emerald-800">
                    {selectedPatient.clinicianConfirmedCategory || selectedPatient.provisionalCategory}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">ATTENDING CLINICIAN</span>
                  <span className="font-bold text-slate-900">{selectedPatient.assignedDoctorName || 'Pending'}</span>
                </div>
              </div>

              {/* Clinical Vitals */}
              <div className="text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Recorded Triage Vital Signs
                </span>
                <div className="grid grid-cols-5 gap-2 text-center bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">BP</span>
                    <strong className="text-slate-800">{selectedPatient.vitals.bloodPressure}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">HR</span>
                    <strong className="text-slate-800">{selectedPatient.vitals.heartRate} bpm</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">SpO2</span>
                    <strong className="text-slate-800">{selectedPatient.vitals.spO2}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">TEMP</span>
                    <strong className="text-slate-800">{selectedPatient.vitals.temperature}°F</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RESP</span>
                    <strong className="text-slate-800">{selectedPatient.vitals.respiratoryRate}/min</strong>
                  </div>
                </div>
              </div>

              {/* Safety Evaluation & Warning Signs */}
              <div className="text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Multimodal Warning Flags (Safety Rule Engine)
                </span>
                <div className="space-y-1.5">
                  {selectedPatient.aiAssessment?.warningFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-2 rounded text-xs bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-slate-900">• [{flag.severity}] {flag.flag}</strong>
                        <span className="text-slate-500 ml-2">Evidence: {flag.evidence}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{flag.sourceRef}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinician Consultation Record */}
              <div className="text-xs space-y-3 bg-white p-4 rounded border border-slate-300">
                <span className="font-bold text-[#0F2E22] uppercase tracking-wider block text-xs border-b border-slate-200 pb-1">
                  Clinician-Approved Consultation Notes
                </span>

                <div>
                  <strong className="text-slate-800">Clinical Assessment / Diagnosis:</strong>
                  <p className="text-slate-900 font-semibold mt-0.5">
                    {selectedPatient.consultation?.clinicalAssessment || 'Pending clinician documentation.'}
                  </p>
                </div>

                <div>
                  <strong className="text-slate-800">Approved Prescriptions:</strong>
                  {selectedPatient.consultation?.prescriptions && selectedPatient.consultation.prescriptions.length > 0 ? (
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                      {selectedPatient.consultation.prescriptions.map((rx) => (
                        <li key={rx.id}>
                          <strong>{rx.drugName}</strong> ({rx.dosage}) - {rx.frequency} for {rx.duration} ({rx.instructions})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic mt-0.5">No prescriptions recorded.</p>
                  )}
                </div>

                <div>
                  <strong className="text-slate-800">Management & Follow-up Instructions:</strong>
                  <p className="text-slate-700 mt-0.5">
                    {selectedPatient.consultation?.followUpInstructions || selectedPatient.consultation?.plan || 'Standard observation and monitoring.'}
                  </p>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
                <strong>Human-in-the-Loop Clinical Mandate:</strong> CareFlow AI provides algorithmic assistance and evidence extraction. Final clinical decisions, diagnoses, and medical liability reside exclusively with the licensed healthcare provider.
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a patient report from the directory on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
