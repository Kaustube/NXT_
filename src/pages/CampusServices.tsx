import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ShirtIcon, Package, Printer, Car, Search, Wrench,
  MessageSquare, Plus, X, Check, Clock, ChevronRight,
  Lock, Loader2, Trash2,
} from "lucide-react";
import BackButton from "@/components/BackButton";

// ── Types ──────────────────────────────────────────────────────────────────

type ServiceType =
  | "laundry"
  | "gate_pickup"
  | "printing"
  | "cab_share"
  | "lost_found"
  | "mess_feedback"
  | "maintenance";

type ServiceRequest = {
  id: string;
  user_id: string;
  service_type: ServiceType;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  scheduled_at: string | null;
  created_at: string;
  participant_count?: number;
  is_participant?: boolean;
};

// ── Service definitions ────────────────────────────────────────────────────

const SERVICES = [
  {
    type: "laundry" as ServiceType,
    label: "Laundry Pickup",
    icon: ShirtIcon,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    description: "Schedule laundry pickup from your room",
    fields: [
      { key: "room_number", label: "Room Number", placeholder: "e.g. A-204", required: true },
      { key: "bag_count", label: "Number of Bags", placeholder: "1", type: "number", required: true },
      { key: "special_instructions", label: "Special Instructions", placeholder: "Delicate items, etc.", multiline: true },
    ],
    schedulable: true,
  },
  {
    type: "gate_pickup" as ServiceType,
    label: "Gate Pickup",
    icon: Package,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    description: "Request someone to collect your parcel from the gate",
    fields: [
      { key: "parcel_from", label: "Parcel From", placeholder: "e.g. Amazon, Swiggy", required: true },
      { key: "tracking_id", label: "Tracking / Order ID", placeholder: "Optional" },
      { key: "room_number", label: "Deliver to Room", placeholder: "e.g. B-301", required: true },
      { key: "contact_number", label: "Contact Number", placeholder: "Your phone number", required: true },
    ],
    schedulable: false,
  },
  {
    type: "printing" as ServiceType,
    label: "Print Request",
    icon: Printer,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    description: "Send documents for printing at the library/lab",
    fields: [
      { key: "document_name", label: "Document Name", placeholder: "Assignment 3 - DAA", required: true },
      { key: "pages", label: "Number of Pages", placeholder: "10", type: "number", required: true },
      { key: "copies", label: "Copies", placeholder: "1", type: "number" },
      { key: "color", label: "Print Type", type: "select", options: ["Black & White", "Color"], required: true },
      { key: "paper_size", label: "Paper Size", type: "select", options: ["A4", "A3", "Letter"] },
      { key: "pickup_location", label: "Pickup Location", placeholder: "Library counter / Lab 3" },
    ],
    schedulable: true,
  },
  {
    type: "cab_share" as ServiceType,
    label: "Cab Share",
    icon: Car,
    color: "text-green-400 bg-green-400/10 border-green-400/20",
    description: "Find or offer cab sharing to/from campus",
    fields: [
      { key: "from", label: "From", placeholder: "e.g. Bennett University Gate", required: true },
      { key: "to", label: "To", placeholder: "e.g. Noida Sector 18", required: true },
      { key: "seats_available", label: "Seats Available", placeholder: "3", type: "number", required: true },
      { key: "fare_per_person", label: "Fare per Person (₹)", placeholder: "150", type: "number" },
      { key: "contact", label: "Contact / WhatsApp", placeholder: "Your number", required: true },
    ],
    schedulable: true,
  },
  {
    type: "lost_found" as ServiceType,
    label: "Lost & Found",
    icon: Search,
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    description: "Report lost items or post found items",
    fields: [
      { key: "item_type", label: "Type", type: "select", options: ["Lost", "Found"], required: true },
      { key: "item_name", label: "Item Name", placeholder: "e.g. Blue water bottle", required: true },
      { key: "location", label: "Location", placeholder: "Where lost/found", required: true },
      { key: "contact", label: "Contact", placeholder: "Email or phone", required: true },
      { key: "description", label: "Description", placeholder: "Any identifying features", multiline: true },
    ],
    schedulable: false,
  },
  {
    type: "mess_feedback" as ServiceType,
    label: "Mess Feedback",
    icon: MessageSquare,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    description: "Submit feedback or complaints about mess food",
    fields: [
      { key: "meal", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
      { key: "rating", label: "Rating", type: "select", options: ["⭐ Poor", "⭐⭐ Below Average", "⭐⭐⭐ Average", "⭐⭐⭐⭐ Good", "⭐⭐⭐⭐⭐ Excellent"], required: true },
      { key: "feedback", label: "Feedback", placeholder: "What was good or bad?", multiline: true, required: true },
      { key: "date", label: "Date", type: "date" },
    ],
    schedulable: false,
  },
  {
    type: "maintenance" as ServiceType,
    label: "Maintenance",
    icon: Wrench,
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    description: "Report room or hostel maintenance issues",
    fields: [
      { key: "room_number", label: "Room Number", placeholder: "e.g. C-105", required: true },
      { key: "issue_type", label: "Issue Type", type: "select", options: ["Electrical", "Plumbing", "Furniture", "AC/Fan", "Internet", "Door/Lock", "Other"], required: true },
      { key: "description", label: "Description", placeholder: "Describe the issue in detail", multiline: true, required: true },
      { key: "urgency", label: "Urgency", type: "select", options: ["Low", "Medium", "High - Urgent"] },
    ],
    schedulable: false,
  },
];

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  confirmed:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  completed:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled:   "bg-[hsl(var(--surface-3))] text-muted-foreground border-border",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function CampusServices() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"services" | "my_requests" | "community">("services");
  const [activeService, setActiveService] = useState<typeof SERVICES[0] | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [communityRequests, setCommunityRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const hasCollege = !!profile?.college_id;
  const collegeName = profile?.college_name ?? "your college";

  useEffect(() => {
    if (!user || !hasCollege) return;
    void loadRequests();
  }, [user, hasCollege]);

  async function loadRequests() {
    if (!user) return;
    setLoading(true);
    const [{ data: mine }, { data: community }] = await Promise.all([
      supabase
        .from("service_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("service_requests")
        .select("*")
        .in("service_type", ["cab_share", "lost_found"])
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setMyRequests((mine as ServiceRequest[]) ?? []);
    setCommunityRequests((community as ServiceRequest[]) ?? []);
    setLoading(false);
  }

  function openService(svc: typeof SERVICES[0]) {
    setActiveService(svc);
    setFormData({});
    setScheduledAt("");
  }

  async function submitRequest() {
    if (!user || !activeService || !profile?.college_id) return;

    // Validate required fields
    for (const field of activeService.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    // Basic rate limit: check if user submitted same service in last 5 minutes
    const recentKey = `last_service_${activeService.type}`;
    const lastSubmit = localStorage.getItem(recentKey);
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 5 * 60 * 1000) {
      toast.error("Please wait 5 minutes before submitting another request of this type");
      return;
    }

    setSubmitting(true);
    const title = buildTitle(activeService, formData);
    const { error } = await supabase.from("service_requests").insert({
      user_id: user.id,
      college_id: profile.college_id,
      service_type: activeService.type,
      title,
      description: formData.description || formData.feedback || null,
      metadata: formData,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    localStorage.setItem(recentKey, Date.now().toString());
    toast.success(`${activeService.label} request submitted!`);
    setActiveService(null);
    void loadRequests();
    setTab("my_requests");
  }

  async function cancelRequest(id: string) {
    if (!confirm("Cancel this request?")) return;
    await supabase.from("service_requests").update({ status: "cancelled" }).eq("id", id);
    toast.success("Request cancelled");
    void loadRequests();
  }

  function buildTitle(svc: typeof SERVICES[0], data: Record<string, string>): string {
    switch (svc.type) {
      case "laundry":     return `Laundry pickup — Room ${data.room_number ?? ""}`;
      case "gate_pickup": return `Gate pickup — ${data.parcel_from ?? "parcel"}`;
      case "printing":    return `Print: ${data.document_name ?? "document"} (${data.pages ?? "?"} pages)`;
      case "cab_share":   return `Cab: ${data.from ?? ""} → ${data.to ?? ""}`;
      case "lost_found":  return `${data.item_type ?? "Lost/Found"}: ${data.item_name ?? "item"}`;
      case "mess_feedback": return `Mess feedback — ${data.meal ?? ""} (${data.rating?.split(" ")[0] ?? ""})`;
      case "maintenance": return `Maintenance — ${data.issue_type ?? "issue"} in ${data.room_number ?? ""}`;
      default:            return svc.label;
    }
  }

  // ── No college guard ──────────────────────────────────────────────────────
  if (!hasCollege) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <BackButton to="/dashboard" />
        <div className="panel p-12 text-center mt-6">
          <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <h2 className="font-semibold text-lg mb-2">College required</h2>
          <p className="text-sm text-muted-foreground">
            Campus services are only available to students linked to a college.
            Update your profile to access these features.
          </p>
        </div>
      </div>
    );
  }

  // ── Service form modal ────────────────────────────────────────────────────
  if (activeService) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveService(null)}
            className="h-9 w-9 rounded-lg border border-border grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
          >
            ‹
          </button>
          <div className={`h-9 w-9 rounded-lg border grid place-items-center ${activeService.color}`}>
            <activeService.icon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-lg">{activeService.label}</h1>
            <p className="text-xs text-muted-foreground">{collegeName}</p>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          {activeService.fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                >
                  <option value="">Select…</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === "date" ? (
                <input
                  type="date"
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                />
              ) : field.multiline ? (
                <textarea
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring resize-none"
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                />
              )}
            </div>
          ))}

          {activeService.schedulable && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Schedule for (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setActiveService(null)}
              className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitRequest}
              disabled={submitting}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Submit Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Campus</p>
          <h1 className="text-3xl font-bold mt-0.5">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">{collegeName} · College-specific services</p>
        </div>
        <BackButton to="/dashboard" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[hsl(var(--surface-2))] rounded-lg w-fit">
        {[
          { id: "services", label: "All Services" },
          { id: "my_requests", label: `My Requests${myRequests.length ? ` (${myRequests.filter(r => r.status !== "completed" && r.status !== "cancelled").length})` : ""}` },
          { id: "community", label: "Community Board" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Services grid ── */}
      {tab === "services" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map(svc => (
            <button
              key={svc.type}
              onClick={() => openService(svc)}
              className={`panel p-5 text-left hover:border-primary/40 transition-all hover:scale-[1.02] group`}
            >
              <div className={`h-11 w-11 rounded-xl border grid place-items-center mb-3 group-hover:scale-110 transition-transform ${svc.color}`}>
                <svc.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold text-sm mb-1">{svc.label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{svc.description}</div>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                Request <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── My requests ── */}
      {tab === "my_requests" && (
        <div className="space-y-3">
          {loading && (
            <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
          )}
          {!loading && myRequests.length === 0 && (
            <div className="panel p-12 text-center">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No requests yet. Use the Services tab to submit one.</p>
            </div>
          )}
          {myRequests.map(req => {
            const svc = SERVICES.find(s => s.type === req.service_type);
            const Icon = svc?.icon ?? Package;
            return (
              <div key={req.id} className="panel-2 p-4 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl border grid place-items-center shrink-0 ${svc?.color ?? "bg-[hsl(var(--surface-3))] text-muted-foreground border-border"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{req.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[req.status]}`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(req.created_at), "MMM d, h:mm a")}
                    {req.scheduled_at && ` · Scheduled ${format(new Date(req.scheduled_at), "MMM d, h:mm a")}`}
                  </div>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                  )}
                </div>
                {(req.status === "pending" || req.status === "confirmed") && (
                  <button
                    onClick={() => cancelRequest(req.id)}
                    className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Community board (cab share + lost & found) ── */}
      {tab === "community" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active cab shares and lost & found posts from your college</p>
            <button
              onClick={() => {
                const cabSvc = SERVICES.find(s => s.type === "cab_share")!;
                openService(cabSvc);
              }}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Post
            </button>
          </div>

          {loading && <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>}

          {!loading && communityRequests.length === 0 && (
            <div className="panel p-12 text-center">
              <Car className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No active posts. Be the first to post a cab share or lost item!</p>
            </div>
          )}

          {communityRequests.map(req => {
            const svc = SERVICES.find(s => s.type === req.service_type);
            const Icon = svc?.icon ?? Package;
            const meta = req.metadata ?? {};
            return (
              <div key={req.id} className="panel p-4 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl border grid place-items-center shrink-0 ${svc?.color ?? "bg-[hsl(var(--surface-3))] text-muted-foreground border-border"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{req.title}</div>
                  {req.service_type === "cab_share" && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {meta.seats_available && <div>🪑 {meta.seats_available} seats available</div>}
                      {meta.fare_per_person && <div>💰 ₹{meta.fare_per_person}/person</div>}
                      {meta.contact && <div>📞 {meta.contact}</div>}
                    </div>
                  )}
                  {req.service_type === "lost_found" && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {meta.location && <div>📍 {meta.location}</div>}
                      {meta.contact && <div>📞 {meta.contact}</div>}
                      {meta.description && <div className="line-clamp-2">{meta.description}</div>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Posted {format(new Date(req.created_at), "MMM d, h:mm a")}
                    {req.scheduled_at && ` · Departing ${format(new Date(req.scheduled_at), "MMM d, h:mm a")}`}
                  </div>
                </div>
                {req.user_id === user?.id && (
                  <button
                    onClick={() => cancelRequest(req.id)}
                    className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
