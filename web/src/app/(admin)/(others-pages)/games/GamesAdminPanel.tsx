"use client";

import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { ChevronDownIcon } from "@/icons";
import { useMemo, useState } from "react";

const GAME_OPTIONS = [
  { value: "crash", label: "Crash" },
  { value: "mines", label: "Mines" },
  { value: "dice", label: "Dice" },
  { value: "coinflip", label: "Coinflip" },
  { value: "cases", label: "Cases" },
  { value: "plinko-towers", label: "Plinko Towers" },
  { value: "roulette", label: "Roulette" },
];

export default function GamesAdminPanel() {
  const [gameId, setGameId] = useState("");
  const selectedLabel = useMemo(
    () => GAME_OPTIONS.find((g) => g.value === gameId)?.label ?? "",
    [gameId]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
      <div className="mx-auto w-full">
        <h3 className="mb-2 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
          Manage games
        </h3>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
          Choose which game you want to modify or update. You can wire this
          selection to your CMS or API next.
        </p>

        <div className="space-y-2">
          <Label>Game</Label>
          <div className="relative max-w-md">
            <Select
              options={GAME_OPTIONS}
              placeholder="Select a game"
              onChange={setGameId}
              className="dark:bg-dark-900"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        {selectedLabel ? (
          <p
            className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300"
            role="status"
          >
            Editing: <span className="font-medium">{selectedLabel}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
