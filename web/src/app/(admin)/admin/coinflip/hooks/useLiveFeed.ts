"use client";

import type { FeedEventType, FeedItem } from "../mock/types";
import { useCallback, useEffect, useState } from "react";

export function useLiveFeed(
  enabled: boolean,
  intervalMs = 3200,
  maxItems = 24
) {
  const [items, setItems] = useState<FeedItem[]>(() => [
    {
      id: "seed-1",
      type: "system",
      message: "Live feed connected (mock stream).",
      timestamp: new Date().toISOString(),
    },
  ]);

  const push = useCallback(
    (partial: Omit<FeedItem, "id" | "timestamp">) => {
      const row: FeedItem = {
        ...partial,
        id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      setItems((prev) => [row, ...prev].slice(0, maxItems));
    },
    [maxItems]
  );

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const hi = Math.random() > 0.82;
      const pot = hi
        ? Math.round(800 + Math.random() * 8000)
        : Math.round(10 + Math.random() * 200);
      const gameId = Math.floor(Math.random() * 90000) + 10000;
      const roll = Math.random();
      let type: FeedEventType = "system";
      let message = "";
      if (roll < 0.28) {
        type = "created";
        message = `New 1v1 created — match #${gameId}, pot ~$${pot}`;
      } else if (roll < 0.52) {
        type = "joined";
        message = `Player joined match #${gameId} — total pot $${pot}`;
      } else if (roll < 0.78) {
        type = "resolved";
        const side = Math.random() > 0.5 ? "Heads" : "Tails";
        message = `Resolved #${gameId}: ${side} — payouts sent (mock)`;
      } else if (roll < 0.9) {
        type = "cancelled";
        message = `Match #${gameId} cancelled (timeout / admin mock)`;
      } else {
        type = "system";
        message = hi
          ? `High-roller activity: pot $${pot} on #${gameId}`
          : `Queue health OK — ${Math.round(12 + Math.random() * 40)} waiting`;
      }
      push({ type, message, highlight: hi });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, push]);

  return { items, push };
}
