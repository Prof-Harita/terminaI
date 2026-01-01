/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface TriPaneLayoutProps {
  leftPanel: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  leftMinWidth?: number;
  rightMinWidth?: number;
}

export function TriPaneLayout({
  leftPanel,
  middlePanel,
  rightPanel,
  leftWidth: defaultLeftWidth = 240,
  rightWidth: defaultRightWidth = 360,
  leftMinWidth = 200,
  rightMinWidth = 280,
}: TriPaneLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('terminai-left-pane-width');
    return saved ? parseInt(saved, 10) : defaultLeftWidth;
  });
  
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('terminai-right-pane-width');
    return saved ? parseInt(saved, 10) : defaultRightWidth;
  });

  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  
  const leftMinRef = useRef(leftMinWidth);
  const rightMinRef = useRef(rightMinWidth);
  
  useEffect(() => {
    leftMinRef.current = leftMinWidth;
    rightMinRef.current = rightMinWidth;
  }, [leftMinWidth, rightMinWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft.current) {
      const newWidth = Math.max(leftMinRef.current, Math.min(400, e.clientX));
      setLeftWidth(newWidth);
      localStorage.setItem('terminai-left-pane-width', newWidth.toString());
    } else if (isResizingRight.current) {
      const newWidth = Math.max(rightMinRef.current, Math.min(600, window.innerWidth - e.clientX));
      setRightWidth(newWidth);
      localStorage.setItem('terminai-right-pane-width', newWidth.toString());
    }
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingLeft.current && !isResizingRight.current) return;
    
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, [handleMouseMove]);

  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, stopResizing]);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, stopResizing]);

  useEffect(() => () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    }, [handleMouseMove, stopResizing]);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Pane */}
      <div 
        style={{ width: `${leftWidth}px`, minWidth: leftMinWidth }}
        className="h-full flex-shrink-0"
      >
        {leftPanel}
      </div>

      {/* Left Divider */}
      <div
        onMouseDown={startResizingLeft}
        className="w-px flex-shrink-0 cursor-col-resize hover:w-0.5 transition-all"
        style={{ background: 'var(--border-subtle)' }}
        role="separator"
        aria-label="Resize left sidebar"
      />

      {/* Middle Pane */}
      <div className="flex-1 h-full min-w-0 flex flex-col">
        {middlePanel}
      </div>

      {/* Right Divider */}
      <div
        onMouseDown={startResizingRight}
        className="w-px flex-shrink-0 cursor-col-resize hover:w-0.5 transition-all"
        style={{ background: 'var(--border-subtle)' }}
        role="separator"
        aria-label="Resize engine room"
      />

      {/* Right Pane */}
      <div 
        style={{ width: `${rightWidth}px`, minWidth: rightMinWidth }}
        className="h-full flex-shrink-0"
      >
        {rightPanel}
      </div>
    </div>
  );
}
