import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, BedDouble, ClipboardCheck, Wrench, TrendingUp, Calendar as CalIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Stats {
  totalUsers: number;
  totalDortoirs: number;
  absencesAujourdhui: number;
  reclamationsEnAttente: number;
  reclamationsEnCours: number;
  reclamationsTerminees: number;
  pointagesAujourdhui: number;
  permanencesAujourdhui: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    (async () => {
      const [u, d, a, rPend, rProg, rDone, p, perm, act] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("dortoirs").select("*", { count: "exact", head: true }),
        supabase.from("absences").select("nombre_absents").eq("date", today),
        supabase.from("reclamations").select("*", { count: "exact", head: true }).eq("status", "EN_ATTENTE"),
        supabase.from("reclamations").select("*", { count: "exact", head: true }).eq("status", "EN_COURS"),
        supabase.from("reclamations").select("*", { count: "exact", head: true }).eq("status", "TERMINEE"),
        supabase.from("restaurant_logs").select("*", { count: "exact", head: true }).eq("date", today),
        supabase.from("permanences").select("*", { count: "exact", head: true }).eq("date", today),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      setStats({
        totalUsers: u.count ?? 0,
        totalDortoirs: d.count ?? 0,
        absencesAujourdhui: (a.data ?? []).reduce((s, r: any) => s + (r.nombre_absents || 0), 0),
        reclamationsEnAttente: rPend.count ?? 0,
        reclamationsEnCours: rProg.count ?? 0,
        reclamationsTerminees: rDone.count ?? 0,
        pointagesAujourdhui: p.count ?? 0,
        permanencesAujourdhui: perm.count ?? 0,
      });
      setRecent(act.data ?? []);
    })();
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary-soft" },
    { label: "Dortoirs", value: stats.totalDortoirs, icon: BedDouble, color: "text-info", bg: "bg-accent" },
    { label: "Absences aujourd'hui", value: stats.absencesAujourdhui, icon: ClipboardCheck, color: "text-warning", bg: "bg-warning-soft" },
    { label: "Permanences du jour", value: stats.permanencesAujourdhui, icon: CalIcon, color: "text-primary", bg: "bg-primary-soft" },
    { label: "Pointages restaurant", value: stats.pointagesAujourdhui, icon: TrendingUp, color: "text-success", bg: "bg-success-soft" },
    { label: "Réclamations en attente", value: stats.reclamationsEnAttente, icon: Wrench, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Bonjour {profile?.full_name?.split(" ")[0] || ""} 👋</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Réclamations</CardTitle>
            <CardDescription>État global</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span>En attente</span><span className="font-semibold text-warning">{stats.reclamationsEnAttente}</span></div>
            <div className="flex justify-between text-sm"><span>En cours</span><span className="font-semibold text-primary">{stats.reclamationsEnCours}</span></div>
            <div className="flex justify-between text-sm"><span>Terminées</span><span className="font-semibold text-success">{stats.reclamationsTerminees}</span></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((a) => (
                  <li key={a.id} className="text-sm flex justify-between border-b last:border-0 pb-2 last:pb-0">
                    <span>{a.action} {a.entity ? `· ${a.entity}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM HH:mm")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
