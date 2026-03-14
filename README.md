# Valour Compliance — Internal

## Latest Changes

| Date | Area | Change |
|------|------|--------|
| Mar 2026 | Testing | Added full E2E test suite covering account creation and AML/CTF self-assessment (video recorded for each journey) |
| Mar 2026 | Compliance Assessment | Restored checklist items in process forms with generation and preservation logic |
| Mar 2026 | Compliance Assessment | Fixed process forms navigating away on every answer change |
| Mar 2026 | Compliance Assessment | Fixed form scroll jump and double-scroll on process pages |
| Mar 2026 | Reporting | Added PDF excerpt generation and rule coverage audit to the pipeline viewer |
| Mar 2026 | Reporting | Fixed PDF sidebar sticky layout and PDF navigation animation timing |
| Mar 2026 | Dashboard | Unified assessment and history into a single tabbed view per assessment |
| Mar 2026 | Dashboard | Fixed progress bar and completion status to apply group-level visibility rules correctly |
| Mar 2026 | Dashboard | Added last assessed date and non-compliant count to Business Processes widget |
| Mar 2026 | Dashboard | Made process owner name clickable to open Assign Owner modal from the assessment table |
| Mar 2026 | Dashboard | Fixed double scrollbar on dashboard layout |
| Mar 2026 | UX | Improved self-assessment terminology, clickable reminder text and regulation names throughout |
| Mar 2026 | Infrastructure | Obfuscated pricing page amounts for alpha testers |
| Feb 2026 | Compliance Assessment | Fixed missing key prop on list fragments in the Remediation page |
| Feb 2026 | Compliance Assessment | Improved checklist control rendering in the remediation table |

---

## E2E Test Recordings

Both user journeys are recorded end-to-end on every test run.

<!-- E2E_ARTIFACTS_START -->
### E2E Test Recordings

_Last updated: 2026-03-14_

#### Journey 1 — Account Creation
- 📹 **Video** — [Watch recording](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/videos/2026-03-14/journey-01-video.webm)

#### Journey 2 — AML/CTF Self-Assessment
- 📹 **Video** — [Watch recording](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/videos/2026-03-14/journey-02-video.webm)
- 📄 **PDF** — [Open audit report](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/pdfs/2026-03-14/audit-report-1773389711779.pdf)
<!-- E2E_ARTIFACTS_END -->

**Journey 1 — Account Creation**: Signs up a new user, creates an organisation, and lands on the dashboard.

**Journey 2 — AML/CTF Self-Assessment**: Activates the AML/CTF regulation, completes every compliance process form with fully compliant answers, completes the assessment, and generates an Audit Report PDF.

---

<details>
<summary><strong>Developer Setup</strong></summary>

### Prerequisites

- Node.js 20+
- Docker (for local Supabase)
- Clerk account

### Local Setup

```bash
npm install
npx supabase start        # copy printed API URL + service_role key to .env.local
npm run dev
```

`.env.local` required keys:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
CLERK_SECRET_KEY=<from Clerk dashboard>
```

### E2E Tests

```bash
npm run test:e2e
```

### Upload Artifacts & Update README

```bash
export SUPABASE_ARTIFACTS_URL=https://pjwzrykeexzeftwremvm.supabase.co
export SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY=<service_role key>
npm run upload:artifacts
```

### Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Clerk · Supabase · Zustand · @react-pdf/renderer · Playwright

</details>
