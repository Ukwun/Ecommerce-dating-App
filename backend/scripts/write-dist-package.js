const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '..', 'dist', 'package.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`, 'utf8');
