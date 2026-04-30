import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageSquare, Hash, UserPlus, UserCheck, Trash2, X, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, Notification, NotificationType } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

function NotifIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "dm":
      return <MessageSquare className="h-4 w-4 text-blue-400" />;
    case "channel_message":
      return <Hash className="h-4 w-4 text-green-400" />;
    case "admin_broadcast":
      return <Megaphone className="h-4 w-4 text-violet-400" />;
    case "friend_request":
      return <UserPlus className="h-4 w-4 text-yellow-400" />;
    case "friend_accepted":
      return <UserCheck className="h-4 w-4 text-emerald-400" />;
  }
}

function NotifItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();

  function handleClick() {
    onRead(notif.id);
    if (notif.type === "dm" && notif.ref_id) {
      // ref_id is conversation_id — navigate to messages
      navigate("/messages");
    } else if (notif.type === "channel_message") {
      navigate("/servers");
    } else if (notif.type === "admin_broadcast") {
      navigate("/dashboard");
    } else if (notif.type === "friend_request" || notif.type === "friend_accepted") {
      navigate("/network");
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--surface-2))] transition-colors",
        !notif.read && "bg-primary/5 border-l-2 border-primary",
      )}
    >
      <div className="mt-0.5 h-7 w-7 rounded-full bg-[hsl(var(--surface-3))] flex items-center justify-center shrink-0">
        <NotifIcon type={notif.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", !notif.read ? "font-medium" : "text-muted-foreground")}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notif.read && (
        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}

export default function NotificationPanel() {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-[hsl(var(--sidebar-background))] shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={(id) => {
                    markRead(id);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
