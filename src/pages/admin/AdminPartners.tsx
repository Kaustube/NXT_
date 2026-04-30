import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Building2, Check, X, Clock, ChevronDown, ChevronUp,
  CalendarDays, Briefcase, Mail, Phone, Tag, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

type Application = {
  id: string;
  user_id: string;
  company_name: string;
  contact_email: string;
  phone_number: string | null;
  description: string | null;
  requested_services: string[];
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  display_name?: string;
  username?: string;
};

const SERVICE_ICON: Record<string, React.ElementType> = {
  events: CalendarDays,
  jobs: Briefcase,
  internships: Building2,
};

const STATUS_STYLES: Record<Application["status"], string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminPartners() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { void load(); }, [filterStatus]);

  async function load() {
    setLoading(true);
    const q = (supabase.from("partner_applications") as any)
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = filterStatus === "all"
      ? await q
      : await q.eq("status", filterStatus);

    if (error) { toast.error(error.message); setLoading(false); return; }

    const rows = (data ?? []) as Application[];

    // Fetch display names in parallel
    const userIds = [...new Set(rows.map((r: Application) => r.user_id))];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);
      const map: Record<string, { display_name: string; username: string }> = {};
      (profiles ?? []).forEach((p: any) => (map[p.user_id] = p));
      rows.forEach((r: Application) => {
        r.display_name = map[r.user_id]?.display_name;
        r.username = map[r.user_id]?.username;
      });
    }

    setApps(rows);
    setLoading(false);
  }

  async function resolve(id: string, action: "approved" | "rejected") {
    if (!user) return;
    setSaving(id);
    const { error } = await (supabase.from("partner_applications") as any)
      .update({
        status: action,
        admin_notes: notes[id] ?? null,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", id);

    if (error) { toast.error(error.message); setSaving(null); return; }

    // If approved, call the DB function to update the profile
    if (action === "approved") {
      await (supabase.rpc as any)("approve_partner_application", {
        p_application_id: id,
        p_admin_id: user.id,
      });
    }

    toast.success(`Application ${action}`);
    setSaving(null);
    void load();
  }

  const pending = apps.filter(a => a.status === "pending").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partner Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review listing access tickets from companies and organizers
          </p>
        </div>
        {pending > 0 && (
          <span className="h-8 px-3 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-sm font-bold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {pending} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`h-8 px-4 rounded-lg text-sm font-medium border transition-all capitalize ${
              filterStatus === s
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted-foreground">
          No {filterStatus === "all" ? "" : filterStatus} applications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const isOpen = expanded === app.id;
            return (
              <div key={app.id} className="panel overflow-hidden">
                {/* Row header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : app.id)}
                >
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--surface-3))] grid place-items-center shrink-0">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{app.company_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[app.status]}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                      <span>{app.display_name ?? app.username ?? "Unknown user"}</span>
                      <span>{format(new Date(app.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>

                  {/* Requested services */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {app.requested_services.map(s => {
                      const Icon = SERVICE_ICON[s] ?? Tag;
                      return (
                        <span key={s} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
                          <Icon className="h-3 w-3" />
                          {s}
                        </span>
                      );
                    })}
                  </div>

                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-3 border-t border-border/50 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <a href={`mailto:${app.contact_email}`} className="hover:text-primary underline truncate">{app.contact_email}</a>
                      </div>
                      {app.phone_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{app.phone_number}</span>
                        </div>
                      )}
                    </div>

                    {app.description && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">What they want to list</div>
                        <p className="text-sm bg-[hsl(var(--surface-2))] rounded-lg p-3 leading-relaxed">{app.description}</p>
                      </div>
                    )}

                    {/* Mobile services */}
                    <div className="sm:hidden flex flex-wrap gap-1.5">
                      {app.requested_services.map(s => {
                        const Icon = SERVICE_ICON[s] ?? Tag;
                        return (
                          <span key={s} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
                            <Icon className="h-3 w-3" />{s}
                          </span>
                        );
                      })}
                    </div>

                    {/* Admin notes + actions */}
                    {app.status === "pending" && (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <textarea
                          value={notes[app.id] ?? ""}
                          onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="Admin notes (optional)…"
                          className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--input))] border border-border text-sm resize-none min-h-[70px] outline-none focus:border-ring"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => resolve(app.id, "rejected")}
                            disabled={saving === app.id}
                            className="h-9 px-4 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all disabled:opacity-50"
                          >
                            <X className="h-4 w-4" /> Reject
                          </button>
                          <button
                            onClick={() => resolve(app.id, "approved")}
                            disabled={saving === app.id}
                            className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-600 transition-all disabled:opacity-50"
                          >
                            {saving === app.id
                              ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Check className="h-4 w-4" />}
                            Approve Access
                          </button>
                        </div>
                      </div>
                    )}

                    {app.status !== "pending" && app.admin_notes && (
                      <div className="pt-2 border-t border-border/50">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Admin Notes</div>
                        <p className="text-sm text-muted-foreground">{app.admin_notes}</p>
                      </div>
                    )}

                    {app.status === "approved" && (
                      <div className="flex items-center gap-2 text-sm text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                        Approved — listing access granted to this account
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
