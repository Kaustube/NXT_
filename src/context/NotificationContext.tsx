import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { playNotificationSound, NotifSoundType } from "@/lib/notificationSounds";

export type NotificationType =
  | "dm"
  | "channel_message"
  | "friend_request"
  | "friend_accepted"
  | "admin_broadcast";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  actor_id: string | null;
  ref_id: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  sound_enabled: boolean;
  sound_volume: number;
  dm_notifications: boolean;
  channel_notifications: boolean;
  friend_notifications: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  sound_enabled: true,
  sound_volume: 80,
  dm_notifications: true,
  channel_notifications: true,
  friend_notifications: true,
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  prefs: NotificationPreferences;
  loadingPrefs: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  updatePrefs: (p: Partial<NotificationPreferences>) => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const prefsRef = useRef<NotificationPreferences>(DEFAULT_PREFS);

  // Keep ref in sync so realtime handler always has latest prefs
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  // Load initial notifications + prefs
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setPrefs(DEFAULT_PREFS);
      setLoadingPrefs(false);
      return;
    }

    (async () => {
      const [{ data: notifs }, { data: p }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setNotifications((notifs as Notification[]) ?? []);

      if (p) {
        const loaded: NotificationPreferences = {
          sound_enabled: (p as any).sound_enabled,
          sound_volume: (p as any).sound_volume,
          dm_notifications: (p as any).dm_notifications,
          channel_notifications: (p as any).channel_notifications,
          friend_notifications: (p as any).friend_notifications,
        };
        setPrefs(loaded);
        prefsRef.current = loaded;
      }
      setLoadingPrefs(false);
    })();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev].slice(0, 50));

          // Play sound based on type + prefs
          const p = prefsRef.current;
          if (!p.sound_enabled) return;
          if (notif.type === "dm" && !p.dm_notifications) return;
          if (
            (notif.type === "channel_message" || notif.type === "admin_broadcast") &&
            !p.channel_notifications
          )
            return;
          if (
            (notif.type === "friend_request" || notif.type === "friend_accepted") &&
            !p.friend_notifications
          )
            return;

          playNotificationSound(notif.type as NotifSoundType, p.sound_volume);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    setNotifications([]);
    await supabase.from("notifications").delete().eq("user_id", user.id);
  }, [user]);

  const updatePrefs = useCallback(
    async (partial: Partial<NotificationPreferences>) => {
      if (!user) return;
      const next = { ...prefsRef.current, ...partial };
      setPrefs(next);
      prefsRef.current = next;
      await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          ...next,
        },
        { onConflict: "user_id" },
      );
    },
    [user],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        prefs,
        loadingPrefs,
        markAllRead,
        markRead,
        updatePrefs,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
