#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

const issues = [];

const pkgConfigCheck = run('pkg-config', ['--version']);
if (pkgConfigCheck.error || pkgConfigCheck.status !== 0) {
  issues.push({
    check: 'pkg-config',
    message:
      'pkg-config is required to compile Tauri dependencies on Linux. Install pkg-config and retry.',
  });
} else {
  const glibCheck = run('pkg-config', ['--exists', 'glib-2.0']);
  if (glibCheck.status !== 0) {
    issues.push({
      check: 'glib-2.0',
      message:
        'glib-2.0 development files are missing. Install your distro package (e.g. libglib2.0-dev) so `glib-2.0.pc` is discoverable.',
    });
  }
}

if (issues.length === 0) {
  console.log('✅ Tauri native dependency preflight passed.');
  process.exit(0);
}

console.error('❌ Tauri native dependency preflight failed:');
for (const issue of issues) {
  console.error(`  - [${issue.check}] ${issue.message}`);
}
process.exit(1);
