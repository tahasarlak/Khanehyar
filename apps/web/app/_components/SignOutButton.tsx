"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("خروج انجام نشد. دوباره تلاش کن.");
      window.dispatchEvent(new Event("khanehyar-auth-changed"));
      router.replace("/");
      router.refresh();
    } catch {
      setError("خروج انجام نشد. اتصال را بررسی و دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="hy-signout-wrap">
      <button type="button" className="ui-btn ui-btn-quiet hy-signout" onClick={signOut} disabled={busy}>
        {busy ? "در حال خروج…" : "خروج"}
      </button>
      {error ? <span className="hy-signout-error" role="status">{error}</span> : null}
    </span>
  );
}
