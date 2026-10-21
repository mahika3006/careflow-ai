import { Patient, Doctor } from '@/types';

/**
 * Generates structured printable HTML for clinical and triage reports.
 * Explicitly marks AI draft vs Clinician-Approved documentation.
 */
export function generatePrintableReportHtml(patient: Patient, doctor?: Doctor): string {
  const isFinalized = patient.consultation?.finalizedByDoctor;
  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const warningFlagsHtml = (patient.aiAssessment?.warningFlags || [])
    .map(
      (f) => `
    <div style="border-left: 4px solid ${f.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'}; background: ${f.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB'}; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px;">
      <div style="font-weight: 600; color: ${f.severity === 'CRITICAL' ? '#991B1B' : '#92400E'}; font-size: 13px;">
        [${f.severity}] ${f.flag}
      </div>
      <div style="font-size: 12px; color: #4B5563; margin-top: 2px;">
        Evidence: ${f.evidence} <span style="color: #6B7280;">(${f.sourceRef})</span>
      </div>
    </div>
  `
    )
    .join('');

  const prescriptionsHtml = (patient.consultation?.prescriptions || [])
    .map(
      (rx, idx) => `
    <tr style="border-bottom: 1px solid #E5E7EB; font-size: 13px;">
      <td style="padding: 8px 10px; font-weight: 600;">${idx + 1}. ${rx.drugName}</td>
      <td style="padding: 8px 10px;">${rx.dosage}</td>
      <td style="padding: 8px 10px;">${rx.frequency}</td>
      <td style="padding: 8px 10px;">${rx.duration}</td>
      <td style="padding: 8px 10px; color: #374151;">${rx.instructions}</td>
      <td style="padding: 8px 10px; text-align: center;">
        <span style="background: ${rx.approvedByClinician ? '#DEF7EC' : '#FEF3C7'}; color: ${rx.approvedByClinician ? '#03543F' : '#92400E'}; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
          ${rx.approvedByClinician ? 'CLINICIAN APPROVED' : 'DRAFT'}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CareFlow AI - Clinical Triage & Consultation Report - ${patient.id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      margin: 0;
      padding: 30px;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0F2E22;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand {
      color: #0F2E22;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .subbrand {
      font-size: 12px;
      color: #64748B;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-final {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    .status-provisional {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 16px;
      background: #F8FAFC;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .vital-item {
      display: inline-block;
      margin-right: 15px;
      margin-bottom: 4px;
    }
    .vital-label {
      font-size: 11px;
      color: #64748B;
    }
    .vital-val {
      font-weight: 700;
      color: #0F172A;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F2E22;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #F1F5F9;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .disclaimer-box {
      margin-top: 30px;
      padding: 12px 16px;
      background: #F8FAFC;
      border: 1px dashed #94A3B8;
      border-radius: 6px;
      font-size: 11px;
      color: #64748B;
      line-height: 1.4;
    }
    @media print {
      body { padding: 15px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">CAREFLOW AI</div>
      <div class="subbrand">Hospital Clinical Triage & Encounter Record</div>
      <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Apex Central Healthcare Network • Department of Emergency & Outpatient Medicine</div>
    </div>
    <div style="text-align: right;">
      <div class="status-badge ${isFinalized ? 'status-final' : 'status-provisional'}">
        ${isFinalized ? '✓ Clinician Finalized Record' : '⚠ Provisional / Draft Assessment'}
      </div>
      <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Generated: ${now}</div>
      <div style="font-size: 11px; color: #64748B;">Encounter ID: ${patient.id}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Patient Identification</div>
      <div style="font-size: 16px; font-weight: 700; color: #0F172A;">${patient.name}</div>
      <div style="color: #475569; margin-top: 2px;">
        ${patient.age} yrs • ${patient.gender} • DOB: ${patient.dob}
      </div>
      <div style="color: #475569; margin-top: 4px;">
        Contact: ${patient.contact} | Emergency: ${patient.emergencyContact?.name} (${patient.emergencyContact?.phone})
      </div>
      <div style="margin-top: 6px; font-size: 11px;">
        Consent Status: <strong style="color: ${patient.consentStatus === 'active' ? '#059669' : '#DC2626'};">${patient.consentStatus.toUpperCase()}</strong>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Triage Classification & Clinician Confirmation</div>
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
        <div>Provisional (AI): <strong>${patient.provisionalCategory}</strong></div>
        <div style="color: #94A3B8;">➔</div>
        <div>Confirmed: <strong style="color: ${patient.clinicianConfirmedCategory === 'EMERGENCY' ? '#DC2626' : '#2563EB'};">${patient.clinicianConfirmedCategory || 'Pending Confirmation'}</strong></div>
      </div>
      <div style="font-size: 11px; color: #475569;">
        Attending Clinician: <strong>${patient.assignedDoctorName || 'Pending Assignment'}</strong>
      </div>
      ${
        patient.overrideReason
          ? `<div style="margin-top: 6px; font-size: 11px; background: #FFFFFF; padding: 6px; border: 1px solid #E2E8F0; border-radius: 4px;">
              <strong>Clinician Clinical Note:</strong> ${patient.overrideReason} (${patient.overrideClinician || ''})
            </div>`
          : ''
      }
    </div>
  </div>

  <div class="card" style="margin-bottom: 20px;">
    <div class="card-title">Initial Triage Vital Signs</div>
    <div>
      <span class="vital-item"><span class="vital-label">Blood Pressure:</span> <span class="vital-val">${patient.vitals.bloodPressure} mmHg</span></span>
      <span class="vital-item"><span class="vital-label">Heart Rate:</span> <span class="vital-val">${patient.vitals.heartRate} bpm</span></span>
      <span class="vital-item"><span class="vital-label">SpO2:</span> <span class="vital-val">${patient.vitals.spO2}%</span></span>
      <span class="vital-item"><span class="vital-label">Temperature:</span> <span class="vital-val">${patient.vitals.temperature}°F</span></span>
      <span class="vital-item"><span class="vital-label">Respiratory Rate:</span> <span class="vital-val">${patient.vitals.respiratoryRate} /min</span></span>
      ${patient.vitals.gcs ? `<span class="vital-item"><span class="vital-label">GCS:</span> <span class="vital-val">${patient.vitals.gcs}/15</span></span>` : ''}
    </div>
  </div>

  <div class="section-title">Incident Presentation & Reported Symptoms</div>
  <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
    <p style="margin: 0 0 6px 0; font-weight: 500;"><strong>Original Narrative:</strong> ${patient.incidentDescription}</p>
    ${patient.originalTranscriptSnippet ? `<p style="margin: 0 0 6px 0; color: #4B5563; font-style: italic;"><strong>Original Language Recording (${patient.originalLanguage}):</strong> "${patient.originalTranscriptSnippet}"</p>` : ''}
    <p style="margin: 0; font-size: 12px; color: #64748B;">Onset: ${patient.symptomOnset} • Duration: ${patient.symptomDuration} • Trajectory: ${patient.symptomProgression}</p>
  </div>

  <div class="section-title">AI Safety Rules & Multimodal Warning Flags</div>
  ${warningFlagsHtml || '<div style="color: #64748B; font-style: italic;">No critical emergency warning flags identified.</div>'}

  ${
    patient.consultation
      ? `
  <div class="section-title">Clinician Consultation & Assessment (Doctor Approved)</div>
  <div style="background: #FFFFFF; border: 1px solid #CBD5E1; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
    <div style="margin-bottom: 8px;">
      <strong style="color: #0F2E22;">Subjective Notes:</strong>
      <div style="color: #334155; margin-top: 2px;">${patient.consultation.subjectiveNotes || 'Recorded during clinical encounter.'}</div>
    </div>
    <div style="margin-bottom: 8px;">
      <strong style="color: #0F2E22;">Objective Examination Findings:</strong>
      <div style="color: #334155; margin-top: 2px;">${patient.consultation.objectiveFindings || 'Physical examination performed.'}</div>
    </div>
    <div style="margin-bottom: 8px;">
      <strong style="color: #0F2E22;">Clinical Impression / Diagnosis:</strong>
      <div style="color: #1E293B; font-weight: 600; margin-top: 2px;">${patient.consultation.clinicalAssessment || 'Awaiting final clinical assessment.'}</div>
    </div>
    <div>
      <strong style="color: #0F2E22;">Treatment & Care Plan:</strong>
      <div style="color: #334155; margin-top: 2px; white-space: pre-line;">${patient.consultation.plan || 'Care plan in progress.'}</div>
    </div>
  </div>

  <div class="section-title">Clinician-Approved Prescriptions</div>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${prescriptionsHtml || '<tr><td colspan="6" style="padding: 10px; color: #94A3B8; text-align: center;">No prescription items entered.</td></tr>'}
    </tbody>
  </table>

  ${
    patient.consultation.referral
      ? `
  <div style="margin-top: 15px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 10px 14px; border-radius: 6px;">
    <strong>Specialty Referral:</strong> ${patient.consultation.referral.specialty} (${patient.consultation.referral.urgency}) • Facility: ${patient.consultation.referral.facility}
    <div style="font-size: 11px; color: #166534; margin-top: 2px;">Notes: ${patient.consultation.referral.notes}</div>
  </div>
  `
      : ''
  }
  `
      : ''
  }

  <div class="disclaimer-box">
    <strong>HUMAN-IN-THE-LOOP HEALTHCARE COMPLIANCE NOTICE:</strong>
    CareFlow AI provides algorithmic triage assistance and multimodal evidence extraction to assist licensed healthcare practitioners. CareFlow AI does not diagnose disease, independently prescribe medication, or substitute for qualified clinical judgment. All final clinical documentation, diagnostic impressions, and treatment plans in this document are strictly the responsibility of the attending physician named herein.
  </div>

  <div style="margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 11px; color: #64748B;">
      Apex Central Hospital Network • HIPAA / ABDM Compliant Electronic Medical Record System
    </div>
    <div style="text-align: right;">
      <div style="font-family: cursive; font-size: 18px; color: #0F2E22;">
        ${patient.assignedDoctorName || 'Dr. Attending Physician'}
      </div>
      <div style="border-top: 1px solid #94A3B8; padding-top: 4px; font-size: 11px; color: #475569; width: 220px;">
        Attending Physician Signature & Stamp
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
