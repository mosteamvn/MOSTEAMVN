import { ElementType } from 'react';
import * as Icons from 'lucide-react';

export const DynamicIcon = ({ name, ...props }: { name: string; size?: number; className?: string, color?: string, style?: any }) => {
  const Icon = Icons[name as keyof typeof Icons] as ElementType;
  if (!Icon) return <Icons.Circle {...props} />;
  return <Icon {...props} />;
};
