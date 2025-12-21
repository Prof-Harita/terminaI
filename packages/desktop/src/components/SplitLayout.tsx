import { useState, useRef, useEffect, ReactNode } from 'react';

interface Props {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  rightPanelVisible: boolean;
  defaultRightWidth?: number;
  minWidth?: number;
}

export function SplitLayout({
  leftPanel,
  rightPanel,
  rightPanelVisible,
  defaultRightWidth = 50,
  minWidth = 20,
}: Props) {
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percentage = ((rect.right - e.clientX) / rect.width) * 100;
      setRightWidth(Math.max(minWidth, Math.min(100 - minWidth, percentage)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth]);

  return (
    <div ref={containerRef} className="flex h-full">
      <div
        style={{ width: rightPanelVisible ? `${100 - rightWidth}%` : '100%' }}
        className="transition-all duration-200"
      >
        {leftPanel}
      </div>
      {rightPanelVisible && (
        <>
          <div
            className={`w-1 cursor-col-resize transition-colors ${isDragging ? 'bg-cyan-500' : 'bg-gray-800 hover:bg-cyan-500'
              }`}
            onMouseDown={() => setIsDragging(true)}
          />
          <div
            style={{ width: `${rightWidth}%` }}
            className="transition-all duration-200"
          >
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}
