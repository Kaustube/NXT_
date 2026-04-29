interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

export default function Logo({ size = "md", showText = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Try image first, fall back to styled N logo */}
      <div className={`${sizes[size]} relative shrink-0`}>
        <img
          src="/logo.png"
          alt="NXT Campus"
          className={`${sizes[size]} rounded-xl object-contain absolute inset-0`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        {/* Styled fallback that matches the actual logo aesthetic */}
        <div
          className={`${sizes[size]} rounded-xl bg-black border border-white/10 items-center justify-center font-black text-white relative overflow-hidden`}
          style={{ display: "none" }}
        >
          <span className="relative z-10" style={{ fontSize: size === "sm" ? "14px" : size === "md" ? "18px" : "24px" }}>N</span>
          {/* Neon globe dot */}
          <span
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: size === "sm" ? "6px" : "8px",
              height: size === "sm" ? "6px" : "8px",
              top: size === "sm" ? "3px" : "4px",
              right: size === "sm" ? "3px" : "4px",
              boxShadow: "0 0 6px #00ffff, 0 0 12px #00ffff",
            }}
          />
        </div>
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${textSizes[size]}`}>
          NXT Campus
        </span>
      )}
    </div>
  );
}
