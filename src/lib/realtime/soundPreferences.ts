const STORAGE_KEY = "tharaa_order_sound_prefs_v1";

export interface OrderSoundPreferences {
  /** User explicitly enabled/disabled sound playback. */
  enabled: boolean;
  /** AudioContext/HTMLAudio unlocked after a real user gesture. */
  unlocked: boolean;
  /** 0–1 volume. */
  volume: number;
  /** Browser Notification permission was requested via UI (not auto). */
  browserNotifyOptIn: boolean;
}

const DEFAULT_PREFS: OrderSoundPreferences = {
  enabled: true,
  unlocked: false,
  volume: 0.55,
  browserNotifyOptIn: false,
};

type PrefsListener = (prefs: OrderSoundPreferences) => void;

const listeners = new Set<PrefsListener>();

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFS.volume;
  return Math.min(1, Math.max(0, value));
}

export function getOrderSoundPreferences(): OrderSoundPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<OrderSoundPreferences>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_PREFS.enabled,
      unlocked: typeof parsed.unlocked === "boolean" ? parsed.unlocked : DEFAULT_PREFS.unlocked,
      volume: clampVolume(typeof parsed.volume === "number" ? parsed.volume : DEFAULT_PREFS.volume),
      browserNotifyOptIn:
        typeof parsed.browserNotifyOptIn === "boolean"
          ? parsed.browserNotifyOptIn
          : DEFAULT_PREFS.browserNotifyOptIn,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setOrderSoundPreferences(patch: Partial<OrderSoundPreferences>): OrderSoundPreferences {
  const next: OrderSoundPreferences = {
    ...getOrderSoundPreferences(),
    ...patch,
    volume: clampVolume(patch.volume ?? getOrderSoundPreferences().volume),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener(next));
  return next;
}

export function subscribeOrderSoundPreferences(listener: PrefsListener): () => void {
  listeners.add(listener);
  listener(getOrderSoundPreferences());
  return () => {
    listeners.delete(listener);
  };
}
