const fs = require('node:fs');
const path = require('node:path');

for (const item of ['dist', 'server.js']) {
  fs.rmSync(path.resolve(__dirname, '..', item), { recursive: true, force: true });
}
