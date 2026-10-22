import { UrgencyCategory, WarningFlag, Vitals, TriageRule, Patient } from '@/types';

export const DEFAULT_TRIAGE_RULES: TriageRule[] = [
  {
    id: 'RULE_CARDIAC_ACS',
    name: 'Acute Coronary Syndrome / Cardiac Arrest Warning',
    category: 'CARDIAC',
    conditionDescription: 'Crushing chest pain radiating to jaw/arm, diaphoresis, or SpO2 < 92% with cardiac history',
    targetCategory: 'EMERGENCY',
    isEmergencyAlert: true,
    enabled: true,
    slaMinutes: 10,
  },
  {
    id: 'RULE_SEVERE_RESPIRATORY',
    name: 'Severe Respiratory Distress / Hypoxia',
    category: 'RESPIRATORY',
    conditionDescription: 'SpO2 < 90% on room air, respiratory rate > 30 bpm, or audible stridor',
    targetCategory: 'EMERGENCY',
    isEmergencyAlert: true,
    enabled: true,
    slaMinutes: 10,
  },
  {
    id: 'RULE_NEURO_STROKE_GCS',
    name: 'Acute Stroke / Altered Consciousness',
    category: 'NEUROLOGICAL',
    conditionDescription: 'GCS < 13, unilateral motor deficit (FAST positive), sudden severe thunderclap headache',
    targetCategory: 'EMERGENCY',
    isEmergencyAlert: true,
    enabled: true,
    slaMinutes: 10,
  },
  {
    id: 'RULE_HEMORRHAGE_SHOCK',
    name: 'Active Uncontrolled Hemorrhage / Hemodynamic Shock',
    category: 'HEMORRHAGE',
    conditionDescription: 'Systolic BP < 90 mmHg with tachycardia > 110 bpm, or active pulsatile/arterial bleeding',
    targetCategory: 'EMERGENCY',
    isEmergencyAlert: true,
    enabled: true,
    slaMinutes: 10,
  },
  {
    id: 'RULE_PREGNANCY_ECLAMPSIA',
    name: 'Severe Preeclampsia / Obstetric Hemorrhage',
    category: 'PREGNANCY',
    conditionDescription: 'Pregnancy > 20 weeks with BP >= 160/110, severe epigastric pain, visual scotoma, or heavy bleeding',
    targetCategory: 'EMERGENCY',
    isEmergencyAlert: true,
    enabled: true,
    slaMinutes: 10,
  },
  {
    id: 'RULE_ACUTE_ABDOMEN',
    name: 'Acute Abdomen / Peritoneal Signs',
    category: 'TRAUMA',
    conditionDescription: 'Severe migratory abdominal pain, rebound tenderness, high fever, or rigid abdomen',
    targetCategory: 'URGENT',
    isEmergencyAlert: false,
    enabled: true,
    slaMinutes: 30,
  },
  {
    id: 'RULE_METABOLIC_DKA',
    name: 'Metabolic Crisis / Diabetic Ketoacidosis',
    category: 'METABOLIC',
    conditionDescription: 'Blood glucose > 350 mg/dL with Kussmaul breathing or urine ketones',
    targetCategory: 'URGENT',
    isEmergencyAlert: false,
    enabled: true,
    slaMinutes: 30,
  },
  {
    id: 'RULE_PEDIATRIC_HIGH_FEVER',
    name: 'Pediatric High Fever with Petechiae / Lethargy',
    category: 'PEDIATRIC',
    conditionDescription: 'Age < 10 with temp > 103.5°F, petechial purpuric rash, or poor oral intake',
    targetCategory: 'URGENT',
    isEmergencyAlert: false,
    enabled: true,
    slaMinutes: 30,
  },
  {
    id: 'RULE_UNCONTROLLED_HTN',
    name: 'Uncontrolled Hypertension without End-Organ Damage',
    category: 'CARDIAC',
    conditionDescription: 'BP > 160/95 mmHg with persistent headache, without chest pain or dyspnea',
    targetCategory: 'NEEDS_REVIEW',
    isEmergencyAlert: false,
    enabled: true,
    slaMinutes: 60,
  },
  {
    id: 'RULE_MILD_SYMPTOMS',
    name: 'Stable Subacute / Routine Presentation',
    category: 'METABOLIC',
    conditionDescription: 'Vitals stable, normal mentation, mild chronic or seasonal complaints',
    targetCategory: 'ROUTINE',
    isEmergencyAlert: false,
    enabled: true,
    slaMinutes: 120,
  },
];

/**
 * Evaluates patient symptoms and vitals against clinical rule set.
 * Returns evaluated category, warning flags, and SLA.
 */
export function evaluateTriageRules(
  symptoms: string[],
  vitals: Vitals,
  patientAge: number,
  isPregnant: boolean = false,
  rules: TriageRule[] = DEFAULT_TRIAGE_RULES
): {
  category: UrgencyCategory;
  flags: WarningFlag[];
  slaMinutes: number;
  isEmergency: boolean;
  explanation: string;
} {
  const flags: WarningFlag[] = [];
  const text = symptoms.join(' ').toLowerCase();

  // Check vitals for cardiac / respiratory emergency
  const spo2Num = typeof vitals.spO2 === 'number' ? vitals.spO2 : parseFloat(String(vitals.spO2));
  const tempNum = typeof vitals.temperature === 'number' ? vitals.temperature : parseFloat(String(vitals.temperature));
  const hrNum = typeof vitals.heartRate === 'number' ? vitals.heartRate : parseFloat(String(vitals.heartRate));
  const rrNum = typeof vitals.respiratoryRate === 'number' ? vitals.respiratoryRate : parseFloat(String(vitals.respiratoryRate));
  let parsedSys: number | undefined;
  let parsedDia: number | undefined;
  if (vitals.bloodPressure && vitals.bloodPressure !== 'N/A' && vitals.bloodPressure.includes('/')) {
    const [s, d] = vitals.bloodPressure.split('/').map((val) => parseInt(val.trim(), 10));
    if (!isNaN(s)) parsedSys = s;
    if (!isNaN(d)) parsedDia = d;
  }

  if (!isNaN(spo2Num)) {
    if (spo2Num < 90) {
      flags.push({
        id: 'FLAG_HYPOXIA_CRITICAL',
        flag: 'Critical Low Oxygen Signal (SpO2 < 90%)',
        severity: 'CRITICAL',
        category: 'RESPIRATORY',
        evidence: `SpO2 measured at ${spo2Num}%, below safety threshold of 90%`,
        sourceRef: 'Pulse Oximeter Vitals',
      });
    } else if (spo2Num <= 93) {
      flags.push({
        id: 'FLAG_HYPOXIA_MODERATE',
        flag: 'Moderate Low Oxygen Signal (SpO2 91-93%)',
        severity: 'WARNING',
        category: 'RESPIRATORY',
        evidence: `SpO2 measured at ${spo2Num}% on room air`,
        sourceRef: 'Pulse Oximeter Vitals',
      });
    }
  }

  // Cardiac check
  const cardiacKeywords = ['chest pain', 'crushing', 'left arm pain', 'jaw pain', 'diaphoresis', 'सीने में दर्द', 'छाती में भारीपन'];
  const hasCardiacSymptoms = cardiacKeywords.some((kw) => text.includes(kw.toLowerCase()));
  if (hasCardiacSymptoms) {
    flags.push({
      id: 'FLAG_ACS_SUSPECT',
      flag: 'Potential Cardiac Urgency Signal',
      severity: 'CRITICAL',
      category: 'CARDIAC',
      evidence: 'Patient reported acute retrosternal chest pain radiating to arm/jaw or associated diaphoresis',
      sourceRef: 'Reported Symptoms & Audio Intake',
    });
  }

  // Blood pressure emergency check
  if (parsedSys !== undefined && parsedDia !== undefined) {
    if (parsedSys >= 180 || parsedDia >= 120) {
      flags.push({
        id: 'FLAG_HYPERTENSIVE_CRISIS',
        flag: 'Severely Elevated Blood Pressure Signal (BP >= 180/120 mmHg)',
        severity: 'CRITICAL',
        category: 'CARDIAC',
        evidence: `BP recorded as ${vitals.bloodPressure}`,
        sourceRef: 'Sphygmomanometer Vitals',
      });
    } else if (isPregnant && (parsedSys >= 160 || parsedDia >= 110)) {
      flags.push({
        id: 'FLAG_PREECLAMPSIA_CRITICAL',
        flag: 'Obstetric High Blood Pressure Signal',
        severity: 'CRITICAL',
        category: 'PREGNANCY',
        evidence: `Third trimester pregnancy with BP ${vitals.bloodPressure} and associated hyperreflexia/visual symptoms`,
        sourceRef: 'Vitals & Intake Form',
      });
    }
  }

  // Neurological check
  const gcsNum = typeof vitals.gcs === 'number' ? vitals.gcs : parseFloat(String(vitals.gcs));
  if (!isNaN(gcsNum) && gcsNum < 13) {
    flags.push({
      id: 'FLAG_DEPRESSED_MENTATION',
      flag: 'Depressed Responsiveness Signal (GCS < 13)',
      severity: 'CRITICAL',
      category: 'NEUROLOGICAL',
      evidence: `Glasgow Coma Scale assessed at ${gcsNum}/15`,
      sourceRef: 'Neurological Assessment',
    });
  }

  // Bleeding check
  const bleedingKeywords = ['heavy bleeding', 'uncontrolled bleeding', 'खून बह रहा', 'hemorrhage', 'vomiting blood'];
  if (bleedingKeywords.some((kw) => text.includes(kw))) {
    flags.push({
      id: 'FLAG_ACTIVE_BLEED',
      flag: 'Acute Hemorrhage / Bleeding Signal',
      severity: 'CRITICAL',
      category: 'HEMORRHAGE',
      evidence: 'Patient reported ongoing acute blood loss',
      sourceRef: 'Patient Incident Statement',
    });
  }

  // Pediatric check
  if (patientAge < 10 && !isNaN(tempNum) && tempNum >= 103.5) {
    flags.push({
      id: 'FLAG_PEDIATRIC_HYPERPYREXIA',
      flag: 'Pediatric Elevated Temperature Signal (Temp >= 103.5°F)',
      severity: 'WARNING',
      category: 'PEDIATRIC',
      evidence: `Core temperature recorded at ${vitals.temperature}°F in a ${patientAge}-year-old child`,
      sourceRef: 'Temperature Probe',
    });
  }

  // Determine Category based on flags and rules
  const hasCritical = flags.some((f) => f.severity === 'CRITICAL');
  const hasWarning = flags.some((f) => f.severity === 'WARNING');

  let category: UrgencyCategory = 'ROUTINE';
  let slaMinutes = 120;
  let explanation = 'Stable vital signs and mild non-progressive symptoms. Standard outpatient queue.';

  if (hasCritical) {
    category = 'EMERGENCY';
    slaMinutes = 10;
    explanation = 'CRITICAL WARNING SIGNS IDENTIFIED: Case triggered immediate safety protocol. Bypasses regular queuing.';
  } else if (hasWarning) {
    category = 'URGENT';
    slaMinutes = 30;
    explanation = 'Potential acute decompensation risk or severe pain. Priority clinical review required within 30 minutes.';
  } else if (
    (parsedSys !== undefined && parsedSys > 150) || 
    (!isNaN(tempNum) && tempNum > 100.4) || 
    (!isNaN(hrNum) && hrNum > 100) || 
    (!isNaN(rrNum) && rrNum > 22)
  ) {
    category = 'NEEDS_REVIEW';
    slaMinutes = 60;
    explanation = 'Abnormal baseline parameters or persistent subacute symptoms. Requires medical evaluation.';
  }

  return {
    category,
    flags,
    slaMinutes,
    isEmergency: category === 'EMERGENCY',
    explanation,
  };
}

/**
 * Calculates priority score for sorting the queue.
 * Higher score = higher priority in queue.
 * Emergency cases receive priority >= 10,000, guaranteed top position.
 * Waiting time dynamically boosts score to prevent starvation.
 */
export function calculateQueuePriority(patient: Patient): number {
  const effectiveCategory = patient.clinicianConfirmedCategory || patient.provisionalCategory;
  
  // Base score per category
  let baseScore = 0;
  switch (effectiveCategory) {
    case 'EMERGENCY':
      baseScore = 100000;
      break;
    case 'URGENT':
      baseScore = 50000;
      break;
    case 'NEEDS_REVIEW':
      baseScore = 20000;
      break;
    case 'ROUTINE':
      baseScore = 5000;
      break;
  }

  // Waiting time escalation factor
  // Every minute of waiting adds to score. If waiting exceeds SLA, add an escalation booster.
  const waitingMinutes = patient.waitingDurationMinutes;
  const sla = patient.slaMinutes || 60;
  let waitingScore = waitingMinutes * 15;

  if (waitingMinutes > sla) {
    const overdueMinutes = waitingMinutes - sla;
    waitingScore += overdueMinutes * 100; // Rapidly escalate overdue cases
  }

  // Critical warning signs bonus
  const criticalFlagsCount = patient.aiAssessment?.warningFlags?.filter(f => f.severity === 'CRITICAL').length || 0;
  const flagBonus = criticalFlagsCount * 2000;

  return baseScore + waitingScore + flagBonus;
}

/**
 * Checks if a patient is overdue relative to their SLA
 */
export function isOverdue(patient: Patient): boolean {
  const sla = patient.slaMinutes || 60;
  return patient.waitingDurationMinutes > sla;
}

/**
 * Formats urgency badge colors and labels
 */
export function getUrgencyStyles(category: UrgencyCategory): {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
  iconBg: string;
} {
  switch (category) {
    case 'EMERGENCY':
      return {
        label: 'POSSIBLE EMERGENCY: clinician review needed',
        badgeBg: 'bg-red-50 text-red-700 border-red-200',
        badgeText: 'text-red-700 font-bold',
        borderColor: 'border-red-500',
        dotColor: 'bg-red-600 animate-pulse',
        iconBg: 'bg-red-100 text-red-700',
      };
    case 'URGENT':
      return {
        label: 'Urgent (Prompt Review)',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeText: 'text-amber-800',
        borderColor: 'border-amber-400',
        dotColor: 'bg-amber-500',
        iconBg: 'bg-amber-100 text-amber-800',
      };
    case 'NEEDS_REVIEW':
      return {
        label: 'Needs Review (Standard)',
        badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
        badgeText: 'text-blue-800',
        borderColor: 'border-blue-400',
        dotColor: 'bg-blue-500',
        iconBg: 'bg-blue-100 text-blue-700',
      };
    case 'ROUTINE':
    default:
      return {
        label: 'Routine (Non-Urgent)',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeText: 'text-emerald-800',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-500',
        iconBg: 'bg-emerald-100 text-emerald-700',
      };
  }
}
