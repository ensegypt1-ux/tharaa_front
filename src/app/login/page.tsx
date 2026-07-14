"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, ShoppingBasket, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { COMMON_AR } from "@/lib/ar/labels";
import { getErrorMessage } from "@/lib/api/errors";

const loginSchema = z.object({
  identifier: z.string().min(3, "أدخل البريد الإلكتروني أو رقم الجوال"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const sessionExpired = params.get("sessionExpired") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      void remember;
      await login(values.identifier, values.password);
      const next = params.get("next");
      router.replace(next && next !== "/login" ? next : "/dashboard");
    } catch (error) {
      setServerError(getErrorMessage(error, COMMON_AR.loginFailed));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-500 text-charcoal shadow-sm">
            <ShoppingBasket className="size-7" />
          </div>
          <h1 className="text-3xl font-semibold text-charcoal">{COMMON_AR.brandName}</h1>
          <p className="mt-1 text-sm text-charcoal-soft">{COMMON_AR.adminDashboard}</p>
        </div>

        <div className="rounded-2xl border border-border-soft bg-surface p-7 shadow-[0_4px_24px_rgba(42,36,29,0.06)]">
          <h2 className="mb-5 text-lg font-semibold text-charcoal">{COMMON_AR.login}</h2>

          {sessionExpired && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{COMMON_AR.sessionExpired}</span>
            </div>
          )}
          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="identifier" required>
                {COMMON_AR.email}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="admin@tharaa.market"
                autoComplete="username"
                className="ltr-field"
                {...register("identifier")}
              />
              <FieldError message={errors.identifier?.message} />
            </div>

            <div>
              <Label htmlFor="password" required>
                {COMMON_AR.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pe-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-0 flex h-10 items-center text-charcoal-soft hover:text-charcoal"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FieldError message={errors.password?.message} />
            </div>

            <label className="flex items-center gap-2 text-sm text-charcoal-soft">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-border-soft text-amber-600 focus:ring-amber-400"
              />
              {COMMON_AR.rememberMe}
            </label>

            <Button type="submit" className="mt-2 w-full" isLoading={isSubmitting}>
              <LogIn className="size-4" />
              {COMMON_AR.enter}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-charcoal-soft">{COMMON_AR.restrictedAccess}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
