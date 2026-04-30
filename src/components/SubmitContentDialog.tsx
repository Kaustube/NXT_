import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, CalendarDays, Briefcase, Building2 } from "lucide-react";

export type ContentType = "event" | "job" | "internship";

interface SubmitContentDialogProps {
  defaultType?: ContentType;
  trigger?: React.ReactNode;
}

const TYPE_META: Record<ContentType, { label: string; icon: React.ElementType; color: string }> = {
  event:       { label: "Event",       icon: CalendarDays, color: "text-purple-400" },
  job:         { label: "Job",         icon: Briefcase,    color: "text-blue-400"   },
  internship:  { label: "Internship",  icon: Building2,    color: "text-emerald-400" },
};

export function SubmitContentDialog({ defaultType = "event", trigger }: SubmitContentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ContentType>(defaultType);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salaryStipend, setSalaryStipend] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [description, setDescription] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  function reset() {
    setTitle(""); setCompany(""); setLocation(""); setSalaryStipend("");
    setDuration(""); setDeadline(""); setStartsAt(""); setApplyLink(""); setDescription(""); setMapsUrl("");
  }

  async function handleSubmit() {
    if (!user) { toast.error("Sign in first"); return; }
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setSubmitting(true);
    try {
      let error: any = null;

      if (type === "event") {
        if (!startsAt) { toast.error("Start date is required for events"); setSubmitting(false); return; }
        ({ error } = await (supabase.from("events") as any).insert({
          title: title.trim(),
          description: description.trim(),
          kind: "hackathon",   // default kind; admin can change later
          starts_at: new Date(startsAt).toISOString(),
          location: location.trim() || null,
          is_approved: false,  // pending admin approval
        }));
      } else {
        // job or internship → goes into opportunities table
        ({ error } = await (supabase as any).from("opportunities").insert({
          provider_id: user.id,
          type,
          title: title.trim(),
          company: company.trim() || "—",
          location: location.trim() || null,
          salary_stipend: salaryStipend.trim() || null,
          duration: duration.trim() || null,
          deadline: deadline.trim() || null,
          description: description.trim(),
          apply_link: applyLink.trim() || null,
          maps_url: mapsUrl.trim() || null,
          is_active: false,    // invisible until admin approves
        }));
      }

      if (error) throw error;

      // Notify admin via edge function
      try {
        await supabase.functions.invoke("notify-admin", {
          body: {
            record: {
              company_name: company || user.email,
              contact_email: user.email,
              phone_number: null,
              requested_services: [type],
              description: `[User submission — ${meta.label}] ${title}`,
            },
          },
        });
      } catch { /* non-fatal */ }

      toast.success(`${meta.label} submitted for admin review! It will appear once approved.`);
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Submit {meta.label}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${meta.color}`}>
            <Icon className="h-5 w-5" />
            Submit a {meta.label}
          </DialogTitle>
          <DialogDescription>
            Your submission will be reviewed by an admin before it appears publicly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Content type</label>
            <Select value={type} onValueChange={v => setType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as ContentType[]).map(t => (
                  <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Common: title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === "event" ? "Annual Hackathon 2025" : type === "job" ? "Senior SWE — Backend" : "ML Research Intern"}
            />
          </div>

          {/* Company — not for events */}
          {type !== "event" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company / Organization</label>
              <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote / Bengaluru" />
            </div>

            {type === "event" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date & Time *</label>
                <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              </div>
            )}

            {type !== "event" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{type === "job" ? "Salary (LPA)" : "Stipend/month"}</label>
                <Input value={salaryStipend} onChange={e => setSalaryStipend(e.target.value)} placeholder="₹12 LPA" />
              </div>
            )}

            {type === "internship" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duration</label>
                <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="3 months" />
              </div>
            )}

            {type !== "event" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Application deadline</label>
                <Input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Dec 31, 2025" />
              </div>
            )}

            {type !== "event" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Apply link</label>
                <Input value={applyLink} onChange={e => setApplyLink(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {type !== "event" && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Google Maps link <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/?q=..." />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the event, role, responsibilities, and requirements…"
              className="min-h-[110px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Send className="h-4 w-4" />
            {submitting ? "Submitting…" : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
