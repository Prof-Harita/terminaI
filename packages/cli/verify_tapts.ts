/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalRuntimeContext } from './src/runtime/LocalRuntimeContext';

import * as path from 'node:path';
import * as fs from 'node:fs';

async function main() {
  try {
    console.log('Initializing LocalRuntimeContext...');
    // Ensure we find the wheel/source. LocalRuntimeContext uses process.cwd() fallback logic if needed.
    // We run from packages/cli so it should find ../../packages/sandbox-image/python

    const ctx = new LocalRuntimeContext('python3', '0.28.0');
    await ctx.initialize();
    console.log('Context initialized.');

    // Create a dummy file to read
    const testFile = 'verify_tapts_test.json';
    fs.writeFileSync(testFile, JSON.stringify({ hello: 'world' }));
    const absPath = path.resolve(testFile);

    console.log(`Testing read_file on ${absPath}...`);

    // Command to use the T-APTS function
    const cmd = `"${ctx.pythonPath}" -c "import json; from terminai_apts.action.files import read_file; print(json.dumps(read_file('${absPath}')))"`;

    const result = await ctx.execute(cmd);

    // Cleanup
    try {
      fs.unlinkSync(testFile);
    } catch {
      // ignore
    }

    console.log('STDOUT:', result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

    if (result.exitCode !== 0) {
      console.error('Exit Code:', result.exitCode);
      process.exit(1);
    }

    const data = JSON.parse(result.stdout);
    if (data.error) {
      console.error('T-APTS Error:', data.error);
      process.exit(1);
    }

    const content = JSON.parse(data.content);
    if (content.hello === 'world') {
      console.log('SUCCESS: Read file correctly via T-APTS');
    } else {
      console.error('FAILURE: Content mismatch', content);
      process.exit(1);
    }
  } catch (e) {
    console.error('Uncaught exception:', e);
    process.exit(1);
  }
}

main();
