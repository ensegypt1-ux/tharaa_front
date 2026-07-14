import { getOrderSoundPreferences, setOrderSoundPreferences } from "./soundPreferences";

const notifiedKeys = new Set<string>();
const notifiedOrder: string[] = [];
const CAP = 300;

let sessionActive = false;

function claim(key: string): boolean {
  if (notifiedKeys.has(key)) return false;
  notifiedKeys.add(key);
  notifiedOrder.push(key);
  while (notifiedOrder.length > CAP) {
    const oldest = notifiedOrder.shift();
    if (oldest) notifiedKeys.delete(oldest);
  }
  return true;
}

export function startBrowserNotifySession(): void {
  sessionActive = true;
}

export function stopBrowserNotifySession(): void {
  sessionActive = false;
  notifiedKeys.clear();
  notifiedOrder.length = 0;
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** User-initiated only — never call on page load. */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") {
    setOrderSoundPreferences({ browserNotifyOptIn: true });
  }
  return result;
}

export function maybeNotifyNewOrder(orderId: string, orderNumber: string): void {
  if (!sessionActive) return;
  if (typeof document === "undefined") return;
  if (!document.hidden) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const prefs = getOrderSoundPreferences();
  if (!prefs.browserNotifyOptIn && Notification.permission !== "granted") return;

  const key = `notify:new:${orderId}`;
  if (!claim(key)) return;

  try {
    const n = new Notification("طلب جديد", {
      body: `تم استلام طلب جديد رقم ${orderNumber}`,
      tag: key,
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = `/orders/${orderId}`;
      n.close();
    };
  } catch {
    // Ignore notification failures silently.
  }
}
