# AlertHub — AI-Enabled Cyber Incident & Safety Portal

> A defence-grade, real-time cyber incident reporting and response platform. Think of it as a **cyber Instagram** — citizens post incidents, AI analyses them, Defence resolves them, Police broadcasts safety alerts to the public.

---

## Live Pipeline

```
Public → Report Incident
       ↓
AI + Defence Analysis  (Gemini AI classifies threat type & severity)
       ↓
Threat Resolved / Identified  (Defence documents mitigation)
       ↓
Police Verification  (Independent review & approval)
       ↓
Broadcast Alert  (Public safety notification)
       ↓
Public Awareness + Safety
```

Every stage is **strictly enforced** on the backend — skipping a stage returns `403 Forbidden`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT (email/password, bcrypt hashed) |
| Storage | Local disk via multer (`/uploads`) |
| AI | Google Gemini 2.0 Flash |
| Real-time | Server-Sent Events (SSE) |
| Maps | react-simple-maps (color-pinned threat map) |
| Charts | Recharts (area, bar, pie) |
| Animation | Motion (Framer Motion) |

---

## Features

### Public
- Report cyber incidents (phishing, malware, ransomware, DDoS, fraud, etc.)
- Upload evidence (image/video)
- Live pipeline tracker — watch your report move through all 6 stages in real time
- Social-style incident feed with severity color pins
- Threat map with 🔴 High · 🟠 Medium · 🟢 Low color pins
- Public alert feed — verified safety broadcasts from police
- AI chatbot for cyber safety guidance

### Defence Panel
- View all pending/active reports
- One-click AI analysis via Gemini — auto-classifies threat type, severity, confidence score, and mitigation steps
- Document resolution notes and forward to police
- Reject false alarms

### Police Panel
- Review defence resolutions
- Approve & verify with one click
- AI auto-generates broadcast alert draft
- Edit and broadcast public safety alert with safety instructions
- Request revision back to defence if needed

### Audit Trail
- Complete log of every pipeline stage transition
- Actor, role, from/to status, notes, timestamp
- Filterable by role (defence / police)

---

## Roles & Access

| Role | Access |
|---|---|
| `public` | Home feed, Report page, Public alerts |
| `defence` | + Defence Panel, Audit Trail |
| `police` | + Police Panel, Audit Trail |

Role mismatch shows a full **Access Denied** screen — no silent redirects.

---

## Project Structure

```
alerthub/
├── server.ts                  # Express backend — pipeline API + Gemini AI
├── src/
│   ├── App.tsx                # Routes
│   ├── firebase.ts            # Firebase client init
│   ├── index.css              # Tailwind + neon effects + matrix rain
│   ├── components/
│   │   ├── Layout.tsx         # Navbar, footer, AI chatbot
│   │   ├── AuthGuard.tsx      # Role-based route protection
│   │   ├── PipelineTracker.tsx # 6-stage pipeline visual
│   │   ├── MatrixRain.tsx     # Animated canvas background
│   │   └── AIChatbot.tsx      # Floating AI assistant
│   ├── pages/
│   │   ├── Home.tsx           # Social feed + threat map + alerts
│   │   ├── Report.tsx         # Incident submission form
│   │   ├── Login.tsx          # Portal selector + auth
│   │   ├── DefenceDashboard.tsx  # Stage 2–3
│   │   ├── PoliceDashboard.tsx   # Stage 4–5
│   │   └── AuditTrail.tsx     # Full audit log
│   ├── hooks/
│   │   └── useAuth.tsx        # Auth context + profile
│   └── utils/
│       └── cn.ts              # Tailwind class merge
└── firestore.rules            # Role-based Firestore security rules
```

---

## Backend API

All endpoints require a Firebase ID token in `Authorization: Bearer <token>`.

| Method | Endpoint | Role | Stage | Description |
|---|---|---|---|---|
| `POST` | `/api/report` | any | 1 | Submit incident → `pending` |
| `POST` | `/api/analyze` | defence | 2 | AI classify → `under_analysis` |
| `POST` | `/api/resolve` | defence | 3 | Document resolution → `resolved` |
| `POST` | `/api/reject` | defence | — | Reject as false alarm → `rejected` |
| `POST` | `/api/verify` | police | 4 | Approve resolution → `verified` |
| `POST` | `/api/request-revision` | police | — | Send back to defence |
| `POST` | `/api/broadcast` | police | 5 | Publish alert → `broadcasted` |
| `GET` | `/api/audit/:reportId` | defence/police | — | Full audit trail |
| `GET` | `/api/pipeline/:reportId` | any | — | Current pipeline status |
| `POST` | `/api/seed-roles` | admin | — | Assign role by email |

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd alerthub
npm install --legacy-peer-deps
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGO_URI=mongodb://localhost:27017/alerthub
JWT_SECRET=your_long_random_secret
ADMIN_SECRET=alerthub-admin-2026
```

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `MONGO_URI` — local MongoDB or [MongoDB Atlas](https://cloud.mongodb.com) connection string
- `JWT_SECRET` — any long random string (change in production)

### 3. Start MongoDB

```bash
# Local (requires MongoDB installed)
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### 4. Run

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Assigning Roles

New accounts default to `public`. To assign `defence` or `police`:

```bash
curl -X POST http://localhost:3000/api/seed-roles \
  -H "Content-Type: application/json" \
  -d '{"secret":"alerthub-admin-2026","email":"officer@example.com","role":"police"}'
```

Or register directly via the Police/Defence portal — the role is set at registration time.

---

## Database Collections (MongoDB)

| Collection | Description |
|---|---|
| `users` | User accounts with hashed passwords and role |
| `reports` | Incident reports with full pipeline status |
| `alerts` | Broadcasted public safety alerts |
| `auditlogs` | Every pipeline transition log |

---

## Pipeline Status Values

```
pending → under_analysis → resolved → verified → broadcasted
                                    ↘ rejected (terminal)
```

---

## License

MIT — Built for defence-grade cybersecurity education and demonstration purposes.
