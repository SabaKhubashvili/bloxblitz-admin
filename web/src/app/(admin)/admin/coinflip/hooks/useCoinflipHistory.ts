"use client";

import { fetchCoinflipHistory } from "@/lib/admin-api/coinflip-history";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export const COINFLIP_HISTORY_QUERY_KEY = "coinflip-history" as const;

const DEBOUNCE_MS = 320;

/**
 * Loads last 20 finished coinflip games; debounces `search` and `minPot` for API calls.
 */
export function useCoinflipHistory(searchInput: string, minPotInput: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchInput.trim(),
  );
  const [debouncedMinPot, setDebouncedMinPot] = useState(() => minPotInput);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedMinPot(minPotInput),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [minPotInput]);

  const query = useQuery({
    queryKey: [
      COINFLIP_HISTORY_QUERY_KEY,
      debouncedSearch,
      debouncedMinPot,
    ] as const,
    queryFn: ({ signal }) =>
      fetchCoinflipHistory(
        {
          search: debouncedSearch || undefined,
          minPot:
            debouncedMinPot.trim() === "" ? undefined : debouncedMinPot.trim(),
        },
        { signal },
      ),
  });

  return { ...query, debouncedSearch, debouncedMinPot };
}
