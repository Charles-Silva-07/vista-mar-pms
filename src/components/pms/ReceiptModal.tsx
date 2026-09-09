import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brl, formatDate, type ConsumptionItem } from "@/lib/pms-store";

// Snapshot dos dados do check-out no momento em que ele foi concluído. Não
// referenciamos a Reservation/ConsumptionItem ao vivo aqui de propósito: se o
// usuário abrir o extrato de outro hóspede depois, o recibo já mostrado tem
// que continuar estático, mostrando exatamente o que foi cobrado naquele
// check-out.
export type ReceiptData = {
  guestName: string;
  roomNumber: string;
  roomCategory: string;
  nights: number;
  rate: number;
  checkoutDate: string; // yyyy-mm-dd
  items: ConsumptionItem[];
  method: string;
  total: number;
};

function ReceiptBody({ receipt }: { receipt: ReceiptData }) {
  const lodging = receipt.nights * receipt.rate;
  const extras = receipt.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  return (
    <div className="space-y-4 text-sm">
      <div className="text-center">
        <p className="text-base font-bold">Alameda Pousada</p>
        <p className="text-xs text-muted-foreground">Comprovante de Check-out</p>
        <p className="text-xs text-muted-foreground">{formatDate(receipt.checkoutDate)}</p>
      </div>

      <dl className="space-y-1.5 border-y border-dashed border-border py-3">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Hóspede</dt>
          <dd className="font-medium">{receipt.guestName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Quarto</dt>
          <dd className="font-medium">
            {receipt.roomNumber} — {receipt.roomCategory}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Forma de pagamento</dt>
          <dd className="font-medium">{receipt.method}</dd>
        </div>
      </dl>

      <div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">
            Diárias ({receipt.nights} x {brl(receipt.rate)})
          </span>
          <span className="font-medium">{brl(lodging)}</span>
        </div>
        {receipt.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-muted-foreground">
            <span>
              {item.qty}x {item.name}
            </span>
            <span>{brl(item.qty * item.unitPrice)}</span>
          </div>
        ))}
        {receipt.items.length > 0 && (
          <div className="flex justify-between border-t border-dashed border-border py-1 pt-2 text-muted-foreground">
            <span>Subtotal consumo</span>
            <span>{brl(extras)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
        <span>Total pago</span>
        <span>{brl(receipt.total)}</span>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Obrigado pela hospedagem — volte sempre!
      </p>
    </div>
  );
}

export function ReceiptModal({
  receipt,
  onOpenChange,
}: {
  receipt: ReceiptData | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!receipt) return null;

  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recibo de Check-out</DialogTitle>
          <DialogDescription>
            {receipt.guestName} · Quarto {receipt.roomNumber}
          </DialogDescription>
        </DialogHeader>

        <ReceiptBody receipt={receipt} />

        <Button className="w-full" onClick={() => window.print()}>
          <Printer /> Imprimir recibo
        </Button>

        {/* Só aparece na hora de imprimir (ver #print-area em styles.css) — o
            resto da tela (dialog, overlay, sidebar) fica oculto na impressão. */}
        <div id="print-area" className="p-8 text-black">
          <ReceiptBody receipt={receipt} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
