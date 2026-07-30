import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// Use the current directory directly instead of going up one level
const packageJsonPath = path.join(scriptDir, 'package.json');
const packageLockPath = path.join(scriptDir, 'package-lock.json');
const codeJsPath = path.join(scriptDir, 'src', 'Code.js');
const srcDirPath = path.join(scriptDir, 'src');

const scriptVersionPattern = /const SCRIPT_VERSION = '[^']+';/;
const compiledHeaderPattern = /^(\/\/ Compiled using\s+\S+\s+)\d+\.\d+\.\d+(?:-push\.\d+)?(\s+\(TypeScript [^)]+\))/;

function bumpPushVersion(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-push\.(\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const hasPushSuffix = match[4] !== undefined;

  // If already on a push prerelease, increment just the push counter.
  // If on a stable release, move to the NEXT patch prerelease so
  // npm version patch lands on a new patch release rather than an existing tag.
  if (hasPushSuffix) {
    const pushBuild = Number(match[4]) + 1;
    return `${major}.${minor}.${patch}-push.${pushBuild}`;
  }

  return `${major}.${minor}.${patch + 1}-push.0`;
}

function syncCompiledHeaders(version) {
  const srcFiles = readdirSync(srcDirPath).filter((fileName) => fileName.endsWith('.js'));

  for (const fileName of srcFiles) {
    const filePath = path.join(srcDirPath, fileName);
    const fileContent = readFileSync(filePath, 'utf8');
    const updatedContent = fileContent.replace(compiledHeaderPattern, `$1${version}$2`);

    if (updatedContent !== fileContent) {
      writeFileSync(filePath, updatedContent, 'utf8');
    }
  }
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
if (!currentVersion || typeof currentVersion !== 'string') {
  throw new Error('Unable to read a valid version from package.json');
}

const nextVersion = bumpPushVersion(currentVersion);
packageJson.version = nextVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
packageLock.version = nextVersion;
if (packageLock.packages && packageLock.packages['']) {
  packageLock.packages[''].version = nextVersion;
}
writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n', 'utf8');

const codeJs = readFileSync(codeJsPath, 'utf8');
if (!scriptVersionPattern.test(codeJs)) {
  throw new Error('SCRIPT_VERSION constant not found in src/Code.js');
}

const updatedCodeJs = codeJs.replace(scriptVersionPattern, `const SCRIPT_VERSION = '${nextVersion}';`);
writeFileSync(codeJsPath, updatedCodeJs, 'utf8');

syncCompiledHeaders(nextVersion);

console.log(`Bumped push version to ${nextVersion}`);