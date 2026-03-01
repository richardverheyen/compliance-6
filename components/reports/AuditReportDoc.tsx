import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type {
  ActiveRegulation,
  OrgProfile,
  Regulation,
  SelfAssessment,
  TeamMember,
} from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditReportData {
  regulation: Regulation;
  activeRegulation: ActiveRegulation;
  orgName: string;
  orgProfile: OrgProfile | null;
  allAssessments: SelfAssessment[];
  teamMembers: TeamMember[];
  generatedAt: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const INDIGO = "#4f46e5";
const GREEN = "#16a34a";
const AMBER = "#d97706";
const RED = "#dc2626";
const GRAY_100 = "#f3f4f6";
const GRAY_400 = "#9ca3af";
const GRAY_600 = "#4b5563";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: GRAY_900,
    paddingTop: 40,
    paddingBottom: 55,
    paddingHorizontal: 40,
  },
  coverPage: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: WHITE,
    backgroundColor: INDIGO,
    paddingTop: 80,
    paddingBottom: 55,
    paddingHorizontal: 50,
  },
  coverLabel: {
    fontSize: 11,
    color: "#c7d2fe",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: WHITE,
    marginBottom: 10,
  },
  coverRegName: {
    fontSize: 14,
    color: "#c7d2fe",
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 10,
    color: "#e0e7ff",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopColor: GRAY_400,
    borderTopWidth: 0.5,
    paddingTop: 6,
    fontSize: 8,
    color: GRAY_400,
  },
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: INDIGO,
    borderBottomColor: INDIGO,
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 12,
    marginTop: 20,
  },
  subHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: GRAY_900,
    marginBottom: 6,
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GRAY_600,
    width: 130,
  },
  metaValue: {
    fontSize: 9,
    color: GRAY_900,
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: INDIGO,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: GRAY_100,
  },
  pill: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  processBlock: {
    marginBottom: 14,
    borderLeftColor: INDIGO,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  processTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: INDIGO,
    marginBottom: 3,
  },
  processOwner: {
    fontSize: 9,
    color: GRAY_600,
    marginBottom: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomColor: GRAY_100,
    borderBottomWidth: 1,
  },
  stepTitle: {
    fontSize: 9,
    color: GRAY_700,
    flex: 1,
  },
  regProcessBlock: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: GRAY_100,
    borderRadius: 4,
  },
  regProcessName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 3,
  },
  regProcessDesc: {
    fontSize: 9,
    color: GRAY_600,
    marginBottom: 3,
  },
  regProcessFreq: {
    fontSize: 8,
    color: GRAY_400,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ratingColor(rating: string) {
  if (rating === "green") return GREEN;
  if (rating === "yellow") return AMBER;
  return RED;
}

function ratingLabel(rating: string) {
  if (rating === "green") return "Compliant";
  if (rating === "yellow") return "Needs Attention";
  return "Non-Compliant";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function assessmentRef(id: string) {
  return `ASMT-${id.slice(-6).toUpperCase()}`;
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function PageFooter({
  regulationName,
  generatedAt,
}: {
  regulationName: string;
  generatedAt: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{regulationName} · Compliance Audit Report</Text>
      <Text>{formatDate(generatedAt)}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

function AuditReportDocument({ data }: { data: AuditReportData }) {
  const { regulation, activeRegulation, orgName, orgProfile, allAssessments, teamMembers, generatedAt } = data;
  const { processes } = activeRegulation;

  const latestAssessment = [...allAssessments]
    .filter((s) => s.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return undefined;
    return teamMembers.find((m) => m.id === ownerId)?.name;
  };

  return (
    <Document title={`Compliance Audit Report — ${regulation.shortName}`}>
      {/* ── Cover page ─────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text style={styles.coverLabel}>Compliance Audit Report</Text>
            <Text style={styles.coverTitle}>{regulation.name}</Text>
            <Text style={styles.coverRegName}>{regulation.agency}</Text>
            <Text style={[styles.coverMeta, { marginTop: 6 }]}>
              {regulation.jurisdiction}
            </Text>
          </View>
          <View>
            <Text style={styles.coverMeta}>
              Organisation: {orgName}
            </Text>
            <Text style={styles.coverMeta}>Generated: {formatDate(generatedAt)}</Text>
            {latestAssessment && (
              <Text style={styles.coverMeta}>
                Assessment Ref: {assessmentRef(latestAssessment.id)}
              </Text>
            )}
          </View>
        </View>
      </Page>

      {/* ── Main content ───────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PageFooter
          regulationName={regulation.shortName}
          generatedAt={generatedAt}
        />

        {/* Section 1 — Regulation Details */}
        <Text style={styles.sectionHeader}>1. Regulation Details</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Full Name</Text>
          <Text style={styles.metaValue}>{regulation.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Short Name</Text>
          <Text style={styles.metaValue}>{regulation.shortName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Agency</Text>
          <Text style={styles.metaValue}>{regulation.agency}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Jurisdiction</Text>
          <Text style={styles.metaValue}>{regulation.jurisdiction}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Description</Text>
          <Text style={styles.metaValue}>{regulation.description}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Applicable Services</Text>
          <Text style={styles.metaValue}>
            {regulation.applicableServices.join(", ")}
          </Text>
        </View>

        {/* Section 2 — Organisation Profile */}
        <Text style={styles.sectionHeader}>2. Organisation Profile</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Organisation Name</Text>
          <Text style={styles.metaValue}>{orgName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Location</Text>
          <Text style={styles.metaValue}>{orgProfile?.location ?? "—"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Applicable Services</Text>
          <Text style={styles.metaValue}>
            {orgProfile?.applicableServices.length ? orgProfile.applicableServices.join(", ") : "—"}
          </Text>
        </View>

        {/* Section 3 — Assessment History */}
        <Text style={styles.sectionHeader}>3. Assessment History</Text>
        {allAssessments.length === 0 ? (
          <Text style={{ color: GRAY_400, fontSize: 9 }}>No assessments on record.</Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={{ width: "18%" }}>Reference</Text>
              <Text style={{ width: "16%" }}>Status</Text>
              <Text style={{ width: "22%" }}>Started</Text>
              <Text style={{ width: "22%" }}>Completed</Text>
              <Text style={{ width: "22%" }}>Completed By</Text>
            </View>
            {allAssessments
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
              .map((assessment, i) => (
                <View
                  key={assessment.id}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={{ width: "18%" }}>
                    {assessmentRef(assessment.id)}
                  </Text>
                  <Text style={{ width: "16%", color: assessment.status === "completed" ? GREEN : AMBER }}>
                    {assessment.status === "completed" ? "Completed" : "In Progress"}
                  </Text>
                  <Text style={{ width: "22%", color: GRAY_700 }}>
                    {formatDate(assessment.startedAt)}
                  </Text>
                  <Text style={{ width: "22%", color: GRAY_700 }}>
                    {assessment.completedAt ? formatDate(assessment.completedAt) : "—"}
                  </Text>
                  <Text style={{ width: "22%", color: GRAY_700 }}>
                    {assessment.completedBy ?? "—"}
                  </Text>
                </View>
              ))}
          </>
        )}

        {/* Section 4 — Process Compliance Detail */}
        <Text style={styles.sectionHeader}>4. Process Compliance Detail</Text>
        {processes.length === 0 ? (
          <Text style={{ color: GRAY_400, fontSize: 9 }}>
            No process data available. Complete a self-assessment to populate
            compliance details.
          </Text>
        ) : (
          processes.map((process) => {
            const rating = getProcessRating(process);
            const ownerName = getOwnerName(process.ownerId);
            return (
              <View key={process.id} style={styles.processBlock} wrap={false}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Text style={styles.processTitle}>{process.title}</Text>
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: ratingColor(rating) },
                    ]}
                  >
                    <Text>{ratingLabel(rating)}</Text>
                  </View>
                </View>
                {ownerName && (
                  <Text style={styles.processOwner}>Owner: {ownerName}</Text>
                )}
                {process.steps.map((step) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: ratingColor(step.rating),
                        marginRight: 6,
                        flexShrink: 0,
                      }}
                    />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: ratingColor(step.rating) },
                      ]}
                    >
                      <Text>{ratingLabel(step.rating)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}

        {/* Section 5 — Regulation Processes Catalogue */}
        <Text style={styles.sectionHeader}>5. Regulation Processes Catalogue</Text>
        {regulation.processes.map((regProcess) => (
          <View key={regProcess.id} style={styles.regProcessBlock} wrap={false}>
            <Text style={styles.regProcessName}>{regProcess.name}</Text>
            <Text style={styles.regProcessDesc}>{regProcess.description}</Text>
            <Text style={styles.regProcessFreq}>
              Frequency: {regProcess.frequencyLabel}
              {regProcess.frequencyDetail ? ` — ${regProcess.frequencyDetail}` : ""}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ─── Generator ───────────────────────────────────────────────────────────────

export async function generateAuditReportPDF(
  data: AuditReportData,
): Promise<string> {
  const blob = await pdf(<AuditReportDocument data={data} />).toBlob();
  return URL.createObjectURL(blob);
}
