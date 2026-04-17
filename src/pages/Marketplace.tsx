import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, X, Edit3, Trash2, Check, Tag, Eye, EyeOff } from "lucide-react";
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

const CATEGORY_LABEL = { sell: "Selling", buy: "Buying", rent: "For Rent" };
const CATEGORY_COLOR = {
  sell: "bg-blue-400/10 text-blue-400",
  buy: "bg-emerald-400/10 text-emerald-400",
  rent: "bg-purple-400/10 text-purple-400",
};

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "rent" | "mine">("all");
  const [collegeOnly, setCollegeOnly] = useState(false);
  const [meCollege, setMeCollege] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState<"buy" | "sell" | "rent">("sell");
  const [description, setDescription] = useState("");
  const [collegeOnlyForm, setCollegeOnlyForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadAll();
    supabase.from("profiles").select("college_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setMeCollege((data as any)?.college_id ?? null));
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

  function openNew() {
    setEditingListing(null);
    setTitle(""); setPrice("0"); setCategory("sell"); setDescription(""); setCollegeOnlyForm(false);
    setShowForm(true);
  }

  function openEdit(l: Listing) {
    setEditingListing(l);
    setTitle(l.title);
    setPrice(String(l.price));
    setCategory(l.category);
    setDescription(l.description ?? "");
    setCollegeOnlyForm(l.college_only);
    setShowForm(true);
  }

  async function saveListing(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      price: Number(price) || 0,
      category,
      college_id: meCollege,
      college_only: collegeOnlyForm,
    };

    let error;
    if (editingListing) {
      ({ error } = await supabase.from("listings").update(payload).eq("id", editingListing.id).eq("seller_id", user.id));
    } else {
      ({ error } = await supabase.from("listings").insert({ ...payload, seller_id: user.id }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingListing ? "Listing updated" : "Listing posted");
    setShowForm(false);
    setEditingListing(null);
    void loadAll();
  }

  async function deleteListing(id: string) {
    if (!confirm("Remove this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id).eq("seller_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("Listing removed"); void loadAll(); }
  }

  async function toggleActive(l: Listing) {
    await supabase.from("listings").update({ active: !l.active }).eq("id", l.id).eq("seller_id", user!.id);
    toast.success(l.active ? "Listing hidden" : "Listing visible again");
    void loadAll();
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filter === "mine") return l.seller_id === user?.id;
      if (filter !== "all" && l.category !== filter) return false;
      if (collegeOnly && l.college_id !== meCollege) return false;
      if (l.college_only && l.college_id !== meCollege) return false;
      return true;
    });
  }, [listings, filter, collegeOnly, meCollege, user]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Marketplace</div>
          <h1 className="font-display text-4xl mt-1">Buy, sell, rent</h1>
        </div>
        <button
          onClick={showForm ? () => setShowForm(false) : openNew}
          className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "New listing"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={saveListing} className="panel p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm">{editingListing ? "Edit listing" : "New listing"}</h2>
            <button type="button" onClick={() => { setShowForm(false); setEditingListing(null); }}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Calculus textbook)" required
              className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm sm:col-span-2 outline-none focus:border-ring" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="1"
                placeholder="Price" className="h-9 pl-7 pr-3 w-full rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}
              className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none">
              <option value="sell">Selling</option>
              <option value="buy">Looking to buy</option>
              <option value="rent">For rent</option>
            </select>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item, condition, pickup details"
              className="px-3 py-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm sm:col-span-2 min-h-[80px] resize-none outline-none focus:border-ring" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 cursor-pointer">
              <input type="checkbox" checked={collegeOnlyForm} onChange={(e) => setCollegeOnlyForm(e.target.checked)} />
              Restrict to my college only
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingListing(null); }}
              className="h-9 px-4 rounded-md border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Cancel</button>
            <button type="submit" disabled={saving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50">
              {saving ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
              {editingListing ? "Update" : "Post listing"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "sell", "buy", "rent", "mine"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-md text-sm border transition-colors ${filter === f ? "bg-[hsl(var(--surface-3))] border-border text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "All" : f === "sell" ? "Selling" : f === "buy" ? "Buying" : f === "rent" ? "Rent" : "My listings"}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm text-muted-foreground ml-auto cursor-pointer">
          <input type="checkbox" checked={collegeOnly} onChange={(e) => setCollegeOnly(e.target.checked)} />
          My college only
        </label>
      </div>

      {/* Listings grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((l) => {
          const seller = sellers[l.seller_id];
          const isOwner = l.seller_id === user?.id;
          return (
            <div key={l.id} className="panel p-4 flex flex-col group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_COLOR[l.category]}`}>
                  {CATEGORY_LABEL[l.category]}
                </span>
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  ₹{l.price}
                </div>
              </div>

              <div className="font-medium text-sm mb-1">{l.title}</div>
              {l.description && <div className="text-xs text-muted-foreground line-clamp-3 mb-3">{l.description}</div>}
              {l.college_only && (
                <span className="text-[10px] text-muted-foreground mb-2">🏫 College only</span>
              )}

              <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground truncate">
                  {seller?.display_name ?? "Seller"} · {format(new Date(l.created_at), "MMM d")}
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(l)} title="Edit"
                      className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toggleActive(l)} title={l.active ? "Hide listing" : "Show listing"}
                      className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors">
                      {l.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteListing(l.id)} title="Delete"
                      className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  seller && (
                    <button onClick={() => navigate(`/messages?with=${seller.user_id}`)}
                      className="h-8 px-3 rounded-md border border-border text-xs hover:bg-[hsl(var(--surface-2))] shrink-0">
                      Chat
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-10 col-span-full">Nothing here yet.</div>
        )}
      </div>
    </div>
  );
}
