import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, X, BedDouble } from "lucide-react";
import { toast } from "sonner";

export default function Dortoirs() {
  const [loading, setLoading] = useState(true);
  const [dortoirs, setDortoirs] = useState<any[]>([]);
  const [assigns, setAssigns] = useState<any[]>([]);
  const [surveillants, setSurveillants] = useState<{ user_id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dortoir_id: "", surveillant_id: "" });

  const load = async () => {
    setLoading(true);
    const [d, a, sRoles] = await Promise.all([
      supabase.from("dortoirs").select("*").order("code"),
      supabase.from("dortoir_assignments").select("*, dortoirs(code)"),
      supabase.from("user_roles").select("user_id").eq("role", "SURVEILLANT"),
    ]);
    const survIds = (sRoles.data ?? []).map((r: any) => r.user_id);
    const { data: survProfiles } = survIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", survIds)
      : { data: [] as any[] };

    // Attach surveillant names to assignments
    const profileMap = new Map<string, string>();
    (survProfiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "(sans nom)"));
    // Also fetch names for any assignment surveillant not in surv list (edge case)
    const allAssignIds = Array.from(new Set((a.data ?? []).map((x: any) => x.surveillant_id)));
    const missing = allAssignIds.filter((id) => !profileMap.has(id as string));
    if (missing.length) {
      const { data: extra } = await supabase.from("profiles").select("user_id, full_name").in("user_id", missing as string[]);
      (extra ?? []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "(sans nom)"));
    }
    const enrichedAssigns = (a.data ?? []).map((x: any) => ({
      ...x,
      surveillant_name: profileMap.get(x.surveillant_id) || "—",
    }));

    setDortoirs(d.data ?? []);
    setAssigns(enrichedAssigns);
    setSurveillants((survProfiles ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name || "(sans nom)" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.dortoir_id || !form.surveillant_id) { toast.error("Sélection requise"); return; }
    const { error } = await supabase.from("dortoir_assignments").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Surveillant assigné");
    setOpen(false); setForm({ dortoir_id: "", surveillant_id: "" }); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dortoir_assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dortoirs</h1>
          <p className="text-muted-foreground mt-1">Affectation des surveillants par dortoir</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nouvelle affectation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Affecter un surveillant</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Dortoir</Label>
                <Select value={form.dortoir_id} onValueChange={(v) => setForm({ ...form, dortoir_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {dortoirs.map((d) => <SelectItem key={d.id} value={d.id}>Dortoir {d.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Surveillant</Label>
                <Select value={form.surveillant_id} onValueChange={(v) => setForm({ ...form, surveillant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {surveillants.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={create}>Assigner</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dortoirs.map((d) => {
            const dortoirAssigns = assigns.filter((a) => a.dortoir_id === d.id);
            return (
              <Card key={d.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-primary" />
                    Dortoir {d.code}
                  </CardTitle>
                  <CardDescription>{dortoirAssigns.length} surveillant{dortoirAssigns.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dortoirAssigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Aucun surveillant</p>
                  ) : (
                    <ul className="space-y-1">
                      {dortoirAssigns.map((a) => (
                        <li key={a.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/40">
                          <span>{a.profiles?.full_name || "—"}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(a.id)}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
