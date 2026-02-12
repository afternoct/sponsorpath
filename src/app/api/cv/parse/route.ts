import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

function extractFields(text: string) {
  const email = (text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i) ?? [null])[0];
  const phone = (text.match(/(\+?\d[\d\s()-]{8,}\d)/) ?? [null])[0];
  const linkedin =
    (text.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9-_%/]+/i) ?? [null])[0] ||
    (text.match(/(www\.)?linkedin\.com\/in\/[A-Za-z0-9-_%/]+/i) ?? [null])[0];

  // crude name guess: first non-empty line that is not an email/phone/url
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const fullName =
    lines.find(l => l.length <= 50 && !l.includes("@") && !l.toLowerCase().includes("linkedin") && !/\d/.test(l)) ||
    "";

  return { fullName, email: email ?? "", phone: phone ?? "", linkedin: linkedin ?? "" };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();

  let text = "";

  if (name.endsWith(".pdf")) {
    const out = await pdf(buf);
    text = out.text || "";
  } else if (name.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer: buf });
    text = out.value || "";
  } else {
    return NextResponse.json({ error: "Only PDF or DOCX supported" }, { status: 400 });
  }

  text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  const fields = extractFields(text);

  return NextResponse.json({ text, fields });
}
