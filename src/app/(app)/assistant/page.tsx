import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigured } from "@/lib/ai/client";
import { Chat } from "./chat";

export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const user = await requireUser();
  const { property, q } = await searchParams;
  const properties = await db.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const initialProperty =
    typeof property === "string" && properties.some((p) => p.id === property) ? property : properties[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="h1">Assistant</h1>
        <p className="mt-1 text-sm text-muted">
          Ask about your assets, warranties, maintenance and spending. Answers come from your own records.
        </p>
      </div>
      {!aiConfigured() ? (
        <div className="card text-sm text-muted">Set ANTHROPIC_API_KEY in .env and restart the server to enable the assistant.</div>
      ) : properties.length === 0 ? (
        <div className="card text-sm text-muted">Add a property first.</div>
      ) : (
        <Chat properties={properties} initialPropertyId={initialProperty} initialQuestion={typeof q === "string" ? q : undefined} />
      )}
    </div>
  );
}
