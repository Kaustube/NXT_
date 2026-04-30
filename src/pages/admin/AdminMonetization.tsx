import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  IndianRupee, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Tag, 
  Filter,
  Search,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

type RequestStatus = 'pending' | 'pricing_set' | 'paid' | 'active' | 'rejected' | 'expired';
type ModuleType = 'event' | 'listing' | 'post' | 'club' | 'resource' | 'business';

interface MonetizationRequest {
  id: string;
  requester_id: string;
  module_type: ModuleType;
  target_id: string;
  boost_type: string;
  status: RequestStatus;
  fee_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  requester?: {
    display_name: string;
    email: string;
  };
}

export default function AdminMonetization() {
  const { isFinanceAdmin, isSuperAdmin, isAdmin } = useAuth();
  const [requests, setRequests] = useState<MonetizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = (supabase as any).from("monetization_requests")
        .select(`
          *,
          requester:profiles!requester_id(display_name, email)
        `)
        .order("created_at", { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setRequests(data as any[] || []);
    } catch (e: any) {
      toast.error("Failed to load requests: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFee = async (id: string) => {
    const feeStr = feeInputs[id];
    if (!feeStr || isNaN(Number(feeStr)) || Number(feeStr) <= 0) {
      toast.error("Please enter a valid fee amount");
      return;
    }

    try {
      const { error } = await (supabase as any).from("monetization_requests")
        .update({ 
          fee_amount: Number(feeStr),
          status: 'pricing_set',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("Fee set successfully. User notified.");
      fetchRequests();
    } catch (e: any) {
      toast.error("Failed to set fee: " + e.message);
    }
  };

  const handleMarkPaid = async (request: MonetizationRequest) => {
    try {
      // 1. Mark request as active/paid
      const { error } = await (supabase as any).from("monetization_requests")
        .update({ 
          status: 'active',
          resolved_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      // 2. Activate the boost on the target table
      let table = "";
      let updates = {};
      
      switch (request.module_type) {
        case 'event':
          table = 'events';
          updates = request.boost_type === 'pinned' ? { is_pinned: true } : { is_featured: true };
          break;
        case 'listing':
          table = 'listings';
          updates = request.boost_type === 'urgent_sale' ? { is_urgent: true } : { is_campus_featured: true };
          // also set boost_until if needed
          break;
        case 'club':
          table = 'servers';
          updates = { is_promoted: true };
          break;
        default:
          toast.success(`Marked as paid. Please manually apply the boost for ${request.module_type}.`);
          fetchRequests();
          return;
      }

      const { error: targetErr } = await (supabase as any).from(table).update(updates).eq('id', request.target_id);
      
      if (targetErr) {
        toast.error(`Marked paid, but failed to auto-apply boost: ${targetErr.message}`);
      } else {
        toast.success("Payment confirmed and boost automatically activated!");
      }
      
      fetchRequests();
    } catch (e: any) {
      toast.error("Failed to mark as paid: " + e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("monetization_requests")
        .update({ 
          status: 'rejected',
          resolved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("Request rejected.");
      fetchRequests();
    } catch (e: any) {
      toast.error("Failed to reject: " + e.message);
    }
  };

  if (!isFinanceAdmin && !isSuperAdmin && !isAdmin) {
    return <div className="p-8">Access Denied. Finance or Super Admin required.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-primary" />
            Monetization & Revenue
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage boost requests, set platform fees, and activate placements.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['pending', 'pricing_set', 'active', 'all'] as const).map(f => (
          <Button 
            key={f} 
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center h-40">Loading requests...</div>
      ) : requests.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            <p>No {filter !== 'all' ? filter : ''} requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="uppercase font-mono tracking-wider">
                      {req.module_type}
                    </Badge>
                    <Badge 
                      className={
                        req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                        req.status === 'pricing_set' ? 'bg-blue-500/20 text-blue-600' :
                        req.status === 'active' ? 'bg-green-500/20 text-green-600' :
                        'bg-red-500/20 text-red-600'
                      }
                      variant="secondary"
                    >
                      {req.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      Boost Type: {req.boost_type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Requested by: {req.requester?.display_name || 'Unknown'} ({req.requester?.email || 'N/A'})
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target ID: <span className="font-mono">{req.target_id}</span>
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-64 bg-muted/30 rounded-lg p-4 flex flex-col justify-center border border-border/50">
                  {req.status === 'pending' ? (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Set Platform Fee (₹)</label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="e.g. 499" 
                          className="font-mono"
                          value={feeInputs[req.id] || ''}
                          onChange={e => setFeeInputs(prev => ({...prev, [req.id]: e.target.value}))}
                        />
                        <Button onClick={() => handleSetFee(req.id)}>Set</Button>
                      </div>
                      <Button variant="ghost" className="w-full text-destructive" onClick={() => handleReject(req.id)}>
                        Reject
                      </Button>
                    </div>
                  ) : req.status === 'pricing_set' ? (
                    <div className="text-center space-y-3">
                      <div className="text-2xl font-bold text-foreground">₹{req.fee_amount}</div>
                      <p className="text-xs text-muted-foreground">Awaiting user payment via offline/UPI.</p>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkPaid(req)}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Paid & Activate
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground line-through opacity-70">₹{req.fee_amount || 0}</div>
                      <div className="mt-2 text-sm font-medium flex items-center justify-center gap-1 text-green-500">
                        <CheckCircle className="h-4 w-4" /> Activated
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
