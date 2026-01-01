/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBoundingBox, type DOMElement } from 'ink';
import { useState, useRef } from 'react';
import type React from 'react';
import { useMouse, type MouseEvent } from '../contexts/MouseContext.js';

export const useMouseHover = (
  containerRef: React.RefObject<DOMElement | null>,
  onHoverChange?: (isHovered: boolean) => void,
  options: { isActive?: boolean } = {},
) => {
  const { isActive = true } = options;
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  useMouse(
    (event: MouseEvent) => {
      if (event.name === 'move' && containerRef.current) {
        const { x, y, width, height } = getBoundingBox(containerRef.current);
        // Terminal mouse events are 1-based, Ink layout is 0-based.
        const mouseX = event.col - 1;
        const mouseY = event.row - 1;

        const relativeX = mouseX - x;
        const relativeY = mouseY - y;

        const nowHovered =
          relativeX >= 0 &&
          relativeX < width &&
          relativeY >= 0 &&
          relativeY < height;

        if (nowHovered !== isHoveredRef.current) {
          isHoveredRef.current = nowHovered;
          setIsHovered(nowHovered);
          onHoverChange?.(nowHovered);
        }
      }
    },
    { isActive },
  );

  return isHovered;
};
