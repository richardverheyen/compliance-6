import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { FeedbackData } from "@/lib/types/process-form";

const FEEDBACK_DIR = path.join(process.cwd(), "data", "feedback");

function sanitizeFormId(id: string): string | null {
  return /^[a-z0-9-]+$/.test(id) ? id : null;
}

async function readFeedback(formId: string): Promise<FeedbackData | null> {
  try {
    const filePath = path.join(FEEDBACK_DIR, `${formId}.json`);
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as FeedbackData;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId: rawId } = await params;
  const formId = sanitizeFormId(rawId);
  if (!formId) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  const data = await readFeedback(formId);
  return NextResponse.json(data ?? { form_id: formId });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId: rawId } = await params;
  const formId = sanitizeFormId(rawId);
  if (!formId) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  const incoming = (await req.json()) as Partial<FeedbackData>;
  const existing = (await readFeedback(formId)) ?? { form_id: formId };

  const merged: FeedbackData = {
    ...existing,
    ...incoming,
    form_id: formId,
    control_notes: {
      ...(existing.control_notes ?? {}),
      ...(incoming.control_notes ?? {}),
    },
    last_updated: new Date().toISOString(),
  };

  await mkdir(FEEDBACK_DIR, { recursive: true });
  await writeFile(
    path.join(FEEDBACK_DIR, `${formId}.json`),
    JSON.stringify(merged, null, 2),
    "utf-8",
  );

  return NextResponse.json(merged);
}
