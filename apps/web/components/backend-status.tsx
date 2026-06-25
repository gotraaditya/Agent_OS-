"use client";

import { useEffect, useState } from "react";

type HealthState = "checking" | "online" | "offline";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function BackendStatus() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch(`${API_URL}/api/health`, {
          signal: controller.signal,
          cache: "no-store"
        });
        setState(response.ok ? "online" : "offline");
      } catch {
        if (!controller.signal.aborted) {
          setState("offline");
        }
      }
    }

    checkBackend();
    return () => controller.abort();
  }, []);

  return (
    <div className={`backend-status ${state}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      Backend: {state}
    </div>
  );
}

