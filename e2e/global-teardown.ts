import { createClerkClient } from "@clerk/backend";
import * as fs from "fs";
import * as path from "path";

/** Mirror of the loader in global-setup.ts */
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function isTestEmail(email: string) {
  return email.startsWith("e2e-") && email.includes("+clerk_test@");
}

export default async function globalTeardown() {
  loadEnvLocal();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.warn("[teardown] CLERK_SECRET_KEY not set — skipping Clerk cleanup");
    return;
  }

  const clerk = createClerkClient({ secretKey });

  // ── 1. Delete test organisations first (orgs can outlive their sole admin) ──
  let deletedOrgs = 0;
  let orgOffset = 0;
  const PAGE = 100;

  outer: while (true) {
    const { data: orgs } = await clerk.organizations.getOrganizationList({
      limit: PAGE,
      offset: orgOffset,
    });

    for (const org of orgs) {
      if (!org.name.startsWith("E2E Test")) continue;
      try {
        await clerk.organizations.deleteOrganization(org.id);
        deletedOrgs++;
      } catch (err) {
        console.warn(`[teardown] Could not delete org ${org.id} (${org.name}):`, err);
      }
    }

    if (orgs.length < PAGE) break outer;
    orgOffset += PAGE;
  }

  console.log(`[teardown] Deleted ${deletedOrgs} test org(s)`);

  // ── 2. Delete test users (email starts with e2e- and has +clerk_test@ suffix) ─
  let deletedUsers = 0;
  let userOffset = 0;

  outer: while (true) {
    const { data: users } = await clerk.users.getUserList({
      limit: PAGE,
      offset: userOffset,
    });

    for (const user of users) {
      const isTest = user.emailAddresses.some((e) => isTestEmail(e.emailAddress));
      if (!isTest) continue;
      try {
        await clerk.users.deleteUser(user.id);
        deletedUsers++;
      } catch (err) {
        console.warn(`[teardown] Could not delete user ${user.id}:`, err);
      }
    }

    if (users.length < PAGE) break outer;
    userOffset += PAGE;
  }

  console.log(`[teardown] Deleted ${deletedUsers} test user(s)`);
}
