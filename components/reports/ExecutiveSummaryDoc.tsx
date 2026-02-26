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
  BusinessProcess,
  Regulation,
  SelfAssessment,
  TeamMember,
} from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegulationSummary {
  regulationId: string;
  name: string;
  shortName: string;
  agency: string;
  lastAssessment: SelfAssessment | undefined;
  processes: BusinessProcess[];
}

export interface ExecutiveSummaryData {
  user: { id: string; email: string; name: string } | null;
  companyName: string;
  healthScore: number;
  compliantProcesses: number;
  totalProcesses: number;
  teamMembers: TeamMember[];
  regulationSummaries: RegulationSummary[];
  generatedAt: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const INDIGO = "#4f46e5";
const GREEN = "#16a34a";
const AMBER = "#d97706";
const RED = "#dc2626";
const GRAY_100 = "#f3f4f6";
const GRAY_400 = "#9ca3af";
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
  // Cover
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
    fontSize: 12,
    color: "#c7d2fe",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 30,
    color: WHITE,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#c7d2fe",
    marginBottom: 60,
  },
  coverMeta: {
    fontSize: 10,
    color: "#e0e7ff",
    marginBottom: 4,
  },
  // Footer
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
  // Section header
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
  // Health score circle
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 8,
  },
  scoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  scoreLabel: {
    fontSize: 10,
    color: GRAY_400,
  },
  // Table
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
  // Pill
  pill: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  // Risk item
  riskProcess: {
    marginBottom: 10,
  },
  riskTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
    color: GRAY_900,
  },
  riskStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
    paddingLeft: 10,
  },
  riskStepText: {
    fontSize: 9,
    color: GRAY_700,
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

// ─── Footer ──────────────────────────────────────────────────────────────────

function PageFooter({
  companyName,
  generatedAt,
}: {
  companyName: string;
  generatedAt: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{companyName} · Compliance Executive Summary</Text>
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

function ExecutiveSummaryDocument({ data }: { data: ExecutiveSummaryData }) {
  const {
    user,
    companyName,
    healthScore,
    compliantProcesses,
    totalProcesses,
    teamMembers,
    regulationSummaries,
    generatedAt,
  } = data;

  const healthColor = healthScore > 70 ? GREEN : healthScore > 40 ? AMBER : RED;

  // Collect non-green processes for "Areas Requiring Attention"
  const attentionItems = regulationSummaries
    .map((reg) => ({
      ...reg,
      atRiskProcesses: reg.processes.filter(
        (p) => getProcessRating(p) !== "green",
      ),
    }))
    .filter((r) => r.atRiskProcesses.length > 0);

  return (
    <Document title="Compliance Executive Summary">
      {/* ── Cover page ─────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text style={styles.coverLabel}>Confidential</Text>
            <Text style={styles.coverTitle}>Compliance{"\n"}Executive Summary</Text>
            <Text style={styles.coverSubtitle}>{companyName}</Text>
          </View>
          <View>
            <Text style={styles.coverMeta}>Generated: {formatDate(generatedAt)}</Text>
            {user && <Text style={styles.coverMeta}>Prepared for: {user.name}</Text>}
            <Text style={styles.coverMeta}>
              {regulationSummaries.length} active regulation
              {regulationSummaries.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </Page>

      {/* ── Main content ───────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PageFooter companyName={companyName} generatedAt={generatedAt} />

        {/* Section 1 — Compliance Health */}
        <Text style={styles.sectionHeader}>1. Compliance Health</Text>
        <View style={styles.scoreRow}>
          <View
            style={[
              styles.scoreCircle,
              { borderColor: healthColor },
            ]}
          >
            <Text style={[styles.scoreNumber, { color: healthColor }]}>
              {healthScore}%
            </Text>
          </View>
          <View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
              Overall Compliance Score
            </Text>
            <Text style={styles.scoreLabel}>
              {compliantProcesses} of {totalProcesses} processes fully compliant
            </Text>
            <Text style={[styles.scoreLabel, { marginTop: 4 }]}>
              {totalProcesses - compliantProcesses} process
              {totalProcesses - compliantProcesses !== 1 ? "es" : ""} require
              attention
            </Text>
          </View>
        </View>

        {/* Section 2 — Regulation Overview */}
        <Text style={styles.sectionHeader}>2. Regulation Overview</Text>
        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={{ width: "30%" }}>Regulation</Text>
          <Text style={{ width: "20%" }}>Agency</Text>
          <Text style={{ width: "25%" }}>Last Assessed</Text>
          <Text style={{ width: "15%", textAlign: "center" }}>Compliant</Text>
          <Text style={{ width: "10%", textAlign: "center" }}>Status</Text>
        </View>
        {regulationSummaries.map((reg, i) => {
          const compliant = reg.processes.filter(
            (p) => getProcessRating(p) === "green",
          ).length;
          const total = reg.processes.length;
          const overallRating =
            total === 0
              ? "green"
              : compliant === total
                ? "green"
                : compliant > total / 2
                  ? "yellow"
                  : "red";
          return (
            <View
              key={reg.regulationId}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={{ width: "30%" }}>{reg.shortName}</Text>
              <Text style={{ width: "20%", color: GRAY_700 }}>{reg.agency}</Text>
              <Text style={{ width: "25%", color: GRAY_700 }}>
                {reg.lastAssessment?.completedAt
                  ? formatDate(reg.lastAssessment.completedAt)
                  : reg.lastAssessment
                    ? "In progress"
                    : "Not assessed"}
              </Text>
              <Text style={{ width: "15%", textAlign: "center", color: GRAY_700 }}>
                {compliant}/{total}
              </Text>
              <View
                style={{
                  width: "10%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: ratingColor(overallRating) },
                  ]}
                >
                  <Text>{overallRating === "green" ? "OK" : overallRating === "yellow" ? "!" : "!!"}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Section 3 — Areas Requiring Attention */}
        <Text style={styles.sectionHeader}>3. Areas Requiring Attention</Text>
        {attentionItems.length === 0 ? (
          <Text style={{ color: GREEN, fontFamily: "Helvetica-Bold", fontSize: 10 }}>
            All processes are fully compliant. No areas requiring attention.
          </Text>
        ) : (
          attentionItems.map((reg) => (
            <View key={reg.regulationId}>
              <Text
                style={{
                  fontFamily: "Helvetica-Bold",
                  fontSize: 11,
                  color: INDIGO,
                  marginBottom: 6,
                }}
              >
                {reg.shortName}
              </Text>
              {reg.atRiskProcesses.map((process) => {
                const rating = getProcessRating(process);
                const atRiskSteps = process.steps.filter(
                  (s) => s.rating !== "green",
                );
                return (
                  <View key={process.id} style={styles.riskProcess}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Text style={styles.riskTitle}>{process.title}</Text>
                      <View
                        style={[
                          styles.pill,
                          { backgroundColor: ratingColor(rating) },
                        ]}
                      >
                        <Text>{ratingLabel(rating)}</Text>
                      </View>
                    </View>
                    {atRiskSteps.map((step) => (
                      <View key={step.id} style={styles.riskStep}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: ratingColor(step.rating),
                          }}
                        />
                        <Text style={styles.riskStepText}>{step.title}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* Section 4 — Team */}
        <Text style={styles.sectionHeader}>4. Team</Text>
        <View style={styles.tableHeader}>
          <Text style={{ width: "40%" }}>Name</Text>
          <Text style={{ width: "40%" }}>Email</Text>
          <Text style={{ width: "20%" }}>Role</Text>
        </View>
        {teamMembers.map((member, i) => (
          <View
            key={member.id}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={{ width: "40%" }}>{member.name}</Text>
            <Text style={{ width: "40%", color: GRAY_700 }}>{member.email}</Text>
            <Text style={{ width: "20%", color: GRAY_700 }}>{member.role}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ─── Generator ───────────────────────────────────────────────────────────────

export async function generateExecutiveSummaryPDF(
  data: ExecutiveSummaryData,
): Promise<string> {
  const blob = await pdf(<ExecutiveSummaryDocument data={data} />).toBlob();
  return URL.createObjectURL(blob);
}
