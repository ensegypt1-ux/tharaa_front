import {
  getOrderSoundPreferences,
  setOrderSoundPreferences,
  subscribeOrderSoundPreferences,
  type OrderSoundPreferences,
} from "./soundPreferences";

export type OrderAlertSoundKind = "new" | "status";

const SOUND_SRC: Record<OrderAlertSoundKind, string> = {
  new: "/sounds/order-new.wav",
  status: "/sounds/order-status.wav",
};

/** Sounds already played for live socket events (survives reconnect duplicates). */
const playedSoundKeys = new Set<string>();
const PLAYED_CAP = 400;
const playedOrder: string[] = [];

let sessionActive = false;
let unlockedThisSession = false;
let gestureBound = false;

function rememberPlayed(key: string): boolean {
  if (playedSoundKeys.has(key)) return false;
  playedSoundKeys.add(key);
  playedOrder.push(key);
  while (playedOrder.length > PLAYED_CAP) {
    const oldest = playedOrder.shift();
    if (oldest) playedSoundKeys.delete(oldest);
  }
  return true;
}

async function unlockAudioElements(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const probe = new Audio(SOUND_SRC.status);
    probe.volume = 0.001;
    await probe.play();
    probe.pause();
    probe.currentTime = 0;
    unlockedThisSession = true;
    setOrderSoundPreferences({ unlocked: true, enabled: true });
    return true;
  } catch {
    return false;
  }
}

function bindGestureUnlock(): void {
  if (typeof window === "undefined" || gestureBound) return;
  gestureBound = true;

  const onGesture = () => {
    if (!sessionActive) return;
    void unlockAudioElements();
  };

  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture);
}

export function startOrderAlertSession(): void {
  sessionActive = true;
  bindGestureUnlock();
  const prefs = getOrderSoundPreferences();
  if (prefs.unlocked) {
    // Prefs say unlocked before, but browsers still need a gesture each load.
    // Keep unlocked=false for UI until this session unlocks.
    unlockedThisSession = false;
  }
}

export function stopOrderAlertSession(): void {
  sessionActive = false;
  unlockedThisSession = false;
  playedSoundKeys.clear();
  playedOrder.length = 0;
}

export function isOrderSoundSessionActive(): boolean {
  return sessionActive;
}

export function isOrderSoundUnlocked(): boolean {
  return unlockedThisSession;
}

export function getSoundUiState(): OrderSoundPreferences & { unlockedThisSession: boolean } {
  return { ...getOrderSoundPreferences(), unlockedThisSession };
}

export async function activateOrderSounds(): Promise<boolean> {
  if (!sessionActive) return false;
  const ok = await unlockAudioElements();
  if (ok) {
    setOrderSoundPreferences({ enabled: true, unlocked: true });
  }
  return ok;
}

export function setOrderSoundEnabled(enabled: boolean): void {
  setOrderSoundPreferences({ enabled });
}

export function setOrderSoundVolume(volume: number): void {
  setOrderSoundPreferences({ volume });
}

export function subscribeSoundUi(listener: (state: ReturnType<typeof getSoundUiState>) => void): () => void {
  return subscribeOrderSoundPreferences(() => listener(getSoundUiState()));
}

async function playFile(kind: OrderAlertSoundKind): Promise<void> {
  if (!sessionActive) return;
  const prefs = getOrderSoundPreferences();
  if (!prefs.enabled) return;
  if (!unlockedThisSession) return;

  try {
    const audio = new Audio(SOUND_SRC[kind]);
    audio.volume = Math.min(1, Math.max(0, prefs.volume));
    await audio.play();
  } catch {
    // Autoplay restriction or decode failure — keep UI calm, show activate CTA.
    unlockedThisSession = false;
  }
}

/** Play only if this live-event key was not already sounded. */
export async function playOrderAlertOnce(
  dedupeKey: string,
  kind: OrderAlertSoundKind,
): Promise<boolean> {
  if (!rememberPlayed(dedupeKey)) return false;
  await playFile(kind);
  return true;
}

export async function playTestOrderSound(): Promise<void> {
  if (!sessionActive) return;
  if (!unlockedThisSession) {
    const ok = await activateOrderSounds();
    if (!ok) return;
  }
  setOrderSoundPreferences({ enabled: true });
  await playFile("new");
}

export const IMPORTANT_STATUS_SOUNDS: ReadonlySet<string> = new Set([
  "CANCELLED",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
]);
