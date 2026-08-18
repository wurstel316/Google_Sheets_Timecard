import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const MODE = (process.argv[2] || 'status').toLowerCase();
// Use the directory of this script as root for proper path resolution
const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(__filename) + '/';
const ACTIVE_PATH = resolve(ROOT, '.clasp.json');
const CONFIG_BY_ENV = {
  live: resolve(ROOT, 'clasp.live.json'),
  test: resolve(ROOT, 'clasp.test.json')
};

function readJson(pathUrl) {
  return JSON.parse(readFileSync(pathUrl, 'utf8'));
}

function readActiveConfig() {
  if (!existsSync(ACTIVE_PATH)) {
    throw new Error('Missing .clasp.json. Run an env switch command first (env:live or env:test).');
  }
  return readJson(ACTIVE_PATH);
}

function detectEnvFromScriptId(scriptId) {
  const entries = Object.entries(CONFIG_BY_ENV);
  for (const [envName, filePath] of entries) {
    if (!existsSync(filePath)) continue;
    const cfg = readJson(filePath);
    if (cfg.scriptId === scriptId) return envName;
  }
  return 'custom';
}

function printStatus() {
  const active = readActiveConfig();
  const envName = detectEnvFromScriptId(active.scriptId);
  console.log(`Active clasp target: ${envName}`);
  console.log(`scriptId: ${active.scriptId}`);
  console.log(`rootDir: ${active.rootDir}`);
}

function switchEnv(envName) {
  const sourcePath = CONFIG_BY_ENV[envName];
  if (!sourcePath) {
    throw new Error(`Unknown env "${envName}". Use live, test, or status.`);
  }
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing config file: ${sourcePath}`);
  }

  const source = readJson(sourcePath);
  if (!source.scriptId || !source.rootDir) {
    throw new Error(`Invalid ${envName} config: scriptId/rootDir required.`);
  }

  writeFileSync(ACTIVE_PATH, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log(`Switched clasp target to ${envName}.`);
  printStatus();
}

if (MODE === 'status') {
  printStatus();
} else {
  switchEnv(MODE);
}
