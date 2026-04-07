"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  session_expired:
    "Your session has expired. Please sign in again.",
  unauthenticated: "Please sign in to continue.",
  session_invalid: "Your session is no longer valid. Please sign in again.",
};

export default function SignInReasonBanner() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  if (!reason || !MESSAGES[reason]) {
    return null;
  }
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {MESSAGES[reason]}
    </div>
  );
}
