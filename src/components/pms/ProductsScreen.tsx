import { useMemo, useState } from "react";
import { Plus, Search, Trash2, ShoppingBag } from "lucide-react";
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
import { QuantityInput } from "@/components/pms/QuantityInput";
import { brl, productCategories, usePms, type ProductCategory } from "@/lib/pms-store";

const NO_SUPPLY = "nenhum";
const emptyForm = {
  name: "",
  category: productCategories[0]!,
  price: "",
  supplyId: NO_SUPPLY,
  qtyPerSale: "1",
};

export function ProductsScreen() {
  const { products, addProduct, removeProduct, supplies } = usePms();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const supplyName = (id?: string) => supplies.find((s) => s.id === id)?.name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const submit = async () => {
    const price = Number(form.price.replace(".", "").replace(",", "."));
    if (!form.name.trim() || !price) {
      toast.error("Informe o nome e o valor do item.");
      return;
    }
    const hasSupply = form.supplyId !== NO_SUPPLY;
    const qtyPerSale = Number(form.qtyPerSale.replace(",", ".")) || 1;
    try {
      await addProduct({
        name: form.name.trim(),
        category: form.category,
        price,
        ...(hasSupply ? { supplyId: form.supplyId, qtyPerSale } : {}),
      });
      toast.success("Item cadastrado no catálogo.");
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar o item.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar item"
              className="pl-9"
            />
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setOpen(true)}>
          <Plus /> Novo Item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Estoque vinculado</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{p.category}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.supplyId ? (
                    <span>
                      {supplyName(p.supplyId) ?? "Item removido"}{" "}
                      <span className="text-xs">(-{p.qtyPerSale ?? 1}/venda)</span>
                    </span>
                  ) : (
                    <span className="text-xs italic">Sem controle</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold">{brl(p.price)}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try {
                        await removeProduct(p.id);
                        toast.success(`"${p.name}" removido do catálogo.`);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Não foi possível remover o item.");
                      }
                    }}
                    aria-label={`Remover ${p.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Novo item do catálogo
            </DialogTitle>
            <DialogDescription>
              Cadastre um produto ou serviço vendido na pousada, com o valor cobrado do hóspede.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Água mineral 500ml"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="7,00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vincular a insumo do estoque (opcional)</Label>
              <Select
                value={form.supplyId}
                onValueChange={(v) => setForm({ ...form, supplyId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLY}>Nenhum (sem controle de estoque)</SelectItem>
                  {supplies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.quantity} {s.unit} em estoque)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ao vender este item no extrato do hóspede, a quantidade abaixo é baixada
                automaticamente do estoque.
              </p>
            </div>
            {form.supplyId !== NO_SUPPLY && (
              <div className="space-y-1.5">
                <Label>Qtd. de estoque consumida por venda</Label>
                <QuantityInput
                  value={form.qtyPerSale}
                  onChange={(v) => setForm({ ...form, qtyPerSale: v })}
                  min={1}
                />
              </div>
            )}
            <Button className="w-full" onClick={submit}>
              Salvar item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
