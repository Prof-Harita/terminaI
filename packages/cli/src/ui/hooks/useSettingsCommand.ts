/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export function useSettingsCommand() {
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const openSettingsDialog = useCallback(() => {
    setIsSettingsDialogOpen(true);
  }, []);

  const closeSettingsDialog = useCallback(() => {
    setIsSettingsDialogOpen(false);
  }, []);

  return {
    isSettingsDialogOpen,
    openSettingsDialog,
    closeSettingsDialog,
  };
}
