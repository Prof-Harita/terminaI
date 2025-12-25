/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesktopAutomationService } from '../../packages/core/src/gui/service/DesktopAutomationService.js';

async function main() {
  console.log('Starting GUI Automation Integration Test...');

  const service = DesktopAutomationService.getInstance();

  // Enable GUI automation for testing (default is off for security)
  service.setEnabled(true);

  try {
    console.log('1. Checking capabilities...');
    const caps = await service.getCapabilities();
    console.log('Capabilities:', caps);

    console.log('2. Taking snapshot...');
    const snapshot = await service.snapshot({
      includeTree: true,
      includeScreenshot: false,
      includeTextIndex: false,
    });
    console.log('Snapshot ID:', snapshot.snapshotId);
    console.log('Active App:', snapshot.activeApp.title);

    if (snapshot.tree) {
      console.log('Root Node Role:', snapshot.tree.role);
    }

    console.log('3. Testing query (self-check)...');
    const queryResult = await service.query({
      selector: 'role=Frame', // Use valid selector syntax
      limit: 10,
    });
    console.log(
      'Query Result count:',
      queryResult.data ? (queryResult.data as Array<unknown>).length : 0,
    );

    console.log('Integration Test Completed Successfully.');
  } catch (err: unknown) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
}

main();
