#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const LIVE_DEPLOYMENT_ID = 'AKfycbxGxJVbfVxUDNH75QieX9SCzplO5hwvt5hGckNWYhwibfe18qBngByILqIuf7zHdifa';
const RELEASE_TYPES = new Set(['patch', 'minor', 'major']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`\n> ${printable}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${printable}`);
  }
}

function runCapture(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `Command failed: ${command} ${args.join(' ')}`);
  }

  return String(result.stdout || '').trim();
}

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  const version = String(packageJson.version || '').trim();

  if (!version) {
    throw new Error('Unable to read version from package.json.');
  }

  return version;
}

function ensureLiveConfirmation() {
  if (process.env.CONFIRM_LIVE !== 'YES') {
    fail('Live release blocked. Set CONFIRM_LIVE=YES to continue. Example: CONFIRM_LIVE=YES npm run release:patch');
  }
}

function ensureGitRepository() {
  runCapture('git', ['rev-parse', '--is-inside-work-tree']);
}

function stageAllChanges() {
  run('git', ['add', '-A']);
}

function printStagedSummary() {
  const staged = runCapture('git', ['diff', '--cached', '--name-status']);

  if (!staged) {
    console.log('\nNo pending workspace changes were staged before version bump.');
    return;
  }

  console.log('\nStaged changes that will be included in the release commit:');
  console.log(staged);
}

function bumpAndTag(releaseType) {
  run('npm', ['version', releaseType, '-m', `release(${releaseType}): v%s`]);
}

function pushGit() {
  run('git', ['push']);
  run('git', ['push', '--tags']);
}

function deployLive(version) {
  run('npm', ['run', 'env:live']);
  run('clasp', ['push']);
  run('clasp', ['deploy', '--deploymentId', LIVE_DEPLOYMENT_ID, '--description', `Release v${version}`]);
}

function main() {
  const releaseType = (process.argv[2] || '').trim().toLowerCase();

  if (!RELEASE_TYPES.has(releaseType)) {
    fail('Usage: node run-release.mjs <patch|minor|major>');
  }

  ensureLiveConfirmation();
  ensureGitRepository();

  const beforeVersion = readPackageVersion();
  console.log(`Current package version: ${beforeVersion}`);

  stageAllChanges();
  printStagedSummary();
  bumpAndTag(releaseType);

  const releasedVersion = readPackageVersion();
  console.log(`Released version: ${releasedVersion}`);

  pushGit();
  deployLive(releasedVersion);

  console.log(`\nRelease complete: v${releasedVersion}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Release failed: ${message}`);
}
