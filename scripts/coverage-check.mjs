#!/usr/bin/env node

/**
 * Coverage threshold checker.
 * Parses Node.js --experimental-test-coverage output from CI artifacts
 * or runs coverage inline and checks that all packages meet thresholds.
 *
 * Thresholds are defined inline below — adjust as needed.
 */

import { execSync } from 'node:child_process';

// Coverage thresholds per package (line %)
const THRESHOLDS = {
  '@ai-tg-channels/jsonrpc': 50,
  'scrapper': 10,
};

const THRESHOLD_DEFAULT = 0; // packages without explicit threshold: just ensure tests pass

function run() {
  let failed = false;

  for (const [pkg, threshold] of Object.entries(THRESHOLDS)) {
    if (threshold <= 0) continue;

    console.log(`\n📦 ${pkg} — checking coverage threshold: ${threshold}%`);

    try {
      const output = execSync(`pnpm -F ${pkg} test:coverage`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      // Parse the coverage table from Node.js test runner output
      // Lines are prefixed with "ℹ " locally and "# " in CI
      const stripPrefix = (l) => l.replace(/^[#ℹ]\s*/, '');
      const lines = output.split('\n');
      const allFilesLine = lines.find((l) => stripPrefix(l).trim().startsWith('all files'));

      if (!allFilesLine) {
        console.error(`  ⚠ Could not parse coverage for ${pkg}`);
        console.error(`  Raw output:\n${output.slice(-500)}`);
        failed = true;
        continue;
      }

      // Extract line coverage percentage (Node.js outputs bare numbers, no "%" suffix)
      const cleaned = stripPrefix(allFilesLine);
      const match = cleaned.match(/all files\s*\|\s*([\d.]+)/);
      if (!match) {
        console.error(`  ⚠ Could not parse line coverage from: ${allFilesLine}`);
        failed = true;
        continue;
      }

      const lineCov = parseFloat(match[1]);
      console.log(`  Line coverage: ${lineCov}%`);

      if (lineCov < threshold) {
        console.error(`  ✗ Coverage ${lineCov}% is below threshold ${threshold}%`);
        failed = true;
      } else {
        console.log(`  ✓ Coverage ${lineCov}% meets threshold ${threshold}%`);
      }
    } catch (err) {
      console.error(`  ✗ Test run failed for ${pkg}`);
      console.error(err.stderr || err.message);
      failed = true;
    }
  }

  if (failed) {
    console.error('\n❌ Coverage check failed');
    process.exit(1);
  } else {
    console.log('\n✅ All coverage thresholds met');
  }
}

run();