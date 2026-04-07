"use client";
import SignInReasonBanner from "@/components/auth/SignInReasonBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useRouter } from "next/navigation";
import React, { Suspense, useState } from "react";

type Step = "credentials" | "twoFactor";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string | null>(null);

  const { login, verifyTwoFactor, resendTwoFactor } = useAuth();
  const router = useRouter();

  async function handleCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.kind === "twoFactor") {
        setChallengeId(result.challengeId);
        setEmailMasked(result.emailMasked ?? null);
        setStep("twoFactor");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challengeId) {
      setError("Session expired. Start over from sign in.");
      return;
    }
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const code = String(fd.get("code") ?? "").replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyTwoFactor(challengeId, code);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!challengeId) return;
    setError(null);
    setSubmitting(true);
    try {
      await resendTwoFactor(challengeId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend code.";
      const retry =
        err instanceof Error && "retryAfterSeconds" in err
          ? (err as Error & { retryAfterSeconds?: number }).retryAfterSeconds
          : undefined;
      setError(
        retry != null && retry > 0
          ? `${msg} Try again in ${retry}s.`
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setChallengeId(null);
    setEmailMasked(null);
    setError(null);
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {step === "credentials" ? "Sign In" : "Check your email"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step === "credentials"
                ? "Enter your email and password to sign in!"
                : `We sent a 6-digit code to ${emailMasked ?? "your inbox"}. Enter it below.`}
            </p>
          </div>
          <Suspense fallback={null}>
            <SignInReasonBanner />
          </Suspense>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800 dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-200"
            >
              {error}
            </div>
          )}
          <div>
            {step === "credentials" ? (
              <form onSubmit={handleCredentials}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      Email <span className="text-error-500">*</span>{" "}
                    </Label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="info@gmail.com"
                      disabled={submitting}
                      error={!!error}
                    />
                  </div>
                  <div>
                    <Label>
                      Password <span className="text-error-500">*</span>{" "}
                    </Label>
                    <div className="relative">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={submitting}
                        error={!!error}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        alert("Contact support to reset your password.")
                      }
                      className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div>
                    <Button className="w-full" size="sm" disabled={submitting}>
                      {submitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTwoFactor}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      Verification code <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      name="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      maxLength={6}
                      disabled={submitting}
                      error={!!error}
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleBackToCredentials}
                      className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      disabled={submitting}
                    >
                      ← Use a different account
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResend()}
                      className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                      disabled={submitting}
                    >
                      Resend code
                    </button>
                  </div>
                  <div>
                    <Button className="w-full" size="sm" disabled={submitting}>
                      {submitting ? "Verifying…" : "Verify and continue"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
