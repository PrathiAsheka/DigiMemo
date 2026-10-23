import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ASSET_CATEGORIES, DOCUMENT_KINDS } from "@/lib/constants";
import { extractText } from "unpdf";
import { anthropic, FALLBACK, MODEL } from "./client";
import { ollamaChat, OllamaError, type OllamaMessage } from "./ollama";
import { aiProvider, OLLAMA_MODEL } from "./provider";

// Document intelligence (proposal §6–7): read a receipt, invoice, warranty card or
// manual and propose structured asset / warranty / cost data. Every field carries a
// confidence so the review screen can ask the user to confirm uncertain values.

const Confidence = z.enum(["high", "medium", "low"]);
const textField = z.object({ value: z.string().nullable(), confidence: Confidence });
const numberField = z.object({ value: z.number().nullable(), confidence: Confidence });

export const ExtractionSchema = z.object({
  documentKind: z.enum(DOCUMENT_KINDS),
  summary: z.string().describe("One or two sentences describing the document."),
  vendor: textField.describe("Store, installer or company that issued the document."),
  asset: z.object({
    name: textField.describe("Short everyday name for the item, e.g. 'Refrigerator' or 'Split AC unit'."),
    category: z.object({ value: z.enum(ASSET_CATEGORIES).nullable(), confidence: Confidence }),
    manufacturer: textField,
    model: textField,
    serialNumber: textField,
  }),
  purchaseDate: textField.describe("ISO date yyyy-mm-dd."),
  purchasePrice: numberField.describe("Price paid for the item itself, excluding unrelated lines."),
  currency: z.string().nullable().describe("ISO 4217 code, e.g. USD."),
  warranty: z.object({
    endDate: textField.describe("ISO date. If only a duration is stated, compute it from the purchase date."),
    durationMonths: numberField,
    provider: textField,
    terms: textField.describe("Short summary of what is covered."),
  }),
  service: z.object({
    isServiceRecord: z.boolean().describe("True if this documents a repair or maintenance visit."),
    date: textField,
    description: textField,
    cost: numberField,
  }),
  suggestedMaintenance: z
    .array(
      z.object({
        title: z.string(),
        intervalDays: z.number().int().nullable(),
        source: z.enum(["document", "general_guidance"]),
      }),
    )
    .describe("Routine owner-level maintenance stated in the document, or widely accepted for this kind of item."),
  warnings: z.array(z.string()).describe("Anything the owner should double-check, including safety notes."),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM = `You extract structured property-maintenance data from documents a homeowner uploads: receipts, invoices, warranty cards, manuals, service reports and photos of equipment labels.

Rules:
- Only report what the document supports. If a field isn't present, return null with confidence "low". Never invent serial numbers, model numbers or dates.
- confidence "high" means the value is printed clearly; "medium" means inferred or partly legible; "low" means a guess or absent.
- If a receipt lists several items, describe the main durable asset (appliance or equipment) and mention the others in warnings.
- Dates must be yyyy-mm-dd.
- suggestedMaintenance is limited to simple owner-level tasks (cleaning filters, descaling, visual checks). Mark items you add from general knowledge as "general_guidance".
- For electrical, gas, structural, roofing, HVAC refrigerant or solar work, do not suggest DIY repairs; add a warning that a qualified professional should do it.`;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function canExtract(mimeType: string) {
  return mimeType === "application/pdf" || IMAGE_TYPES.has(mimeType);
}

export async function extractDocument(file: Buffer, mimeType: string, filename: string, today: string): Promise<Extraction> {
  return aiProvider() === "ollama"
    ? extractWithOllama(file, mimeType, filename, today)
    : extractWithClaude(file, mimeType, filename, today);
}

// ── Ollama (free, local) ─────────────────────────────────────────────────────

async function pdfText(file: Buffer) {
  const { text } = await extractText(new Uint8Array(file), { mergePages: true });
  return text.replace(/[ \t]+\n/g, "\n").trim().slice(0, 40_000);
}

async function extractWithOllama(file: Buffer, mimeType: string, filename: string, today: string): Promise<Extraction> {
  const user: OllamaMessage = { role: "user", content: "" };
  const intro = `File name: ${filename}\nToday's date: ${today}\n`;
  if (mimeType === "application/pdf") {
    // Local vision models read images, not PDFs, so send the PDF's text layer.
    const text = await pdfText(file);
    if (!text) {
      throw new OllamaError("This PDF has no readable text (it's probably a scan). Upload a photo or image of it instead.");
    }
    user.content = `${intro}Document text:\n"""\n${text}\n"""\n\nExtract the data.`;
  } else {
    user.content = `${intro}The document is the attached image. Extract the data.`;
    user.images = [file.toString("base64")];
  }

  const reply = await ollamaChat({
    model: OLLAMA_MODEL(),
    messages: [
      { role: "system", content: `${SYSTEM}\n\nReply with a single JSON object that matches the provided schema, and nothing else.` },
      user,
    ],
    format: EXTRACTION_JSON_SCHEMA,
    options: { temperature: 0 },
  });

  let raw: unknown;
  try {
    raw = JSON.parse(reply);
  } catch {
    throw new OllamaError("The local model's reply wasn't valid JSON. Try again, or use a larger model.");
  }
  return normalizeExtraction(raw);
}

const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(ExtractionSchema) as Record<string, unknown>;

/**
 * Small local models often get the shape almost right (a missing field, "High" instead
 * of "high", a price as a string). Rebuild the extraction field by field, treating
 * anything unusable as "not found", so the review screen always has something to show.
 */
function normalizeExtraction(input: unknown): Extraction {
  const o = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const conf = (v: unknown) => {
    const c = String(v ?? "").toLowerCase();
    return (c === "high" || c === "medium" ? c : "low") as "high" | "medium" | "low";
  };
  const text = (v: unknown) => {
    const f = o(v);
    const raw = "value" in f ? f.value : v;
    const s = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    return s && s.toLowerCase() !== "null" ? { value: s, confidence: conf(f.confidence ?? "medium") } : { value: null, confidence: "low" as const };
  };
  const num = (v: unknown) => {
    const f = o(v);
    const raw = "value" in f ? f.value : v;
    const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? { value: n, confidence: conf(f.confidence ?? "medium") } : { value: null, confidence: "low" as const };
  };
  const oneOf = <T extends readonly string[]>(v: unknown, allowed: T): T[number] | null => {
    const s = String(v ?? "").toLowerCase();
    return (allowed as readonly string[]).includes(s) ? (s as T[number]) : null;
  };
  const isoDate = (v: unknown) => {
    const t = text(v);
    return t.value && /^\d{4}-\d{2}-\d{2}$/.test(t.value) ? t : { value: null, confidence: "low" as const };
  };

  const root = o(input);
  const asset = o(root.asset);
  const warranty = o(root.warranty);
  const service = o(root.service);
  const category = o(asset.category);
  return {
    documentKind: oneOf(root.documentKind, DOCUMENT_KINDS) ?? "other",
    summary: typeof root.summary === "string" ? root.summary : "",
    vendor: text(root.vendor),
    asset: {
      name: text(asset.name),
      category: {
        value: oneOf("value" in category ? category.value : asset.category, ASSET_CATEGORIES),
        confidence: conf(category.confidence),
      },
      manufacturer: text(asset.manufacturer),
      model: text(asset.model),
      serialNumber: text(asset.serialNumber),
    },
    purchaseDate: isoDate(root.purchaseDate),
    purchasePrice: num(root.purchasePrice),
    currency: typeof root.currency === "string" && /^[A-Za-z]{3}$/.test(root.currency) ? root.currency.toUpperCase() : null,
    warranty: {
      endDate: isoDate(warranty.endDate),
      durationMonths: num(warranty.durationMonths),
      provider: text(warranty.provider),
      terms: text(warranty.terms),
    },
    service: {
      isServiceRecord: service.isServiceRecord === true,
      date: isoDate(service.date),
      description: text(service.description),
      cost: num(service.cost),
    },
    suggestedMaintenance: (Array.isArray(root.suggestedMaintenance) ? root.suggestedMaintenance : [])
      .map(o)
      .filter((t) => typeof t.title === "string" && t.title.trim())
      .slice(0, 8)
      .map((t) => {
        const days = Number(t.intervalDays);
        return {
          title: String(t.title).trim(),
          intervalDays: Number.isInteger(days) && days > 0 ? days : null,
          source: t.source === "document" ? ("document" as const) : ("general_guidance" as const),
        };
      }),
    warnings: (Array.isArray(root.warnings) ? root.warnings : []).filter((w): w is string => typeof w === "string").slice(0, 8),
  };
}

// ── Claude ───────────────────────────────────────────────────────────────────

async function extractWithClaude(file: Buffer, mimeType: string, filename: string, today: string): Promise<Extraction> {
  const data = file.toString("base64");
  const source: Anthropic.Beta.BetaContentBlockParam =
    mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data },
        };

  const response = await anthropic.beta.messages.parse({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(ExtractionSchema) },
    messages: [
      {
        role: "user",
        content: [source, { type: "text", text: `File name: ${filename}\nToday's date: ${today}\nExtract the data.` }],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The AI declined to process this document.");
  if (!response.parsed_output) throw new Error("The AI response could not be read.");
  return response.parsed_output;
}
