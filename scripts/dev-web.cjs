"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const webDir = path.join(root, "apps", "web");
const envPath = path.join(webDir, ".env");

if (!fs.existsSync(envPath)) {
  console.error("ERROR: apps/web/.env not found.");
  process.exit(1);
}

// Load the known-working local development configuration.
// Avoid an inherited stale DATABASE_URL overriding the .env file.
delete process.env.DATABASE_URL;

try {
  process.loadEnvFile(envPath);
} catch (error) {
  console.error("ERROR: Failed to load the environment file.");
  console.error(error.code || error.name);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || "";

if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  console.error("ERROR: DATABASE_URL has an invalid format.");
  process.exit(1);
}

const env = { ...process.env };

// NODE_OPTIONS must not contain --env-file or --eval.
delete env.NODE_OPTIONS;

let nextCli;

try {
  nextCli = require.resolve("next/dist/bin/next", {
    paths: [webDir],
  });
} catch {
  console.error("ERROR: Next.js package not found.");
  process.exit(1);
}

console.log("Khanehyar development launcher");
console.log("DATABASE_URL: valid format");
console.log("Starting Next.js...");

const child = spawn(process.execPath, [nextCli, "dev"], {
  cwd: webDir,
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("error", (error) => {
  console.error("Failed to start Next.js:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 0;
  } else {
    process.exitCode = code ?? 1;
  }
});

process.on("SIGINT", () => {
  if (child.pid && !child.killed) {
    child.kill("SIGINT");
  }
});