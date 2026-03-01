# Database Architecture

## Overview

The app uses **Supabase** (PostgreSQL) as its data store and **Clerk** for authentication. Clerk owns the identity layer — user accounts, sessions, and organisations. Supabase stores all application data.

There is no Row-Level Security (RLS). Every API route runs with the **service-role key**, which bypasses Postgres policies. Tenant isolation is enforced in application code by scoping every query to `org_id`.

---

## Tenancy Model

Clerk provides two identity primitives:

| Clerk primitive | When used |
|---|---|
| `orgId` | User belongs to a Clerk Organisation (team account) |
| `userId` | User is signed in individually (no org) |

Every authenticated API route derives a single `tenantId`:

```ts
const { orgId, userId } = await auth();
const tenantId = orgId ?? userId;
```

All user-data rows are stored with `org_id = tenantId`. This means a user working alone and a user within an organisation each get a completely isolated data partition — using the same tables and code paths.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    regulations {
        TEXT id PK
        TEXT name
        TEXT short_name
        TEXT agency
        TEXT jurisdiction
        TEXT description
        TEXT[] applicable_services
        JSONB processes
    }

    regulation_key_dates {
        TEXT id PK
        TEXT regulation_id FK
        TEXT title
        TEXT description
        TEXT iso_date
        TEXT recurrence
        BOOLEAN is_countdown_primary
        INTEGER sort_order
    }

    calendar_events {
        TEXT id PK
        TEXT title
        TEXT date_label
        TEXT regulation_id FK
        TEXT agency
        TEXT description
    }

    team_members {
        UUID id PK
        TEXT org_id
        TEXT name
        TEXT email
        TEXT role
        TEXT avatar_color
        TIMESTAMPTZ created_at
    }

    active_regulations {
        UUID id PK
        TEXT org_id
        TEXT regulation_id FK
        TIMESTAMPTZ activated_at
        JSONB business_profile
    }

    self_assessments {
        UUID id PK
        TEXT org_id
        TEXT regulation_id
        TEXT status
        TIMESTAMPTZ started_at
        TIMESTAMPTZ completed_at
        TEXT completed_by
        JSONB section_answers
    }

    process_assignments {
        UUID id PK
        TEXT org_id
        TEXT process_id
        UUID team_member_id FK
    }

    reminders {
        UUID id PK
        TEXT org_id
        TEXT key_date_id
        TEXT regulation_id
        TEXT channel
        TEXT timing
        TEXT custom_date
        TIMESTAMPTZ created_at
    }

    regulations ||--o{ regulation_key_dates : "has key dates"
    regulations ||--o{ calendar_events : "linked to"
    regulations ||--o{ active_regulations : "activated by org"
    active_regulations ||--o{ self_assessments : "has assessments"
    team_members ||--o{ process_assignments : "assigned to process"
    regulation_key_dates ||--o{ reminders : "has reminders"
```

---

## Table Reference

### Reference Tables (no auth required)

These tables contain static regulatory content. They are seeded at startup and do not change per-tenant.

#### `regulations`

The master list of compliance regulations the platform supports.

| Column | Type | Description |
|---|---|---|
| `id` | `TEXT` | Slug identifier, e.g. `aml-ctf-rules` |
| `name` | `TEXT` | Full legal name of the regulation |
| `short_name` | `TEXT` | Short display name, e.g. `AML/CTF Rules` |
| `agency` | `TEXT` | Regulatory body, e.g. `AUSTRAC` |
| `jurisdiction` | `TEXT` | e.g. `Australia` |
| `description` | `TEXT` | Plain-language summary |
| `applicable_services` | `TEXT[]` | Service types this regulation covers |
| `processes` | `JSONB` | Array of `RegulationProcess` objects (id, name, description, frequency, parentId) |

The `processes` JSONB column stores the full process hierarchy inline. Processes with a `parentId` are sub-processes of the parent.

#### `regulation_key_dates`

Compliance deadlines and recurring obligations associated with a regulation.

| Column | Type | Description |
|---|---|---|
| `id` | `TEXT` | e.g. `aml-annual-report` |
| `regulation_id` | `TEXT FK` | References `regulations.id` |
| `title` | `TEXT` | e.g. `Annual Compliance Report` |
| `description` | `TEXT` | What must be submitted/done |
| `iso_date` | `TEXT` | Next occurrence date (`YYYY-MM-DD`) |
| `recurrence` | `TEXT` | `annual` or `once` |
| `is_countdown_primary` | `BOOLEAN` | Whether to highlight this date in the countdown widget |
| `sort_order` | `INTEGER` | Display order within a regulation |

#### `calendar_events`

Upcoming compliance events shown in the dashboard Obligation Calendar. Not all events are tied to an activated regulation.

| Column | Type | Description |
|---|---|---|
| `id` | `TEXT` | e.g. `cal-aml-annual` |
| `title` | `TEXT` | Display title |
| `date_label` | `TEXT` | Short date label, e.g. `MAR 31` |
| `regulation_id` | `TEXT FK` | Optional — `NULL` for non-regulation events |
| `agency` | `TEXT` | Regulatory body |
| `description` | `TEXT` | Brief description |

---

### Org-Scoped Tables (auth required)

All rows in these tables include `org_id TEXT NOT NULL`, which is set to the Clerk `tenantId` at write time. All reads filter by `org_id = tenantId`.

#### `team_members`

People within the organisation who can be assigned to compliance processes.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `org_id` | `TEXT` | Clerk `tenantId` |
| `name` | `TEXT` | Full name |
| `email` | `TEXT` | Email address |
| `role` | `TEXT` | Job title / role |
| `avatar_color` | `TEXT` | Tailwind class for avatar display |
| `created_at` | `TIMESTAMPTZ` | When added |

#### `active_regulations`

Which regulations an organisation has opted into. Has a unique constraint on `(org_id, regulation_id)` — an org can only activate a regulation once.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `org_id` | `TEXT` | Clerk `tenantId` |
| `regulation_id` | `TEXT FK` | References `regulations.id` |
| `activated_at` | `TIMESTAMPTZ` | When the org activated this regulation |
| `business_profile` | `JSONB` | Org's scoping answers from the introduction form |

When a regulation is activated, the API automatically creates a `self_assessments` row in the same transaction (status = `in_progress`), so an org always enters assessment state B immediately.

#### `self_assessments`

A compliance self-assessment run for a regulation. An org can have multiple assessments per regulation over time (previous ones are `completed`, the current one is `in_progress`).

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `org_id` | `TEXT` | Clerk `tenantId` |
| `regulation_id` | `TEXT` | Regulation being assessed |
| `status` | `TEXT` | `in_progress` or `completed` |
| `started_at` | `TIMESTAMPTZ` | When the assessment began |
| `completed_at` | `TIMESTAMPTZ` | When completed (`NULL` if in progress) |
| `completed_by` | `TEXT` | Name/identifier of person who completed it |
| `section_answers` | `JSONB` | Map of `{ [sectionId]: Record<questionId, answer> }` |

**`section_answers` structure:**
```json
{
  "risk-assessment": { "q1": "Yes", "q2": "No" },
  "customer-due-diligence": { "q1": "Yes" },
  "PROC-AML-001": { "step1": "completed" }
}
```
The key `"risk-assessment"` holds the regulation introduction/scoping answers. All other keys are process slugs.

The **active assessment** for a regulation is determined at query time by `status = 'in_progress'` — there is no dedicated column.

#### `process_assignments`

Maps a compliance process (by its string ID) to a team member. Unique per `(org_id, process_id)`.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `org_id` | `TEXT` | Clerk `tenantId` |
| `process_id` | `TEXT` | e.g. `PROC-AML-001` |
| `team_member_id` | `UUID FK` | References `team_members.id` |

#### `reminders`

Notification preferences for a specific regulation key date.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `org_id` | `TEXT` | Clerk `tenantId` |
| `key_date_id` | `TEXT` | References `regulation_key_dates.id` |
| `regulation_id` | `TEXT` | Denormalised for filtering convenience |
| `channel` | `TEXT` | e.g. `email`, `in-app` |
| `timing` | `TEXT` | e.g. `1-week`, `custom` |
| `custom_date` | `TEXT` | ISO date string when `timing = 'custom'` |
| `created_at` | `TIMESTAMPTZ` | When created |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Middleware as Next.js Middleware<br/>(Clerk)
    participant API as API Route
    participant Supabase

    Browser->>Middleware: GET /dashboard/...
    Middleware->>Middleware: Verify Clerk session token
    alt Not authenticated
        Middleware-->>Browser: Redirect to /sign-in
    else Authenticated
        Middleware-->>Browser: Allow request
    end

    Browser->>API: GET /api/compliance/team
    API->>API: auth() → { orgId, userId }
    API->>API: tenantId = orgId ?? userId
    API->>Supabase: SELECT * FROM team_members<br/>WHERE org_id = tenantId
    Supabase-->>API: Rows
    API-->>Browser: JSON response
```

---

## API Route Reference

### Static Routes (no authentication)

These routes serve reference data and require no Clerk session.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/compliance/regulations` | All regulations |
| `GET` | `/api/compliance/regulations/[id]` | Single regulation |
| `GET` | `/api/compliance/regulations/[id]/introduction` | Introduction form schema |
| `GET` | `/api/compliance/regulations/[id]/manifest` | Process list manifest |
| `GET` | `/api/compliance/regulations/[id]/key-dates` | Key compliance dates |
| `GET` | `/api/compliance/regulations/[id]/processes/[processId]/schema` | Process form schema |
| `GET` | `/api/compliance/calendar` | Calendar events |

### Authenticated Routes (org-scoped)

These routes call `auth()` and scope all queries to `tenantId`. A 401 is returned if no valid session exists.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/compliance/team` | List team members |
| `POST` | `/api/compliance/team` | Add a team member |
| `PATCH` | `/api/compliance/team/[id]` | Update a team member |
| `DELETE` | `/api/compliance/team/[id]` | Remove a team member |
| `GET` | `/api/compliance/active-regulations` | All activated regulations + assessments |
| `POST` | `/api/compliance/active-regulations` | Activate a regulation (also creates first assessment) |
| `POST` | `/api/compliance/active-regulations/[regulationId]/assessments` | Start a new assessment |
| `PATCH` | `/api/compliance/active-regulations/[regulationId]/assessments/[assessmentId]` | Complete an assessment |
| `PATCH` | `/api/compliance/active-regulations/[regulationId]/assessments/[assessmentId]/section-answers/[sectionId]` | Save answers for one section |
| `GET` | `/api/compliance/process-assignments` | All process → team member assignments |
| `PUT` | `/api/compliance/process-assignments/[processId]` | Assign a process to a team member |
| `DELETE` | `/api/compliance/process-assignments/[processId]` | Remove an assignment |
| `GET` | `/api/compliance/reminders` | All reminders for the org |
| `POST` | `/api/compliance/reminders` | Create a reminder |
| `DELETE` | `/api/compliance/reminders/[id]` | Delete a reminder |

---

## Data Flow: Activating a Regulation

```mermaid
sequenceDiagram
    participant Client as Browser (Zustand store)
    participant API
    participant Supabase

    Client->>API: POST /api/compliance/active-regulations<br/>{ regulationId, businessProfile, introAnswers }
    API->>Supabase: UPSERT active_regulations<br/>{ org_id, regulation_id, business_profile }
    Supabase-->>API: active_regulation row
    API->>Supabase: INSERT self_assessments<br/>{ org_id, regulation_id, status: "in_progress",<br/>  section_answers: { "risk-assessment": introAnswers } }
    Supabase-->>API: self_assessment row
    API-->>Client: { regulationId, activatedAt, selfAssessments, activeAssessmentId }
    Client->>Client: Update local Zustand cache
```

---

## Data Flow: Saving Assessment Answers

```mermaid
sequenceDiagram
    participant Client as Browser (SectionForm)
    participant API
    participant Supabase

    Client->>API: PATCH .../assessments/[assessmentId]/section-answers/[sectionId]<br/>{ questionId: answer, ... }
    API->>Supabase: SELECT section_answers FROM self_assessments<br/>WHERE id = assessmentId AND org_id = tenantId
    Supabase-->>API: existing section_answers
    API->>API: Merge: { ...existing, [sectionId]: newAnswers }
    API->>Supabase: UPDATE self_assessments SET section_answers = merged
    Supabase-->>API: OK
    API-->>Client: { ok: true }
    Client->>Client: Update local Zustand cache
```

---

## Local Development

**Prerequisites:** Docker Desktop running.

```bash
# Start Supabase (use pinned version — v2.76+ has a broken storage-api image)
npx supabase@2.75.0 start

# Start the Next.js app
npm run dev
```

The local Supabase keys are deterministic — `.env.local` is already configured with the correct values and does not need updating between restarts.

**Local services:**

| Service | URL |
|---|---|
| API / PostgREST | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Database (Postgres) | postgres://postgres:postgres@127.0.0.1:54322/postgres |
| Inbucket (email) | http://127.0.0.1:54324 |

**Resetting the database** (re-runs migrations + seed):
```bash
npx supabase@2.75.0 db reset
```
