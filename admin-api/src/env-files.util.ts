import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves optional env files for this monorepo layout:
 * `admin-api/` service and repo-root `.env` / `.env.dev` (used with Docker `--env-file`).
 *
 * @nestjs/config merges in array order so **earlier paths win** on duplicate keys.
 * Put more specific / local files first.
 */
export function resolveNestEnvFilePaths(): string[] {
  const adminApiRoot = join(__dirname, '..');
  const monorepoRoot = join(__dirname, '..', '..');
  const appRootAboveMonorepo = join(monorepoRoot, '..');
  const candidates = [
    join(adminApiRoot, '.env'),
    join(adminApiRoot, '.env.local'),
    join(monorepoRoot, '.env'),
    join(monorepoRoot, '.env.dev'),
    join(appRootAboveMonorepo, '.env'),
  ];
  return candidates.filter((p) => existsSync(p));
}
