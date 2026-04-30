import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Briefcase, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ListingAccessService = "events" | "jobs" | "internships";

type ServiceOption = {
  value: ListingAccessService;
  label: string;
};

const SERVICE_META: Record<ListingAccessService, { label: string; icon: typeof CalendarDays }> = {
  events: { label: "Events", icon: CalendarDays },
  jobs: { label: "Jobs", icon: Briefcase },
  internships: { label: "Internships", icon: Building2 },
};

type PartnerApplicationRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_services: string[];
};

interface RequestListingAccessDialogProps {
  services: ServiceOption[];
  defaultService?: ListingAccessService;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
}

export function RequestListingAccessDialog({
  services,
  defaultService,
  trigger,
  title = "Request listing access",
  description = "Submit your organization details. An admin will review the request before listing access is approved.",
}: RequestListingAccessDialogProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<ListingAccessService>(defaultService ?? services[0]?.value ?? "events");
  const [companyName, setCompanyName] = useState(profile?.company_name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? profile?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedMeta = useMemo(() => SERVICE_META[service], [service]);
  const SelectedIcon = selectedMeta.icon;

  useEffect(() => {
    setService(defaultService ?? services[0]?.value ?? "events");
  }, [defaultService, services]);

  useEffect(() => {
    setCompanyName(profile?.company_name ?? "");
    setContactEmail(user?.email ?? profile?.email ?? "");
  }, [profile?.company_name, profile?.email, user?.email]);

  async function handleSubmit() {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!companyName.trim() || !contactEmail.trim() || !details.trim()) {
      toast.error("Organization name, contact email, and request details are required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("partner_applications")
        .select("id, status, requested_services")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"]);

      if (existingError) throw existingError;

      const existing = ((existingRows ?? []) as PartnerApplicationRow[]).find((row) =>
        (row.requested_services ?? []).includes(service),
      );

      if (existing?.status === "pending") {
        toast.error(`A ${selectedMeta.label.toLowerCase()} request is already pending admin approval`);
        setSubmitting(false);
        return;
      }

      if (existing?.status === "approved") {
        toast.error(`Your account already has ${selectedMeta.label.toLowerCase()} access approved`);
        setSubmitting(false);
        return;
      }

      const payload = {
        user_id: user.id,
        company_name: companyName.trim(),
        contact_email: contactEmail.trim(),
        phone_number: phoneNumber.trim() || null,
        description: details.trim(),
        requested_services: [service],
      };

      const { data, error } = await supabase
        .from("partner_applications")
        .insert(payload)
        .select("id, company_name, contact_email, phone_number, requested_services, description")
        .single();

      if (error) throw error;

      const { error: notifyError } = await supabase.functions.invoke("notify-admin", {
        body: { record: data },
      });

      if (notifyError) {
        toast.warning("Request saved, but admin email notification could not be sent automatically");
      } else {
        toast.success(`${selectedMeta.label} request sent to admin for approval`);
      }

      setDetails("");
      setPhoneNumber("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Request Listing Access
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SelectedIcon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Request type</label>
            <Select value={service} onValueChange={(value) => setService(value as ListingAccessService)}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {services.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organization / company name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Events"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contact email</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="team@acme.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone number</label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98XXXXXXXX"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">What do you want to list?</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Share the event, job, or internship details and anything the admin should review before approving."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Send className="h-4 w-4" />
            {submitting ? "Sending..." : "Send to Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
