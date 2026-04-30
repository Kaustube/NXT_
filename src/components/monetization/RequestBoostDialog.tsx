import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, Star, Pin, Megaphone, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type ModuleType = 'event' | 'listing' | 'post' | 'club' | 'resource' | 'business';

interface BoostOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  estimatedPrice: string;
}

const BOOST_OPTIONS: Record<ModuleType, BoostOption[]> = {
  event: [
    { id: 'featured', name: 'Featured Event', description: 'Highlight your event with a gold border on the events page.', icon: Star, estimatedPrice: '₹299 - ₹499' },
    { id: 'pinned', name: 'Pinned to Top', description: 'Pin your event at the top of the feed for maximum visibility.', icon: Pin, estimatedPrice: '₹499 - ₹999' }
  ],
  listing: [
    { id: 'urgent_sale', name: 'Urgent Sale Badge', description: 'Add a fire badge to indicate an urgent sale.', icon: AlertCircle, estimatedPrice: '₹49' },
    { id: 'campus_featured', name: 'Campus Featured', description: 'Keep your listing at the top for 72 hours.', icon: Rocket, estimatedPrice: '₹149' }
  ],
  club: [
    { id: 'promoted', name: 'Promote Club', description: 'Show your club in the recommended section.', icon: Megaphone, estimatedPrice: '₹499/mo' }
  ],
  post: [],
  resource: [],
  business: []
};

interface RequestBoostDialogProps {
  moduleType: ModuleType;
  targetId: string;
  trigger?: React.ReactNode;
}

export function RequestBoostDialog({ moduleType, targetId, trigger }: RequestBoostDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const options = BOOST_OPTIONS[moduleType] || [];

  const handleRequest = async () => {
    if (!user || !selectedBoost) return;
    
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("monetization_requests").insert({
        requester_id: user.id,
        module_type: moduleType,
        target_id: targetId,
        boost_type: selectedBoost,
        status: 'pending'
      } as any);

      if (error) throw error;
      
      toast.success("Boost requested! An admin will review and set the fee shortly.");
      setOpen(false);
    } catch (e: any) {
      toast.error("Failed to request boost: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (options.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
            <Rocket className="h-4 w-4" /> Boost
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Boost this {moduleType}
          </DialogTitle>
          <DialogDescription>
            Select a visibility package. An admin will review and provide a final price.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {options.map(opt => (
            <div 
              key={opt.id}
              onClick={() => setSelectedBoost(opt.id)}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedBoost === opt.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border/50 hover:border-border'
              }`}
            >
              <div className={`mt-0.5 p-2 rounded-md ${selectedBoost === opt.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <opt.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground flex justify-between">
                  {opt.name}
                  <span className="text-sm font-normal text-muted-foreground">{opt.estimatedPrice}</span>
                </h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleRequest} disabled={!selectedBoost || loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
