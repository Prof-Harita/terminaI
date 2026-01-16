/* eslint-disable */
const { getAsset } = require('node:sea');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
  try {
    const asset = getAsset('terminai_cli.mjs');
    const mjs = Buffer.from(asset);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminai-'));
    const tempFile = path.join(tempDir, 'bundle.mjs');
    fs.writeFileSync(tempFile, mjs);

    try {
      // Use absolute path with file:// protocol for ESM import
      await import('file://' + tempFile);
    } finally {
      // Optional: cleanup temp file on process exit if needed
    }
  } catch (err) {
    console.error('Failed to start TerminaI CLI sidecar:');
    console.error(err);
    process.exit(1);
  }
})();
