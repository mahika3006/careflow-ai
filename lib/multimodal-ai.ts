import { AIAssessment, WarningFlag, Vitals, MediaEvidence, TranscriptSegment, UrgencyCategory } from '@/types';
import { evaluateTriageRules } from '@/lib/triage-rules';

export interface MultimodalIntakeInput {
  textDescription?: string;
  originalLanguage?: 'en' | 'hi' | 'hinglish';
  vitals?: Vitals;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  isPregnant?: boolean;
  audioFileName?: string;
  imageFileName?: string;
  reportFileName?: string;
}

export interface ExtractedFact {
  id: string;
  factType: 'SYMPTOM' | 'ONSET' | 'DURATION' | 'VITAL_SIGN' | 'HISTORY' | 'ALLERGY';
  value: string;
  originalTextSnippet: string;
  sourceRef: string;
  confidence: number;
}

export interface MultimodalAnalysisResult {
  detectedLanguage: 'en' | 'hi' | 'hinglish';
  extractedFacts: ExtractedFact[];
  aiAssessment: AIAssessment;
  generatedTranscript?: TranscriptSegment[];
  ocrExtractedText?: string;
  uncertaintyScore: number;
  conflictingInfo: string[];
  missingCrucialInfo: string[];
}

/**
 * Simulates intelligent Multimodal AI processing pipeline with source grounding,
 * uncertainty scoring, and safety rule engine evaluation.
 */
export function processMultimodalIntake(input: MultimodalIntakeInput): MultimodalAnalysisResult {
  const rawText = (input.textDescription || '').trim();
  
  // 1. Language Detection
  let detectedLanguage: 'en' | 'hi' | 'hinglish' = input.originalLanguage || 'en';
  const hasDevanagari = /[\u0900-\u097F]/.test(rawText);
  const hasHinglishKeywords = /\b(dard|saans|bukhar|chakkar|pet|chhati|bahut|hai|raha|rahi|kal|se|mein)\b/i.test(rawText);
  
  if (hasDevanagari) {
    detectedLanguage = 'hi';
  } else if (hasHinglishKeywords) {
    detectedLanguage = 'hinglish';
  }

  // 2. Fact Extraction with Source Grounding
  const extractedFacts: ExtractedFact[] = [];
  const lower = rawText.toLowerCase();

  // Extract symptoms
  if (lower.includes('chest pain') || lower.includes('chhati') || lower.includes('छाती') || lower.includes('pressure')) {
    extractedFacts.push({
      id: 'FACT-1',
      factType: 'SYMPTOM',
      value: 'Severe retrosternal chest pain radiating to left arm/jaw',
      originalTextSnippet: rawText.substring(0, Math.min(60, rawText.length)),
      sourceRef: 'Verbal Audio Intake @ 00:08',
      confidence: 0.96,
    });
  }

  if (lower.includes('breath') || lower.includes('saans') || lower.includes('सांस') || lower.includes('dyspnea')) {
    extractedFacts.push({
      id: 'FACT-2',
      factType: 'SYMPTOM',
      value: 'Acute dyspnea / shortness of breath',
      originalTextSnippet: 'difficulty breathing upon exertion or at rest',
      sourceRef: 'Verbal Statement @ 00:16',
      confidence: 0.94,
    });
  }

  if (lower.includes('headache') || lower.includes('sar dard') || lower.includes('सिरदर्द')) {
    extractedFacts.push({
      id: 'FACT-3',
      factType: 'SYMPTOM',
      value: 'Severe persistent headache',
      originalTextSnippet: 'severe headache worsening over past hours',
      sourceRef: 'Intake Symptom Form',
      confidence: 0.92,
    });
  }

  if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('बुखार')) {
    extractedFacts.push({
      id: 'FACT-4',
      factType: 'SYMPTOM',
      value: 'Elevated body temperature / pyrexia',
      originalTextSnippet: 'high fever reported for multiple days',
      sourceRef: 'Thermometer & Intake Description',
      confidence: 0.98,
    });
  }

  // 3. Vitals Check
  const vitals: Vitals = input.vitals || {
    bloodPressure: '128/82',
    heartRate: 78,
    spO2: 98,
    temperature: 98.6,
    respiratoryRate: 16,
    gcs: 15,
  };

  extractedFacts.push({
    id: 'FACT-VIT-1',
    factType: 'VITAL_SIGN',
    value: `BP: ${vitals.bloodPressure} mmHg, HR: ${vitals.heartRate} bpm, SpO2: ${vitals.spO2}%`,
    originalTextSnippet: `Recorded at triage booth: ${vitals.bloodPressure}, ${vitals.heartRate} bpm`,
    sourceRef: 'Calibrated Triage Monitor',
    confidence: 0.99,
  });

  // 4. Missing Crucial Information & Conflicts
  const missingCrucialInfo: string[] = [];
  const conflictingInfo: string[] = [];

  if (!input.vitals || !input.vitals.spO2) {
    missingCrucialInfo.push('SpO2 pulse oximetry value is missing or unverified.');
  }
  if (!vitals.bloodPressure || vitals.bloodPressure === '0/0') {
    missingCrucialInfo.push('Blood pressure measurement is required for hemodynamic baseline.');
  }
  if (lower.includes('pregnant') && !input.isPregnant) {
    conflictingInfo.push('Intake narrative mentions pregnancy but demographic flag indicates non-pregnant.');
  }

  // 5. Evaluate against clinical rule engine
  const symptomsList = extractedFacts.map(f => f.value);
  if (symptomsList.length === 0) symptomsList.push(rawText || 'General medical review');

  const ruleEval = evaluateTriageRules(
    symptomsList,
    vitals,
    input.age || 40,
    input.isPregnant || false
  );

  // 6. Calculate Uncertainty Score (0.0 to 1.0)
  // Higher uncertainty if missing info or low text clarity
  let uncertainty = 0.08;
  if (missingCrucialInfo.length > 0) uncertainty += 0.15;
  if (conflictingInfo.length > 0) uncertainty += 0.20;
  if (rawText.length < 20) uncertainty += 0.10;
  uncertainty = Math.min(0.85, Math.max(0.04, uncertainty));

  const confidenceGrade = uncertainty < 0.15 ? 'HIGH' : uncertainty < 0.35 ? 'MODERATE' : 'LOW';

  const aiAssessment: AIAssessment = {
    structuredSummary: `AI Summary: ${ruleEval.explanation}. Extracted ${extractedFacts.length} verified clinical facts with source grounding.`,
    warningFlags: ruleEval.flags,
    provisionalCategory: ruleEval.category,
    explanation: ruleEval.explanation,
    missingConflictingInfo: [...missingCrucialInfo, ...conflictingInfo],
    uncertaintyScore: Math.round(uncertainty * 100) / 100,
    confidenceGrade,
    suggestedFollowUpQuestions: [
      'Are there any known drug allergies or adverse reactions to standard medications?',
      'Is the patient currently taking prescription anticoagulants or antiplatelet agents?',
      'When did the patient last consume food or fluid?',
    ],
    modelVersion: 'CareFlow-Multimodal-v3.2 (Gemini-Flash-Medical-Anchor)',
    assessedAt: new Date().toISOString(),
    humanReviewRequired: true,
  };

  // Generate simulated audio transcript if audio was specified
  let generatedTranscript: TranscriptSegment[] | undefined;
  if (input.audioFileName || rawText) {
    generatedTranscript = [
      {
        timestamp: '00:03',
        seconds: 3,
        speaker: 'Triage Nurse',
        text: detectedLanguage === 'hi' ? 'कृपया बताइए आपको क्या समस्या हो रही है?' : 'Please describe your main symptoms and when they began.',
        confidence: 0.99,
      },
      {
        timestamp: '00:10',
        seconds: 10,
        speaker: 'Patient',
        text: rawText || (detectedLanguage === 'hi' ? 'छाती में बहुत दबाव और घबराहट महसूस हो रही है।' : 'I have been having tightness in my chest and difficulty breathing.'),
        confidence: 0.95,
        highlightUrgent: ruleEval.isEmergency,
      },
      {
        timestamp: '00:24',
        seconds: 24,
        speaker: 'Triage Nurse',
        text: detectedLanguage === 'hi' ? 'समझ गया। हम तुरंत आपके महत्वपूर्ण संकेत जांच रहे हैं।' : 'Understood. We are recording your vitals and calling the attending physician.',
        confidence: 0.98,
      },
    ];
  }

  return {
    detectedLanguage,
    extractedFacts,
    aiAssessment,
    generatedTranscript,
    ocrExtractedText: input.imageFileName ? 'OCR EXTRACTED: Blood Pressure 158/98 mmHg. Heart Rate 104 bpm. Rhythm regular.' : undefined,
    uncertaintyScore: uncertainty,
    conflictingInfo,
    missingCrucialInfo,
  };
}
