import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SLOT_LABELS, REPAS_LABELS, PermanenceSlot, RepasType } from "@/lib/types";

export default function Calendrier() {
  const { user, primaryRole } = useAuth();
  const isAdmin = primaryRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [perms, setPerms] = useState<any[]>([]);
  const [restos, setRestos] = useState<any[]>([]);
  const [surveillants, setSurveillants] = useState<{ user_id: string; full_name: string }[]>([]);

  const [openP, setOpenP] = useState(false);
  const [openR, setOpenR] = useState(false);
  const [pForm, setPForm] = useState({ surveillant_id: "", date: format(new Date(), "yyyy-MM-dd"), slot: "MATIN" as PermanenceSlot, notes: "" });
  const [rForm, setRForm] = useState({ surveillant_id: "", date: format(new Date(), "yyyy-MM-dd"), repas: "DEJEUNER" as RepasType });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 6);

  const load = async () => {
    setLoading(true);
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(weekEnd, "yyyy-MM-dd");

    let pRes: any = { data: [] };
    let rRes: any = { data: [] };
    if (isAdmin) {
      [pRes, rRes] = await Promise.all([
        supabase.from("permanences").select("*, profiles!permanences_surveillant_id_fkey(full_name)").gte("date", start).lte("date", end),
        supabase.from("restaurant_assignments").select("*, profiles!restaurant_assignments_surveillant_id_fkey(full_name)").gte("date", start).lte("date", end),
      ]);
    } else if (user) {
      [pRes, rRes] = await Promise.all([
        supabase.from("permanences").select("*").eq("surveillant_id", user.id).gte("date", start).lte("date", end),
        supabase.from("restaurant_assignments").select("*").eq("surveillant_id", user.id).gte("date", start).lte("date", end),
      ]);
    }
    setPerms(pRes.data ?? []);
    setRestos(rRes.data ?? []);

    if (isAdmin) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "SURVEILLANT");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
        : { data: [] as any[] };
      const list = (profs ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name || "(sans nom)" }));
      setSurveillants(list);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, weekStart, isAdmin]);

  const createPerm = async () => {
    if (!pForm.surveillant_id) { toast.error("Choisir un surveillant"); return; }
    const { error } = await supabase.from("permanences").insert({
      surveillant_id: pForm.surveillant_id,
      date: pForm.date,
      slot: pForm.slot,
      notes: pForm.notes || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Permanence assignée");
    setOpenP(false); load();
  };

  const createResto = async () => {
    if (!rForm.surveillant_id) { toast.error("Choisir un surveillant"); return; }
    const { error } = await supabase.from("restaurant_assignments").insert({
      surveillant_id: rForm.surveillant_id,
      date: rForm.date,
      repas: rForm.repas,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Restaurant assigné");
    setOpenR(false); load();
  };

  const removePerm = async (id: string) => {
    const { error } = await supabase.from("permanences").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };
  const removeResto = async (id: string) => {
    const { error } = await supabase.from("restaurant_assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground mt-1">Permanences et services restaurant</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={openP} onOpenChange={setOpenP}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Permanence</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle permanence</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Surveillant</Label>
                    <Select value={pForm.surveillant_id} onValueChange={(v) => setPForm({ ...pForm, surveillant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {surveillants.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={pForm.date} onChange={(e) => setPForm({ ...pForm, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Créneau</Label>
                      <Select value={pForm.slot} onValueChange={(v) => setPForm({ ...pForm, slot: v as PermanenceSlot })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SLOT_LABELS) as PermanenceSlot[]).map((s) => (
                            <SelectItem key={s} value={s}>{SLOT_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={pForm.notes} onChange={(e) => setPForm({ ...pForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenP(false)}>Annuler</Button>
                  <Button onClick={createPerm}>Assigner</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={openR} onOpenChange={setOpenR}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Restaurant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assigner restaurant</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Surveillant</Label>
                    <Select value={rForm.surveillant_id} onValueChange={(v) => setRForm({ ...rForm, surveillant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {surveillants.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={rForm.date} onChange={(e) => setRForm({ ...rForm, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Repas</Label>
                      <Select value={rForm.repas} onValueChange={(v) => setRForm({ ...rForm, repas: v as RepasType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(REPAS_LABELS) as RepasType[]).map((s) => (
                            <SelectItem key={s} value={s}>{REPAS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenR(false)}>Annuler</Button>
                  <Button onClick={createResto}>Assigner</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium">
          Semaine du {format(weekStart, "d MMM", { locale: fr })} au {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((d) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const dayPerms = perms.filter((p) => p.date === dateStr);
            const dayRestos = restos.filter((r) => r.date === dateStr);
            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
            return (
              <Card key={dateStr} className={isToday ? "border-primary shadow-md" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <div className="capitalize">{format(d, "EEE", { locale: fr })}</div>
                    <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(d, "dd")}</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {dayPerms.map((p: any) => (
                    <div key={p.id} className="text-xs p-2 rounded bg-primary-soft border border-primary/20">
                      <div className="font-medium text-primary">{SLOT_LABELS[p.slot as PermanenceSlot].split(" (")[0]}</div>
                      {isAdmin && <div className="text-muted-foreground truncate">{p.profiles?.full_name}</div>}
                      {isAdmin && (
                        <button onClick={() => removePerm(p.id)} className="text-destructive text-[10px] hover:underline">Suppr.</button>
                      )}
                    </div>
                  ))}
                  {dayRestos.map((r: any) => (
                    <div key={r.id} className="text-xs p-2 rounded bg-warning-soft border border-warning/20">
                      <div className="font-medium text-warning">🍽 {REPAS_LABELS[r.repas as RepasType]}</div>
                      {isAdmin && <div className="text-muted-foreground truncate">{r.profiles?.full_name}</div>}
                      {isAdmin && (
                        <button onClick={() => removeResto(r.id)} className="text-destructive text-[10px] hover:underline">Suppr.</button>
                      )}
                    </div>
                  ))}
                  {dayPerms.length === 0 && dayRestos.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">—</div>
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
