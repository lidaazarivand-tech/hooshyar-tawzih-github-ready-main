const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const packageVersion = packageJson.version;
const appVersion = read('src/constants/appInfo.ts')
  .match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
const androidGradle = read('android/app/build.gradle');
const androidVersion = androidGradle.match(/versionName\s+["']([^"']+)["']/)?.[1];
const versionCode = Number(androidGradle.match(/versionCode\s+(\d+)/)?.[1]);
const cacheVersion = read('public/sw.js')
  .match(/hooshyar-static-v([^'"]+)/)?.[1];

if (!packageVersion || !appVersion || !androidVersion ||
    new Set([packageVersion, appVersion, androidVersion]).size !== 1) {
  throw new Error(`Version mismatch: ${JSON.stringify({ packageVersion, appVersion, androidVersion })}`);
}
if (!cacheVersion?.startsWith(packageVersion)) {
  throw new Error(`Service worker cache version ${cacheVersion} does not match ${packageVersion}`);
}
if (!Number.isInteger(versionCode) || versionCode <= 0) {
  throw new Error(`Invalid Android versionCode: ${versionCode}`);
}

const capacitorVersions = Object.entries({
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {})
}).filter(([name]) => name.startsWith('@capacitor/'));
const capacitorMajors = new Set(
  capacitorVersions.map(([, version]) => String(version).match(/\d+/)?.[0]).filter(Boolean)
);
if (capacitorMajors.size !== 1 || !capacitorMajors.has('8')) {
  throw new Error(`Capacitor major-version mismatch: ${JSON.stringify(Object.fromEntries(capacitorVersions))}`);
}

console.log({ packageVersion, versionCode, cacheVersion, capacitorMajor: 8 });
