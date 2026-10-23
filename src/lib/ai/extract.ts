import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ASSET_CATEGORIES, DOCUMENT_KINDS } from "@/lib/constants";
import { anthropic, FALLBACK, MODEL } from "./client";

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

/** Reads a receipt, invoice, warranty card or label photo and proposes structured data. */
export async function extractDocument(file: Buffer, mimeType: string, filename: string, today: string): Promise<Extraction> {
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
