'use client';

import React, { useState, useMemo } from 'react';
import { 
  Stethoscope, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  AlertCircle, 
  Plus, 
  Mic, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  Pill, 
  Printer, 
  Save, 
  Lock, 
  Calendar, 
  Send, 
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { getUrgencyStyles, isOverdue, sortPatientsByPriority } from '@/lib/triage-rules';
import { generatePrintableReportHtml } from '@/lib/reports';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface DoctorDashboardViewProps {
  onSelectPatient: (patientId: string) => void;
}

export function DoctorDashboardView({ onSelectPatient }: DoctorDashboardViewProps) {
  const { 
    doctors, 
    patients, 
    selectedDoctorId, 
    setSelectedDoctorId, 
    toggleDoctorAvailability,
    updateConsultation,
    addPrescriptionItem,
    approvePrescriptionItem,
    finalizeClinicalDocumentation
  } = useCareFlow();

  const doctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Active assigned patients for this doctor (excluding discharged), strictly sorted by standardized priority
  const assignedPatients = useMemo(() => {
    const list = patients.filter((p) => p.assignedDoctorId === doctor.id && p.status !== 'DISCHARGED');
    return sortPatientsByPriority(list);
  }, [patients, doctor.id]);

  // Selected patient within the doctor's consultation workspace
  const [activePatientId, setActivePatientId] = useState<string>(
    assignedPatients.length > 0 ? assignedPatients[0].id : ''
  );

  const activePatient = patients.find((p) => p.id === activePatientId) || assignedPatients[0];

  // Consultation form local state
  const [subjectiveNotes, setSubjectiveNotes] = useState(activePatient?.consultation?.subjectiveNotes || '');
  const [objectiveFindings, setObjectiveFindings] = useState(activePatient?.consultation?.objectiveFindings || '');
  const [clinicalAssessment, setClinicalAssessment] = useState(activePatient?.consultation?.clinicalAssessment || '');
  const [plan, setPlan] = useState(activePatient?.consultation?.plan || '');

  // Prescription builder state
  const [newDrugName, setNewDrugName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newFrequency, setNewFrequency] = useState('Once daily (OD)');
  const [newDuration, setNewDuration] = useState('5 days');
  const [newRoute, setNewRoute] = useState('Oral');
  const [newInstructions, setNewInstructions] = useState('Take after meals');

  // Referral builder state
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralSpecialty, setReferralSpecialty] = useState('');
  const [referralFacility, setReferralFacility] = useState('Apex Tertiary Care - OT');
  const [referralNotes, setReferralNotes] = useState('');

  // Voice dictation simulation state
  const [isDictating, setIsDictating] = useState(false);

  // Sync state when active patient changes
  React.useEffect(() => {
    if (activePatient) {
      setSubjectiveNotes(activePatient.consultation?.subjectiveNotes || activePatient.incidentDescription || '');
      setObjectiveFindings(
        activePatient.consultation?.objectiveFindings ||
        `Vitals: BP ${activePatient.vitals.bloodPressure}, HR ${activePatient.vitals.heartRate} bpm, SpO2 ${activePatient.vitals.spO2}%, Temp ${activePatient.vitals.temperature}°F.`
      );
      setClinicalAssessment(activePatient.consultation?.clinicalAssessment || '');
      setPlan(activePatient.consultation?.plan || '');
    }
  }, [activePatientId, activePatient?.id]);

  const handleSaveConsultationDraft = () => {
    if (!activePatient) return;
    updateConsultation(
      activePatient.id,
      {
        subjectiveNotes,
        objectiveFindings,
        clinicalAssessment,
        plan,
      },
      doctor.name
    );
    alert('Clinical consultation draft saved.');
  };

  const handleAddPrescription = () => {
    if (!activePatient || !newDrugName.trim() || !newDosage.trim()) {
      alert('Please enter drug name and dosage.');
      return;
    }

    // Check allergy
    const matchesAllergy = activePatient.allergies.some((allg) =>
      newDrugName.toLowerCase().includes(allg.toLowerCase())
    );

    addPrescriptionItem(
      activePatient.id,
      {
        drugName: newDrugName,
        dosage: newDosage,
        frequency: newFrequency,
        duration: newDuration,
        route: newRoute,
        instructions: newInstructions,
        allergyWarning: matchesAllergy ? `Potential allergy match: ${activePatient.allergies.join(', ')}` : undefined,
        approvedByClinician: true,
      },
      doctor.name
    );

    setNewDrugName('');
    setNewDosage('');
  };

  const handleFinalizeRecord = () => {
    if (!activePatient) return;
    if (!clinicalAssessment.trim()) {
      alert('Please enter a clinical diagnosis / assessment before finalizing.');
      return;
    }
    handleSaveConsultationDraft();
    finalizeClinicalDocumentation(activePatient.id, doctor.name);
    alert('Encounter finalized and electronically signed. Report generated.');
  };

  const simulateDictation = () => {
    setIsDictating(true);
    setTimeout(() => {
      setSubjectiveNotes(
        (prev) =>
          prev +
          (prev ? '\n' : '') +
          '[Dictated note]: Patient reports stable breathing on room air. Denies worsening retrosternal radiation. Pain score reduced from 8/10 to 3/10 post initial stabilization.'
      );
      setIsDictating(false);
    }, 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Doctor Header & Profile Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <UserAvatar
              name={doctor.name}
              src={doctor.avatar}
              size="2xl"
              showStatus
              status={doctor.availabilityStatus}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {doctor.name}
                </h2>
                {doctor.verifiedRegistration && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Verified Clinician
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  {doctor.registrationNumber}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {doctor.qualifications} • {doctor.yearsOfExperience} yrs experience
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {doctor.specializations.map((spec, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                    {spec}
                  </span>
                ))}
                <span className="text-[10px] text-slate-400">• Languages: {doctor.languages.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Availability Toggle & Caseload */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">Caseload Capacity</div>
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {doctor.currentCaseload} / {doctor.maxCapacity} Patients
              </div>
            </div>

            <button
              onClick={() => toggleDoctorAvailability(doctor.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                doctor.availabilityStatus === 'AVAILABLE'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${doctor.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
              <span>{doctor.availabilityStatus}</span>
            </button>

            {/* Doctor Switcher Dropdown */}
            <select
              value={doctor.id}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-emerald-600"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specializations[0]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Left (Assigned Patients Queue) & Right (Consultation Workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Assigned Queue ({assignedPatients.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sorted by Priority</span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[680px]">
            {assignedPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active patients currently assigned to {doctor.name}.
              </div>
            ) : (
              assignedPatients.map((patient) => {
                const isSelected = activePatient?.id === patient.id;
                const effectiveCat = patient.clinicianConfirmedCategory || patient.provisionalCategory;
                const styles = getUrgencyStyles(effectiveCat);
                const isOver = isOverdue(patient);

                return (
                  <div
                    key={patient.id}
                    onClick={() => setActivePatientId(patient.id)}
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
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {patient.incidentDescription}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                        <span>Waited: <strong className="text-slate-700">{patient.waitingDurationMinutes}m</strong></span>
                        <span>•</span>
                        <span>Status: <strong className="text-slate-700">{patient.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badgeBg}`}>
                        {effectiveCat}
                      </span>
                      {isOver && (
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                          SLA Expired
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Consultation Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-5">
          {activePatient ? (
            <>
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Consultation: {activePatient.name}
                    </h3>
                    <span className="font-mono text-xs text-slate-400">
                      ({activePatient.id})
                    </span>
                    <button
                      onClick={() => onSelectPatient(activePatient.id)}
                      className="text-xs text-emerald-800 font-bold hover:underline"
                    >
                      View Full Dossier
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activePatient.age} yrs • {activePatient.gender} • BP: {activePatient.vitals.bloodPressure} • SpO2: {activePatient.vitals.spO2}% • HR: {activePatient.vitals.heartRate} bpm
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={simulateDictation}
                    disabled={isDictating}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                      isDictating
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isDictating ? 'Transcribing...' : 'Dictate Notes'}</span>
                  </button>

                  <button
                    onClick={handleSaveConsultationDraft}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold border border-slate-200 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    onClick={handleFinalizeRecord}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0F2E22] hover:bg-[#164232] text-white rounded text-xs font-bold shadow-xs transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Finalize & Sign</span>
                  </button>
                </div>
              </div>

              {/* Subjective Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  1. Subjective Clinical History & Patient Complaints
                </label>
                <textarea
                  value={subjectiveNotes}
                  onChange={(e) => setSubjectiveNotes(e.target.value)}
                  rows={3}
                  placeholder="Record symptoms, onset, progression, patient responses..."
                  className="w-full p-2.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Objective Findings */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  2. Objective Physical Exam & Diagnostic Observations
                </label>
                <textarea
                  value={objectiveFindings}
                  onChange={(e) => setObjectiveFindings(e.target.value)}
                  rows={2}
                  placeholder="Auscultation, palpation, neurological exam, vitals reassessment..."
                  className="w-full p-2.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Assessment / Diagnosis */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  3. Clinician Assessment & Working Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clinicalAssessment}
                  onChange={(e) => setClinicalAssessment(e.target.value)}
                  placeholder="e.g. Acute Coronary Syndrome (STEMI), Acute Appendicitis, Severe Preeclampsia..."
                  className="w-full p-2.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  4. Management Plan & Treatment Strategy
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  rows={2}
                  placeholder="Intervention strategy, dietary recommendations, admission orders..."
                  className="w-full p-2.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Prescription Builder */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Pill className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Prescription Orders ({activePatient.consultation?.prescriptions.length || 0})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Requires Clinician Approval</span>
                </div>

                {/* Existing Prescriptions List */}
                <div className="space-y-2">
                  {activePatient.consultation?.prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-2.5 bg-white rounded border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{rx.drugName} • {rx.dosage}</div>
                        <div className="text-[11px] text-slate-500">
                          {rx.frequency} • {rx.duration} ({rx.route}) — {rx.instructions}
                        </div>
                        {rx.allergyWarning && (
                          <div className="text-[10px] text-red-600 font-bold mt-0.5">
                            ⚠ {rx.allergyWarning}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {rx.approvedByClinician ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Approved
                          </span>
                        ) : (
                          <button
                            onClick={() => approvePrescriptionItem(activePatient.id, rx.id, doctor.name)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold"
                          >
                            Sign & Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Prescription Row */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 text-xs">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={newDrugName}
                      onChange={(e) => setNewDrugName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={newDosage}
                      onChange={(e) => setNewDosage(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <select
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option>STAT Once</option>
                      <option>Once daily (OD)</option>
                      <option>Twice daily (BD)</option>
                      <option>Thrice daily (TDS)</option>
                      <option>Four times (QDS)</option>
                      <option>As needed (SOS)</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Duration (5 days)"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddPrescription}
                      className="w-full py-2 bg-[#0F2E22] hover:bg-[#164232] text-white rounded text-xs font-bold transition-colors"
                    >
                      + Add Rx
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a patient from the assigned queue to open the clinical workspace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
