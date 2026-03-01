import { NextResponse } from "next/server";
import { getRegulationContent } from "@/mocks/regulation-content/index";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const content = getRegulationContent(id);
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(content.introduction);
}
