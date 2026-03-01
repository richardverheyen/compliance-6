import { NextResponse } from "next/server";
import { getRegulationContent } from "@/mocks/regulation-content/index";
import { compileProcess } from "@/lib/process-forms";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; processId: string }> },
) {
  const { id, processId } = await params;
  const content = getRegulationContent(id);
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = content.processForms[processId];
  if (!form) {
    return NextResponse.json({ error: "Process not found" }, { status: 404 });
  }

  return NextResponse.json(compileProcess(form));
}
