import { useEffect, useState } from "react";
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
import { brl, day, usePms } from "@/lib/pms-store";

export function ReservationModal({
  open,
  onOpenChange,
  defaultRoomId,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRoomId?: string | undefined;
  defaultDate?: string | undefined;
}) {
  const { rooms, addReservation } = usePms();
  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState(defaultRoomId ?? rooms[0]?.id ?? "");
  const [start, setStart] = useState(defaultDate ?? day(0));
  const [nights, setNights] = useState("2");
  const [eta, setEta] = useState("14:00");
  const [amountPaidInput, setAmountPaidInput] = useState("0");

  useEffect(() => {
    if (open) {
      setRoomId(defaultRoomId ?? rooms[0]?.id ?? "");
      setStart(defaultDate ?? day(0));
    }
  }, [open, defaultRoomId, defaultDate, rooms]);

  const room = rooms.find((r) => r.id === roomId);
  const total = (room?.rate ?? 0) * (Number(nights) || 1);

  const submit = () => {
    if (!guestName.trim()) {
      toast.error("Informe o nome do hóspede.");
      return;
    }
    const n = Number(nights) || 1;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + n);
    const chosenRoom = rooms.find((r) => r.id === roomId)!;
    const amountPaid = Math.max(0, Number(amountPaidInput.replace(",", ".")) || 0);
    addReservation({
      roomId,
      guestName: guestName.trim(),
      start,
      end: endDate.toISOString().slice(0, 10),
      status: "confirmada",
      amountPaid,
      eta,
      nights: n,
      rate: chosenRoom.rate,
    });
    toast.success(`Reserva criada para ${guestName} no quarto ${chosenRoom.number}.`);
    setGuestName("");
    setAmountPaidInput("0");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
          <DialogDescription>Cadastre uma nova hospedagem no mapa de ocupação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Hóspede</Label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quarto</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.number} — {r.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Diárias</Label>
              <Input
                value={nights}
                onChange={(e) => setNights(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Horário previsto</Label>
            <Input type="time" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Valor pago agora (R$)</Label>
              <span className="text-xs text-muted-foreground">Total da estadia: {brl(total)}</span>
            </div>
            <Input
              value={amountPaidInput}
              onChange={(e) => setAmountPaidInput(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAmountPaidInput(String(total / 2).replace(".", ","))}
              >
                Sinal (50%)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAmountPaidInput(String(total).replace(".", ","))}
              >
                Pago integral
              </Button>
            </div>
          </div>
          <Button className="w-full" onClick={submit}>
            Salvar reserva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
