import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ to = "/dashboard", label = "Back to Dashboard", className = "" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background/50 backdrop-blur-sm text-sm font-medium hover:bg-[hsl(var(--surface-2))] hover:border-primary/50 transition-all hover:scale-105 ${className}`}
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
