import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const packageJsonPath = new URL('./package.json', import.meta.url);
const codeJsPath = new URL('./src/Code.js', import.meta.url);
const srcDirPath = new URL('./src/', import.meta.url);

const scriptVersionPattern = /const SCRIPT_VERSION = '[^']+';/;
const compiledHeaderPattern = /^(\/\/ Compiled using\s+\S+\s+)\d+\.\d+\.\d+(?:-push\.\d+)?(\s+\(TypeScript [^)]+\))/;

function syncCompiledHeaders(version) {
  const srcFiles = readdirSync(srcDirPath).filter((fileName) => fileName.endsWith('.js'));

  for (const fileName of srcFiles) {
    const filePath = new URL(fileName, srcDirPath);
    const fileContent = readFileSync(filePath, 'utf8');
    const updatedContent = fileContent.replace(compiledHeaderPattern, `$1${version}$2`);

    if (updatedContent !== fileContent) {
      writeFileSync(filePath, updatedContent, 'utf8');
    }
  }
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (!version || typeof version !== 'string') {
  throw new Error('Unable to read a valid version from package.json');
}

const codeJs = readFileSync(codeJsPath, 'utf8');

if (!scriptVersionPattern.test(codeJs)) {
  throw new Error('SCRIPT_VERSION constant not found in src/Code.js');
}

const updatedCodeJs = codeJs.replace(scriptVersionPattern, `const SCRIPT_VERSION = '${version}';`);
writeFileSync(codeJsPath, updatedCodeJs, 'utf8');

syncCompiledHeaders(version);

console.log(`Synced SCRIPT_VERSION to ${version}`);
