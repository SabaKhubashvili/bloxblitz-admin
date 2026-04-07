-- Optimizes per-case time-range analytics on case_open_history.
CREATE INDEX IF NOT EXISTS "case_open_history_caseId_createdAt_idx"
ON "case_open_history" ("caseId", "createdAt");
