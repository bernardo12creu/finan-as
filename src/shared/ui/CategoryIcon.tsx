import React from 'react';
import * as Icons from 'lucide-react';

export interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-5 h-5',
  style,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<any>>)[name] || Icons.CircleDot;
  return <IconComponent className={className} style={style} />;
};
