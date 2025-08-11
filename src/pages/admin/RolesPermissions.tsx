import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface AppPermission { id: string; permission_key: string; description: string | null }
interface RolePermission { id: string; role: 'admin'|'technician'|'user'; permission_id: string }

const roles: RolePermission["role"][] = ["admin", "technician", "user"];

const RolesPermissionsPage = () => {
  const [perms, setPerms] = useState<AppPermission[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    document.title = "Ruoli e Permessi | Admin";
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: rp }] = await Promise.all([
      supabase.from("app_permissions").select("id, permission_key, description").order("permission_key"),
      supabase.from("role_permissions").select("id, role, permission_id")
    ]);
    setPerms(p || []);
    setRolePerms(rp || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mapping = useMemo(() => {
    const m = new Map<string, Set<string>>();
    roles.forEach((r) => m.set(r, new Set()));
    rolePerms.forEach((rp) => {
      const set = m.get(rp.role);
      if (set) set.add(rp.permission_id);
    });
    return m;
  }, [rolePerms]);

  const toggle = async (role: RolePermission["role"], permission_id: string) => {
    const has = mapping.get(role)?.has(permission_id);
    if (has) {
      const toDelete = rolePerms.find((rp) => rp.role === role && rp.permission_id === permission_id);
      if (toDelete) {
        await supabase.from("role_permissions").delete().eq("id", toDelete.id);
      }
    } else {
      await supabase.from("role_permissions").insert({ role, permission_id });
    }
    load();
  };

  const addPermission = async () => {
    if (!newKey.trim()) return;
    const { error } = await supabase.from("app_permissions").insert({ permission_key: newKey.trim(), description: newDesc || null });
    if (!error) {
      setNewKey("");
      setNewDesc("");
      load();
    }
  };

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ruoli e Permessi</h1>
          <p className="text-sm text-muted-foreground">Configura i permessi per i ruoli di sistema</p>
        </div>
        <BackToDashboardButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo Permesso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="permission_key (es. manage_teams)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input placeholder="Descrizione (opzionale)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button onClick={addPermission}>Aggiungi</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matrice Permessi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Caricamento...</div>}
          {!loading && (
            <div className="space-y-4">
              {perms.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{p.permission_key}</div>
                    {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
                  </div>
                  <div className="flex items-center gap-6">
                    {roles.map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm">
                        <span className="w-24 capitalize">{r}</span>
                        <Switch
                          checked={mapping.get(r)?.has(p.id) || false}
                          onCheckedChange={() => toggle(r, p.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default RolesPermissionsPage;
