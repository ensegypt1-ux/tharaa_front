const BASE_TITLE = "لوحة تحكم سوق ثراء";

let unread = 0;
let tracking = false;
const listeners = new Set<(count: number) => void>();
let notifyScheduled = false;

/** Defer listener updates off the current React commit/insertion phase. */
function notify(): void {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    const count = unread;
    listeners.forEach((listener) => {
      try {
        listener(count);
      } catch {
        // ignore subscriber errors
      }
    });
  });
}

function renderTitle(): void {
  if (typeof document === "undefined") return;
  document.title = unread > 0 ? `(${unread}) طلب جديد — ${BASE_TITLE}` : BASE_TITLE;
}

export function getUnreadNewOrders(): number {
  return unread;
}

/** Server / SSR snapshot for useSyncExternalStore. */
export function getUnreadNewOrdersServerSnapshot(): number {
  return 0;
}

/**
 * Subscribe for useSyncExternalStore / effects.
 * Does not invoke the listener synchronously — React reads via getSnapshot.
 */
export function subscribeUnreadNewOrders(listener: (count: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startUnreadOrdersTitleTracking(): void {
  if (typeof window === "undefined" || tracking) return;
  tracking = true;

  const reset = () => {
    if (unread === 0) {
      renderTitle();
      return;
    }
    unread = 0;
    renderTitle();
    notify();
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reset();
  });

  window.addEventListener("focus", reset);
  renderTitle();
}

export function bumpUnreadNewOrder(): void {
  if (typeof document === "undefined") return;
  if (!document.hidden) return;
  unread += 1;
  renderTitle();
  notify();
}

export function resetUnreadNewOrders(): void {
  if (unread === 0) {
    renderTitle();
    return;
  }
  unread = 0;
  renderTitle();
  notify();
}

export function stopUnreadOrdersTitleTracking(): void {
  unread = 0;
  renderTitle();
  notify();
}
