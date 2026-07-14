"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  activateOrderSounds,
  getSoundUiState,
  playTestOrderSound,
  setOrderSoundEnabled,
  setOrderSoundVolume,
  startOrderAlertSession,
  subscribeSoundUi,
} from "@/lib/realtime/orderAlertSound";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from "@/lib/realtime/browserOrderNotifications";
import { cn } from "@/lib/utils/cn";

export function OrderSoundControl() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => getSoundUiState());
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");
  const [, bump] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    startOrderAlertSession();
    bump((n) => n + 1);
    return subscribeSoundUi((next) => {
      setState(next);
      bump((n) => n + 1);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) setNotifyPerm(getBrowserNotificationPermission());
  }, [open]);

  if (!isAuthenticated) return null;

  const needsActivation = !state.unlockedThisSession;

  return (
    <div className="relative flex items-center gap-1">
      {needsActivation && (
        <button
          type="button"
          onClick={() => {
            void activateOrderSounds().then(() => setState(getSoundUiState()));
          }}
          className="hidden items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 sm:inline-flex"
        >
          تفعيل صوت الطلبات
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex size-10 items-center justify-center rounded-full transition",
          state.enabled && state.unlockedThisSession
            ? "text-amber-700 hover:bg-amber-50"
            : "text-charcoal-soft hover:bg-cream hover:text-charcoal",
        )}
        title="صوت الطلبات"
        aria-label="صوت الطلبات"
      >
        {state.enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border-soft bg-surface shadow-lg">
            <div className="border-b border-border-soft px-4 py-3">
              <p className="text-sm font-semibold text-charcoal">صوت الطلبات</p>
              <p className="mt-0.5 text-xs text-charcoal-soft">
                {state.unlockedThisSession
                  ? state.enabled
                    ? "الصوت مفعّل"
                    : "الصوت متوقف"
                  : "يلزم تفاعل لتفعيل الصوت في المتصفح"}
              </p>
            </div>

            <div className="space-y-2 p-3">
              {needsActivation ? (
                <button
                  type="button"
                  onClick={() => {
                    void activateOrderSounds().then(() => setState(getSoundUiState()));
                  }}
                  className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-charcoal transition hover:bg-amber-400"
                >
                  تفعيل الصوت
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOrderSoundEnabled(!state.enabled);
                    setState(getSoundUiState());
                  }}
                  className="flex w-full items-center justify-center rounded-lg border border-border-soft px-3 py-2 text-sm font-medium text-charcoal transition hover:bg-cream"
                >
                  {state.enabled ? "إيقاف الصوت" : "تفعيل الصوت"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  void playTestOrderSound().then(() => setState(getSoundUiState()));
                }}
                className="flex w-full items-center justify-center rounded-lg border border-border-soft px-3 py-2 text-sm text-charcoal-soft transition hover:bg-cream hover:text-charcoal"
              >
                اختبار الصوت
              </button>

              <div className="rounded-lg border border-border-soft px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between text-xs text-charcoal-soft">
                  <span>مستوى الصوت</span>
                  <span className="ltr-field">{Math.round(state.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(state.volume * 100)}
                  onChange={(e) => {
                    setOrderSoundVolume(Number(e.target.value) / 100);
                    setState(getSoundUiState());
                  }}
                  className="w-full accent-amber-500"
                  aria-label="مستوى الصوت"
                />
              </div>

              {notifyPerm !== "unsupported" && notifyPerm !== "granted" && (
                <button
                  type="button"
                  onClick={() => {
                    void requestBrowserNotificationPermission().then(setNotifyPerm);
                  }}
                  className="flex w-full items-center justify-center rounded-lg border border-border-soft px-3 py-2 text-sm text-charcoal-soft transition hover:bg-cream hover:text-charcoal"
                >
                  تفعيل إشعارات المتصفح
                </button>
              )}

              {notifyPerm === "granted" && (
                <p className="px-1 text-xs text-success">إشعارات المتصفح مفعّلة للطلبات الجديدة في الخلفية</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
