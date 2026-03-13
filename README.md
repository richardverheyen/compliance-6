# Valour Compliance

**Valour Compliance** is an Australian SaaS platform that helps financial services businesses manage their regulatory obligations — starting with AML/CTF (Anti-Money Laundering and Counter-Terrorism Financing) and expanding to cover the full compliance lifecycle.

Compliance is complex, time-consuming, and high-stakes. Valour Compliance replaces spreadsheets and manual tracking with a structured, guided workflow that gives compliance officers and business owners a clear picture of where they stand, what needs attention, and what evidence they have on file.

---

## What It Does

### Regulation Management
Businesses can activate the regulations that apply to them. Valour Compliance currently supports the AML/CTF Rules and is expanding to cover additional Australian financial services regulations. Each regulation comes with structured guidance, scoping questions, and a library of compliance processes.

### Guided Self-Assessment
Step-by-step self-assessment workflows walk users through each compliance process. Each process contains structured questions, yes/no controls, and checklist items. Answers are saved in real time and progress is tracked throughout.

### Compliance Dashboard
A central dashboard gives an at-a-glance view of compliance status across all activated regulations — including outstanding processes, non-compliant items, process ownership, and last assessed dates.

### Audit Report Generation
Completed assessments can be exported as professional PDF audit reports, suitable for internal review or presentation to regulators. Reports include assessment details, process-by-process findings, and a summary of compliance status.

### Team Collaboration
Compliance processes can be assigned to specific team members. Reminders can be configured to ensure assessments are completed on schedule.

### Assessment History
All completed assessments are stored and accessible. Users can review historical assessments, track compliance trends over time, and start new assessments at any time.

---

## Changelog

### March 2026

**Compliance Assessment**
- Added comprehensive user journey E2E tests covering the full AML/CTF self-assessment workflow
- Updated AML/CTF regulation content with improved process definitions and rule coverage
- Restored checklist items within process forms, with generation and preservation logic in the content pipeline
- Fixed process form navigating away on every answer change, ensuring edits are saved in place
- Fixed form scroll jump and double-scroll behaviour on process pages

**Reporting**
- Added PDF excerpt generation and rule coverage audit to the pipeline viewer
- Fixed PDF sidebar layout to use sticky positioning for correct scrolling behaviour
- Fixed PDF navigation firing before the sidebar open animation completes

**Dashboard & UX**
- Unified compliance assessment and assessment history into a single tabbed view per assessment
- Fixed progress bar and completion status to correctly apply group-level visibility rules
- Fixed the business processes dashboard to use completed assessment data with an improved process list
- Added last assessed date and non-compliant count to the Business Processes widget
- Made process owner name clickable to open the Assign Owner modal directly from the assessment table
- Made reminder text and regulation name clickable for faster navigation
- Improved self-assessment terminology for clarity throughout the product

**Infrastructure**
- Updated pricing page to obfuscate amounts for alpha testers

### February 2026

**Compliance Assessment**
- Fixed missing key prop on list fragments in the Remediation page
- Improved checklist control rendering in the remediation table

**Dashboard & UX**
- Fixed double scrollbar caused by `h-screen`/`overflow-hidden` on the dashboard layout
- Updated user groups configuration

---

## Latest E2E Test Recordings

<!-- E2E_ARTIFACTS_START -->
## Latest E2E Test Recordings

> Last updated: 2026-03-13 · [View all runs](https://github.com/)

### Journey 2 — AML/CTF Self-Assessment

| Type | File | Link |
|------|------|------|
| 📹 Video | video.webm | [Open video](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/videos/2026-03-13/video.webm) |
| 📹 Video | video.webm | [Open video](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/videos/2026-03-13/video.webm) |
| 📄 PDF | audit-report-1773389711779.pdf | [Open PDF](https://pjwzrykeexzeftwremvm.supabase.co/storage/v1/object/public/e2e-artifacts/pdfs/2026-03-13/audit-report-1773389711779.pdf) |

*Videos open directly in browser or download as .webm. PDFs open inline.*
<!-- E2E_ARTIFACTS_END -->

---

<details>
<summary><strong>For Developers</strong></summary>

### Prerequisites

- Node.js 20+
- Docker (for local Supabase)
- A Clerk account (for authentication)

### Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start local Supabase**
   ```bash
   npx supabase start
   ```
   Copy the printed `service_role key` and `API URL` into `.env.local`.

3. **Configure environment variables**

   Create `.env.local` in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
   CLERK_SECRET_KEY=<from Clerk dashboard>
   ```

4. **Run database migrations**
   ```bash
   npx supabase db reset
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Running E2E Tests

```bash
npm run test:e2e
```

Test videos are saved to `test-results/` and PDFs to `test-results/pdfs/`.

### Uploading Test Artifacts

To upload E2E artifacts to Supabase storage and update this README with links:

```bash
export SUPABASE_ARTIFACTS_URL=https://xxxx.supabase.co
export SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY=eyJ...
npm run upload:artifacts
```

### Tech Stack

- **Framework**: Next.js 16 / React 19 / TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **State**: Zustand
- **PDF generation**: @react-pdf/renderer
- **Testing**: Playwright (E2E)

</details>
