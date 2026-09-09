import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  FileText,
  FolderCog,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { QuantityInput } from "@/components/pms/QuantityInput";
import {
  day,
  isLowStock,
  usePms,
  type SupplyCategory,
  type SupplyItem,
  type SupplyMovementType,
} from "@/lib/pms-store";
import { cn } from "@/lib/utils";

export function SupplyScreen() {
  const {
    supplies,
    supplyCategories,
    supplyMovements,
    addSupply,
    updateSupply,
    removeSupply,
    addSupplyMovement,
    addSupplyCategory,
    renameSupplyCategory,
  } = usePms();
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    category: supplyCategories[0] ?? "Outros",
    unit: "un",
    quantity: "",
    minQuantity: "",
  });
  const [editTarget, setEditTarget] = useState<SupplyItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", unit: "", minQuantity: "" });
  const [deleteTarget, setDeleteTarget] = useState<SupplyItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<SupplyItem | null>(null);
  const [moveType, setMoveType] = useState<SupplyMovementType>("saida");
  const [moveQty, setMoveQty] = useState("1");
  const [moveCost, setMoveCost] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return supplies;
    return supplies.filter((s) => s.name.toLowerCase().includes(q));
  }, [supplies, query]);

  // Agrupa por categoria, mantendo só os grupos que têm algum item depois
  // do filtro de busca — evita mostrar seção vazia.
  const grouped = useMemo(() => {
    return supplyCategories
      .map((cat) => ({ category: cat, items: filtered.filter((s) => s.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const lowStockCount = supplies.filter(isLowStock).length;

  const shoppingList = useMemo(
    () =>
      supplies
        .filter(isLowStock)
        .map((s) => ({ ...s, suggested: Math.max(0, s.minQuantity - s.quantity) })),
    [supplies],
  );

  const todayLabel = new Date().toLocaleDateString("pt-BR", { dateStyle: "long" });

  const exportExcel = () => {
    if (shoppingList.length === 0) {
      toast.error("Nenhum insumo com estoque baixo pra exportar.");
      return;
    }
    const escape = (v: string | number) => {
      const s = String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Insumo", "Grupo", "Unidade", "Estoque atual", "Estoque mínimo", "Sugestão de compra"];
    const rows = shoppingList.map((s) => [
      s.name,
      s.category,
      s.unit,
      s.quantity,
      s.minQuantity,
      s.suggested,
    ]);
    const lines = [header, ...rows].map((r) => r.map(escape).join(";"));
    // BOM no início + ";" como separador: é o que o Excel em português abre
    // certinho, com acento correto, sem precisar importar nada manualmente.
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-compras-estoque-${day(0)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Lista exportada para Excel.");
  };

  const exportPdf = () => {
    if (shoppingList.length === 0) {
      toast.error("Nenhum insumo com estoque baixo pra exportar.");
      return;
    }
    window.print();
  };

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
    addSupply({
      name: newForm.name.trim(),
      category: newForm.category,
      unit: newForm.unit.trim(),
      quantity,
      minQuantity,
    });
    toast.success("Insumo cadastrado no estoque.");
    setNewForm({
      name: "",
      category: supplyCategories[0] ?? "Outros",
      unit: "un",
      quantity: "",
      minQuantity: "",
    });
    setNewOpen(false);
  };

  const submitNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Informe o nome da nova categoria.");
      return;
    }
    if (supplyCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error(`Já existe uma categoria chamada "${name}".`);
      return;
    }
    addSupplyCategory(name);
    toast.success(`Categoria "${name}" criada.`);
    setNewCategoryName("");
  };

  const startRename = (c: string) => {
    setRenamingCategory(c);
    setRenameValue(c);
  };

  const submitRename = () => {
    if (!renamingCategory) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error("Informe o novo nome da categoria.");
      return;
    }
    if (
      name.toLowerCase() !== renamingCategory.toLowerCase() &&
      supplyCategories.some((c) => c.toLowerCase() === name.toLowerCase())
    ) {
      toast.error(`Já existe uma categoria chamada "${name}".`);
      return;
    }
    renameSupplyCategory(renamingCategory, name);
    toast.success("Categoria renomeada.");
    setRenamingCategory(null);
    setRenameValue("");
  };

  const openEdit = (s: SupplyItem) => {
    setEditTarget(s);
    setEditForm({
      name: s.name,
      category: s.category,
      unit: s.unit,
      minQuantity: String(s.minQuantity),
    });
  };

  const submitEdit = () => {
    if (!editTarget) return;
    const minQuantity = Number(editForm.minQuantity.replace(",", "."));
    if (!editForm.name.trim() || !editForm.unit.trim() || Number.isNaN(minQuantity)) {
      toast.error("Preencha nome, unidade e estoque mínimo.");
      return;
    }
    updateSupply(editTarget.id, {
      name: editForm.name.trim(),
      category: editForm.category,
      unit: editForm.unit.trim(),
      minQuantity,
    });
    toast.success("Insumo atualizado.");
    setEditTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeSupply(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" removido do estoque.`);
    setDeleteTarget(null);
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
          <span className="flex-1">
            <b>{lowStockCount}</b> {lowStockCount === 1 ? "insumo está" : "insumos estão"} com
            estoque baixo — reabasteça em breve.
          </span>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
              onClick={exportPdf}
            >
              <FileText className="size-4" /> Exportar PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-success/25 bg-success/5 text-success hover:bg-success/10"
              onClick={exportExcel}
            >
              <FileSpreadsheet className="size-4" /> Exportar Excel
            </Button>
          </div>
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
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            <FolderCog /> Categorias
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus /> Novo Insumo
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            Nenhum insumo encontrado.
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.category} className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{group.category}</h3>
              <span className="text-xs text-muted-foreground">
                {group.items.length} {group.items.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Insumo</th>
                    <th className="px-4 py-2.5 font-semibold">Estoque atual</th>
                    <th className="px-4 py-2.5 font-semibold">Mínimo</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {group.items.map((s) => {
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
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openMove(s, "entrada")}>
                              <ArrowUpCircle className="size-4" /> Entrada
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMove(s, "saida")}>
                              <ArrowDownCircle className="size-4" /> Saída
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-muted-foreground"
                                  aria-label={`Mais ações para ${s.name}`}
                                >
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(s)}>
                                  <Pencil className="size-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(s)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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
            <div className="space-y-1.5">
              <Label>Grupo / Categoria</Label>
              <Select
                value={newForm.category}
                onValueChange={(v) => setNewForm({ ...newForm, category: v as SupplyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supplyCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade de medida</Label>
              <Input
                value={newForm.unit}
                onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                placeholder="L, kg, un, rolo..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estoque atual</Label>
                <QuantityInput
                  value={newForm.quantity}
                  onChange={(v) => setNewForm({ ...newForm, quantity: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mínimo permitido</Label>
                <QuantityInput
                  value={newForm.minQuantity}
                  onChange={(v) => setNewForm({ ...newForm, minQuantity: v })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={submitNew}>
              Salvar insumo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gerenciar categorias */}
      <Dialog
        open={categoriesOpen}
        onOpenChange={(o) => {
          setCategoriesOpen(o);
          if (!o) {
            setRenamingCategory(null);
            setNewCategoryName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Categorias de insumo</DialogTitle>
            <DialogDescription>
              Crie novos grupos ou renomeie os existentes. Renomear atualiza todos os insumos
              daquele grupo automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {supplyCategories.map((c) => (
                <li key={c} className="flex items-center justify-between gap-2 px-3 py-2">
                  {renamingCategory === c ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitRename()}
                        className="h-8"
                      />
                      <Button size="sm" onClick={submitRename}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingCategory(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{c}</span>
                      <Button size="sm" variant="ghost" onClick={() => startRename(c)}>
                        <Pencil className="size-3.5" /> Renomear
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="space-y-1.5">
              <Label>Nova categoria</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitNewCategory()}
                  placeholder="Ex.: Manutenção"
                />
                <Button onClick={submitNewCategory}>
                  <Plus /> Criar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar insumo */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar insumo</DialogTitle>
            <DialogDescription>
              Altere nome, grupo, unidade ou estoque mínimo. Pra mudar a quantidade, use Entrada/Saída.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grupo / Categoria</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: v as SupplyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supplyCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade de medida</Label>
                <Input
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mínimo permitido</Label>
                <QuantityInput
                  value={editForm.minQuantity}
                  onChange={(v) => setEditForm({ ...editForm, minQuantity: v })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={submitEdit}>
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o insumo do estoque e desfaz o vínculo com qualquer produto do
              catálogo que estava ligado a ele. O histórico de movimentações antigas é mantido.
              Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <QuantityInput value={moveQty} onChange={setMoveQty} min={1} />
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

      {/* Só aparece na hora de imprimir/exportar PDF (ver #print-area em styles.css) */}
      <div id="print-area" className="p-8 text-black">
        <h1 className="text-xl font-bold">Alameda Pousada — Lista de Compras</h1>
        <p className="mt-1 text-sm text-gray-600">Insumos com estoque baixo · {todayLabel}</p>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 pr-2">✓</th>
              <th className="py-2 pr-2">Insumo</th>
              <th className="py-2 pr-2">Grupo</th>
              <th className="py-2 pr-2">Estoque atual</th>
              <th className="py-2 pr-2">Mínimo</th>
              <th className="py-2 pr-2">Sugestão de compra</th>
            </tr>
          </thead>
          <tbody>
            {shoppingList.map((s) => (
              <tr key={s.id} className="border-b border-gray-300">
                <td className="py-2 pr-2">☐</td>
                <td className="py-2 pr-2">{s.name}</td>
                <td className="py-2 pr-2">{s.category}</td>
                <td className="py-2 pr-2">
                  {s.quantity} {s.unit}
                </td>
                <td className="py-2 pr-2">
                  {s.minQuantity} {s.unit}
                </td>
                <td className="py-2 pr-2">
                  {s.suggested} {s.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
