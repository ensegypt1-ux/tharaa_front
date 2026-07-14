"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Settings as SettingsIcon } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/Input";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listAppSettings, patchBootstrapSettings, upsertAppSetting } from "@/lib/api/settings";
import type { AppSettingRow } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";

type BootstrapForm = {
  storeNameAr: string;
  storeNameEn: string;
  storeLogo: string;
  supportPhone: string;
  supportEmail: string;
  maintenanceMode: boolean;
  minimumSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  notificationsEnabled: boolean;
  googleLoginEnabled: boolean;
  offersEnabled: boolean;
  couponsEnabled: boolean;
  reviewsEnabled: boolean;
  searchEnabled: boolean;
  inventoryEnabled: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function boolOr(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function buildForm(rows: AppSettingRow[]): BootstrapForm {
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const store = asRecord(byKey["bootstrap.store"]);
  const application = asRecord(byKey["bootstrap.application"]);
  const notifications = asRecord(byKey["bootstrap.notifications"]);
  const authentication = asRecord(byKey["bootstrap.authentication"]);
  const featureFlags = asRecord(byKey["bootstrap.featureFlags"]);

  return {
    storeNameAr: stringOr(store.storeNameAr),
    storeNameEn: stringOr(store.storeNameEn),
    storeLogo: stringOr(store.storeLogo),
    supportPhone: stringOr(store.supportPhone),
    supportEmail: stringOr(store.supportEmail),
    maintenanceMode: boolOr(application.maintenanceMode),
    minimumSupportedVersion: stringOr(application.minimumSupportedVersion, "1.0.0"),
    latestVersion: stringOr(application.latestVersion, "1.0.0"),
    forceUpdate: boolOr(application.forceUpdate),
    notificationsEnabled: boolOr(notifications.notificationsEnabled, true),
    googleLoginEnabled: boolOr(authentication.googleLoginEnabled),
    offersEnabled: boolOr(featureFlags.offersEnabled, true),
    couponsEnabled: boolOr(featureFlags.couponsEnabled, true),
    reviewsEnabled: boolOr(featureFlags.reviewsEnabled, true),
    searchEnabled: boolOr(featureFlags.searchEnabled, true),
    inventoryEnabled: boolOr(featureFlags.inventoryEnabled, true),
  };
}

function SettingsPageInner() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ mode: "create" | "edit"; key: string; valueText: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [form, setForm] = useState<BootstrapForm | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<BootstrapForm | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<"maintenance" | "forceUpdate" | "both" | null>(null);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  const settingsQuery = useQuery({ queryKey: ["app-settings"], queryFn: listAppSettings });

  useEffect(() => {
    if (settingsQuery.data) {
      const next = buildForm(settingsQuery.data);
      setForm(next);
      setSavedSnapshot(next);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!bootstrapSuccess) return;
    const t = window.setTimeout(() => setBootstrapSuccess(false), 4000);
    return () => window.clearTimeout(t);
  }, [bootstrapSuccess]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => upsertAppSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      setModal(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const bootstrapMutation = useMutation({
    mutationFn: (payload: BootstrapForm) =>
      patchBootstrapSettings({
        merge: true,
        store: {
          storeNameAr: payload.storeNameAr,
          storeNameEn: payload.storeNameEn,
          storeLogo: payload.storeLogo || null,
          supportPhone: payload.supportPhone,
          supportEmail: payload.supportEmail,
        },
        application: {
          maintenanceMode: payload.maintenanceMode,
          minimumSupportedVersion: payload.minimumSupportedVersion,
          latestVersion: payload.latestVersion,
          forceUpdate: payload.forceUpdate,
        },
        notifications: {
          notificationsEnabled: payload.notificationsEnabled,
        },
        authentication: {
          googleLoginEnabled: payload.googleLoginEnabled,
        },
        featureFlags: {
          offersEnabled: payload.offersEnabled,
          couponsEnabled: payload.couponsEnabled,
          reviewsEnabled: payload.reviewsEnabled,
          searchEnabled: payload.searchEnabled,
          inventoryEnabled: payload.inventoryEnabled,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      setBootstrapError(null);
      setBootstrapSuccess(true);
      setSaveConfirm(null);
      if (form) setSavedSnapshot(form);
    },
    onError: (err) => setBootstrapError(getErrorMessage(err)),
  });

  const openCreate = () => {
    setError(null);
    setModal({ mode: "create", key: "", valueText: "{\n  \n}" });
  };

  const openEdit = (row: AppSettingRow) => {
    setError(null);
    setModal({ mode: "edit", key: row.key, valueText: JSON.stringify(row.value, null, 2) });
  };

  const handleSave = () => {
    if (!modal) return;
    if (!modal.key.trim()) {
      setError("المفتاح مطلوب.");
      return;
    }
    try {
      const parsed = JSON.parse(modal.valueText);
      saveMutation.mutate({ key: modal.key.trim(), value: parsed });
    } catch {
      setError("يجب أن تكون القيمة بصيغة JSON صالحة.");
    }
  };

  const updateField = <K extends keyof BootstrapForm>(key: K, value: BootstrapForm[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const requestBootstrapSave = () => {
    if (!form || !savedSnapshot) return;
    const enablingMaintenance = form.maintenanceMode && !savedSnapshot.maintenanceMode;
    const enablingForceUpdate = form.forceUpdate && !savedSnapshot.forceUpdate;
    if (enablingMaintenance && enablingForceUpdate) {
      setSaveConfirm("both");
    } else if (enablingMaintenance) {
      setSaveConfirm("maintenance");
    } else if (enablingForceUpdate) {
      setSaveConfirm("forceUpdate");
    } else {
      bootstrapMutation.mutate(form);
    }
  };

  const saveConfirmCopy: Record<NonNullable<typeof saveConfirm>, { title: string; description: string }> = {
    maintenance: {
      title: "تفعيل وضع الصيانة",
      description: "سيتم منع العملاء من استخدام التطبيق حتى تعطيل وضع الصيانة. هل تريد المتابعة؟",
    },
    forceUpdate: {
      title: "تفعيل فرض التحديث",
      description: "سيتم إجبار المستخدمين على تحديث التطبيق قبل الاستمرار. هل تريد المتابعة؟",
    },
    both: {
      title: "تفعيل الصيانة وفرض التحديث",
      description: "أنت على وشك تفعيل وضع الصيانة وفرض التحديث معًا. هذا سيؤثر على جميع مستخدمي التطبيق.",
    },
  };

  const columns: DataTableColumn<AppSettingRow>[] = useMemo(
    () => [
      { key: "key", header: "المفتاح", render: (r) => <span className="font-mono text-sm font-medium text-charcoal">{r.key}</span> },
      {
        key: "value",
        header: "القيمة",
        render: (r) => (
          <code className="block max-w-md truncate text-xs text-charcoal-soft">{JSON.stringify(r.value)}</code>
        ),
      },
      { key: "updatedAt", header: "آخر تحديث", render: (r) => formatDateTime(r.updatedAt) },
      {
        key: "actions",
        header: "",
        className: "text-start",
        render: (r) => (
          <button onClick={() => openEdit(r)} className="flex size-8 items-center justify-center rounded-lg text-charcoal-soft transition hover:bg-amber-50 hover:text-amber-700">
            <Pencil className="size-4" />
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="إعدادات التطبيق"
        description="إعدادات المتجر والنسخ والصيانة والميزات. للمدير فقط."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            إعداد جديد
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>إعدادات التشغيل</CardTitle>
        </CardHeader>
        <CardBody>
          {settingsQuery.isLoading && <LoadingState />}
          {settingsQuery.isError && <ErrorState message="تعذر تحميل الإعدادات." onRetry={() => settingsQuery.refetch()} />}
          {form && (
            <div className="space-y-6">
              {bootstrapSuccess && (
                <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-sm text-success">
                  تم حفظ إعدادات التشغيل بنجاح.
                </div>
              )}
              {bootstrapError && (
                <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{bootstrapError}</div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>اسم المتجر (عربي)</Label>
                  <Input value={form.storeNameAr} onChange={(e) => updateField("storeNameAr", e.target.value)} />
                </div>
                <div>
                  <Label>اسم المتجر (إنجليزي)</Label>
                  <Input className="ltr-field" value={form.storeNameEn} onChange={(e) => updateField("storeNameEn", e.target.value)} />
                </div>
                <div>
                  <Label>شعار المتجر (رابط)</Label>
                  <Input className="ltr-field" value={form.storeLogo} onChange={(e) => updateField("storeLogo", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>هاتف الدعم</Label>
                  <Input className="ltr-field" value={form.supportPhone} onChange={(e) => updateField("supportPhone", e.target.value)} />
                </div>
                <div>
                  <Label>بريد الدعم</Label>
                  <Input className="ltr-field" value={form.supportEmail} onChange={(e) => updateField("supportEmail", e.target.value)} />
                </div>
                <div>
                  <Label>الحد الأدنى لإصدار التطبيق</Label>
                  <Input className="ltr-field" value={form.minimumSupportedVersion} onChange={(e) => updateField("minimumSupportedVersion", e.target.value)} />
                </div>
                <div>
                  <Label>أحدث إصدار</Label>
                  <Input className="ltr-field" value={form.latestVersion} onChange={(e) => updateField("latestVersion", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["maintenanceMode", "وضع الصيانة"],
                    ["forceUpdate", "فرض التحديث"],
                    ["notificationsEnabled", "الإشعارات"],
                    ["googleLoginEnabled", "تسجيل الدخول عبر Google"],
                    ["offersEnabled", "العروض"],
                    ["couponsEnabled", "الكوبونات"],
                    ["reviewsEnabled", "التقييمات"],
                    ["searchEnabled", "البحث"],
                    ["inventoryEnabled", "المخزون"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm text-charcoal ${
                      (key === "maintenanceMode" || key === "forceUpdate") && form[key]
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-border-soft bg-cream/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-amber-500"
                      checked={form[key]}
                      onChange={(e) => updateField(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex justify-end">
                <Button isLoading={bootstrapMutation.isPending} onClick={requestBootstrapSave}>
                  حفظ إعدادات التشغيل
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كل المفاتيح</CardTitle>
        </CardHeader>
        {settingsQuery.isLoading && <LoadingState />}
        {settingsQuery.isError && <ErrorState message="تعذر تحميل الإعدادات." onRetry={() => settingsQuery.refetch()} />}
        {settingsQuery.data && settingsQuery.data.length === 0 && <EmptyState icon={SettingsIcon} title="لا توجد إعدادات بعد" />}
        {settingsQuery.data && settingsQuery.data.length > 0 && (
          <DataTable columns={columns} rows={settingsQuery.data} rowKey={(r) => r.key} />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(saveConfirm)}
        onClose={() => setSaveConfirm(null)}
        onConfirm={() => form && bootstrapMutation.mutate(form)}
        isLoading={bootstrapMutation.isPending}
        variant="danger"
        title={saveConfirm ? saveConfirmCopy[saveConfirm].title : ""}
        description={saveConfirm ? saveConfirmCopy[saveConfirm].description : ""}
        confirmLabel="تأكيد الحفظ"
      />

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `تعديل «${modal.key}»` : "إعداد جديد"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              إلغاء
            </Button>
            <Button isLoading={saveMutation.isPending} onClick={handleSave}>
              حفظ
            </Button>
          </>
        }
      >
        {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        {modal && (
          <div className="space-y-4">
            <div>
              <Label required>المفتاح</Label>
              <Input
                value={modal.key}
                disabled={modal.mode === "edit"}
                onChange={(e) => setModal({ ...modal, key: e.target.value })}
                placeholder="مثال: app.maintenanceMode" className="ltr-field"
              />
            </div>
            <div>
              <Label required>القيمة (JSON)</Label>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={modal.valueText}
                onChange={(e) => setModal({ ...modal, valueText: e.target.value })}
              />
              <FieldHint>يجب أن تكون القيمة بصيغة JSON صالحة.</FieldHint>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireRole navKey="settings">
      <SettingsPageInner />
    </RequireRole>
  );
}
