/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FC, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type OnboardingResult = {
  approvalMode: 'default' | 'preview' | 'yolo';
  voiceEnabled: boolean;
};

type Step = 'welcome' | 'approval' | 'voice' | 'ready';

const approvalModes: Array<OnboardingResult['approvalMode']> = [
  'default',
  'preview',
  'yolo',
];

function ApprovalChoice({
  selected,
}: {
  selected: OnboardingResult['approvalMode'];
}) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {approvalModes.map((mode) => (
        <Text key={mode} color={mode === selected ? 'cyan' : 'gray'}>
          {mode === selected ? '› ' : '  '}
          {mode === 'default'
            ? 'Prompt for approvals (recommended)'
            : mode === 'preview'
              ? 'Preview only — show commands, no execution'
              : 'YOLO — auto-approve everything'}
        </Text>
      ))}
    </Box>
  );
}

function VoiceChoice({ enabled }: { enabled: boolean }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={enabled ? 'cyan' : 'gray'}>
        {enabled ? '› Enable voice (push-to-talk)' : '  Enable voice (push-to-talk)'}
      </Text>
      <Text color={!enabled ? 'cyan' : 'gray'}>
        {!enabled ? '› Keep text-only for now' : '  Keep text-only for now'}
      </Text>
    </Box>
  );
}

export const Onboarding: FC<{ onComplete: (result: OnboardingResult) => void }> = ({
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('welcome');
  const [approvalMode, setApprovalMode] =
    useState<OnboardingResult['approvalMode']>('default');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const stepIndex = useMemo(() => {
    return ['welcome', 'approval', 'voice', 'ready'].indexOf(step);
  }, [step]);

  useInput((_, key) => {
    if (key.return) {
      if (step === 'ready') {
        onComplete({ approvalMode, voiceEnabled });
      } else {
        setStep(
          step === 'welcome'
            ? 'approval'
            : step === 'approval'
              ? 'voice'
              : 'ready',
        );
      }
      return;
    }
    if (step === 'approval') {
      if (key.leftArrow || key.upArrow) {
        const currentIdx = approvalModes.indexOf(approvalMode);
        const next = approvalModes[Math.max(0, currentIdx - 1)];
        setApprovalMode(next);
      } else if (key.rightArrow || key.downArrow) {
        const currentIdx = approvalModes.indexOf(approvalMode);
        const next = approvalModes[Math.min(approvalModes.length - 1, currentIdx + 1)];
        setApprovalMode(next);
      }
    }
    if (step === 'voice') {
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow || key.tab) {
        setVoiceEnabled((prev) => !prev);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      <Text color="cyan" bold>
        TermAI — First Run Setup ({stepIndex + 1}/4)
      </Text>

      {step === 'welcome' && (
        <Box flexDirection="column" gap={1}>
          <Text>
            Welcome! Let&apos;s configure safety and voice so TermAI matches how you work.
          </Text>
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      )}

      {step === 'approval' && (
        <Box flexDirection="column">
          <Text>Choose your approval style.</Text>
          <Text dimColor>
            Use ↑/↓ to pick. Enter to continue. You can change this later in settings.
          </Text>
          <ApprovalChoice selected={approvalMode} />
        </Box>
      )}

      {step === 'voice' && (
        <Box flexDirection="column">
          <Text>Enable voice?</Text>
          <Text dimColor>Toggle with arrows/Tab. Enter to continue.</Text>
          <VoiceChoice enabled={voiceEnabled} />
        </Box>
      )}

      {step === 'ready' && (
        <Box flexDirection="column" gap={1}>
          <Text>All set. We&apos;ll launch the CLI with your choices.</Text>
          <Box flexDirection="column">
            <Text>
              • Approvals: {approvalMode === 'default'
                ? 'Prompt before actions'
                : approvalMode === 'preview'
                  ? 'Preview only'
                  : 'YOLO (auto-approve)'}
            </Text>
            <Text>• Voice: {voiceEnabled ? 'Enabled' : 'Disabled'}</Text>
          </Box>
          <Text dimColor>Press Enter to start.</Text>
        </Box>
      )}
    </Box>
  );
};
