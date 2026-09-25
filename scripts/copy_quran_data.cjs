const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'data', 'quranFullData.json');
const targetDir = path.join(root, 'public', 'data');
const target = path.join(targetDir, 'quranFullData.json');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Prepared ${path.relative(root, target)}`);
