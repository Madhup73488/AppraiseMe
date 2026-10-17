import { cn } from '../utils/cn'

export interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="299 244 430 548"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="am-logo-rise"
          x1="696"
          y1="758"
          x2="512"
          y2="316"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5f7ff0" />
          <stop offset="1" stopColor="#aab8ff" />
        </linearGradient>
        <radialGradient
          id="am-logo-node"
          cx="500"
          cy="284"
          r="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f2f4ff" />
          <stop offset="1" stopColor="#aab8ff" />
        </radialGradient>
      </defs>
      <path
        d="M 332 758 L 512 300"
        stroke="#6b8afd"
        strokeWidth="66"
        strokeLinecap="round"
      />
      <path
        d="M 410 612 L 648 612"
        stroke="#6b8afd"
        strokeWidth="66"
        strokeLinecap="round"
      />
      <path
        d="M 696 758 L 696 672 L 640 672 L 640 548 L 584 548 L 584 424 L 512 424 L 512 316"
        stroke="url(#am-logo-rise)"
        strokeWidth="66"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="512" cy="296" r="52" fill="url(#am-logo-node)" />
    </svg>
  )
}
