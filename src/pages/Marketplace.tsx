import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: "buy" | "sell" | "rent";
  college_id: string | null;
  college_only: boolean;
  active: boolean;
  created_at: string;
};
type Seller = { user_id: string; display_name: string; username: string };

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "rent">("all");
  const [collegeOnly, setCollegeOnly] = useState(false);
  const [meCollege, setMeCollege] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState<"buy" | "sell" | "rent">("sell");
  const [description, setDescription] = useState("");
  const [collegeOnlyForm, setCollegeOnlyForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadAll();
    supabase.from("profiles").select("college_id").eq("user_id", user.id).maybeSingle().then(({ data }) => setMeCollege((data as any)?.college_id ?? null));
  }, [user]);

  async function loadAll() {
    const { data } = await supabase.from("listings").select("*").eq("active", true).order("created_at", { ascending: false });
    const ls = (data as Listing[]) ?? [];
    setListings(ls);
    const ids = [...new Set(ls.map((l) => l.seller_id))];
    if (ids.length) {
      const { data: pf } = await supabase.from("profiles").select("user_id, display_name, username").in("user_id", ids);
      const map: Record<string, Seller> = {};
      (pf ?? []).forEach((p: any) => (map[p.user_id] = p));
      setSellers(map);
    }
  }

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("listings").insert({
      seller_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: Number(price) || 0,
      category,
      college_id: meCollege,
      college_only: collegeOnlyForm,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Listing posted");
      setShowForm(false);
      setTitle("");
      setPrice("0");
      setDescription("");
      setCategory("sell");
      setCollegeOnlyForm(false);
      void loadAll();
    }
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== "all" && l.category !== filter) return false;
      if (collegeOnly && l.college_id !== meCollege) return false;
      if (l.college_only && l.college_id !== meCollege) return false;
      return true;
    });
  }, [listings, filter, collegeOnly, meCollege]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Marketplace</div>
          <h1 className="font-display text-4xl mt-1">Buy, sell, rent</h1>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "New listing"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createListing} className="panel p-5 grid sm:grid-cols-2 gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Calculus textbook)" className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm sm:col-span-2" required />
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="1" placeholder="Price" className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm">
            <option value="sell">Selling</option>
            <option value="buy">Looking to buy</option>
            <option value="rent">For rent</option>
          </select>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item, condition, pickup details" className="px-3 py-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm sm:col-span-2 min-h-[80px]" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <input type="checkbox" checked={collegeOnlyForm} onChange={(e) => setCollegeOnlyForm(e.target.checked)} />
            Restrict to my college only
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Post listing</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "buy", "sell", "rent"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-md text-sm border ${filter === f ? "bg-[hsl(var(--surface-3))] border-border text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "All" : f === "buy" ? "Buying" : f === "sell" ? "Selling" : "Rent"}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
          <input type="checkbox" checked={collegeOnly} onChange={(e) => setCollegeOnly(e.target.checked)} />
          My college only
        </label>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((l) => {
          const seller = sellers[l.seller_id];
          return (
            <div key={l.id} className="panel p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.category === "sell" ? "Selling" : l.category === "buy" ? "Buying" : "Rent"}</div>
                  <div className="text-sm font-medium mt-1">{l.title}</div>
                </div>
                <div className="text-sm font-semibold">₹{l.price}</div>
              </div>
              {l.description && <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{l.description}</div>}
              <div className="mt-auto pt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {seller?.display_name ?? "Seller"} · {format(new Date(l.created_at), "MMM d")}
                </div>
                {seller && seller.user_id !== user?.id && (
                  <button onClick={() => navigate(`/messages?with=${seller.user_id}`)} className="h-8 px-3 rounded-md border border-border text-xs">Chat</button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-sm text-muted-foreground text-center py-10 col-span-full">Nothing here yet.</div>}
      </div>
    </div>
  );
}
