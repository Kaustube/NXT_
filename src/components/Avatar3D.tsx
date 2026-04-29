import { useState } from "react";
import { Camera, User } from "lucide-react";

interface Avatar3DProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onUpload?: (file: File) => void;
  uploading?: boolean;
  fallbackText?: string;
}

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl",
  xl: "h-32 w-32 text-4xl",
};

export default function Avatar3D({
  src,
  alt,
  size = "md",
  editable = false,
  onUpload,
  uploading = false,
  fallbackText,
}: Avatar3DProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const initials = fallbackText || alt
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showImage = src && !imageError;

  return (
    <div
      className={`relative ${sizeClasses[size]} rounded-2xl overflow-hidden group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? "scale(1.05) rotateY(5deg)" : "scale(1) rotateY(0deg)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 3D shadow effect */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent blur-xl"
        style={{
          transform: "translateZ(-10px)",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      {/* Main avatar container */}
      <div
        className="relative h-full w-full rounded-2xl border-4 border-background bg-gradient-to-br from-[hsl(var(--surface-3))] to-[hsl(var(--surface-2))] shadow-xl overflow-hidden"
        style={{
          boxShadow: isHovered
            ? "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--primary)/0.2)"
            : "0 10px 20px rgba(0,0,0,0.2)",
          transition: "box-shadow 0.3s",
        }}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
            style={{
              transform: isHovered ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.3s",
            }}
          />
        ) : (
          <div className="h-full w-full grid place-items-center font-bold text-foreground/60 bg-gradient-to-br from-primary/10 to-purple-500/10">
            {initials || <User className="h-1/2 w-1/2 opacity-30" />}
          </div>
        )}

        {/* Shine effect */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
          style={{
            transform: isHovered ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 0.6s",
          }}
        />

        {/* Upload overlay */}
        {editable && (
          <label
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-opacity ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {uploading ? (
              <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUpload) onUpload(file);
              }}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Glow ring */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            boxShadow: "0 0 20px hsl(var(--primary)/0.5), inset 0 0 20px hsl(var(--primary)/0.2)",
            animation: "pulse 2s infinite",
          }}
        />
      )}
    </div>
  );
}
