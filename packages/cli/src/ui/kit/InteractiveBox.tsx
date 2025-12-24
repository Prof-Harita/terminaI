/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useRef, useState } from 'react';
import { Box, type DOMElement, type BoxProps } from 'ink';
import { useMouseClick } from '../hooks/useMouseClick.js';
import { useMouseHover } from '../hooks/useMouseHover.js';

export interface InteractiveBoxProps extends BoxProps {
  children?: React.ReactNode;
  onClick?: () => void;
  onHover?: (isHovered: boolean) => void;
  hoverStyle?: BoxProps; // Style to apply when hovered
  activeStyle?: BoxProps; // Style to apply when active/clicked (optional)
  disabled?: boolean;
}

export const InteractiveBox: React.FC<InteractiveBoxProps> = ({
  children,
  onClick,
  onHover,
  hoverStyle,
  activeStyle,
  disabled = false,
  ...boxProps
}) => {
  const ref = useRef<DOMElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false); // For click feedback (optional)

  // Use the hover hook
  useMouseHover(
    ref,
    (hovered) => {
      if (!disabled) {
        setIsHovered(hovered);
        onHover?.(hovered);
      }
    },
    { isActive: !disabled },
  );

  // Use the click hook
  useMouseClick(
    ref,
    () => {
      if (!disabled && onClick) {
        // Simple active state feedback
        setIsActive(true);
        setTimeout(() => setIsActive(false), 150);
        onClick();
      }
    },
    { isActive: !disabled },
  );

  // Merge styles: boxProps -> hoverStyle (if hovered) -> activeStyle (if active)
  const finalProps = {
    ...boxProps,
    ...(isHovered && !isActive ? hoverStyle : {}),
    ...(isActive ? activeStyle : {}),
  };

  return (
    <Box ref={ref} {...finalProps}>
      {children}
    </Box>
  );
};
