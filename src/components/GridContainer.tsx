import React from 'react';
import { cn } from '@/lib/utils';

interface GridContainerProps {
  children: React.ReactNode;
  className?: string;
  columns?: number | string;
  rows?: number | string;
  gap?: 'small' | 'medium' | 'large';
  areas?: string[];
  responsive?: boolean;
}

const GridContainer: React.FC<GridContainerProps> = ({
  children,
  className,
  columns = 'auto',
  rows = 'auto',
  gap = 'medium',
  areas,
  responsive = true
}) => {
  // Gap size definitions
  const gapClasses = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6'
  };

  // Grid template styles
  const gridStyles: React.CSSProperties = {
    gridTemplateColumns: typeof columns === 'number' 
      ? `repeat(${columns}, 1fr)` 
      : columns,
    gridTemplateRows: typeof rows === 'number' 
      ? `repeat(${rows}, auto)` 
      : rows,
    gridTemplateAreas: areas ? areas.map(area => `"${area}"`).join(' ') : undefined
  };

  return (
    <div
      className={cn(
        // Base grid container
        'grid',
        'w-full',
        'h-full',
        
        // Gap classes
        gapClasses[gap],
        
        // Responsive behavior
        responsive && [
          'grid-cols-1',
          'md:grid-cols-2',
          'lg:grid-cols-3',
          'xl:grid-cols-4'
        ],
        
        // Custom className
        className
      )}
      style={gridStyles}
    >
      {children}
    </div>
  );
};

export default GridContainer