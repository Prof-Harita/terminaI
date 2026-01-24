/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContainerRuntimeContext } from './ContainerRuntimeContext.js';

async function main() {
  console.log('Initializing ContainerRuntimeContext...');

  // Note: This relies on 'terminai-sandbox:latest' being present (built by npm run build:sandbox)
  const ctx = new ContainerRuntimeContext('0.28.0');

  try {
    await ctx.initialize();
    console.log('Container initialized (running).');

    const testString = `hello-world-${Date.now()}`;
    const containerPath = '/tmp/test_file.txt';

    // 1. Write file inside container use normal shell command
    console.log(`Writing to ${containerPath}...`);
    const writeResult = await ctx.execute(
      `echo "${testString}" > ${containerPath}`,
    );
    if (writeResult.exitCode !== 0) {
      throw new Error(`Failed to write: ${writeResult.stderr}`);
    }

    // 2. Read back
    console.log(`Reading from ${containerPath}...`);
    const readResult = await ctx.execute(`cat ${containerPath}`);
    if (readResult.exitCode !== 0) {
      throw new Error(`Failed to read: ${readResult.stderr}`);
    }

    const content = readResult.stdout.trim();
    if (content === testString) {
      console.log('SUCCESS: Content matches.');
    } else {
      console.error(`FAILURE: Expected '${testString}', got '${content}'`);
      process.exit(1);
    }

    // 3. T-APTS Verification (Phase 1+2 integration)
    // Check if T-APTS is installed. The path is hardcoded in ContainerRuntimeContext
    console.log('Verifying T-APTS in container...');

    // Use Python code to invoke T-APTS
    const pythonCmd = `import json; from terminai_apts.action.files import read_file; print(json.dumps(read_file('${containerPath}')))`;
    const taptsExecCmd = `${ctx.pythonPath} -c "${pythonCmd}"`;

    const taptsResult = await ctx.execute(taptsExecCmd);

    if (taptsResult.exitCode !== 0) {
      console.error('T-APTS execution failed:', taptsResult.stderr);
      throw new Error('T-APTS execution failed');
    }

    const taptsData = JSON.parse(taptsResult.stdout);
    if (taptsData.content && taptsData.content.trim() === testString) {
      console.log('SUCCESS: T-APTS read_file works in container.');
    } else {
      console.error('FAILURE: T-APTS content mismatch', taptsData);
      process.exit(1);
    }
  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  } finally {
    await ctx.dispose();
    console.log('Container disposed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
