import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usePms, type Guest } from "@/lib/pms-store";

const purposes = ["Lazer", "Negócios", "Eventos", "Estudos", "Saúde", "Outros"];
const transports = ["Automóvel", "Avião", "Ônibus", "Navio", "Outro"];

const emptyForm = {
  name: "",
  document: "",
  country: "Brasil",
  phone: "",
  email: "",
  purpose: "Lazer",
  transport: "Automóvel",
  lastCity: "",
  nextCity: "",
};

export function GuestsScreen() {
  const { guests, addGuest } = usePms();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Guest | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) => g.name.toLowerCase().includes(q) || g.document.toLowerCase().includes(q),
    );
  }, [guests, query]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const required: (keyof typeof emptyForm)[] = ["name", "document", "phone", "email"];
    if (required.some((k) => !form[k].trim())) {
      toast.error("Preencha todos os campos obrigatórios da FNRH.");
      return;
    }
    addGuest(form);
    toast.success("Hóspede cadastrado com sucesso.");
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou CPF/Passaporte"
            className="pl-9"
          />
        </div>
        <Button className="shrink-0" onClick={() => setOpen(true)}>
          <Plus /> Novo Hóspede
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Hóspede</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Viagem</th>
              <th className="px-4 py-3 font-semibold">Estadias</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.country}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{g.document}</td>
                <td className="px-4 py-3">
                  <p>{g.phone}</p>
                  <p className="text-xs text-muted-foreground">{g.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{g.purpose}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.lastCity} → {g.nextCity}
                  </p>
                </td>
                <td className="px-4 py-3 font-medium">{g.stays}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => setDetail(g)}>
                    Ficha
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum hóspede encontrado para "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ficha Nacional de Registro de Hóspedes (FNRH)</DialogTitle>
            <DialogDescription>Todos os campos são obrigatórios por lei.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome completo</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CPF / Passaporte</Label>
              <Input value={form.document} onChange={(e) => set("document", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>País de origem</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo da viagem</Label>
              <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purposes.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meio de transporte</Label>
              <Select value={form.transport} onValueChange={(v) => set("transport", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transports.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Última cidade / estado</Label>
              <Input value={form.lastCity} onChange={(e) => set("lastCity", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Próximo destino</Label>
              <Input value={form.nextCity} onChange={(e) => set("nextCity", e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={submit}>
            Cadastrar hóspede
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ficha do hóspede</DialogTitle>
            <DialogDescription>{detail?.name}</DialogDescription>
          </DialogHeader>
          {detail && (
            <dl className="space-y-2 text-sm">
              {[
                ["Documento", detail.document],
                ["País", detail.country],
                ["Telefone", detail.phone],
                ["E-mail", detail.email],
                ["Motivo da viagem", detail.purpose],
                ["Transporte", detail.transport],
                ["Última cidade", detail.lastCity],
                ["Próximo destino", detail.nextCity],
                ["Estadias", String(detail.stays)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
