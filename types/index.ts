export type UserRole = 'NURSE' | 'DOCTOR' | 'ADMIN' | 'PATIENT';

export type AppTheme = 'day' | 'night';

export type UrgencyCategory = 'EMERGENCY' | 'URGENT' | 'NEEDS_REVIEW' | 'ROUTINE';

export type PatientStatus = 
  | 'WAITING_AI' 
  | 'TRIAGE_PENDING' 
  | 'TRIAGED' 
  | 'ASSIGNED' 
  | 'IN_CONSULTATION' 
  | 'REVIEWED' 
  | 'DISCHARGED';

export type WarningFlagCategory = 
  | 'CARDIAC' 
  | 'RESPIRATORY' 
  | 'NEUROLOGICAL' 
  | 'HEMORRHAGE' 
  | 'TRAUMA' 
  | 'PREGNANCY' 
  | 'PEDIATRIC' 
  | 'METABOLIC';

export type WarningFlagSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Vitals {
  bloodPressure: string; // e.g., "168/104" or "N/A"
  heartRate: number | string; // bpm or "N/A"
  spO2: number | string; // percentage or "N/A"
  temperature: number | string; // deg F or "N/A"
  respiratoryRate: number | string; // breaths/min or "N/A"
  gcs?: number | string; // Glasgow Coma Scale 3-15 or "N/A"
}

export interface WarningFlag {
  id: string;
  flag: string;
  severity: WarningFlagSeverity;
  category: WarningFlagCategory;
  evidence: string;
  sourceRef: string; // e.g., "audio_rec_01 @ 00:14" or "ecg_lead_ii.png"
}

export interface AIAssessment {
  structuredSummary: string;
  warningFlags: WarningFlag[];
  provisionalCategory: UrgencyCategory;
  explanation: string;
  missingConflictingInfo: string[];
  uncertaintyScore: number; // 0.0 to 1.0 (lower is more certain)
  confidenceGrade: 'HIGH' | 'MODERATE' | 'LOW';
  suggestedFollowUpQuestions: string[];
  modelVersion: string;
  assessedAt: string;
  humanReviewRequired: boolean;
}

export interface TranscriptSegment {
  timestamp: string; // e.g., "00:08"
  seconds: number;
  speaker: string;
  text: string;
  confidence: number;
  highlightUrgent?: boolean;
}

export interface MediaEvidence {
  id: string;
  type: 'audio' | 'video' | 'image' | 'report_pdf';
  title: string;
  url: string;
  durationOrPages?: string;
  extractedText?: string;
  transcript?: TranscriptSegment[];
  keyframeAnalysis?: {
    timestamp: string;
    observation: string;
    urgencySign: boolean;
  }[];
  ocrConfidence?: number;
  uploadedAt: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: 
    | 'REGISTRATION' 
    | 'INTAKE_SUBMITTED' 
    | 'MEDIA_UPLOADED' 
    | 'AI_TRIAGE_GENERATED' 
    | 'CLINICIAN_CONFIRMED' 
    | 'CLINICIAN_OVERRIDE'
    | 'DOCTOR_ASSIGNED' 
    | 'CONSULTATION_STARTED' 
    | 'PRESCRIPTION_ISSUED' 
    | 'REFERRAL_CREATED' 
    | 'REPORT_FINALIZED' 
    | 'DISCHARGED'
    | 'CONSENT_UPDATED';
  description: string;
  actor: string;
  actorRole: UserRole | 'SYSTEM_AI';
  meta?: Record<string, any>;
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  allergyWarning?: string;
  approvedByClinician: boolean;
}

export interface Referral {
  id: string;
  specialty: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  facility: string;
  notes: string;
  requestedAt: string;
}

export interface ConsultationRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  startedAt: string;
  completedAt?: string;
  subjectiveNotes: string;
  objectiveFindings: string;
  clinicalAssessment: string;
  plan: string;
  prescriptions: Prescription[];
  referral?: Referral;
  followUpInstructions?: string;
  followUpDate?: string;
  finalizedByDoctor: boolean;
  finalizedAt?: string;
  audioRecordingUrl?: string;
}

export interface Patient {
  id: string; // e.g., "CF-PT-8091"
  name: string;
  avatar: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob?: string;
  contact: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  consentStatus: 'active' | 'withdrawn' | 'pending';
  consentTimestamp: string;
  arrivalTime: string;
  waitingDurationMinutes: number;
  originalLanguage: string;
  vitals: Vitals;
  pastMedicalHistory: string[];
  allergies: string[];
  incidentDescription: string;
  originalTranscriptSnippet?: string;
  reportedSymptoms: string[];
  symptomOnset: string;
  symptomDuration: string;
  symptomProgression: 'rapidly_worsening' | 'gradual' | 'fluctuating' | 'improving';
  missingInformation: string[];
  provisionalCategory: UrgencyCategory;
  clinicianConfirmedCategory?: UrgencyCategory;
  overrideReason?: string;
  overrideClinician?: string;
  overrideTimestamp?: string;
  status: PatientStatus;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  reviewDeadline: string;
  slaMinutes: number;
  escalated: boolean;
  escalationReason?: string;
  aiAssessment: AIAssessment;
  mediaEvidence: MediaEvidence[];
  timeline: TimelineEvent[];
  consultation?: ConsultationRecord;
}

export interface Doctor {
  id: string; // e.g., "DOC-102"
  name: string;
  avatar: string;
  qualifications: string; // e.g., "MD, DM Cardiology"
  registrationNumber: string; // e.g., "MCI-2012-48210"
  verifiedRegistration: boolean;
  specializations: string[];
  yearsOfExperience: number;
  languages: string[];
  availabilityStatus: 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_CALL' | 'OFF_DUTY';
  currentCaseload: number;
  maxCapacity: number;
  department: string;
  facility: string;
  completedConsultationsCount: number;
  pendingReviewsCount: number;
  activePatientIds: string[];
}

export interface TriageRule {
  id: string;
  name: string;
  category: WarningFlagCategory;
  conditionDescription: string;
  targetCategory: UrgencyCategory;
  isEmergencyAlert: boolean;
  enabled: boolean;
  slaMinutes: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'SYSTEM_AI';
  action: string;
  entityType: 'PATIENT' | 'TRIAGE_ASSESSMENT' | 'DOCTOR_ASSIGNMENT' | 'CONSULTATION' | 'PRESCRIPTION' | 'RULE_CONFIG';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  rationale?: string;
}

export interface MatchingScoreBreakdown {
  doctorId: string;
  doctorName: string;
  specialtyMatchScore: number; // 0-100
  workloadBalanceScore: number; // 0-100
  languageMatchScore: number; // 0-100
  continuityScore: number; // 0-100
  totalScore: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}
