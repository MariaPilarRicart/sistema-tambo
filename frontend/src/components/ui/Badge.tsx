import type { ReactNode } from 'react';

type BadgeTone = 'critical' | 'warning' | 'success' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
