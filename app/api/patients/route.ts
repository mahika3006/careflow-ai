import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Patient, UrgencyCategory, PatientStatus } from '@/types';

function mapCaseToPatient(caseItem: any): Patient {
  const p = caseItem.patients || {};
  const v = (caseItem.vitals && caseItem.vitals[0]) || {};
  const ai = (caseItem.ai_triage && caseItem.ai_triage[0]) || {};
  const assignment = (caseItem.assignments && caseItem.assignments[0]) || {};
  const doctor = assignment.doctors || {};
  const consents = (p.consents && p.consents[0]) || {};

  // Map triage level
  const triageLevelRaw = (ai.summary?.triage_level || '').toLowerCase();
  let provisionalCategory: UrgencyCategory = 'ROUTINE';
  if (triageLevelRaw === 'emergency' || (caseItem.priority_score && caseItem.priority_score >= 80)) {
    provisionalCategory = 'EMERGENCY';
  } else if (triageLevelRaw === 'urgent' || (caseItem.priority_score && caseItem.priority_score >= 50)) {
    provisionalCategory = 'URGENT';
  } else if (triageLevelRaw === 'needs_review' || (caseItem.priority_score && caseItem.priority_score >= 30)) {
    provisionalCategory = 'NEEDS_REVIEW';
  }

  // Map status
  let status: PatientStatus = 'WAITING_AI';
  const rawStatus = (caseItem.status || '').toLowerCase();
  if (rawStatus === 'closed') {
    status = 'DISCHARGED';
  } else if (rawStatus === 'assigned' || assignment.doctor_id) {
    status = 'ASSIGNED';
  } else if (rawStatus === 'under_review') {
    status = 'TRIAGED';
  } else if (caseItem.ai_triage?.length > 0) {
    status = 'TRIAGE_PENDING';
  }

  // SLA
  const slaMinutes = 
    provisionalCategory === 'EMERGENCY' ? 10 :
    provisionalCategory === 'URGENT' ? 30 :
    provisionalCategory === 'NEEDS_REVIEW' ? 60 : 120;

  // Calculate waiting time
  const createdAt = new Date(caseItem.created_at || Date.now());
  const now = new Date();
  const waitingDurationMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)));

  // Warning flags
  const flags = Array.isArray(ai.flags) ? ai.flags : [];
  const warningFlags = flags.map((f: string, idx: number) => ({
    id: `flag-${caseItem.id}-${idx}`,
    flag: f.replace(/_/g, ' ').toUpperCase(),
    severity: (provisionalCategory === 'EMERGENCY' ? 'CRITICAL' : 'WARNING') as any,
    category: 'CARDIAC' as any,
    evidence: ai.summary?.case_summary || caseItem.symptoms_text || 'Reported symptom',
    sourceRef: 'Initial Intake Statement'
  }));

  // Prescriptions & Consultation
  const prescriptions = (caseItem.prescriptions || []).map((rx: any) => ({
    id: rx.id,
    drugName: rx.prescription_text || 'Clinical Prescription',
    dosage: 'As prescribed',
    frequency: 'Daily',
    duration: '5 days',
    route: 'Oral',
    instructions: rx.advice_text || '',
    allergyWarning: p.allergies ? `Known allergy: ${p.allergies}` : undefined,
    approvedByClinician: !!rx.approved_at,
  }));

  const consultation = (assignment.doctor_id || prescriptions.length > 0) ? {
    id: `cons-${caseItem.id}`,
    doctorId: assignment.doctor_id || '',
    doctorName: doctor.full_name || 'Assigned Clinician',
    startedAt: assignment.assigned_at || caseItem.created_at,
    completedAt: rawStatus === 'closed' ? caseItem.updated_at : undefined,
    subjectiveNotes: caseItem.symptoms_text || '',
    objectiveFindings: `Vitals: BP ${v.bp_sys || 120}/${v.bp_dia || 80}, HR ${v.heart_rate || 72}, SpO2 ${v.spo2 || 98}%`,
    clinicalAssessment: ai.summary?.routing_hint || 'Clinical evaluation in progress.',
    plan: prescriptions.length > 0 ? 'Administer prescribed therapy and follow up.' : 'Observation and supportive care.',
    prescriptions,
    finalizedByDoctor: rawStatus === 'closed',
    finalizedAt: rawStatus === 'closed' ? caseItem.updated_at : undefined,
  } : undefined;

  // Documents / Media Evidence
  const mediaEvidence = (caseItem.documents || []).map((doc: any) => ({
    id: doc.id,
    type: doc.doc_type === 'report' ? 'report_pdf' : 'image',
    title: doc.doc_type ? `${doc.doc_type.toUpperCase()} Attachment` : 'Clinical Report',
    url: doc.file_path || '',
    extractedText: doc.ocr_text || (doc.extracted ? JSON.stringify(doc.extracted) : ''),
    ocrConfidence: doc.confidence || 0.95,
    uploadedAt: doc.uploaded_at || caseItem.created_at,
  }));

  return {
    id: caseItem.id, // Primary UI key is the case ID
    name: p.full_name || 'Anonymous Patient',
    avatar: p.photo_path || 'demo/patients/patient_001.jpg',
    age: p.age ?? 35,
    gender: (p.gender === 'Female' ? 'Female' : (p.gender === 'Male' ? 'Male' : 'Other')),
    contact: p.contact || 'N/A',
    emergencyContact: {
      name: 'Next of Kin',
      relationship: 'Relative',
      phone: p.contact || 'N/A',
    },
    consentStatus: consents.withdrawn_at ? 'withdrawn' : (consents.granted_at ? 'active' : 'pending'),
    consentTimestamp: consents.granted_at || caseItem.created_at,
    arrivalTime: caseItem.created_at,
    waitingDurationMinutes,
    originalLanguage: caseItem.input_language || 'English',
    vitals: {
      bloodPressure: (v.bp_sys && v.bp_dia) ? `${v.bp_sys}/${v.bp_dia}` : '120/80',
      heartRate: v.heart_rate ?? 75,
      spO2: v.spo2 ?? 98,
      temperature: v.temp_f ?? 98.6,
      respiratoryRate: v.resp_rate ?? 16,
      gcs: v.gcs ?? 15,
    },
    pastMedicalHistory: [],
    allergies: p.allergies ? [p.allergies] : [],
    incidentDescription: caseItem.symptoms_text || '',
    reportedSymptoms: Array.isArray(caseItem.priority_reasons) && caseItem.priority_reasons.length > 0 
      ? caseItem.priority_reasons 
      : [caseItem.symptoms_text?.slice(0, 50) || 'Primary symptom'],
    symptomOnset: 'Recently noted',
    symptomDuration: 'Acute',
    symptomProgression: 'gradual',
    missingInformation: [],
    provisionalCategory,
    status,
    assignedDoctorId: assignment.doctor_id,
    assignedDoctorName: doctor.full_name,
    reviewDeadline: new Date(createdAt.getTime() + slaMinutes * 60000).toISOString(),
    slaMinutes,
    escalated: waitingDurationMinutes > slaMinutes && status !== 'DISCHARGED',
    escalationReason: waitingDurationMinutes > slaMinutes ? `Wait time exceeded ${slaMinutes}m SLA` : undefined,
    aiAssessment: {
      structuredSummary: ai.summary?.case_summary || caseItem.symptoms_text || 'Intake assessment recorded.',
      warningFlags,
      provisionalCategory,
      explanation: ai.summary?.routing_hint || 'AI rule-based triage assessment based on reported symptoms and vitals.',
      missingConflictingInfo: [],
      uncertaintyScore: 0.1,
      confidenceGrade: 'HIGH',
      suggestedFollowUpQuestions: Array.isArray(ai.followup_questions) ? ai.followup_questions : [],
      modelVersion: ai.model_version || 'careflow-synthetic-rule-v1',
      assessedAt: ai.created_at || caseItem.created_at,
      humanReviewRequired: true,
    },
    mediaEvidence,
    timeline: [
      {
        id: `tl-${caseItem.id}-1`,
        timestamp: caseItem.created_at,
        eventType: 'INTAKE_SUBMITTED',
        description: 'Patient presented and intake symptoms registered.',
        actor: 'Triage Nurse',
        actorRole: 'NURSE',
      },
      ...(ai.created_at ? [{
        id: `tl-${caseItem.id}-2`,
        timestamp: ai.created_at,
        eventType: 'AI_TRIAGE_GENERATED' as const,
        description: `AI triage completed: ${provisionalCategory} recommendation.`,
        actor: 'CareFlow AI',
        actorRole: 'SYSTEM_AI' as const,
      }] : []),
      ...(assignment.assigned_at ? [{
        id: `tl-${caseItem.id}-3`,
        timestamp: assignment.assigned_at,
        eventType: 'DOCTOR_ASSIGNED' as const,
        description: `Assigned to ${doctor.full_name || 'Physician'}.`,
        actor: 'Attending Staff',
        actorRole: 'NURSE' as const,
      }] : []),
    ],
    consultation,
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: casesData, error } = await supabase
      .from('cases')
      .select(`
        *,
        patients (*, consents (*)),
        vitals (*),
        ai_triage (*),
        assignments (*, doctors (*)),
        documents (*),
        prescriptions (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cases/patients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const patients: Patient[] = (casesData || []).map(mapCaseToPatient);
    return NextResponse.json(patients);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/patients:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    // 1. Insert patient
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .insert({
        full_name: body.name || 'Anonymous Patient',
        age: body.age || 35,
        gender: body.gender || 'Other',
        contact: body.contact || 'N/A',
        allergies: Array.isArray(body.allergies) ? body.allergies.join(', ') : (body.allergies || ''),
        photo_path: body.avatar || 'demo/patients/patient_001.jpg',
      })
      .select()
      .single();

    if (patientError) {
      console.error('Error creating patient:', patientError);
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    // 2. Insert case (patient problem text lives in cases.symptoms_text)
    const priorityScore = 
      body.provisionalCategory === 'EMERGENCY' ? 90 :
      body.provisionalCategory === 'URGENT' ? 60 :
      body.provisionalCategory === 'NEEDS_REVIEW' ? 40 : 20;

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        patient_id: patientData.id,
        symptoms_text: body.incidentDescription || body.reportedSymptoms?.join(', ') || 'Patient intake',
        input_language: body.originalLanguage || 'English',
        status: body.status === 'ASSIGNED' ? 'assigned' : 'waiting',
        priority_score: priorityScore,
        priority_reasons: body.reportedSymptoms || [],
      })
      .select()
      .single();

    if (caseError) {
      console.error('Error creating case:', caseError);
      return NextResponse.json({ error: caseError.message }, { status: 500 });
    }

    // 3. Insert vitals if provided
    if (body.vitals) {
      const bpParts = (body.vitals.bloodPressure || '120/80').split('/');
      await supabase.from('vitals').insert({
        case_id: caseData.id,
        bp_sys: parseInt(bpParts[0], 10) || 120,
        bp_dia: parseInt(bpParts[1], 10) || 80,
        heart_rate: parseInt(String(body.vitals.heartRate), 10) || 72,
        spo2: parseInt(String(body.vitals.spO2), 10) || 98,
        temp_f: parseFloat(String(body.vitals.temperature)) || 98.6,
        resp_rate: parseInt(String(body.vitals.respiratoryRate), 10) || 16,
        gcs: parseInt(String(body.vitals.gcs), 10) || 15,
      });
    }

    // 4. Insert AI triage
    await supabase.from('ai_triage').insert({
      case_id: caseData.id,
      summary: {
        case_summary: body.incidentDescription || 'Patient symptoms recorded.',
        routing_hint: body.aiAssessment?.explanation || 'Triage review pending.',
        triage_level: (body.provisionalCategory || 'ROUTINE').toLowerCase(),
      },
      flags: (body.aiAssessment?.warningFlags || []).map((f: any) => f.flag || f),
      followup_questions: body.aiAssessment?.suggestedFollowUpQuestions || [],
      model_version: 'careflow-ai-v1',
    });

    // 5. Insert consent
    await supabase.from('consents').insert({
      patient_id: patientData.id,
      purpose: 'triage_and_care',
      granted_at: new Date().toISOString(),
    });

    // 6. Insert assignment if doctor is specified
    if (body.assignedDoctorId) {
      await supabase.from('assignments').insert({
        case_id: caseData.id,
        doctor_id: body.assignedDoctorId,
      });
    }

    // Return the complete joined record
    const { data: completeCase } = await supabase
      .from('cases')
      .select(`
        *,
        patients (*, consents (*)),
        vitals (*),
        ai_triage (*),
        assignments (*, doctors (*)),
        documents (*),
        prescriptions (*)
      `)
      .eq('id', caseData.id)
      .single();

    return NextResponse.json(mapCaseToPatient(completeCase));
  } catch (err: any) {
    console.error('Unexpected error in POST /api/patients:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
