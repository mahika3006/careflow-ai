import { Doctor, Patient, MatchingScoreBreakdown } from '@/types';

/**
 * Maps triage categories and symptoms to clinical specialties
 */
export function inferRequiredSpecialties(patient: Patient): string[] {
  const text = (patient.incidentDescription + ' ' + patient.reportedSymptoms.join(' ')).toLowerCase();
  const warningFlags = patient.aiAssessment?.warningFlags || [];
  const categories = warningFlags.map(f => f.category);

  const specialties: string[] = [];

  if (categories.includes('CARDIAC') || text.includes('chest pain') || text.includes('heart') || text.includes('छाती')) {
    specialties.push('Cardiology', 'Emergency Medicine');
  }
  if (categories.includes('RESPIRATORY') || text.includes('breath') || text.includes('cough') || text.includes('asthma') || text.includes('सांस')) {
    specialties.push('Pulmonology', 'Emergency Medicine');
  }
  if (categories.includes('PREGNANCY') || text.includes('pregnant') || text.includes('eclampsia') || text.includes('गर्भावस्था')) {
    specialties.push('Obstetrics & Gynecology');
  }
  if (categories.includes('PEDIATRIC') || patient.age <= 12) {
    specialties.push('Pediatrics');
  }
  if (categories.includes('TRAUMA') || text.includes('appendix') || text.includes('abdominal pain') || text.includes('surgery') || text.includes('pet')) {
    specialties.push('General Surgery', 'Emergency Medicine');
  }
  if (categories.includes('NEUROLOGICAL') || text.includes('stroke') || text.includes('headache') || text.includes('weakness')) {
    specialties.push('Neurology', 'Emergency Medicine');
  }

  // Fallbacks
  if (specialties.length === 0) {
    specialties.push('Internal Medicine', 'Emergency Medicine');
  }

  return Array.from(new Set(specialties));
}

/**
 * Stage 1: Eligibility Check
 */
export function checkDoctorEligibility(doctor: Doctor, patient: Patient): { isEligible: boolean; reason?: string } {
  // 1. Must have verified registration
  if (!doctor.verifiedRegistration) {
    return { isEligible: false, reason: 'Doctor registration not verified' };
  }

  // 2. Availability status
  if (doctor.availabilityStatus === 'OFF_DUTY') {
    return { isEligible: false, reason: 'Doctor is currently off duty' };
  }

  // 3. Workload capacity
  if (doctor.currentCaseload >= doctor.maxCapacity) {
    return { isEligible: false, reason: `Workload at maximum capacity (${doctor.currentCaseload}/${doctor.maxCapacity})` };
  }

  return { isEligible: true };
}

/**
 * Stage 2: Match Scoring
 */
export function calculateDoctorMatchScore(doctor: Doctor, patient: Patient): MatchingScoreBreakdown {
  const eligibility = checkDoctorEligibility(doctor, patient);
  if (!eligibility.isEligible) {
    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialtyMatchScore: 0,
      workloadBalanceScore: 0,
      languageMatchScore: 0,
      continuityScore: 0,
      totalScore: 0,
      isEligible: false,
      ineligibilityReason: eligibility.reason,
    };
  }

  const requiredSpecialties = inferRequiredSpecialties(patient);
  
  // 1. Specialty Match Score (0 - 100)
  let specialtyScore = 30; // base score
  const hasExactSpecialty = doctor.specializations.some((spec) =>
    requiredSpecialties.some((req) => req.toLowerCase() === spec.toLowerCase())
  );
  const isEmergencySpecialist = doctor.specializations.some(s => s.toLowerCase().includes('emergency'));
  const isInternalMed = doctor.specializations.some(s => s.toLowerCase().includes('internal medicine'));

  if (hasExactSpecialty) {
    specialtyScore = 100;
  } else if (isEmergencySpecialist) {
    specialtyScore = 85;
  } else if (isInternalMed) {
    specialtyScore = 70;
  }

  // 2. Workload Balance Score (0 - 100)
  // Higher score if doctor has lower caseload relative to capacity
  const utilizationRatio = doctor.currentCaseload / doctor.maxCapacity;
  const workloadScore = Math.round((1 - utilizationRatio) * 100);

  // 3. Language Match Score (0 - 100)
  let languageScore = 60;
  const patientLang = patient.originalLanguage;
  if (patientLang === 'hi' || patientLang === 'hinglish') {
    if (doctor.languages.includes('Hindi') || doctor.languages.includes('HI')) {
      languageScore = 100;
    }
  } else if (patientLang === 'en') {
    if (doctor.languages.includes('English') || doctor.languages.includes('EN')) {
      languageScore = 100;
    }
  }

  // 4. Continuity of Care Score (0 - 100)
  let continuityScore = 40;
  if (patient.assignedDoctorId === doctor.id) {
    continuityScore = 100;
  }

  // Composite Weighted Score
  // Weights: Specialty 45%, Workload 30%, Language 15%, Continuity 10%
  const totalScore = Math.round(
    specialtyScore * 0.45 +
    workloadScore * 0.30 +
    languageScore * 0.15 +
    continuityScore * 0.10
  );

  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialtyMatchScore: specialtyScore,
    workloadBalanceScore: workloadScore,
    languageMatchScore: languageScore,
    continuityScore: continuityScore,
    totalScore,
    isEligible: true,
  };
}

/**
 * Runs 2-stage matching for a patient across all doctors.
 * Returns ranked list of eligible doctors.
 */
export function rankDoctorsForPatient(patient: Patient, allDoctors: Doctor[]): MatchingScoreBreakdown[] {
  const scores = allDoctors.map((doc) => calculateDoctorMatchScore(doc, patient));
  // Sort descending by total score, placing eligible doctors first
  return scores.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.totalScore - a.totalScore;
  });
}
