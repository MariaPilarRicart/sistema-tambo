import type { SVGProps } from 'react';

interface CowIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function CowIcon({ size = 24, ...props }: CowIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 21a4 4 0 0 1-4.8-5.2c0-1.5.3-3.8 2.2-5.4L7 8" />
      <path d="M17 21a4 4 0 0 0 4.8-5.2c0-1.5-.3-3.8-2.2-5.4L17 8" />
      <path d="M4 14h16" />
      <path d="M10 8c-2 0-3-1-3-3s1-2 3-2 3 1 3 2-1 3-3 3z" />
      <path d="M12 2v4" />
    </svg>
  );
}
