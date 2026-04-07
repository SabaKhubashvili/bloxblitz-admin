import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const adminRoot = join(webRoot, "..", "admin-api");
const webSchema = join(webRoot, "prisma", "schema.prisma");

function copyGeneratedClient() {
  const pairs = [
    [join(adminRoot, "node_modules", ".prisma"), join(webRoot, "node_modules", ".prisma")],
    [
      join(adminRoot, "node_modules", "@prisma", "client"),
      join(webRoot, "node_modules", "@prisma", "client"),
    ],
  ];
  for (const [from, to] of pairs) {
    if (!existsSync(from)) continue;
    if (existsSync(to)) rmSync(to, { recursive: true });
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
  }
}

if (existsSync(webSchema)) {
  execSync("npx prisma generate --schema=./prisma/schema.prisma", {
    cwd: webRoot,
    stdio: "inherit",
  });
} else {
  execSync("npx prisma generate", { cwd: adminRoot, stdio: "inherit" });
  copyGeneratedClient();
}
