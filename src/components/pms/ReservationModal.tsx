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
import { day, usePms } from "@/lib/pms-store";

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

  useEffect(() => {
    if (open) {
      setRoomId(defaultRoomId ?? rooms[0]?.id ?? "");
      setStart(defaultDate ?? day(0));
    }
  }, [open, defaultRoomId, defaultDate, rooms]);

  const submit = () => {
    if (!guestName.trim()) {
      toast.error("Informe o nome do hóspede.");
      return;
    }
    const n = Number(nights) || 1;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + n);
    const room = rooms.find((r) => r.id === roomId)!;
    addReservation({
      roomId,
      guestName: guestName.trim(),
      start,
      end: endDate.toISOString().slice(0, 10),
      status: "confirmada",
      eta,
      nights: n,
      rate: room.rate,
    });
    toast.success(`Reserva criada para ${guestName} no quarto ${room.number}.`);
    setGuestName("");
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
          <Button className="w-full" onClick={submit}>
            Salvar reserva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
