'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Patient, 
  Doctor, 
  TriageRule, 
  AuditLogEntry, 
  UserRole, 
  UrgencyCategory, 
  ConsultationRecord, 
  Prescription,
  AppTheme 
} from '@/types';
import { INITIAL_PATIENTS } from '@/lib/data/mock-patients';
import { INITIAL_DOCTORS } from '@/lib/data/mock-doctors';
import { DEFAULT_TRIAGE_RULES, evaluateTriageRules, calculateQueuePriority } from '@/lib/triage-rules';



interface CareFlowContextType {
  patients: Patient[];
  doctors: Doctor[];
  rules: TriageRule[];
  auditLogs: AuditLogEntry[];
  currentRole: UserRole;
  selectedDoctorId: string;
  selectedPatientId: string | null;
  currentLanguage: 'en' | 'hi' | 'hinglish';
  searchQuery: string;
  emergencyAlertCount: number;
  theme: AppTheme;
  sidebarCollapsed: boolean;
  
  // Actions
  setRole: (role: UserRole) => void;
  setSelectedDoctorId: (id: string) => void;
  setSelectedPatientId: (id: string | null) => void;
  setLanguage: (lang: 'en' | 'hi' | 'hinglish') => void;
  setSearchQuery: (q: string) => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  // Patient & Clinical Actions
  registerPatient: (patientData: Partial<Patient>) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  confirmOrOverrideTriage: (
    patientId: string,
    category: UrgencyCategory,
    reason: string,
    clinicianName: string
  ) => void;
  assignDoctorToPatient: (
    patientId: string,
    doctorId: string,
    actorName: string
  ) => void;
  updateConsultation: (
    patientId: string,
    data: Partial<ConsultationRecord>,
    actorName: string
  ) => void;
  approvePrescriptionItem: (
    patientId: string,
    prescriptionId: string,
    actorName: string
  ) => void;
  addPrescriptionItem: (
    patientId: string,
    item: Omit<Prescription, 'id'>,
    actorName: string
  ) => void;
  finalizeClinicalDocumentation: (
    patientId: string,
    actorName: string
  ) => void;
  dischargePatient: (
    patientId: string,
    actorName: string,
    notes?: string
  ) => void;
  readmitPatient: (
    patientId: string,
    actorName: string,
    reason?: string
  ) => void;
  updatePatientConsent: (
    patientId: string,
    status: 'active' | 'withdrawn',
    actorName: string
  ) => void;
  toggleDoctorAvailability: (doctorId: string) => void;
  updateRule: (ruleId: string, updates: Partial<TriageRule>) => void;
  deletePatientRecord: (patientId: string, reason: string) => void;
}

const CareFlowContext = createContext<CareFlowContextType | null>(null);

const STORAGE_KEY_RULES = 'careflow_rules_v1';
const STORAGE_KEY_LOGS = 'careflow_logs_v1';

export function CareFlowProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);

  const [rules, setRules] = useState<TriageRule[]>(DEFAULT_TRIAGE_RULES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'LOG-INIT-1',
      timestamp: '2026-10-19T21:49:00Z',
      actorId: 'DOC-102',
      actorName: 'Dr. Vikramaditya Rao',
      actorRole: 'DOCTOR',
      action: 'CONFIRM_EMERGENCY_TRIAGE',
      entityType: 'TRIAGE_ASSESSMENT',
      entityId: 'CF-PT-8091',
      previousValue: 'Provisional: EMERGENCY',
      newValue: 'Confirmed: EMERGENCY',
      rationale: 'Cath Lab activated for STEMI V1-V4 elevation',
    },
    {
      id: 'LOG-INIT-2',
      timestamp: '2026-10-19T22:09:00Z',
      actorId: 'DOC-103',
      actorName: 'Dr. Sunita Bannerjee',
      actorRole: 'DOCTOR',
      action: 'CONFIRM_EMERGENCY_TRIAGE',
      entityType: 'TRIAGE_ASSESSMENT',
      entityId: 'CF-PT-8092',
      previousValue: 'Provisional: EMERGENCY',
      newValue: 'Confirmed: EMERGENCY',
      rationale: 'Severe preeclampsia with impending eclampsia symptoms',
    },
  ]);

  const [currentRole, setCurrentRole] = useState<UserRole>('NURSE');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('DOC-102');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setThemeState] = useState<AppTheme>('day');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  const applyThemeClass = (t: AppTheme) => {
    if (typeof document !== 'undefined') {
      if (t === 'night') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'night');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'day');
      }
    }
  };

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    applyThemeClass(t);
    try { localStorage.setItem('careflow_theme', t); } catch {}
  };

  const toggleTheme = () => setTheme(theme === 'day' ? 'night' : 'day');

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try { localStorage.setItem('careflow_sidebar_collapsed', String(collapsed)); } catch {}
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // ── Bootstrap: load UI prefs from localStorage ───────────
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('careflow_sidebar_collapsed');
      if (savedCollapsed !== null) setSidebarCollapsedState(savedCollapsed === 'true');

      const savedTheme = localStorage.getItem('careflow_theme') as AppTheme;
      if (savedTheme === 'day' || savedTheme === 'night') {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      }

      const r = localStorage.getItem(STORAGE_KEY_RULES);
      if (r) setRules(JSON.parse(r));
    } catch {}
  }, []);

  // ── Supabase Live Data Fetch ──────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function loadFromDb() {
      try {
        const [patientsRes, doctorsRes, logsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/doctors'),
          fetch('/api/audit-logs'),
        ]);

        if (patientsRes.ok) {
          const pData = await patientsRes.json();
          if (isMounted && Array.isArray(pData) && pData.length > 0) {
            setPatients(pData);
          }
        }

        if (doctorsRes.ok) {
          const dData = await doctorsRes.json();
          if (isMounted && Array.isArray(dData) && dData.length > 0) {
            setDoctors(dData);
            setSelectedDoctorId((prev) => (dData.some((d: Doctor) => d.id === prev) ? prev : dData[0].id));
          }
        }

        if (logsRes.ok) {
          const lData = await logsRes.json();
          if (isMounted && Array.isArray(lData) && lData.length > 0) {
            setAuditLogs(lData);
          }
        }
      } catch (err) {
        console.warn('Failed to load from Supabase backend:', err);
      }
    }
    loadFromDb();
    return () => { isMounted = false; };
  }, []);

  const savePatients = useCallback((newPatients: Patient[]) => {
    setPatients(newPatients);
  }, []);

  const saveDoctors = useCallback((newDoctors: Doctor[]) => {
    setDoctors(newDoctors);
  }, []);

  const logAudit = (
    actorName: string,
    actorRole: UserRole | 'SYSTEM_AI',
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    previousValue?: string,
    newValue?: string,
    rationale?: string
  ) => {
    const entry: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      actorId: actorName,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      rationale,
    };
    setAuditLogs((prev) => [entry, ...prev]);

    // Sync to Supabase audit_log
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  };

  // Register New Patient with automated AI Triage evaluation
  const registerPatient = (patientData: Partial<Patient>): Patient => {
    const id = `CF-PT-${Math.floor(1000 + Math.random() * 9000)}`;
    const vitals = patientData.vitals || {
      bloodPressure: '120/80',
      heartRate: 75,
      spO2: 98,
      temperature: 98.6,
      respiratoryRate: 16,
      gcs: 15,
    };

    // Local safety rules engine (always runs as a safety net)
    const triageEval = evaluateTriageRules(
      patientData.reportedSymptoms || [patientData.incidentDescription || 'General review'],
      vitals,
      patientData.age || 40,
      false,
      rules
    );

    // If Gemma AI result is provided via patientData.aiAssessment, use it as primary source
    // The local rules engine acts as a safety fallback (whichever is more critical wins)
    const gemmaAI = patientData.aiAssessment;
    const gemmaCategory = gemmaAI?.provisionalCategory;

    // Priority resolution: if AI says EMERGENCY but rules say ROUTINE, escalate to EMERGENCY (never downgrade safety)
    const categoryPriority: Record<string, number> = { EMERGENCY: 4, URGENT: 3, NEEDS_REVIEW: 2, ROUTINE: 1 };
    const aiPriority = gemmaCategory ? (categoryPriority[gemmaCategory] || 1) : 0;
    const rulePriority = categoryPriority[triageEval.category] || 1;

    // Use whichever is more urgent (AI or rules), with AI as preferred when equal
    const effectiveCategory = (aiPriority >= rulePriority && gemmaCategory)
      ? gemmaCategory
      : triageEval.category;

    let effectiveSla = 120;
    if (effectiveCategory === 'EMERGENCY') effectiveSla = 10;
    else if (effectiveCategory === 'URGENT') effectiveSla = 30;
    else if (effectiveCategory === 'NEEDS_REVIEW') effectiveSla = 60;

    const isEmergency = effectiveCategory === 'EMERGENCY';

    const now = new Date().toISOString();
    const aiSource = gemmaAI ? 'gemma-4-26b-a4b-it (Live Gemini API)' : 'CareFlow Safety Rules Engine v3.2';

    const finalAIAssessment = gemmaAI
      ? {
          ...gemmaAI,
          // Merge any extra critical flags the local rules found that AI may have missed
          warningFlags: [
            ...(gemmaAI.warningFlags || []),
            // Add rule-based flags that aren't already represented
            ...triageEval.flags.filter(
              (rf) => !(gemmaAI.warningFlags || []).some((af: any) => af.category === rf.category && af.severity === rf.severity)
            ),
          ],
          modelVersion: aiSource,
          assessedAt: now,
          humanReviewRequired: true,
        }
      : {
          structuredSummary: `Patient presented with: ${patientData.incidentDescription || 'Symptoms under evaluation'}. Evaluated by local clinical safety rules engine.`,
          warningFlags: triageEval.flags,
          provisionalCategory: effectiveCategory,
          explanation: triageEval.explanation,
          missingConflictingInfo: ['Confirmatory diagnostic imaging or lab draw requested.'],
          uncertaintyScore: 0.15,
          confidenceGrade: 'MODERATE' as const,
          suggestedFollowUpQuestions: [
            'Any relevant past medical or surgical history not yet recorded?',
            'Currently taking any blood thinners, insulin, or cardiac medication?',
          ],
          modelVersion: aiSource,
          assessedAt: now,
          humanReviewRequired: true,
        };

    const newPatient: Patient = {
      id,
      name: patientData.name || 'Anonymous Patient',
      avatar: patientData.avatar || '',
      age: patientData.age || 35,
      gender: patientData.gender || 'Male',
      dob: patientData.dob,
      contact: patientData.contact || '+91 98000 00000',
      emergencyContact: patientData.emergencyContact || {
        name: 'Family Contact',
        relationship: 'Relative',
        phone: '+91 98000 00001',
      },
      consentStatus: patientData.consentStatus || 'active',
      consentTimestamp: now,
      arrivalTime: now,
      waitingDurationMinutes: 0,
      originalLanguage: patientData.originalLanguage || 'en',
      vitals,
      pastMedicalHistory: patientData.pastMedicalHistory || [],
      allergies: patientData.allergies || ['None reported'],
      incidentDescription: patientData.incidentDescription || '',
      originalTranscriptSnippet: patientData.originalTranscriptSnippet,
      reportedSymptoms: patientData.reportedSymptoms || [],
      symptomOnset: patientData.symptomOnset || 'Just arrived',
      symptomDuration: patientData.symptomDuration || '< 1 hour',
      symptomProgression: patientData.symptomProgression || 'gradual',
      missingInformation: ['Baseline lab results pending stat draw'],
      provisionalCategory: effectiveCategory,
      status: 'TRIAGED',
      reviewDeadline: new Date(Date.now() + effectiveSla * 60000).toISOString(),
      slaMinutes: effectiveSla,
      escalated: isEmergency,
      escalationReason: isEmergency
        ? gemmaAI
          ? `Gemma AI (${aiSource}) detected critical emergency indicators requiring immediate clinical intervention.`
          : 'Critical warning flag automatically triggered Emergency Priority by safety rules engine.'
        : undefined,
      aiAssessment: finalAIAssessment,
      mediaEvidence: patientData.mediaEvidence || [],
      timeline: [
        {
          id: `TL-${Date.now()}-1`,
          timestamp: now,
          eventType: 'INTAKE_SUBMITTED',
          description: `Patient intake registered by ${currentRole}.`,
          actor: currentRole,
          actorRole: currentRole,
        },
        {
          id: `TL-${Date.now()}-2`,
          timestamp: now,
          eventType: 'AI_TRIAGE_GENERATED',
          description: gemmaAI
            ? `gemma-4-26b-a4b-it assigned provisional category: ${effectiveCategory} (SLA ${effectiveSla} min). ${triageEval.category !== effectiveCategory ? `Safety rules engine also evaluated: ${triageEval.category}.` : ''}`
            : `Safety rules engine assigned provisional category: ${effectiveCategory} (SLA ${effectiveSla} min).`,
          actor: gemmaAI ? 'gemma-4-26b-a4b-it via Gemini API' : 'CareFlow Safety Rules Engine',
          actorRole: 'SYSTEM_AI',
        },
      ],
    };

    const updatedList = [newPatient, ...patients];
    savePatients(updatedList);

    // Sync to Supabase
    fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPatient,
        incidentDescription: newPatient.incidentDescription || newPatient.reportedSymptoms?.join(', '),
      }),
    })
      .then((res) => res.json())
      .then((saved) => {
        if (saved && saved.id) {
          setPatients((curr) => curr.map((p) => (p.id === id ? saved : p)));
        }
      })
      .catch((e) => console.warn('Supabase register error:', e));

    logAudit(
      currentRole,
      currentRole,
      'REGISTER_PATIENT',
      'PATIENT',
      id,
      undefined,
      JSON.stringify({ name: newPatient.name, category: effectiveCategory, aiPowered: !!gemmaAI }),
      gemmaAI ? 'Patient registered with live Gemma AI triage assessment' : 'Patient registered with local safety rules triage'
    );
    return newPatient;
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    const updated = patients.map((p) => {
      if (p.id === id) return { ...p, ...updates };
      return p;
    });
    savePatients(updated);

    fetch(`/api/patients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((e) => console.warn('Supabase updatePatient error:', e));
  };

  // Human Review: Clinician confirms or overrides AI triage
  const confirmOrOverrideTriage = (
    patientId: string,
    category: UrgencyCategory,
    reason: string,
    clinicianName: string
  ) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    const previousCat = patient.clinicianConfirmedCategory || patient.provisionalCategory;
    const isOverride = previousCat !== category;
    const now = new Date().toISOString();

    let newSla = 60;
    if (category === 'EMERGENCY') newSla = 10;
    else if (category === 'URGENT') newSla = 30;
    else if (category === 'NEEDS_REVIEW') newSla = 60;
    else if (category === 'ROUTINE') newSla = 120;

    const timelineEvent = {
      id: `TL-${Date.now()}`,
      timestamp: now,
      eventType: (isOverride ? 'CLINICIAN_OVERRIDE' : 'CLINICIAN_CONFIRMED') as any,
      description: isOverride
        ? `Clinician OVERRODE category from ${previousCat} to ${category}. Reason: ${reason}`
        : `Clinician CONFIRMED triage category as ${category}.`,
      actor: clinicianName,
      actorRole: 'DOCTOR' as UserRole,
    };

    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          clinicianConfirmedCategory: category,
          overrideReason: reason,
          overrideClinician: clinicianName,
          overrideTimestamp: now,
          slaMinutes: newSla,
          escalated: category === 'EMERGENCY',
          timeline: [timelineEvent, ...p.timeline],
        };
      }
      return p;
    });

    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicianConfirmedCategory: category,
        overrideReason: reason,
        overrideClinician: clinicianName,
      }),
    }).catch((e) => console.warn('Supabase override error:', e));

    logAudit(
      clinicianName,
      'DOCTOR',
      isOverride ? 'OVERRIDE_TRIAGE_CATEGORY' : 'CONFIRM_TRIAGE_CATEGORY',
      'TRIAGE_ASSESSMENT',
      patientId,
      previousCat,
      category,
      reason
    );
  };

  // Assign or reassign doctor to patient
  const assignDoctorToPatient = (
    patientId: string,
    doctorId: string,
    actorName: string
  ) => {
    const patient = patients.find((p) => p.id === patientId);
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!patient || !doctor) return;

    const now = new Date().toISOString();
    const previousDoc = patient.assignedDoctorName || 'Unassigned';

    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          assignedDoctorId: doctor.id,
          assignedDoctorName: doctor.name,
          status: (p.status === 'WAITING_AI' || p.status === 'TRIAGED') ? ('ASSIGNED' as const) : p.status,
          timeline: [
            {
              id: `TL-${Date.now()}`,
              timestamp: now,
              eventType: 'DOCTOR_ASSIGNED' as const,
              description: `Patient assigned to ${doctor.name} (${doctor.specializations[0]}).`,
              actor: actorName,
              actorRole: currentRole,
            },
            ...p.timeline,
          ],
        };
      }
      return p;
    });

    // Update doctor caseload
    const updatedDoctors = doctors.map((d) => {
      if (d.id === doctorId && !d.activePatientIds.includes(patientId)) {
        return {
          ...d,
          currentCaseload: d.currentCaseload + 1,
          activePatientIds: [...d.activePatientIds, patientId],
        };
      }
      return d;
    });

    savePatients(updatedPatients);
    saveDoctors(updatedDoctors);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedDoctorId: doctorId }),
    }).catch((e) => console.warn('Supabase assign error:', e));


    logAudit(
      actorName,
      currentRole,
      'ASSIGN_DOCTOR',
      'DOCTOR_ASSIGNMENT',
      patientId,
      previousDoc,
      doctor.name,
      `Workload assigned: ${doctor.currentCaseload + 1}/${doctor.maxCapacity}`
    );
  };

  // Update clinical consultation notes and assessment
  const updateConsultation = (
    patientId: string,
    data: Partial<ConsultationRecord>,
    actorName: string
  ) => {
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        const currentCons = p.consultation || {
          id: `CONS-${p.id}`,
          doctorId: p.assignedDoctorId || 'DOC-101',
          doctorName: p.assignedDoctorName || 'Dr. Attending',
          startedAt: new Date().toISOString(),
          subjectiveNotes: '',
          objectiveFindings: '',
          clinicalAssessment: '',
          plan: '',
          prescriptions: [],
          finalizedByDoctor: false,
        };

        return {
          ...p,
          status: 'IN_CONSULTATION' as const,
          consultation: {
            ...currentCons,
            ...data,
          },
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultation: data }),
    }).catch((e) => console.warn('Supabase updateConsultation error:', e));
  };

  // Add prescription item
  const addPrescriptionItem = (
    patientId: string,
    item: Omit<Prescription, 'id'>,
    actorName: string
  ) => {
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        const cons = p.consultation || {
          id: `CONS-${p.id}`,
          doctorId: p.assignedDoctorId || 'DOC-101',
          doctorName: p.assignedDoctorName || 'Dr. Attending',
          startedAt: new Date().toISOString(),
          subjectiveNotes: '',
          objectiveFindings: '',
          clinicalAssessment: '',
          plan: '',
          prescriptions: [],
          finalizedByDoctor: false,
        };

        const newItem: Prescription = {
          ...item,
          id: `RX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        };

        return {
          ...p,
          consultation: {
            ...cons,
            prescriptions: [...cons.prescriptions, newItem],
          },
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultation: { prescriptions: [item] } }),
    }).catch((e) => console.warn('Supabase addPrescription error:', e));

    logAudit(
      actorName,
      'DOCTOR',
      'ADD_PRESCRIPTION',
      'PRESCRIPTION',
      patientId,
      undefined,
      `${item.drugName} ${item.dosage}`,
      'Clinician entered draft prescription'
    );
  };

  // Approve prescription item (clinician sign-off)
  const approvePrescriptionItem = (
    patientId: string,
    prescriptionId: string,
    actorName: string
  ) => {
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId && p.consultation) {
        return {
          ...p,
          consultation: {
            ...p.consultation,
            prescriptions: p.consultation.prescriptions.map((rx) => {
              if (rx.id === prescriptionId) {
                return { ...rx, approvedByClinician: true };
              }
              return rx;
            }),
          },
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultation: {
          prescriptions: [{ id: prescriptionId, approvedByClinician: true }],
        },
      }),
    }).catch((e) => console.warn('Supabase approveRx error:', e));

    logAudit(
      actorName,
      'DOCTOR',
      'APPROVE_PRESCRIPTION',
      'PRESCRIPTION',
      prescriptionId,
      'Pending Approval',
      'Approved',
      'Clinician explicitly verified dose, route, and absence of contraindications'
    );
  };

  // Finalize consultation and clinical report
  const finalizeClinicalDocumentation = (
    patientId: string,
    actorName: string
  ) => {
    const now = new Date().toISOString();
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId && p.consultation) {
        return {
          ...p,
          status: 'REVIEWED' as const,
          consultation: {
            ...p.consultation,
            finalizedByDoctor: true,
            finalizedAt: now,
          },
          timeline: [
            {
              id: `TL-${Date.now()}`,
              timestamp: now,
              eventType: 'REPORT_FINALIZED' as const,
              description: `Clinical consultation finalized and signed by ${actorName}.`,
              actor: actorName,
              actorRole: 'DOCTOR' as UserRole,
            },
            ...p.timeline,
          ],
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISCHARGED' }),
    }).catch((e) => console.warn('Supabase finalize error:', e));

    logAudit(
      actorName,
      'DOCTOR',
      'FINALIZE_CONSULTATION',
      'CONSULTATION',
      patientId,
      'Draft',
      'Clinician Finalized',
      'Doctor approved all clinical notes, assessments, and prescriptions'
    );
  };

  // Discharge patient from acute management to history
  const dischargePatient = (
    patientId: string,
    actorName: string,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          status: 'DISCHARGED' as const,
          dischargedAt: now,
          dischargeNotes: notes || 'Patient clinically stabilized and discharged.',
          timeline: [
            {
              id: `TL-${Date.now()}`,
              timestamp: now,
              eventType: 'DISCHARGED' as const,
              description: `Patient discharged by ${actorName}. ${notes ? `Notes: ${notes}` : ''}`,
              actor: actorName,
              actorRole: (currentRole === 'DOCTOR' ? 'DOCTOR' : 'NURSE') as UserRole,
            },
            ...p.timeline,
          ],
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISCHARGED' }),
    }).catch((e) => console.warn('Supabase discharge error:', e));

    logAudit(
      actorName,
      currentRole === 'DOCTOR' ? 'DOCTOR' : 'NURSE',
      'DISCHARGE_PATIENT',
      'PATIENT',
      patientId,
      'Active',
      'Discharged',
      notes || 'Patient formal discharge finalized'
    );
  };

  // Re-admit patient from historical records back to active workflow
  const readmitPatient = (
    patientId: string,
    actorName: string,
    reason?: string
  ) => {
    const now = new Date().toISOString();
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          status: 'TRIAGED' as const,
          arrivalTime: now,
          waitingDurationMinutes: 0,
          dischargedAt: undefined,
          timeline: [
            {
              id: `TL-${Date.now()}`,
              timestamp: now,
              eventType: 'READMITTED' as const,
              description: `Patient re-admitted to active clinical queue by ${actorName}. Reason: ${reason || 'Recurrent / worsening acute symptoms requiring clinical evaluation.'}`,
              actor: actorName,
              actorRole: (currentRole === 'DOCTOR' ? 'DOCTOR' : 'NURSE') as UserRole,
            },
            ...p.timeline,
          ],
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'TRIAGED' }),
    }).catch((e) => console.warn('Supabase readmit error:', e));

    logAudit(
      actorName,
      currentRole === 'DOCTOR' ? 'DOCTOR' : 'NURSE',
      'READMIT_PATIENT',
      'PATIENT',
      patientId,
      'Discharged',
      'Active (Triaged)',
      reason || 'Patient re-admitted to active clinical register without duplicate records'
    );
  };

  // Consent Management
  const updatePatientConsent = (
    patientId: string,
    status: 'active' | 'withdrawn',
    actorName: string
  ) => {
    const now = new Date().toISOString();
    const updatedPatients = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          consentStatus: status,
          consentTimestamp: now,
          timeline: [
            {
              id: `TL-${Date.now()}`,
              timestamp: now,
              eventType: 'CONSENT_UPDATED' as const,
              description: `Patient data processing consent status changed to ${status.toUpperCase()}.`,
              actor: actorName,
              actorRole: currentRole,
            },
            ...p.timeline,
          ],
        };
      }
      return p;
    });
    savePatients(updatedPatients);

    fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentStatus: status }),
    }).catch((e) => console.warn('Supabase consent error:', e));

    logAudit(
      actorName,
      currentRole,
      'UPDATE_CONSENT',
      'PATIENT',
      patientId,
      undefined,
      status,
      `Consent withdrawal/update requested by patient or guardian`
    );
  };

  // Toggle Doctor availability
  const toggleDoctorAvailability = (doctorId: string) => {
    let nextAvail = true;
    const updatedDoctors = doctors.map((d) => {
      if (d.id === doctorId) {
        nextAvail = d.availabilityStatus === 'OFF_DUTY';
        const nextStatus = nextAvail ? 'AVAILABLE' : 'OFF_DUTY';
        return { ...d, availabilityStatus: nextStatus as any };
      }
      return d;
    });
    saveDoctors(updatedDoctors);

    fetch(`/api/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: nextAvail }),
    }).catch((e) => console.warn('Supabase toggle doctor error:', e));
  };

  // Update Triage Rule
  const updateRule = (ruleId: string, updates: Partial<TriageRule>) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r));
    setRules(updated);
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(updated));
    } catch {}
    logAudit(
      currentRole,
      currentRole,
      'UPDATE_TRIAGE_RULE',
      'RULE_CONFIG',
      ruleId,
      undefined,
      JSON.stringify(updates),
      'Clinical triage policy adjustment'
    );
  };

  // Delete Patient Record (GDPR / right to be forgotten compliance)
  const deletePatientRecord = (patientId: string, reason: string) => {
    const remaining = patients.filter((p) => p.id !== patientId);
    savePatients(remaining);

    fetch(`/api/patients/${patientId}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('Supabase delete error:', e));

    logAudit(
      currentRole,
      currentRole,
      'DELETE_PATIENT_RECORD',
      'PATIENT',
      patientId,
      'Active Patient',
      'Deleted',
      `Data deletion workflow executed. Reason: ${reason}`
    );
  };

  // Count active emergency alerts
  const emergencyAlertCount = patients.filter((p) => {
    const cat = p.clinicianConfirmedCategory || p.provisionalCategory;
    return cat === 'EMERGENCY' && p.status !== 'DISCHARGED' && p.status !== 'REVIEWED';
  }).length;

  return (
    <CareFlowContext.Provider
      value={{
        patients,
        doctors,
        rules,
        auditLogs,
        currentRole,
        selectedDoctorId,
        selectedPatientId,
        currentLanguage,
        searchQuery,
        emergencyAlertCount,
        theme,
        sidebarCollapsed,
        setRole: setCurrentRole,
        setSelectedDoctorId,
        setSelectedPatientId,
        setLanguage: setCurrentLanguage,
        setSearchQuery,
        setTheme,
        toggleTheme,
        setSidebarCollapsed,
        toggleSidebar,
        registerPatient,
        updatePatient,
        confirmOrOverrideTriage,
        assignDoctorToPatient,
        updateConsultation,
        approvePrescriptionItem,
        addPrescriptionItem,
        finalizeClinicalDocumentation,
        dischargePatient,
        readmitPatient,
        updatePatientConsent,
        toggleDoctorAvailability,
        updateRule,
        deletePatientRecord,
      }}
    >
      {children}
    </CareFlowContext.Provider>
  );
}

export function useCareFlow() {
  const context = useContext(CareFlowContext);
  if (!context) {
    throw new Error('useCareFlow must be used within CareFlowProvider');
  }
  return context;
}
