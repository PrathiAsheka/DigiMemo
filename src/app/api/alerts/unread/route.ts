import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { activeAlertsWhere, syncAlerts } from "@/lib/alerts";

// Unread, visible alerts for the signed-in user. Polled by the notification helper
// (components/alert-notifier.tsx) to show new ones as system notifications.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await syncAlerts(userId);
  const alerts = await db.alert.findMany({
    where: { ...activeAlertsWhere(userId), readAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, message: true, severity: true, href: true, createdAt: true },
  });
  return Response.json({ alerts }, { headers: { "Cache-Control": "no-store" } });
}
