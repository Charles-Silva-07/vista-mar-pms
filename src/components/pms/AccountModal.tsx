import { useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
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
import { QuantityInput } from "@/components/pms/QuantityInput";
import { ReceiptModal, type ReceiptData } from "@/components/pms/ReceiptModal";
import { brl, day, isLowStock, usePms, type Reservation } from "@/lib/pms-store";
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
  const {
    rooms,
    products,
    supplies,
    consumptions,
    addConsumption,
    removeConsumption,
    addTransaction,
    updateReservationStatus,
    updateReservationPayment,
  } = usePms();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [method, setMethod] = useState("Pix");
  const [productId, setProductId] = useState<string>(products[0]?.id ?? CUSTOM_ITEM);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [qty, setQty] = useState("1");

  // Não retorna cedo aqui: mesmo com reservation null (extrato fechado logo
  // após o check-out), o ReceiptModal no fim do JSX precisa continuar
  // renderizando o recibo que acabou de ser gerado.
  if (!reservation) {
    return <ReceiptModal receipt={receipt} onOpenChange={(o) => !o && setReceipt(null)} />;
  }
  const room = rooms.find((r) => r.id === reservation.roomId);
  const items = consumptions.filter((c) => c.reservationId === reservation.id);
  const lodging = reservation.nights * reservation.rate;
  const extras = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const total = lodging + extras;
  // Valor já recebido antes do check-out (sinal/entrada) precisa ser abatido
  // do total, senão o extrato cobra o hóspede de novo e o financeiro conta
  // essa receita duas vezes.
  const alreadyPaid = Math.min(reservation.amountPaid, total);
  const remaining = Math.max(0, total - alreadyPaid);

  const selectedProduct = products.find((p) => p.id === productId);
  const isCustom = productId === CUSTOM_ITEM || !selectedProduct;

  const addItem = async () => {
    const name = isCustom ? customName.trim() : selectedProduct!.name;
    const unitPrice = isCustom ? Number(customPrice.replace(",", ".")) : selectedProduct!.price;
    const qtyNum = Number(qty) || 1;
    if (!name || !unitPrice) {
      toast.error("Informe o produto e o valor unitário.");
      return;
    }

    // Se o item vendido tem vínculo com estoque, confere se tem quantidade
    // suficiente antes de vender - evita vender frigobar/produto que já
    // acabou sem o funcionário perceber.
    let stockUsage: { supplyId: string; supplyQty: number } | undefined;
    if (!isCustom && selectedProduct?.supplyId) {
      const supply = supplies.find((s) => s.id === selectedProduct.supplyId);
      const supplyQty = (selectedProduct.qtyPerSale ?? 1) * qtyNum;
      if (supply && supply.quantity < supplyQty) {
        toast.error(
          `Estoque insuficiente de "${supply.name}": disponível ${supply.quantity} ${supply.unit}, necessário ${supplyQty}.`,
        );
        return;
      }
      stockUsage = { supplyId: selectedProduct.supplyId, supplyQty };
    }

    try {
      await addConsumption({
        reservationId: reservation.id,
        name,
        qty: qtyNum,
        unitPrice,
        ...stockUsage,
      });
      setCustomName("");
      setCustomPrice("");
      setQty("1");
      toast.success("Consumo lançado no extrato.");

      if (stockUsage) {
        const supply = supplies.find((s) => s.id === stockUsage!.supplyId);
        if (supply) {
          const remainingStock = supply.quantity - stockUsage.supplyQty;
          if (isLowStock({ ...supply, quantity: remainingStock })) {
            toast.warning(`Estoque de "${supply.name}" ficou baixo (${remainingStock} ${supply.unit}).`);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível lançar o consumo.");
    }
  };

  const checkout = () => {
    // Só lança no financeiro o saldo que está sendo recebido agora no
    // check-out. O que já tinha sido pago antes (sinal/entrada) já entrou
    // como receita na hora em que foi registrado — lançar o total de novo
    // aqui duplicaria a receita do dia.
    if (remaining > 0) {
      addTransaction({
        date: day(0),
        description: `Check-out — Quarto ${room?.number} (${reservation.guestName}) via ${method}`,
        category: "Hospedagem",
        amount: remaining,
        type: "entrada",
        status: "Pago",
      }).catch((err) => console.error("Não consegui lançar a receita do check-out no financeiro:", err));
    }
    updateReservationStatus(reservation.id, "finalizada");
    updateReservationPayment(reservation.id, total);
    toast.success(`Check-out concluído. Recibo de ${brl(total)} emitido.`);
    // Snapshot dos dados no momento do check-out - depois disso a reserva
    // muda de status e vira histórico, então o recibo não pode depender do
    // estado ao vivo da reserva/extrato.
    setReceipt({
      guestName: reservation.guestName,
      roomNumber: room?.number ?? "",
      roomCategory: room?.category ?? "",
      nights: reservation.nights,
      rate: reservation.rate,
      checkoutDate: day(0),
      items,
      method,
      total,
    });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open onOpenChange={onOpenChange}>
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
                <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    {i.qty}x {i.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium">{brl(i.qty * i.unitPrice)}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removeConsumption(i.id);
                          toast.success(`"${i.name}" removido do extrato.`);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Não foi possível remover o item.");
                        }
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remover ${i.name} do extrato`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-semibold">+ Adicionar item ao consumo</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <Label className="text-xs">Produto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => {
                      const supply = p.supplyId ? supplies.find((s) => s.id === p.supplyId) : undefined;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {brl(p.price)}
                          {supply ? ` (estoque: ${supply.quantity} ${supply.unit})` : ""}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value={CUSTOM_ITEM}>Outro (avulso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qtd.</Label>
                <QuantityInput value={qty} onChange={setQty} min={1} />
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

          <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total da estadia</span>
              <span className="font-semibold">{brl(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Já pago (sinal/entrada)</span>
              <span className="font-semibold text-success">- {brl(alreadyPaid)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">
              {remaining > 0 ? "Saldo a pagar agora" : "Total geral (já quitado)"}
            </span>
            <span className="text-xl font-bold">{brl(remaining)}</span>
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
            {remaining > 0
              ? `Receber ${brl(remaining)} e Concluir Check-out`
              : "Concluir Check-out e Emitir Recibo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <ReceiptModal receipt={receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </>
  );
}
