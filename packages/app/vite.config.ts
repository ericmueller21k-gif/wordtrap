import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Writes dist/sw.js with every built file precached, versioned by their contents. */
function serviceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "wordtrap-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files = listFiles(outDir)
        .map((f) => "/" + relative(outDir, f).split("\\").join("/"))
        .filter((f) => f !== "/sw.js" && !f.endsWith(".svg") && !f.endsWith(".webmanifest"))
        // Hosts redirect /index.html to /, and a cached redirect can't answer a page load.
        .map((f) => (f === "/index.html" ? "/" : f))
        .sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f === "/" ? "index.html" : f)));
      const sw = readFileSync("sw-template.js", "utf8")
        .replace("__VERSION__", `wordtrap-${hash.digest("hex").slice(0, 12)}`)
        .replace("__FILES__", JSON.stringify(files));
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

export default defineConfig({
  plugins: [preact(), serviceWorker()],
  server: { host: true },
  build: { target: "es2020" },
});
