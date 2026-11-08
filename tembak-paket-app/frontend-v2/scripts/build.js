const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const versionPath = path.join(__dirname, "..", "public", "version.json");
try {
  fs.writeFileSync(versionPath, JSON.stringify({ timestamp: Date.now() }));
  console.log("✓ Updated public/version.json");
} catch (e) {
  console.warn("Failed to update version.json:", e.message);
}

const env = { ...process.env, NODE_OPTIONS: "--max-old-space-size=1024" };
const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
console.log("Starting Next.js build (--max-old-space-size=1024)...");
execSync(`node "${nextBin}" build --webpack`, {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env,
});
