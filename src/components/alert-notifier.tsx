"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Shows new alerts as system (desktop / phone) notifications while the app is open.
// The browser permission is only requested when the user clicks "Turn on", and the
// user can switch notifications off again in the app at any time.

type UnreadAlert = { id: string; title: string; message: string; severity: string; href: string };

const ENABLED_KEY = "hdt-notifications";
const SEEN_KEY = "hdt-notified-alerts";
const PROMPT_DISMISSED_KEY = "hdt-notifications-prompt-dismissed";
const POLL_MS = 60_000;

const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: notifications still work for this visit */
    }
  },
};

const supported = () => typeof window !== "undefined" && "Notification" in window;

// One shared state (browser permission + the user's on/off choice) for every component,
// so turning notifications on in the settings panel immediately starts the poller.
const CHANGE_EVENT = "hdt-notifications-change";
const announce = () => window.dispatchEvent(new Event(CHANGE_EVENT));

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange); // permission may change in browser settings
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** "granted|on", "default|off", "unsupported|off"… as a string so React can compare it. */
function snapshot() {
  const permission = supported() ? Notification.permission : "unsupported";
  return `${permission}|${storage.get(ENABLED_KEY) === "on" ? "on" : "off"}`;
}

function useNotificationState() {
  const [permission, enabled] = useSyncExternalStore(subscribe, snapshot, () => "unsupported|off").split("|");
  return { permission, enabled: enabled === "on" };
}

function seenIds(): Set<string> {
  try {
    return new Set(JSON.parse(storage.get(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function remember(ids: Iterable<string>) {
  const all = [...seenIds(), ...ids].slice(-500);
  storage.set(SEEN_KEY, JSON.stringify(all));
}

function show(title: string, body: string, href: string, tag: string) {
  const n = new Notification(title, { body, tag, icon: "/favicon.ico" });
  n.onclick = () => {
    window.focus();
    window.location.href = href;
    n.close();
  };
}

async function fetchUnread(): Promise<UnreadAlert[]> {
  const res = await fetch("/api/alerts/unread", { cache: "no-store" });
  if (!res.ok) return [];
  return ((await res.json()) as { alerts: UnreadAlert[] }).alerts;
}

/** Notifies about alerts the user hasn't been told about yet (urgent and soon only). */
async function notifyNew({ firstRun = false } = {}) {
  const alerts = await fetchUnread();
  const seen = seenIds();
  const fresh = alerts.filter((a) => !seen.has(a.id));
  remember(alerts.map((a) => a.id));
  if (firstRun) {
    if (alerts.length) {
      const urgent = alerts.filter((a) => a.severity === "critical").length;
      show(
        "Notifications are on",
        `You have ${alerts.length} unread alert${alerts.length === 1 ? "" : "s"}${urgent ? `, ${urgent} urgent` : ""}. New ones will appear here.`,
        "/alerts",
        "hdt-summary",
      );
    }
    return;
  }
  const important = fresh.filter((a) => a.severity !== "info");
  if (important.length > 3) {
    show(`${important.length} new alerts`, important.slice(0, 3).map((a) => a.title).join("\n"), "/alerts", "hdt-summary");
  } else {
    for (const a of important) show(a.title, a.message, a.href, a.id);
  }
}

/** Invisible poller, mounted once in the signed-in layout. */
export function AlertNotifier() {
  const { permission, enabled } = useNotificationState();
  useEffect(() => {
    if (permission !== "granted" || !enabled) return;
    const tick = () => void notifyNew().catch(() => {});
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [permission, enabled]);
  return null;
}

/** Controls on the Alerts page: ask for permission, test, or switch off. */
export function NotificationSettings() {
  const { permission, enabled } = useNotificationState();
  const [message, setMessage] = useState<string | null>(null);

  const turnOn = useCallback(async () => {
    setMessage(null);
    const result = await Notification.requestPermission();
    if (result === "granted") {
      // Summary first (marks current alerts as seen), then start the poller.
      await notifyNew({ firstRun: true }).catch(() => {});
      storage.set(ENABLED_KEY, "on");
    } else {
      setMessage(result === "denied" ? "Notifications were blocked. You can allow them in your browser's site settings." : "Notifications weren't turned on.");
    }
    announce();
  }, []);

  const turnOff = () => {
    storage.set(ENABLED_KEY, "off");
    announce();
  };

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="h2">Notifications</h2>
        <p className="text-xs text-muted">Show urgent and upcoming alerts as notifications on this device while the app is open.</p>
      </div>
      {permission === "unsupported" ? (
        <p className="text-sm text-muted">This browser doesn&apos;t support notifications.</p>
      ) : permission === "denied" ? (
        <p className="text-sm text-warn">Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the lock icon next to the address), then reload.</p>
      ) : permission === "granted" && enabled ? (
        <>
          <p className="text-sm text-ok">On for this device.</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              onClick={() => show("Test notification", "This is how new alerts will appear.", "/alerts", "hdt-test")}
            >
              Send a test
            </button>
            <button className="btn-link" onClick={turnOff}>Turn off</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Your browser will ask for permission first. You can turn this off at any time.</p>
          <button className="btn w-full" onClick={turnOn}>Turn on notifications</button>
        </>
      )}
      {message && <p className="text-sm text-warn">{message}</p>}
    </div>
  );
}

/** One-time invitation shown on the dashboard until the user decides. */
export function NotificationPrompt() {
  const { permission } = useNotificationState();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(storage.get(PROMPT_DISMISSED_KEY) === "1" || storage.get(ENABLED_KEY) !== null);
  }, []);
  if (hidden || permission !== "default") return null;

  const dismiss = () => {
    storage.set(PROMPT_DISMISSED_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-ok-bg px-4 py-3 text-sm">
      <span className="text-lg" aria-hidden="true">🔔</span>
      <span className="flex-1">Get a notification on this device when maintenance is due or something needs attention?</span>
      <Link href="/alerts#notifications" className="btn py-1.5" onClick={() => storage.set(PROMPT_DISMISSED_KEY, "1")}>
        Set up
      </Link>
      <button className="btn-link" onClick={dismiss}>Not now</button>
    </div>
  );
}
