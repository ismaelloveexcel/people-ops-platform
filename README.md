# Employee Portal — People Ops Platform

## What This Is

This is a **standalone employee portal** — a lightweight input and visibility layer for employees.

Employees use this portal to:
- **Submit requests** (leave, document, reimbursement, bank details update)
- **Track request status** (Submitted → Under Review → Processed)
- **Submit suggestions** for workplace improvements
- **Raise concerns** through an internal submission process
- **View policies and FAQ** (leave information, processes, etc.)
- **View their own profile** information

## What This Is NOT

- ❌ This is **not** the main system of record
- ❌ This is **not** a workflow engine or decision engine
- ❌ This is **not** an admin dashboard or HRIS
- ❌ This does **not** depend on Ops Intelligence Hub or any external system
- ❌ This does **not** perform payroll, salary calculations, or automatic approvals
- ❌ This does **not** contain disciplinary or termination features

## Independence

This portal is **fully functional without any external system**:

- All requests are submitted and stored via the backend API + database
- Status tracking works locally through the portal
- No external APIs, intelligence hubs, or automation systems are required
- No AI or machine learning dependencies

**Ops Intelligence Hub** (if used) is strictly optional and acts only as:
- A reader of data
- A reporting/processing layer
- It is **never** a dependency

## Architecture

```
[Employee Browser]
       │
       ▼
  Frontend (React/Vite)     → Vercel / static hosting
       │  HTTPS REST calls
       ▼
  Backend (FastAPI)          → Railway / any Python host
       │  Supabase client
       ▼
  Database (PostgreSQL)      → Supabase
```

## Portal Features

| Page | Purpose |
|------|---------|
| Home | Landing page with quick links to all features |
| My Requests | Track status of all submitted requests |
| Leave Request | Submit a leave request |
| Document Request | Request employment letters, payslips, references |
| Reimbursement | Submit work expenses with receipt |
| Bank Details Update | Request a change to salary payment details |
| Suggest Improvement | Submit constructive workplace suggestions |
| Raise a Concern | Internal concern submission for management review |
| Policies & FAQ | Leave information, processes, data privacy info |
| My Profile | View your own employment information |

## Request Statuses

The portal uses three simple statuses visible to employees:

| Status | Meaning |
|--------|---------|
| **Submitted** | Your request has been received |
| **Under Review** | Your request is being reviewed |
| **Processed** | A decision has been made (approved or returned with feedback) |

All decisions are made by people, not automated systems. Requests are reviewed in line with the company process.

## HR / Mauritius Compliance

- Leave information references the **Workers' Rights Act 2019** for general guidance only
- Leave requests are **captured, not auto-approved** — final balance and approval subject to company records and HR review
- No payroll or salary calculations are performed
- No automatic entitlement logic is treated as final
- No disciplinary or termination features in the portal
- Sensitive employee data (NID) is masked in the UI

## Integration Readiness

The data model is designed for clean future integration:
- Consistent request types and statuses
- UUID-based identifiers
- Timestamped records with audit trails
- Standard REST API endpoints

**However**: No integration is implemented. No external system calls are made. The portal works fully standalone.

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev      # Development server
npm run build    # Production build
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

See `backend/.env.example` for required configuration. The Anthropic API key is **optional** — the portal does not use AI features.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions.
