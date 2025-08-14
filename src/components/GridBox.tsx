import React from 'react';
import { cn } from '@/lib/utils';

interface GridBoxProps {
  children: React.ReactNode;
  className?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  variant?: 'default' | 'elevated' | 'bordered' | 'transparent';
}

const GridBox: React.FC<GridBoxProps> = ({
  children,
  className,
  gridColumn,
  gridRow,
  gridArea,
  size = 'medium',
  variant = 'default'
}) => {
  // Size definitions using grid fractional units and explicit dimensions
  const sizeClasses = {
    small: 'min-w-[200px] min-h-[150px]',
    medium: 'min-w-[300px] min-h-[200px]',
    large: 'min-w-[400px] min-h-[300px]',
    full: 'w-full h-full'
  };

  // Variant styles for different box appearances
  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-lg',
    bordered: 'bg-transparent border-2 border-gray-300',
    transparent: 'bg-transparent'
  };

  // Grid positioning styles
  const gridStyles: React.CSSProperties = {
    gridColumn: gridColumn,
    gridRow: gridRow,
    gridArea: gridArea
  };

  return (
    <div
      className={cn(
        // Base grid box styles
        'grid-box',
        'rounded-lg',
        'p-4',
        'transition-all duration-200',
        'overflow-hidden',
        
        // Size classes
        sizeClasses[size],
        
        // Variant classes
        variantClasses[variant],
        
        // Custom className
        className
      )}
      style={gridStyles}
    >
      {children}
    </div>
  );
};

export default GridBox;