<div align="center">

<img src="https://img.shields.io/badge/CareFlow_AI-Emergency_Triage-0F2E22?style=for-the-badge&logo=heart&logoColor=white" alt="CareFlow AI" height="45" />

# 🏥 CareFlow AI

**AI-powered emergency triage & intelligent doctor-matching for hospitals.**  
The sickest patient — not the longest-waiting — always gets seen first.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemma 4](https://img.shields.io/badge/AI-Gemma_4_26B-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<br/>

[**Live Demo**](https://careflow-ai.vercel.app) &nbsp;·&nbsp;
[**Architecture**](#-architecture) &nbsp;·&nbsp;
[**API Reference**](#-api-reference) &nbsp;·&nbsp;
[**Getting Started**](#-getting-started)

<br/>

> ⚠️ **Disclaimer:** CareFlow AI is a hackathon prototype and decision-support tool. It is **not** a certified medical device and must **not** be used for real clinical decisions. The clinician always has the final authority.

</div>

---

## 📖 Overview

In a busy emergency department, the sickest patient is not always the one who arrived first.

**CareFlow AI** solves this by fusing an LLM with a deterministic clinical rule engine that can never be overridden by a hallucination:

```
Patient checks in (symptoms typed or spoken in Hindi / English)
         ↓
PDF of past medical report uploaded → Gemma 4 extracts structured history
         ↓
/api/triage:  Code safety checks → Gemma analysis → Rule engine
         ↓
finalRank = Math.max(AI rank, rule-engine rank)   ← AI can NEVER downgrade critical cases
         ↓
Live priority queue:  Emergency → Urgent → Needs Review → Routine
         ↓
Two-Stage Doctor Matching Engine picks the optimal available physician
         ↓
Doctor consults, writes prescription, discharges
         ↓
Patient archived in Discharged History (record never deleted)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Triage** | Gemma 4 analyses symptoms, vitals, audio transcript and extracted PDF history, returning a structured urgency assessment with every reason **source-cited** |
| 🛡️ **Safety Floor** | `Math.max(AI rank, rule rank)` — AI can raise urgency but **never** lower a case the rules flag as critical |
| 📄 **Smart PDF Extraction** | Text PDFs parsed with `pdf-parse`; scanned image PDFs fall back to Gemma's vision capability automatically |
| 🎙️ **Multilingual Voice** | Speech-to-text for Hindi, Hinglish and English symptom reporting |
| 🔊 **TTS Summaries** | Doctors can listen to the AI triage summary via Gnani Neural TTS |
| 👨‍⚕️ **Two-Stage Doctor Matching** | Eligibility filter → weighted scoring on specialty (45%), workload (30%), language (15%), continuity (10%) |
| 🔢 **Tier-Gap Priority Queue** | Fixed 10M/5M/1M/100K score gaps guarantee tier order is immutable regardless of wait time |
| 🔒 **Defence-in-Depth Security** | Supabase RLS, server-only service key, prompt-injection detection, Zod schema validation |
| 📜 **Full Audit Trail** | Every clinical action logged with actor, role, action, entity, before → after, timestamp |
| 🗃️ **Discharge Archive** | Records are **never deleted**. Discharged patients move to a searchable history; readmission restores without duplicating |
| 📊 **Analytics Dashboard** | Trends and category distribution charts via Recharts |

---

## 🏗️ Architecture

### System Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND  (Next.js 16 / React 19)                │
│                                                                            │
│  OverviewView  TriageQueueView  PatientDetailView  DoctorDashboardView   │
│  PatientDashboardView  AppointmentsAssignmentsView  DischargedHistoryView│
│                           ↕ React Context (lib/store.tsx)                 │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  fetch / PATCH (optimistic UI)
┌─────────────────────────────▼────────────────────────────────────────────┐
│                      BACKEND  (Next.js API Routes — Serverless)           │
│                                                                            │
│  /api/triage          → Code checks → Gemma 4 → Rule engine              │
│  /api/extract-history → pdf-parse  → Gemma 4 vision                      │
│  /api/patients        → JOIN: cases+vitals+ai_triage+assignments+doctors  │
│  /api/doctors         → Doctor CRUD + availability                        │
│  /api/audit-logs      → Immutable compliance trail                        │
│  /api/stt             → Speech-to-text (Hindi / English)                  │
│  /api/tts             → Gnani Neural text-to-speech                       │
└────────────┬────────────────────────────┬────────────────────────────────┘
             │                            │
  ┌──────────▼──────────┐    ┌────────────▼────────────┐
  │   Supabase Postgres  │    │    Google AI Studio      │
  │   (8 tables + RLS)   │    │    Gemma 4 26B-A4B-IT   │
  │   Supabase Storage   │    │    (temperature 0.1)     │
  │   (PDF uploads)      │    └─────────────────────────┘
  └─────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | Pages + API routes in one project; strict typing is non-negotiable for clinical data |
| **State** | React Context (`lib/store.tsx`) | Lightweight shared store; optimistic updates give instant UI feedback |
| **Backend** | Next.js API routes (Edge/Serverless) | One codebase, one deployment, shared TypeScript types |
| **Database** | Supabase (PostgreSQL + Storage) | Complex relational joins, Row Level Security, object storage for PDFs |
| **AI Model** | Gemma 4 `gemma-4-26b-a4b-it` | Native Hindi/Hinglish, structured JSON output, open-weight (on-prem capable) |
| **Validation** | Zod 4 | Validates every field of the AI's JSON — garbage in cannot mean garbage out |
| **Charts** | Recharts | Analytics and category distribution |
| **Icons** | lucide-react | Consistent icon set |

---

## 🧠 How Triage Works

`/api/triage` runs **three independent stages**. The result of all three is merged with a safety-first rule.

### Stage A — Code-Level Safety Checks *(before the AI sees anything)*

```typescript
// Prompt injection guard
const injectionRegex = /(ignore\s+previous\s+instructions|system\s+prompt|mark\s+me\s+critical|bypass\s+triage)/i;
if (injectionRegex.test(combinedInput)) {
  // flag as suspicious_input, reset priority boost to routine
}

// Vitals: never assume normal
if (!vitals || allVitalsEmpty) flags.push({ type: 'missing', text: 'Current vitals not measured' });

// Cross-source conflict detection
if (formSaysNoMeds && reportListsMeds)  flags.push({ type: 'conflict', ... });
if (formNameNeReportName)               flags.push({ type: 'conflict', ... });
```

### Stage B — Gemma 4 Analysis *(temperature 0.1 for consistency)*

The model is given the full clinical picture and must return **strictly structured JSON**:

```jsonc
{
  "urgency_suggestion": "immediate | urgent | moderate | low | unclear",
  "reasons": [
    { "text": "Chest pain radiating to left arm with diaphoresis", "source": "symptoms: \"crushing chest pain, sweating\"" }
  ],
  "flags": [
    { "type": "conflict | missing | low_confidence | suspicious_input", "text": "...", "sources": ["..."] }
  ],
  "followup_questions": ["Has the patient taken any nitrates in the last 24 hours?"],
  "first_aid_steps": ["Keep patient seated upright", "Call emergency services (112) immediately"],
  "summary": "...",
  "uncertainty_notes": ["Vitals not measured — cannot assess haemodynamic status"]
}
```

> Every `reason` **must** cite its source (`"symptoms: ..."`, `"report p.1: ..."`, `"audio transcript"`). Reasons without a valid source are dropped server-side.

### Stage C — Code-Level Rule Engine *(after AI, independent)*

| Condition | Priority Score |
|---|---|
| SpO₂ < 90% | 92 → **EMERGENCY** |
| Chest pain + sweating | 88 → **EMERGENCY** |
| Hypertensive crisis BP (≥ 180/120) | 88 → **EMERGENCY** |
| Respiratory distress keywords | 85 → **EMERGENCY** |
| Active / uncontrolled bleeding | 90 → **EMERGENCY** |
| Anticoagulant in history + bleeding signs | score +10 booster |
| Infant (age < 2) with acute signs | score +10 booster |

### Safety Floor — The Key Design Decision

```typescript
const finalRank = Math.max(modelRank, ruleRank);
```

The AI can **raise** urgency but can **never lower** a case the rule engine flags as critical. A patient with SpO₂ < 90% is always `EMERGENCY`, even if the model returns `"moderate"`.

### Human-in-the-Loop

| Field | Meaning |
|---|---|
| `provisionalCategory` | What the AI suggested |
| `clinicianConfirmedCategory` | What the attending clinician confirmed or overrode (with mandatory justification) |
| `effectiveCategory` | `clinicianConfirmedCategory ?? provisionalCategory` — used for all sorting and display |

---

## 🩺 Two-Stage Doctor Matching

Inspired by **min-cost-flow matching** — supply (doctors) matched to demand (patients) with minimum mismatch penalty.

### Stage 1 — Hard Eligibility Filter

```
❌  verifiedRegistration === false   →  eliminated
❌  availabilityStatus === 'OFF_DUTY' →  eliminated
❌  currentCaseload >= maxCapacity    →  eliminated
✅  Remaining doctors proceed to Stage 2
```

### Stage 2 — Weighted Score (0–100)

```
totalScore =
  specialtyMatchScore  × 0.45   // Cardiologist for chest pain = 100pts
  workloadBalanceScore × 0.30   // (1 - caseload/capacity) × 100
  languageMatchScore   × 0.15   // Hindi patient + Hindi doctor = 100pts
  continuityScore      × 0.10   // Same doctor as before = 100pts
```

The top-scoring eligible doctor is the auto-match recommendation. Clinicians can override manually.

---

## 🔢 Priority Queue — Tier-Gap Scoring

> **Problem:** Wait-time escalation can let an Urgent patient leapfrog a fresh Emergency patient if both use the same score axis.

**Solution:** Fixed, enormous gaps between tiers.

| Tier | Base Score |
|---|---|
| `EMERGENCY` | 10,000,000 |
| `URGENT` | 5,000,000 |
| `NEEDS_REVIEW` | 1,000,000 |
| `ROUTINE` | 100,000 |

Wait-time adds `minutes × 15` points. An Urgent patient would need **~231 days** of waiting to catch a fresh Emergency — impossible in any real scenario. Within a tier, longer waits rank higher. Tiers never cross.

---

## 🔌 API Reference

| Route | Method | Description |
|---|---|---|
| `/api/triage` | `POST` | Code safety checks → Gemma 4 → rule engine → final urgency result |
| `/api/extract-history` | `POST` | PDF → structured history (conditions, medications, allergies, past values, surgeries) |
| `/api/patients` | `GET` | List all patients — joins `cases + patients + vitals + ai_triage + assignments + doctors` |
| `/api/patients` | `POST` | Create new patient + case in Supabase |
| `/api/patients/[id]` | `PATCH` | Update status, clinician override, doctor assignment, or discharge |
| `/api/doctors` | `GET` | All doctors with specializations, languages, and caseload |
| `/api/doctors/[id]` | `PATCH` | Update availability status and caseload count |
| `/api/audit-logs` | `GET / POST` | Read or write compliance audit entries |
| `/api/stt` | `POST` | Speech-to-text for Hindi / English audio |
| `/api/tts` | `POST` | Text-to-speech for AI triage summaries |

---

## 🗄️ Database Schema

```sql
patients      (id, full_name, dob, gender, contact, allergies, blood_group)
cases         (id, patient_id, status ∈ {open,under_review,assigned,closed},
               priority_score, symptoms_text, created_at, updated_at)
vitals        (id, case_id, bp_sys, bp_dia, heart_rate, spo2, temperature, respiratory_rate, gcs)
ai_triage     (id, case_id, triage_level, summary JSONB, flags TEXT[])
assignments   (id, case_id, doctor_id, assigned_at)
doctors       (id, full_name, specialization TEXT[], language TEXT[],
               max_capacity INT, current_caseload INT, availability_status)
prescriptions (id, case_id, doctor_id, prescription_text, advice_text, approved_at)
audit_logs    (id, actor, role, action, entity_type, entity_id,
               old_value, new_value, notes, created_at)
consents      (id, patient_id, status ∈ {active,withdrawn}, signed_at)
```

**Status mapping** (Supabase DB → App):

| DB `status` | App `PatientStatus` |
|---|---|
| `open` | `WAITING_AI` |
| `under_review` | `TRIAGED` |
| `assigned` | `ASSIGNED` |
| `closed` | `DISCHARGED` |

---

## 🔐 Security Model

```
Browser
  └── @supabase/ssr (anon key)
        └── RLS policies enforce per-row visibility
              ├── PATIENT → own records only
              ├── DOCTOR  → assigned patients only
              └── ADMIN   → unrestricted

Server (API routes only)
  └── utils/supabase/admin.ts (service-role key)
        └── Bypasses RLS — only used for server-side writes
        └── NEVER imported in client components
        └── NEVER prefixed with NEXT_PUBLIC_
```

**Additional layers:**
- **Prompt injection** — regex guard, score reset, clinician security flag
- **AI output validation** — Zod schema + 3 JSON extraction fallbacks (code block → outermost braces → any JSON blob)
- **Vitals hallucination prevention** — every unmeasured vital passed as `null (Unmeasured)` in the prompt; rule engine validates independently
- **Audit logging** — immutable trail of every triage confirmation, override, assignment, discharge, and readmission
- **Consent tracking** — `active / withdrawn` per patient
- **Data retention** — records are never deleted; discharge archives, readmission restores without duplicates

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemma 4)
- *(Optional)* STT / Gnani TTS provider keys

### 1. Clone & Install

```bash
git clone https://github.com/Yuvraj-9696-singh/careflow-ai.git
cd careflow-ai
npm install
```

### 2. Environment Variables

Create `.env.local` at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<secret-service-role-key>    # server-only — never expose

# AI
GEMINI_API_KEY=<your-google-ai-key>

# Speech (optional)
STT_API_KEY=<your-stt-key>
GNANI_TTS_API_KEY=<your-tts-key>
GNANI_TTS_USER_ID=<your-tts-user-id>
```

> 🔒 **Never** commit `.env.local`. **Never** give `SUPABASE_SERVICE_ROLE_KEY` a `NEXT_PUBLIC_` prefix.

### 3. Database Setup

1. Create the tables from the schema above in your Supabase project.
2. Enable **Row Level Security** on all tables and add role-based policies.
3. Create a **Storage bucket** named `medical-reports` for PDF uploads.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Turbopack dev server |
| `npm run build` | Create an optimised production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint the codebase |

---

## 📁 Project Structure

```
careflow-ai/
├── app/
│   ├── api/
│   │   ├── triage/            # Stage A+B+C triage pipeline
│   │   ├── extract-history/   # PDF → structured history (Gemma vision fallback)
│   │   ├── patients/          # Patient CRUD — 6-table JOIN
│   │   │   └── [id]/          # PATCH: status, override, assignment, discharge
│   │   ├── doctors/           # Doctor management
│   │   │   └── [id]/
│   │   ├── audit-logs/        # Compliance trail
│   │   ├── stt/               # Speech-to-text
│   │   └── tts/               # Text-to-speech
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── CareFlowApp.tsx        # Root router — maps active tab to view
│   ├── Sidebar.tsx            # Navigation + active patient count badge
│   ├── TopNav.tsx             # Role switcher, overdue alerts, emergency bell
│   ├── ui/
│   │   └── UserAvatar.tsx     # Initials avatar with vibrant gradient backgrounds
│   ├── views/
│   │   ├── OverviewView.tsx
│   │   ├── TriageQueueView.tsx
│   │   ├── PatientDashboardView.tsx
│   │   ├── PatientDetailView.tsx          # Discharge / Re-admit workflow
│   │   ├── AppointmentsAssignmentsView.tsx # Two-stage doctor matching
│   │   ├── DoctorDashboardView.tsx
│   │   ├── DischargedHistoryView.tsx      # Searchable archive
│   │   ├── AnalyticsView.tsx
│   │   ├── MedicalRecordsView.tsx
│   │   ├── ReportsView.tsx
│   │   └── SettingsView.tsx
│   └── modals/
│       └── NewPatientModal.tsx
│
├── lib/
│   ├── store.tsx              # CareFlowContext — global state + all actions
│   ├── triage-rules.ts        # Priority ranking, tier-gap scoring, sort helpers
│   ├── doctor-matching.ts     # 2-stage matching algorithm
│   ├── reports.ts             # Printable clinical report HTML generator
│   └── audio/
│       └── speech-services.ts # Gnani TTS wrapper
│
├── types/
│   └── index.ts               # All TypeScript interfaces (Patient, Doctor, ...)
│
└── utils/
    └── supabase/
        ├── client.ts          # Browser client (anon key — RLS restricted)
        └── admin.ts           # Server-only client (service role — bypasses RLS)
```

---

## ⚠️ Known Limitations

- If the Gemma API is unavailable, `/api/triage` returns a 500 error (no graceful fallback yet).
- Real clinical validation and regulatory approval have not been performed.
- Audio STT quality depends on the upstream provider.

---

## 🗺️ Roadmap

- [ ] Retry with exponential backoff + rules-only fallback when the AI is down
- [ ] Admin alerting (email / Slack) on AI failures
- [ ] On-premise Gemma deployment for full data residency
- [ ] MFA and formal HIPAA / DPDPA risk assessment
- [ ] Real-time queue updates via Supabase Realtime subscriptions
- [ ] Automated test suite for the rule engine and matching algorithm
- [ ] Bed management module
- [ ] Radiology / lab order integration

---

## 🤝 Contributing

Contributions are welcome!

```bash
# 1. Fork the repo and clone your fork
git clone https://github.com/<your-username>/careflow-ai.git

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes and run checks
npm run lint
npx tsc --noEmit

# 4. Commit and push
git commit -m "feat: your feature description"
git push origin feature/your-feature-name

# 5. Open a Pull Request
```

Please ensure TypeScript compiles with zero errors before opening a PR.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Tredence Healthcare Hackathon**

[![GitHub](https://img.shields.io/badge/GitHub-Yuvraj--9696--singh-181717?style=flat-square&logo=github)](https://github.com/Yuvraj-9696-singh/careflow-ai)

</div>