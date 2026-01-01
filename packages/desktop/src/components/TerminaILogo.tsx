/**
 * TerminaI Logo Component
 * Displays "termina" in theme-appropriate color with blinking red "I"
 */

import { cn } from '../lib/utils'

interface TerminaILogoProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function TerminaILogo({ size = 'medium', className }: TerminaILogoProps) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-3xl',
  }

  return (
    <span
      className={cn(
        'font-mono font-medium select-none inline-flex items-baseline',
        sizeClasses[size],
        className
      )}
    >
      <span className="text-foreground">termina</span>
      <span 
        className="text-[#E2231A] font-bold"
        style={{ 
          fontWeight: 800,
          fontSize: '1.05em',
        }}
      >
        I
      </span>
    </span>
  )
}
