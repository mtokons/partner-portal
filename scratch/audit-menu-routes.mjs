// Audit: cross-check every menu href in menu-engine.ts against real src/app routes.
// Route groups like (shared) and (portal) are transparent in the URL path.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "src", "app");

// 1. Collect all route paths that have a page.(tsx|jsx|ts|js)
const routes = new Set();
const dynamicSegments = []; // routes containing [param] -> store regex

function walk(dir, urlParts) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    // Route groups (xxx) and parallel @slots are transparent
    let nextParts = urlParts;
    if (!(entry.startsWith("(") && entry.endsWith(")")) && !entry.startsWith("@")) {
      nextParts = [...urlParts, entry];
    }
    // does this dir have a page file?
    const hasPage = ["page.tsx", "page.jsx", "page.ts", "page.js"].some((p) =>
      existsSync(join(full, p))
    );
    if (hasPage) {
      const url = "/" + nextParts.join("/");
      routes.add(url === "/" ? "/" : url.replace(/\/$/, ""));
      if (nextParts.some((p) => p.startsWith("[") || p.startsWith("("))) {
        // build a regex for dynamic route
        const rx = "^/" + nextParts
          .map((p) => (p.startsWith("[") ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
          .join("/") + "$";
        dynamicSegments.push(new RegExp(rx));
      }
    }
    walk(full, nextParts);
  }
}
walk(appDir, []);

// 2. Extract hrefs from menu-engine.ts
const menuSrc = readFileSync(join(root, "src", "lib", "menu-engine.ts"), "utf8");
const hrefRe = /href:\s*"([^"]+)"/g;
const keyBeforeRe = /key:\s*"([^"]+)"[^}]*?href:\s*"([^"]+)"/g;

const items = [];
let m;
while ((m = keyBeforeRe.exec(menuSrc)) !== null) {
  items.push({ key: m[1], href: m[2] });
}

function routeExists(href) {
  const path = href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (routes.has(path)) return true;
  return dynamicSegments.some((rx) => rx.test(path));
}

const missing = items.filter((it) => !routeExists(it.href));

console.log(`Total menu items: ${items.length}`);
console.log(`Total app routes: ${routes.size}`);
console.log(`\nMISSING ROUTES (${missing.length}):`);
for (const it of missing) console.log(`  ${it.key.padEnd(32)} -> ${it.href}`);
