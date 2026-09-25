const fs = require('node:fs');
const path = require('node:path');

const audioDir = path.resolve(__dirname, '..', 'dist', 'audio', 'azan');
if (fs.existsSync(audioDir)) {
  fs.rmSync(audioDir, { recursive: true, force: true });
  console.log('Removed duplicate web Azan audio from native bundle; Android uses res/raw.');
}
