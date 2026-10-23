import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { anthropic, FALLBACK, MODEL } from "./client";

// AI Property Assistant (proposal §5–6): answers questions over the user's own
// property record. The whole record is small for a home, so it goes in the system
// prompt (prompt-cached) instead of a retrieval index; swap in search for portfolios.

const INSTRUCTIONS = `You are the Home Digital Twin assistant. You help an owner understand and maintain their property using the property record below, which is the system's live data.

How to answer:
- Ground every answer in the record. Cite the specific asset, date, provider or amount you used. If the record doesn't contain the answer, say so plainly and suggest what to add (e.g. "upload the receipt" or "add the install date").
- Today's date is given with the record; use it for "this month", "overdue", warranty status and asset age.
- Be concise. The chat shows plain text: use short "-" bullet lists when listing several items, and no markdown headings, tables or bold.
- You can give general, widely accepted owner-level maintenance guidance (cleaning filters, checking seals), and say when it is general guidance rather than from their records.
- Safety: never give instructions for electrical, gas, structural, roofing, refrigerant or solar repairs, and never state that such a system is safe. Recommend a qualified, licensed professional for those, and for any sign of burning smells, sparks, gas odour, water near electrics, or structural cracking, tell the user to stop using the system and contact a professional or emergency services.
- You cannot change records yourself. Tell the user which page to use (Maintenance, Work orders, Documents, Costs) when they want to add or change something.`;

const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : "?");

/** Renders the user's property data as compact text for the model. */
export async function buildPropertyContext(userId: string, propertyId: string | null) {
  const properties = await db.property.findMany({
    where: { ownerId: userId, ...(propertyId ? { id: propertyId } : {}) },
    orderBy: { createdAt: "asc" },
    include: {
      spaces: true,
      assets: { include: { warranties: true, space: { select: { name: true } } }, orderBy: { name: "asc" } },
      tasks: { include: { asset: { select: { name: true } } }, orderBy: { nextDueDate: "asc" } },
      workOrders: {
        include: { asset: { select: { name: true } }, provider: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      costRecords: { include: { asset: { select: { name: true } } }, orderBy: { date: "desc" }, take: 300 },
      documents: { select: { filename: true, kind: true, createdAt: true, asset: { select: { name: true } } }, take: 200 },
    },
  });
  const providers = await db.serviceProvider.findMany({ where: { ownerId: userId } });

  const lines: string[] = [];
  for (const p of properties) {
    lines.push(`## Property: ${p.name} (${p.type}${p.address ? `, ${p.address}` : ""}${p.yearBuilt ? `, built ${p.yearBuilt}` : ""})`);
    if (p.notes) lines.push(`Notes: ${p.notes}`);
    lines.push(`Spaces: ${p.spaces.map((s) => s.name).join(", ") || "none"}`);

    lines.push(`\n### Assets (${p.assets.length})`);
    for (const a of p.assets) {
      const parts = [
        a.category,
        a.space?.name && `in ${a.space.name}`,
        a.manufacturer && `make ${a.manufacturer}`,
        a.model && `model ${a.model}`,
        a.serialNumber && `serial ${a.serialNumber}`,
        a.purchaseDate && `purchased ${d(a.purchaseDate)}`,
        a.installDate && `installed ${d(a.installDate)}`,
        a.purchasePrice != null && `price $${a.purchasePrice}`,
        a.expectedLifeYears && `expected life ${a.expectedLifeYears}y`,
        `status ${a.status}`,
      ].filter(Boolean);
      lines.push(`- ${a.name}: ${parts.join("; ")}`);
      for (const w of a.warranties) {
        lines.push(`  - warranty${w.provider ? ` (${w.provider})` : ""}: ${d(w.startDate)} to ${d(w.endDate)}${w.terms ? `, ${w.terms}` : ""}`);
      }
      if (a.notes) lines.push(`  - notes: ${a.notes}`);
    }

    lines.push(`\n### Maintenance schedule`);
    for (const t of p.tasks) {
      lines.push(
        `- ${t.title}${t.asset ? ` [${t.asset.name}]` : ""}: ${t.active ? `next due ${d(t.nextDueDate)}` : "completed (one-off)"}; ${
          t.intervalDays ? `every ${t.intervalDays} days` : "one-off"
        }; last done ${d(t.lastCompletedAt)}`,
      );
    }

    lines.push(`\n### Work orders and service history`);
    for (const w of p.workOrders) {
      lines.push(
        `- ${w.title}${w.asset ? ` [${w.asset.name}]` : ""}: ${w.status}, priority ${w.priority}${w.provider ? `, by ${w.provider.name}` : ""}${
          w.completedAt ? `, completed ${d(w.completedAt)}` : w.scheduledFor ? `, scheduled ${d(w.scheduledFor)}` : `, opened ${d(w.createdAt)}`
        }${w.resolution ? `; ${w.resolution}` : ""}`,
      );
    }

    lines.push(`\n### Costs`);
    for (const c of p.costRecords) {
      lines.push(`- ${d(c.date)} ${c.category} ${c.currency} ${c.amount.toFixed(2)}${c.asset ? ` [${c.asset.name}]` : ""}${c.description ? `: ${c.description}` : ""}`);
    }

    lines.push(`\n### Documents on file`);
    for (const doc of p.documents) {
      lines.push(`- ${doc.filename} (${doc.kind}${doc.asset ? `, ${doc.asset.name}` : ""}, ${d(doc.createdAt)})`);
    }
    lines.push("");
  }
  lines.push(`## Service providers`);
  for (const sp of providers) lines.push(`- ${sp.name}${sp.category ? ` (${sp.category})` : ""}`);

  return lines.join("\n");
}

export function streamAssistantReply(context: string, messages: Anthropic.Beta.BetaMessageParam[]) {
  const today = new Date().toISOString().slice(0, 10);
  return anthropic.beta.messages.stream({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low" },
    system: [
      { type: "text", text: INSTRUCTIONS },
      // Cached per conversation: the record changes rarely between turns.
      { type: "text", text: `# Property record\n\n${context}`, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Today's date: ${today}` },
    ],
    messages,
  });
}
