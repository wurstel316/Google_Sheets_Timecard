#!/usr/bin/env node

import fs from 'node:fs';

const CHANGELOG_PATH = 'CHANGELOG.md';
const PACKAGE_PATH = 'package.json';

const RESET_UNRELEASED_SECTION = [
  '## [Unreleased]',
  '',
  '### Added',
  '- _None yet._',
  '',
  '### Changed',
  '- _None yet._',
  '',
  '### Fixed',
  '- _None yet._',
  '',
  '### Removed',
  '- _None yet._'
].join('\n');

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMeaningfulEntries(unreleasedText) {
  const normalized = unreleasedText
    .replace(/^\s*###\s+.*$/gm, '')
    .replace(/^\s*-\s*_None yet\._\s*$/gim, '')
    .replace(/^\s*-\s*$/gm, '')
    .trim();
  return normalized.length > 0;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
  const version = String(pkg.version || '').trim();
  if (!version) {
    throw new Error('package.json version is missing.');
  }

  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const unreleasedHeader = '## [Unreleased]';
  const unreleasedHeaderIndex = changelog.indexOf(unreleasedHeader);

  if (unreleasedHeaderIndex === -1) {
    throw new Error('CHANGELOG.md must contain a "## [Unreleased]" section.');
  }

  const existingVersionPattern = new RegExp(
    `^## \\[${escapeRegExp(version)}\\]\\b`,
    'm'
  );
  if (existingVersionPattern.test(changelog)) {
    console.log(`CHANGELOG.md already contains [${version}]. Skipping update.`);
    return;
  }

  const unreleasedBodyStart = changelog.indexOf('\n', unreleasedHeaderIndex) + 1;
  if (unreleasedBodyStart <= 0) {
    throw new Error('Unable to parse Unreleased section in CHANGELOG.md.');
  }

  const nextTopLevelHeaderIndex = changelog.indexOf('\n## ', unreleasedBodyStart);
  const unreleasedBodyEnd = nextTopLevelHeaderIndex === -1 ? changelog.length : nextTopLevelHeaderIndex;
  const unreleasedBody = changelog.slice(unreleasedBodyStart, unreleasedBodyEnd).trim();

  const today = new Date().toISOString().slice(0, 10);
  const releaseBody = hasMeaningfulEntries(unreleasedBody)
    ? unreleasedBody
    : '### Changed\n- No documented changes were recorded in Unreleased before this release.';

  const prefix = changelog.slice(0, unreleasedHeaderIndex);
  const suffix = changelog.slice(unreleasedBodyEnd);

  const newSection = [
    RESET_UNRELEASED_SECTION,
    '',
    `## [${version}] - ${today}`,
    '',
    releaseBody,
    ''
  ].join('\n');

  const updated = `${prefix}${newSection}${suffix}`;
  fs.writeFileSync(CHANGELOG_PATH, updated, 'utf8');
  console.log(`CHANGELOG.md updated for release ${version}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}