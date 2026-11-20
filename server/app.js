// Entry file for hosts such as Hostinger (Express preset, entry file "app.js").
// Uses the bundled server (dist/server.js, built automatically after "npm install").
// If that file is missing, it runs the TypeScript source directly with tsx.
const fs = require('node:fs');
const path = require('node:path');

const built = path.join(__dirname, 'dist', 'server.js');
if (fs.existsSync(built)) {
  require(built);
} else {
  require('tsx/cjs');
  require('./src/index.ts');
}
