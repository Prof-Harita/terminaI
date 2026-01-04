/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { act } from 'react';
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { LoadedSettings } from '../../config/settings.js';
import { renderWithProviders } from '../../test-utils/render.js';
import { AuthProviderWizardFlow } from './AuthProviderWizardFlow.js';
import { OpenAICompatibleSetupDialog } from './OpenAICompatibleSetupDialog.js';
import { ProviderWizard } from './ProviderWizard.js';

vi.mock('./ProviderWizard.js', () => ({
  ProviderWizard: vi.fn(() => null),
}));

vi.mock('./OpenAICompatibleSetupDialog.js', () => ({
  OpenAICompatibleSetupDialog: vi.fn(() => null),
}));

const mockedProviderWizard = ProviderWizard as unknown as Mock;
const mockedOpenAICompatibleSetupDialog =
  OpenAICompatibleSetupDialog as unknown as Mock;

function getLatestProviderWizardProps() {
  const call = mockedProviderWizard.mock.calls.at(-1)?.[0] as
    | {
        onSelectOpenAICompatible: () => void;
        onProceedToGeminiAuth: () => void;
      }
    | undefined;
  if (!call) {
    throw new Error('ProviderWizard was not rendered');
  }
  return call;
}

function getLatestOpenAISetupProps() {
  const call = mockedOpenAICompatibleSetupDialog.mock.calls.at(-1)?.[0] as
    | {
        terminalWidth?: number;
        onBack: () => void;
        onComplete: () => void;
      }
    | undefined;
  if (!call) {
    throw new Error('OpenAICompatibleSetupDialog was not rendered');
  }
  return call;
}

describe('AuthProviderWizardFlow', () => {
  it('renders ProviderWizard first', () => {
    const settings = { merged: {} } as unknown as LoadedSettings;
    renderWithProviders(
      <AuthProviderWizardFlow
        settings={settings}
        terminalWidth={100}
        onComplete={() => {}}
      />,
    );

    expect(mockedProviderWizard).toHaveBeenCalledOnce();
    expect(mockedOpenAICompatibleSetupDialog).not.toHaveBeenCalled();
  });

  it('switches to OpenAI setup and can go back', () => {
    const settings = { merged: {} } as unknown as LoadedSettings;
    renderWithProviders(
      <AuthProviderWizardFlow
        settings={settings}
        terminalWidth={123}
        onComplete={() => {}}
      />,
    );

    act(() => {
      getLatestProviderWizardProps().onSelectOpenAICompatible();
    });

    const openaiProps = getLatestOpenAISetupProps();
    expect(openaiProps.terminalWidth).toBe(123);

    act(() => {
      openaiProps.onBack();
    });

    expect(mockedProviderWizard.mock.calls.length).toBeGreaterThan(1);
  });

  it('completes when Gemini path proceeds', () => {
    const settings = { merged: {} } as unknown as LoadedSettings;
    const onComplete = vi.fn();

    renderWithProviders(
      <AuthProviderWizardFlow
        settings={settings}
        terminalWidth={100}
        onComplete={onComplete}
      />,
    );

    act(() => {
      getLatestProviderWizardProps().onProceedToGeminiAuth();
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('completes when OpenAI setup completes', () => {
    const settings = { merged: {} } as unknown as LoadedSettings;
    const onComplete = vi.fn();

    renderWithProviders(
      <AuthProviderWizardFlow
        settings={settings}
        terminalWidth={100}
        onComplete={onComplete}
      />,
    );

    act(() => {
      getLatestProviderWizardProps().onSelectOpenAICompatible();
    });
    act(() => {
      getLatestOpenAISetupProps().onComplete();
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });
});
