import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { brl, day, usePms, type Reservation } from "@/lib/pms-store";
import { cn } from "@/lib/utils";

const methods = ["Pix", "Cartão de Crédito", "Dinheiro"];
const CUSTOM_ITEM = "avulso";

export function AccountModal({
  reservation,
  onOpenChange,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { rooms, products, consumptions, addConsumption, addTransaction, updateReservationStatus } =
    usePms();
  const [method, setMethod] = useState("Pix");
  const [productId, setProductId] = useState<string>(products[0]?.id ?? CUSTOM_ITEM);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [qty, setQty] = useState("1");

  if (!reservation) return null;
  const room = rooms.find((r) => r.id === reservation.roomId);
  const items = consumptions.filter((c) => c.reservationId === reservation.id);
  const lodging = reservation.nights * reservation.rate;
  const extras = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const total = lodging + extras;

  const selectedProduct = products.find((p) => p.id === productId);
  const isCustom = productId === CUSTOM_ITEM || !selectedProduct;

  const addItem = () => {
    const name = isCustom ? customName.trim() : selectedProduct!.name;
    const unitPrice = isCustom ? Number(customPrice.replace(",", ".")) : selectedProduct!.price;
    if (!name || !unitPrice) {
      toast.error("Informe o produto e o valor unitário.");
      return;
    }
    addConsumption({
      reservationId: reservation.id,
      name,
      qty: Number(qty) || 1,
      unitPrice,
    });
    setCustomName("");
    setCustomPrice("");
    setQty("1");
    toast.success("Consumo lançado no extrato.");
  };

  const checkout = () => {
    addTransaction({
      date: day(0),
      description: `Check-out — Quarto ${room?.number} (${reservation.guestName}) via ${method}`,
      category: "Hospedagem",
      amount: total,
      type: "entrada",
      status: "Pago",
    });
    updateReservationStatus(reservation.id, "finalizada");
    toast.success(`Check-out concluído. Recibo de ${brl(total)} emitido.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!reservation} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            Extrato — Quarto {room?.number}
          </DialogTitle>
          <DialogDescription>
            {reservation.guestName} · {room?.category} · {reservation.nights} diárias
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Diárias ({reservation.nights} x {brl(reservation.rate)})
              </span>
              <span className="font-semibold">{brl(lodging)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">
              Consumos extras
            </p>
            <ul className="divide-y divide-border">
              {items.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum consumo lançado.</li>
              )}
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    {i.qty}x {i.name}
                  </span>
                  <span className="shrink-0 font-medium">{brl(i.qty * i.unitPrice)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-semibold">+ Adicionar item ao consumo</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem]">
              <div className="space-y-1">
                <Label className="text-xs">Produto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {brl(p.price)}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_ITEM}>Outro (avulso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qtd.</Label>
                <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            {isCustom && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do item</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex.: Passeio de barco"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor un.</Label>
                  <Input
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="7,00"
                  />
                </div>
              </div>
            )}
            <Button onClick={addItem} variant="secondary" className="mt-3 w-full sm:w-auto">
              <Plus /> Adicionar item
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">Total geral</span>
            <span className="text-xl font-bold">{brl(total)}</span>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    method === m
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={checkout}
            className="h-11 w-full bg-success text-success-foreground hover:bg-success/90"
          >
            Concluir Check-out e Emitir Recibo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
