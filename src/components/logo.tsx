export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vl-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="oklch(0.5 0.19 265)" />
            <stop offset="1" stopColor="oklch(0.68 0.17 258)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#vl-g)" />
        <path
          d="M9 10.5L16 22L23 10.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="22" r="1.6" fill="white" />
      </svg>
      <span className="font-semibold tracking-tight text-[15px] text-foreground">
        Valtro<span className="text-muted-foreground font-normal"> Labs</span>
      </span>
    </span>
  );
}
