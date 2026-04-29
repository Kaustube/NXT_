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
      <img
        src="/logo.png"
        alt="NXT Campus"
        className={`${sizes[size]} rounded-xl object-contain`}
        onError={(e) => {
          // Fallback to text logo if image not found
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      {/* Fallback text logo (hidden by default, shown if image fails) */}
      <div
        className={`${sizes[size]} rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold shadow-md shadow-primary/30`}
        style={{ display: "none" }}
      >
        N
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${textSizes[size]}`}>
          NXT Campus
        </span>
      )}
    </div>
  );
}
