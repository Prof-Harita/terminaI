import { useState } from "react";

interface ContextFile {
  path: string;
  tokens: number;
}
interface Props {
  files: ContextFile[];
  totalUsed: number;
  totalLimit: number;
  children: React.ReactNode;
}

export function ContextPopover({
  files,
  totalUsed,
  totalLimit,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const percentage = Math.min((totalUsed / totalLimit) * 100, 100);
  const isWarning = percentage > 70;
  const isCritical = percentage > 90;
  
  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className="relative"
    >
      {children}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card border rounded-lg shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center justify-between">
            <span>Context Usage</span>
            <span className={isCritical ? "text-red-500" : isWarning ? "text-amber-500" : ""}>
              {Math.round(totalUsed / 1000)}K / {Math.round(totalLimit / 1000)}K
            </span>
          </h4>
          
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {files.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {files.map((f) => (
                <div key={f.path} className="flex justify-between text-xs group hover:bg-muted/50 px-1 rounded">
                  <span className="truncate text-muted-foreground group-hover:text-foreground transition-colors">
                    {f.path.split('/').pop()}
                  </span>
                  <span className="text-muted-foreground ml-2 flex-shrink-0">
                    {f.tokens.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No files in context</p>
          )}
        </div>
      )}
    </div>
  );
}
