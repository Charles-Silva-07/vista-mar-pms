import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Search } from "lucide-react";
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
import { toast } from "sonner";
import { day, isLowStock, usePms, type SupplyItem, type SupplyMovementType } from "@/lib/pms-store";
import { cn } from "@/lib/utils";

const emptySupplyForm = { name: "", unit: "un", quantity: "", minQuantity: "" };

export function SupplyScreen() {
  const { supplies, supplyMovements, addSupply, addSupplyMovement } = usePms();
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState(emptySupplyForm);
  const [moveTarget, setMoveTarget] = useState<SupplyItem | null>(null);
  const [moveType, setMoveType] = useState<SupplyMovementType>("saida");
  const [moveQty, setMoveQty] = useState("1");
  const [moveCost, setMoveCost] = useState("");
  const [moveNote, setMoveNote] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return supplies;
    return supplies.filter((s) => s.name.toLowerCase().includes(q));
  }, [supplies, query]);

  const lowStockCount = supplies.filter(isLowStock).length;

  const recentMovements = useMemo(
    () => [...supplyMovements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [supplyMovements],
  );
  const supplyName = (id: string) => supplies.find((s) => s.id === id)?.name ?? "Item removido";

  const submitNew = () => {
    const quantity = Number(newForm.quantity.replace(",", "."));
    const minQuantity = Number(newForm.minQuantity.replace(",", "."));
    if (!newForm.name.trim() || !newForm.unit.trim() || Number.isNaN(quantity) || Number.isNaN(minQuantity)) {
      toast.error("Preencha nome, unidade, quantidade e estoque mínimo.");
      return;
    }
    addSupply({ name: newForm.name.trim(), unit: newForm.unit.trim(), quantity, minQuantity });
    toast.success("Insumo cadastrado no estoque.");
    setNewForm(emptySupplyForm);
    setNewOpen(false);
  };

  const openMove = (s: SupplyItem, type: SupplyMovementType) => {
    setMoveTarget(s);
    setMoveType(type);
    setMoveQty("1");
    setMoveCost("");
    setMoveNote("");
  };

  const submitMove = () => {
    if (!moveTarget) return;
    const quantity = Number(moveQty.replace(",", "."));
    if (!quantity || quantity <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    const unitCost = moveType === "entrada" ? Number(moveCost.replace(",", ".")) || undefined : undefined;
    const note = moveNote.trim();
    addSupplyMovement({
      supplyId: moveTarget.id,
      type: moveType,
      quantity,
      date: day(0),
      ...(unitCost !== undefined ? { unitCost } : {}),
      ...(note ? { note } : {}),
    });
    toast.success(
      moveType === "entrada"
        ? `Entrada registrada: +${quantity} ${moveTarget.unit} de ${moveTarget.name}.`
        : `Baixa registrada: -${quantity} ${moveTarget.unit} de ${moveTarget.name}.`,
    );
    setMoveTarget(null);
  };

  return (
    <div className="space-y-4">
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            <b>{lowStockCount}</b> {lowStockCount === 1 ? "insumo está" : "insumos estão"} com
            estoque baixo — reabasteça em breve.
          </span>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar insumo"
            className="pl-9"
          />
        </div>
        <Button className="shrink-0" onClick={() => setNewOpen(true)}>
          <Plus /> Novo Insumo
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Insumo</th>
              <th className="px-4 py-3 font-semibold">Estoque atual</th>
              <th className="px-4 py-3 font-semibold">Mínimo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum insumo encontrado.
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const low = isLowStock(s);
              return (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.quantity} {s.unit}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.minQuantity} {s.unit}
                  </td>
                  <td className="px-4 py-3">
                    {low ? (
                      <Badge className="gap-1 bg-warning text-warning-foreground">
                        <AlertTriangle className="size-3" /> Estoque baixo — reabastecer
                      </Badge>
                    ) : (
                      <Badge className="bg-success/15 text-success">Estoque OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openMove(s, "entrada")}>
                        <ArrowUpCircle className="size-4" /> Entrada
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openMove(s, "saida")}>
                        <ArrowDownCircle className="size-4" /> Saída
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">
          Movimentações recentes
        </p>
        <ul className="divide-y divide-border">
          {recentMovements.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">Nenhuma movimentação ainda.</li>
          )}
          {recentMovements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{supplyName(m.supplyId)}</span>
                {m.note && <span className="text-muted-foreground"> · {m.note}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {m.date.split("-").reverse().join("/")}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    m.type === "entrada" ? "text-success" : "text-destructive",
                  )}
                >
                  {m.type === "entrada" ? "+" : "-"}
                  {m.quantity}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Novo insumo */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo insumo</DialogTitle>
            <DialogDescription>
              Cadastre um item de consumo interno da pousada (limpeza, café da manhã, etc.).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Detergente"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input
                  value={newForm.unit}
                  onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                  placeholder="L, kg, un..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Qtd. inicial</Label>
                <Input
                  value={newForm.quantity}
                  onChange={(e) => setNewForm({ ...newForm, quantity: e.target.value })}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mínimo</Label>
                <Input
                  value={newForm.minQuantity}
                  onChange={(e) => setNewForm({ ...newForm, minQuantity: e.target.value })}
                  inputMode="decimal"
                />
              </div>
            </div>
            <Button className="w-full" onClick={submitNew}>
              Salvar insumo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registrar entrada/saída */}
      <Dialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {moveType === "entrada" ? "Registrar entrada" : "Registrar baixa"} — {moveTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Estoque atual: {moveTarget?.quantity} {moveTarget?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={moveType === "entrada" ? "default" : "outline"}
                onClick={() => setMoveType("entrada")}
              >
                <ArrowUpCircle /> Entrada (compra)
              </Button>
              <Button
                type="button"
                variant={moveType === "saida" ? "default" : "outline"}
                onClick={() => setMoveType("saida")}
              >
                <ArrowDownCircle /> Saída (uso)
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input value={moveQty} onChange={(e) => setMoveQty(e.target.value)} inputMode="decimal" />
              </div>
              {moveType === "entrada" && (
                <div className="space-y-1.5">
                  <Label>Custo unitário (R$)</Label>
                  <Input
                    value={moveCost}
                    onChange={(e) => setMoveCost(e.target.value)}
                    placeholder="opcional"
                    inputMode="decimal"
                  />
                </div>
              )}
            </div>
            {moveType === "entrada" && (
              <p className="text-xs text-muted-foreground">
                Informando o custo, essa compra já é lançada automaticamente no Financeiro.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input
                value={moveNote}
                onChange={(e) => setMoveNote(e.target.value)}
                placeholder="Ex.: reposição dos quartos"
              />
            </div>
            <Button className="w-full" onClick={submitMove}>
              Confirmar {moveType === "entrada" ? "entrada" : "saída"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
