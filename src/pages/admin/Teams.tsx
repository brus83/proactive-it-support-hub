import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface Department { id: string; name: string }
interface Team { id: string; name: string; department_id: string | null; description: string | null }

const TeamsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>();

  useEffect(() => {
    document.title = "Gestione Team | Admin";
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: deps }, { data: tms }] = await Promise.all([
      supabase.from("departments").select("id,name").order("name"),
      supabase.from("teams").select("*").order("name")
    ]);
    setDepartments(deps || []);
    setTeams(tms || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const canSave = useMemo(() => name.trim().length > 1, [name]);

  const add = async () => {
    if (!canSave) return;
    const { error } = await supabase.from("teams").insert({
      name: name.trim(),
      description: description || null,
      department_id: departmentId || null,
    });
    if (!error) {
      setName("");
      setDescription("");
      setDepartmentId(undefined);
      load();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("teams").delete().eq("id", id);
    load();
  };

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestione Team</h1>
          <p className="text-sm text-muted-foreground">Crea team e assegnali ai dipartimenti</p>
        </div>
        <BackToDashboardButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo Team</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Descrizione (opzionale)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Dipartimento (opzionale)" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-3">
            <Button onClick={add} disabled={!canSave}>Aggiungi</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading && <div>Caricamento...</div>}
            {!loading && teams.length === 0 && <div className="text-sm text-muted-foreground">Nessun team</div>}
            {!loading && teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.description || ""}{t.description && " • "}{
                      departments.find((d) => d.id === t.department_id)?.name || "Senza dipartimento"
                    }
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => remove(t.id)}>Elimina</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default TeamsPage;
