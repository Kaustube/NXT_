import { useState, useEffect } from "react";
import {
  Settings,
  Volume2,
  VolumeX,
  MessageSquare,
  Hash,
  UserPlus,
  Sun,
  Moon,
  Palette,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/context/NotificationContext";
import { playNotificationSound } from "@/lib/notificationSounds";
import { useTheme, ACCENT_THEMES } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const AI_ASSISTANT_PREF_KEY = "nxt-ai-assistant-enabled";

export default function SettingsPanel() {
  const { prefs, updatePrefs, loadingPrefs } = useNotifications();
  const { theme, toggle, accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const [aiAssistantOn, setAiAssistantOn] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(AI_ASSISTANT_PREF_KEY) !== "false",
  );

  useEffect(() => {
    if (!open) return;
    setAiAssistantOn(localStorage.getItem(AI_ASSISTANT_PREF_KEY) !== "false");
  }, [open]);

  function setAiAssistantPref(enabled: boolean) {
    localStorage.setItem(AI_ASSISTANT_PREF_KEY, enabled ? "1" : "false");
    setAiAssistantOn(enabled);
    window.dispatchEvent(new Event("nxt-ai-assistant-pref-changed"));
  }

  function handleVolumeChange(val: number[]) {
    updatePrefs({ sound_volume: val[0] });
  }

  function previewSound(type: "dm" | "channel_message" | "friend_request") {
    if (prefs.sound_enabled) {
      playNotificationSound(type, prefs.sound_volume);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </SheetTitle>
        </SheetHeader>

        {/* Appearance */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Appearance
          </h3>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <div>
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs text-muted-foreground">Toggle light / dark theme</p>
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggle} />
          </div>
        </section>

        <Separator className="mb-6" />

        {/* Accent / Color Themes */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Accent Color
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_THEMES.map((a) => {
              const isActive = accent.id === a.id;
              // Extract hue/sat/light for the swatch
              const [h, s, l] = a.primary.replace(/%/g, "").split(" ").map(Number);
              return (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  title={a.label}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                    isActive
                      ? "border-foreground/40 bg-[hsl(var(--surface-2))]"
                      : "border-border hover:border-foreground/20 hover:bg-[hsl(var(--surface-2))]",
                  )}
                >
                  <div
                    className="h-6 w-6 rounded-full shadow-md"
                    style={{ background: `hsl(${h}, ${s}%, ${l}%)` }}
                  />
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">
                    {a.label.split(" ")[0]}
                  </span>
                  {isActive && (
                    <span className="h-1 w-1 rounded-full bg-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <Separator className="mb-6" />

        {/* Notification sounds */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notification Sounds
          </h3>

          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-4">
              {/* Master sound toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {prefs.sound_enabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Enable sounds</p>
                    <p className="text-xs text-muted-foreground">Play audio for notifications</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.sound_enabled}
                  onCheckedChange={(v) => updatePrefs({ sound_enabled: v })}
                />
              </div>

              {/* Volume slider */}
              <div className={prefs.sound_enabled ? "" : "opacity-40 pointer-events-none"}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Volume</p>
                  <span className="text-xs text-muted-foreground">{prefs.sound_volume}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[prefs.sound_volume]}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>

              {/* Per-type sound previews */}
              <div className={`space-y-2 ${prefs.sound_enabled ? "" : "opacity-40 pointer-events-none"}`}>
                <p className="text-xs text-muted-foreground mb-1">Preview sounds</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => previewSound("dm")}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border hover:bg-[hsl(var(--surface-2))] transition-colors text-xs"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    DM
                  </button>
                  <button
                    onClick={() => previewSound("channel_message")}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border hover:bg-[hsl(var(--surface-2))] transition-colors text-xs"
                  >
                    <Hash className="h-4 w-4 text-green-400" />
                    Server
                  </button>
                  <button
                    onClick={() => previewSound("friend_request")}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border hover:bg-[hsl(var(--surface-2))] transition-colors text-xs"
                  >
                    <UserPlus className="h-4 w-4 text-yellow-400" />
                    Friend
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <Separator className="mb-6" />

        {/* Notification types */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notification Types
          </h3>

          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">Direct messages</p>
                    <p className="text-xs text-muted-foreground">When someone DMs you</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.dm_notifications}
                  onCheckedChange={(v) => updatePrefs({ dm_notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Server messages</p>
                    <p className="text-xs text-muted-foreground">Activity in your servers</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.channel_notifications}
                  onCheckedChange={(v) => updatePrefs({ channel_notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium">Friend requests</p>
                    <p className="text-xs text-muted-foreground">Requests and acceptances</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.friend_notifications}
                  onCheckedChange={(v) => updatePrefs({ friend_notifications: v })}
                />
              </div>
            </div>
          )}
        </section>

        <Separator className="mb-6" />

        {/* AI assistant */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            AI assistant
          </h3>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Campus AI chat</p>
                <p className="text-xs text-muted-foreground">
                  Show the floating assistant. Drag its button or the grip (⋮⋮) when open to move it.
                </p>
              </div>
            </div>
            <Switch checked={aiAssistantOn} onCheckedChange={setAiAssistantPref} />
          </div>
        </section>

        <Separator className="mb-6" />

        {/* About */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            About
          </h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>NXT Campus Platform</p>
            <p className="text-xs">v1.0.0</p>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
