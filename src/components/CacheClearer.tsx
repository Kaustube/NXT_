import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { forceClearCache } from "@/lib/version";

export default function CacheClearer() {
  const [clearing, setClearing] = useState(false);

  const handleClear = () => {
    if (confirm("This will clear all cached data and reload the app. Continue?")) {
      setClearing(true);
      forceClearCache();
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={clearing}
      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
      title="Clear all cached data"
    >
      {clearing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Clearing...
        </>
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" />
          Clear Cache
        </>
      )}
    </button>
  );
}
