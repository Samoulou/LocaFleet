#!/usr/bin/env node

/**
 * Pre-commit check script for LocaFleet
 * Cross-platform (Windows/Unix) script that runs all checks before allowing git commit.
 *
 * Usage: node scripts/pre-commit-check.js
 *
 * This script:
 * 1. Removes any existing pre-commit pass flag
 * 2. Runs `npm run check` (tsc + lint + unit tests)
 * 3. Creates a flag file on success that the git commit hook checks
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Flag file location - uses system temp directory for cross-platform compatibility
const FLAG_FILE = path.join(os.tmpdir(), "locafleet-pre-commit-pass");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function main() {
  log("\n========================================", colors.blue);
  log("  LocaFleet Pre-Commit Check", colors.blue);
  log("========================================\n", colors.blue);

  // Step 1: Remove existing flag file
  if (fs.existsSync(FLAG_FILE)) {
    fs.unlinkSync(FLAG_FILE);
    log("Removed previous pre-commit flag.", colors.yellow);
  }

  // Step 2: Run npm run check
  log("Running npm run check (tsc + lint + tests)...\n", colors.blue);

  try {
    execSync("npm run check", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    // Step 3: Create flag file on success
    fs.writeFileSync(FLAG_FILE, new Date().toISOString());

    log("\n========================================", colors.green);
    log("  All checks passed!", colors.green);
    log("  You can now commit your changes.", colors.green);
    log("========================================\n", colors.green);

    log(`Flag file created at: ${FLAG_FILE}`, colors.yellow);
    process.exit(0);
  } catch (error) {
    log("\n========================================", colors.red);
    log("  Checks failed!", colors.red);
    log("  Fix the errors above before committing.", colors.red);
    log("========================================\n", colors.red);

    process.exit(1);
  }
}

main();
