// Build script for the embeddable widget
// Run: npx tsx scripts/build-widget.ts

import * as fs from 'fs';
import * as path from 'path';

const widgetDir = path.join(__dirname, '..', 'widget');
const css = fs.readFileSync(path.join(widgetDir, 'src', 'styles.css'), 'utf-8');

// Read the API module
const apiSrc = fs.readFileSync(path.join(widgetDir, 'src', 'api.ts'), 'utf-8')
  .replace(/export /g, '')
  .replace(/import.*\n/g, '');

// Read the main module, remove imports, inline CSS
const mainSrc = fs.readFileSync(path.join(widgetDir, 'src', 'index.ts'), 'utf-8')
  .replace(/import.*\n/g, '')
  .replace(/declare global.*?}/s, '')
  .replace('styles', `\`${css.replace(/`/g, '\\`')}\``);

const bundle = `
(function() {
${apiSrc}
${mainSrc}
})();
`;

// Write to public dir so Next.js serves it as a static file
const outPath = path.join(__dirname, '..', 'public', 'widget.js');
fs.writeFileSync(outPath, bundle.trim());
console.log('✓ Widget built to public/widget.js');
