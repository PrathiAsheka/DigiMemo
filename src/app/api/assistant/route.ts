import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { buildPropertyContext, streamAssistantReply } from "@/lib/ai/assistant";
import { aiConfigured, describeAiError } from "@/lib/ai/client";
import { getProfile } from "@/lib/profiles";

export const maxDuration = 300;

const BodySchema = z.object({
  propertyId: z.string().nullable(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

// Streams the assistant's reply as plain text chunks.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!aiConfigured()) return new Response("The assistant needs ANTHROPIC_API_KEY to be set.", { status: 503 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return new Response("Invalid request", { status: 400 });
  }
  const { propertyId, messages } = parsed.data;
  if (propertyId && !(await db.property.count({ where: { id: propertyId, ownerId: userId } }))) {
    return new Response("Not found", { status: 404 });
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { useCase: true } });
  const context = await buildPropertyContext(userId, propertyId);
  const stream = streamAssistantReply(context, getProfile(user?.useCase).assistantContext, messages);
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_delta" && event.delta.stop_reason === "refusal") {
            controller.enqueue(encoder.encode("\n\nI can't help with that request."));
          }
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`\n\n${describeAiError(error)}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
