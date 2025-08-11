import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackToDashboardButton from "@/components/BackToDashboardButton";

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const DepartmentsPage = () => {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    document.title = "Gestione Dipartimenti | Admin";
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("departments").select("*").order("name");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const canSave = useMemo(() => name.trim().length > 1, [name]);

  const add = async () => {
    if (!canSave) return;
    const { error } = await supabase.from("departments").insert({ name: name.trim(), description: description || null });
    if (!error) {
      setName("");
      setDescription("");
      load();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    load();
  };

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestione Dipartimenti</h1>
          <p className="text-sm text-muted-foreground">Crea e organizza i dipartimenti dell'organizzazione</p>
        </div>
        <BackToDashboardButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo Dipartimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Descrizione (opzionale)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="md:col-span-2">
            <Button onClick={add} disabled={!canSave}>
              Aggiungi
            </Button>
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
            {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">Nessun dipartimento</div>}
            {!loading && items.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{d.name}</div>
                  {d.description && <div className="text-sm text-muted-foreground">{d.description}</div>}
                </div>
                <Button variant="destructive" size="sm" onClick={() => remove(d.id)}>Elimina</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default DepartmentsPage;
